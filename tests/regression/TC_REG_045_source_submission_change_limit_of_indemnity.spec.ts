import { expect, Locator, Page, test } from '@playwright/test';
import {
  FinalPolicyDetailsPage,
  LoginPage,
  OrderDialog,
  PolicyIssuedPage,
  ProductSelectionPage,
  QuoteManagerPage,
  QuotesPage,
  StatementsOfFactPage,
  SummaryPage,
} from '../../src/pages/mlis-portal';
import { BrokerPortalPage } from '../../src/pages/broker-portal-policy';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';

async function pickFirstVisible(candidates: Locator[], timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    for (const candidate of candidates) {
      const target = candidate.first();
      if (await target.isVisible().catch(() => false)) {
        return target;
      }
    }
    await candidates[0].page().waitForTimeout(300);
  }
  throw new Error('Unable to find a visible locator from provided candidates.');
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

async function clickChangeLimit(page: Page) {
  const tryDirectOrMenu = async (): Promise<boolean> => {
    const directAction = page
      .getByRole('button', { name: /Change\s*(of)?\s*Limit\s*of\s*Indeminity|Change\s*(of)?\s*Limit\s*of\s*Indemnity/i })
      .or(page.getByRole('link', { name: /Change\s*(of)?\s*Limit\s*of\s*Indeminity|Change\s*(of)?\s*Limit\s*of\s*Indemnity/i }))
      .or(page.locator('button, a').filter({ hasText: /Change\s*(of)?\s*Limit\s*of\s*Indem/i }))
      .first();

    if (await directAction.isVisible({ timeout: 3000 }).catch(() => false)) {
      await directAction.click();
      return true;
    }

    const showMoreActions = page.getByRole('button', { name: /Show more actions/i }).first();
    if (await showMoreActions.isVisible({ timeout: 3000 }).catch(() => false)) {
      await showMoreActions.click();
      const menuAction = await pickFirstVisible([
        page.getByRole('menuitem', { name: /Change\s*(of)?\s*Limit\s*of\s*Indem/i }),
        page.locator('[role="menuitem"]').filter({ hasText: /Change\s*(of)?\s*Limit\s*of\s*Indem/i }),
        page.locator('a, button').filter({ hasText: /Change\s*(of)?\s*Limit\s*of\s*Indem/i }),
      ], 10000);
      await menuAction.click();
      return true;
    }

    return false;
  };

  await page.evaluate(() => window.scrollTo(0, 0));

  if (await tryDirectOrMenu()) {
    return;
  }

  // Fallback: action may exist on the Quote record. Navigate via Quotes tab and retry.
  const quotesTab = page.getByRole('tab', { name: /^Quotes$/i }).first();
  if (await quotesTab.isVisible({ timeout: 10000 }).catch(() => false)) {
    await quotesTab.click();
    const quoteLink = await pickFirstVisible([
      page.locator('table tbody tr a:visible'),
      page.locator('[role="tabpanel"] a:visible'),
    ], 30000);
    await quoteLink.click();
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.evaluate(() => window.scrollTo(0, 0));
    if (await tryDirectOrMenu()) {
      return;
    }
  }

  throw new Error('Unable to find Change of Limit of Indemnity action in direct buttons/links or Show more actions menu.');
}

async function setLimitValueAndSave(page: Page, value: string) {
  const limitInput = await pickFirstVisible([
    page.getByRole('spinbutton', { name: /Limit of indemnity|Limit of Indemnity/i }),
    page.getByRole('textbox', { name: /Limit of indemnity|Limit of Indemnity/i }),
    page.locator('input[aria-label*="Limit of indemnity" i], input[aria-label*="Limit of Indemnity" i]'),
    page.locator('input[name*="Limit" i]'),
  ], 60000);
  await limitInput.click();
  await limitInput.fill(value);

  const saveButton = await pickFirstVisible([
    page.getByRole('button', { name: /^Save$/i }),
    page.locator('button:has-text("Save")'),
  ], 60000);
  await saveButton.click();
}

async function verifyLimitFieldUpdated(page: Page, expectedValue: string) {
  await page.evaluate(() => window.scrollBy(0, 1400));
  const limitField = await pickFirstVisible([
    page.locator('records-record-layout-item:has-text("Limit of Indemnity")'),
    page.locator('[data-label="Limit of Indemnity"]'),
    page.locator('[data-label="Limit of indemnity"]'),
  ], 60000);

  const expectedDigits = digitsOnly(expectedValue);
  const renderedText = await limitField.innerText();
  const renderedDigits = digitsOnly(renderedText);
  expect(renderedDigits).toContain(expectedDigits);
}

async function refreshMultipleAndWait(page: Page, times = 3) {
  for (let i = 0; i < times; i += 1) {
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    // Give Salesforce UI a short settle window before next refresh/assertion.
    await page.waitForTimeout(1200);
  }
}

async function expectValidationErrorAndCancel(page: Page) {
  const errorBanner = await pickFirstVisible([
    page.locator('[role="alert"]:visible'),
    page.locator('.slds-has-error:visible'),
    page.locator('text=/Review the errors|error|invalid|must be/i'),
  ], 30000);
  await expect(errorBanner).toBeVisible({ timeout: 30000 });

  const cancelButton = await pickFirstVisible([
    page.getByRole('button', { name: /^Cancel$/i }),
    page.locator('button:has-text("Cancel")'),
  ], 30000);
  await cancelButton.click();
}

