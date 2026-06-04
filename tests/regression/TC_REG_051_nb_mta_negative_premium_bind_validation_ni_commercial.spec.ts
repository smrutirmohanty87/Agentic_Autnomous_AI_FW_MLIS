import { expect, Page, test } from '@playwright/test';
import {
  NiCommercialFinalPolicyDetailsPage,
  NiCommercialLoginPage,
  NiCommercialOrderDialog,
  NiCommercialPolicyIssuedPage,
  NiCommercialProductSelectionPage,
  NiCommercialQuoteManagerPage,
  NiCommercialQuotesPage,
  NiCommercialStatementsOfFactPage,
  NiCommercialSummaryPage,
} from '../../src/pages/mlis-portal-ni-commercial';
import { BrokerPortalPage } from '../../src/pages/broker-portal-policy';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';

const updatedIntermediaryLegalEntity = 'Portal MLIS | Partner a/c (automated) | Bde-Comm';

async function setLookupField(page: Page, fieldLabel: string, searchText: string, skipEdit = false) {
  // Salesforce Lightning inline-edit lookup — 4 steps.

  // Step 1: Click Edit (pencil) to activate inline-edit for this field.
  // When skipEdit is true the field is already in edit mode (sibling triggered inline-edit).
  if (!skipEdit) {
    const editButton = page
      .getByRole('button', { name: new RegExp(`Edit ${fieldLabel}\\s*$`, 'i') })
      .first();
    await expect(editButton).toBeVisible({ timeout: 60_000 });
    await editButton.click();
    await page.waitForTimeout(600);
  }

  // Step 2: Wait for any Salesforce spinner overlay to disappear, then clear existing pill.
  // Use exact field name patterns to avoid matching similarly-named sibling fields.
  await page.locator('.forceModalSpinner .modal-glass.visible').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
  const escapedLabel = fieldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const xButton = page
    .getByRole('button', { name: new RegExp(`Remove ${escapedLabel}\\s*$`, 'i') })
    .or(page.getByRole('button', { name: new RegExp(`Clear ${escapedLabel} Selection\\s*$`, 'i') }))
    .or(page.locator('button.slds-pill__remove').first())
    .first();
  if (await xButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await xButton.click();
    await page.waitForTimeout(400);
  }

  // Step 3: Locate the input by exact field name to avoid matching sibling fields.
  const fieldInput = page
    .getByRole('combobox', { name: new RegExp(`^${escapedLabel}$`, 'i') })
    .or(page.locator(`input[aria-label="${fieldLabel}" i]`))
    .first();
  await expect(fieldInput).toBeVisible({ timeout: 15_000 });
  await fieldInput.click();
  await fieldInput.pressSequentially(searchText, { delay: 80 });
  await page.waitForTimeout(1_000);

  // Step 4: Select from the Search Results dropdown section only.
  const searchResultsList = page
    .locator('[role="listbox"]')
    .filter({ hasText: /search results/i })
    .first();

  const dropdownOption = searchResultsList
    .locator('[role="option"]:visible')
    .filter({ hasNotText: /advanced search|show more results|show all results|search for/i })
    .first();
  await expect(dropdownOption).toBeVisible({ timeout: 25_000 });
  await dropdownOption.click();
  await page.waitForTimeout(600);
}

async function updateSubmissionSourceIntermediaryFields(page: Page) {
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(800);

  await setLookupField(page, 'Intermediary Legal Entity', updatedIntermediaryLegalEntity);

  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(500);

  await setLookupField(page, 'Intermediary Contact', 'T-013', true);

  const saveButton = page.getByRole('button', { name: /^Save$/i }).first();
  await expect(saveButton).toBeVisible({ timeout: 30000 });
  await saveButton.click();
  await page.waitForTimeout(10000);
}