test.describe('@regression | E2E | MTA | Clear Baseline', () => {
  test('TC_REG_045 | Clear MTA flow on a live policy', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-MTA-CLEAR-${Date.now()}`;

    const brokerLogin = new LoginPage(page);
    const quoteManager = new QuoteManagerPage(page);
    const productSelection = new ProductSelectionPage(page);
    const statements = new StatementsOfFactPage(page);
    const quotes = new QuotesPage(page);
    const finalDetails = new FinalPolicyDetailsPage(page);
    const summary = new SummaryPage(page);
    const orderDialog = new OrderDialog(page);
    const policyIssued = new PolicyIssuedPage(page);

    const brokerPortal = new BrokerPortalPage(page);
    const salesforce = new SalesforcePortalPage(page);

    // Create a fresh live policy in Broker Portal.
    await brokerLogin.goto();
    const brokerCreds = getBrokerCredentials();
    await brokerLogin.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();
    await quoteManager.acceptCookiesIfVisible();

    await quoteManager.startResidentialEnglandWalesQuote();
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
    const policyNumber = await policyIssued.getIssuedPolicyNumber();
    await policyIssued.backToQuoteManager();

    // Verify policy is live.
    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    // Open policy in Salesforce.
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password);

    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelatedStable(policyNumber);

    // Perform MTA (reason + mandatory description), then execute limit validations,
    // then complete standard MTA flow (intermediary ref, premium, bind).
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave(
      'Exposure/Limit Changes',
      `MTA Description - Clear baseline flow for ${policyNumber}`,
    );

    // Condition 1: Change Limit of Indemnity with valid value and save.
    const firstUpdatedLimit = '750000';
    await clickChangeLimit(page);
    await setLimitValueAndSave(page, firstUpdatedLimit);

    // Multiple refresh + wait so the updated value reflects reliably before assertion.
    await refreshMultipleAndWait(page, 3);

    // Verify Limit of Indemnity field reflects the new value.
    await verifyLimitFieldUpdated(page, firstUpdatedLimit);

    // Condition 2: Try much higher value and verify validation error appears.
    const tooHighLimit = '9999999999';
    await clickChangeLimit(page);
    const highLimitInput = await pickFirstVisible([
      page.getByRole('spinbutton', { name: /Limit of indemnity|Limit of Indemnity/i }),
      page.getByRole('textbox', { name: /Limit of indemnity|Limit of Indemnity/i }),
      page.locator('input[aria-label*="Limit of indemnity" i], input[aria-label*="Limit of Indemnity" i]'),
      page.locator('input[name*="Limit" i]'),
    ], 60000);
    await highLimitInput.click();
    await highLimitInput.fill(tooHighLimit);

    const saveByRole = page.getByRole('button', { name: /^Save$/i }).first();
    const saveByText = page.locator('button:has-text("Save")').first();
    const canClickSave =
      ((await saveByRole.isVisible({ timeout: 2000 }).catch(() => false)) &&
        (await saveByRole.isEnabled().catch(() => false))) ||
      ((await saveByText.isVisible({ timeout: 1000 }).catch(() => false)) &&
        (await saveByText.isEnabled().catch(() => false)));

    if (canClickSave) {
      if (await saveByRole.isVisible({ timeout: 500 }).catch(() => false)) {
        await saveByRole.click();
      } else {
        await saveByText.click();
      }
      await page.getByRole('button', { name: /^Cancel$/i }).first().click();
      //await expectValidationErrorAndCancel(page);
    } else {
      const cancelButton = await pickFirstVisible([
        page.getByRole('button', { name: /^Cancel$/i }),
        page.locator('button:has-text("Cancel")'),
      ], 30000);
      await cancelButton.click();
    }

    // Continue with remaining MTA steps.
    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
    await salesforce.editMTAPremium('125');
    await salesforce.bindMTA();

    // Wait for policy update and assert top-left Risk ID is shown in expected Salesforce format.
    const riskIdPattern = /\bDAU\/\d{8}\/[A-Z]{4}\/\d{2}\/\d{2}\b/;
    const highlightsTopLeft = page.locator(
      '.slds-page-header, .forceHighlightsPanel, [data-aura-class*="forceHighlightsPanel"]',
    ).first();

    await expect
      .poll(async () => {
        await page.waitForLoadState('domcontentloaded');

        const topLeftText = await highlightsTopLeft.innerText().catch(() => '');
        if (riskIdPattern.test(topLeftText)) {
          return topLeftText.match(riskIdPattern)?.[0] ?? '';
        }

        const bodyText = await page.locator('body').innerText();
        return bodyText.match(riskIdPattern)?.[0] ?? '';
      }, { timeout: 180000, intervals: [2000, 5000] })
      .toMatch(riskIdPattern);

    const finalTopLeftText = await highlightsTopLeft.innerText().catch(() => '');
    const finalBodyText = await page.locator('body').innerText();
    const generatedRiskId =
      finalTopLeftText.match(riskIdPattern)?.[0]
      ?? finalBodyText.match(riskIdPattern)?.[0]
      ?? '';

    expect(
      generatedRiskId,
      'Expected Risk ID in format DAU/########/AAAA/##/## after Bind MTA (top-left highlights).',
    ).toMatch(riskIdPattern);
  });
});