test.describe('@regression | E2E | NI Commercial | NB | MTA | Negative Premium Bind Validation', () => {
  test(
    'DT-MLIS-DF25.5.0 | CR-237340 | TC_34_S6_NB>MTA_Negative MTA Premium should not allow Bind_NI commercial_Broker portal',
    async ({ page }) => {
      test.setTimeout(900000);
      test.slow();

      const caseRef = `E2E-NI-COMM-NB-MTA-NEG-${Date.now()}`;

      const brokerLogin = new NiCommercialLoginPage(page);
      const quoteManager = new NiCommercialQuoteManagerPage(page);
      const productSelection = new NiCommercialProductSelectionPage(page);
      const statements = new NiCommercialStatementsOfFactPage(page);
      const quotes = new NiCommercialQuotesPage(page);
      const finalDetails = new NiCommercialFinalPolicyDetailsPage(page);
      const summary = new NiCommercialSummaryPage(page);
      const orderDialog = new NiCommercialOrderDialog(page);
      const policyIssued = new NiCommercialPolicyIssuedPage(page);

      const brokerPortal = new BrokerPortalPage(page);
      const salesforce = new SalesforcePortalPage(page);

      // NB: Create a fresh NI Commercial policy in Broker Portal.
      await brokerLogin.goto();
      const brokerCreds = getBrokerCredentials();
      await brokerLogin.login(brokerCreds.username, brokerCreds.password);
      await quoteManager.expectLoaded();

      await quoteManager.startCommercialNorthernIrelandQuote();
      await productSelection.expectLoaded();
      await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');
      await productSelection.selectProductsByIndex([1]);
      await productSelection.proceed();

      await statements.expectLoaded();
      await statements.confirmAllStatements();
      await statements.proceed();

      await quotes.expectLoaded();
      await quotes.selectFirstQuote();

      await finalDetails.expectLoaded();
      await finalDetails.fillRequiredDetails();
      await finalDetails.proceed();

      await summary.expectLoaded();
      await summary.expectSummaryData(caseRef);
      await summary.proceedToOrder();
      await orderDialog.selectTodayAndOrder();

      await policyIssued.expectPolicyIssued();
      const policyLabel = page.locator('strong', { hasText: 'Policy number' });
      await expect(policyLabel).toBeVisible({ timeout: 60000 });
      const policyNumber = (await policyLabel.locator('xpath=following::p[1]').first().innerText()).trim();
      await policyIssued.backToQuoteManager();

      // Verify policy is live before MTA.
      await brokerPortal.expectQuoteManagerLoaded();
      await brokerPortal.searchPolicy(policyNumber);
      await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

      // Login to Salesforce and open policy record.
      await salesforce.goto();
      const sfCreds = getSalesforceCredentials();
      await salesforce.login(sfCreds.username, sfCreds.password);

      await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
      await salesforce.openRelatedTab();
      await salesforce.openInsurancePolicyFromRelated(policyNumber);

      // NB -> MTA flow (no CNR, no cancellation)
      await salesforce.openCreateMTADialog();
      await salesforce.fillMTAReasonAndSave(
        'Exposure/Limit Changes',
        `MTA Description - negative premium bind validation for ${policyNumber}`,
      );
      await salesforce.fillIntermediaryReference(`MTA-NEG-REF-${Date.now()}`);
      await updateSubmissionSourceIntermediaryFields(page);

      // Enter negative MTA premium and assert Save is not enabled.
      const editPremiumButton = page.getByRole('button', { name: /Edit MTA Premium/i }).first();
      await expect(editPremiumButton).toBeVisible({ timeout: 30000 });
      await editPremiumButton.click();

      const premiumDialog = page.getByRole('dialog', { name: /Edit MTA Premium/i });
      await expect(premiumDialog).toBeVisible({ timeout: 30000 });

      const spinInput = premiumDialog.getByRole('spinbutton', { name: /MTA.*Premium/i }).first();
      const textInput = premiumDialog.getByRole('textbox', { name: /MTA.*Premium/i }).first();
      const numberInput = premiumDialog.locator('input[type="number"]:visible').first();
      const visibleTextInput = premiumDialog.locator('input[type="text"]:visible').first();
      const anyVisibleInput = premiumDialog.locator('input:visible').first();

      let enteredNegativePremium = false;
      for (const input of [spinInput, textInput, numberInput, visibleTextInput, anyVisibleInput]) {
        const isVisible = await input.isVisible({ timeout: 2000 }).catch(() => false);
        if (!isVisible) continue;

        const isEditable = await input.isEditable().catch(() => false);
        if (!isEditable) continue;

        await input.fill('-100');
        await input.press('Tab').catch(() => undefined);
        enteredNegativePremium = true;
        break;
      }

      expect(enteredNegativePremium, 'Could not find editable premium input in Edit MTA Premium dialog.').toBeTruthy();

      const saveButton = premiumDialog.getByRole('button', { name: /Save/i }).first();
      await expect(saveButton).toBeVisible({ timeout: 15000 });

      const saveDisabled = await saveButton.isDisabled().catch(() => false);
      const saveAriaDisabled = (await saveButton.getAttribute('aria-disabled').catch(() => null)) === 'true';

      expect(
        saveDisabled || saveAriaDisabled,
        `Save button is enabled for negative MTA premium (-100) on policy ${policyNumber}.`,
      ).toBeTruthy();

      // Close dialog only if explicit close is available.
      const closeButton = premiumDialog.getByRole('button', { name: /Close|Cancel/i }).first();
      if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeButton.click();
      }
    },
  );
});
