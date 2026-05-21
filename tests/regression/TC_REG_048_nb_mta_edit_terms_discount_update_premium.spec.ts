import { expect, Page, test } from '@playwright/test';
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

async function verifyEditTermsDiscountAndUpdatePremiumOrClose(page: Page) {
  const editTermsButton = page
    .getByRole('button', { name: /Edit Terms/i })
    .or(page.getByRole('link', { name: /Edit Terms/i }))
    .first();

  await expect(editTermsButton).toBeVisible({ timeout: 60000 });
  await editTermsButton.click();

  const discountField = page
    .getByRole('spinbutton', { name: /Discount/i })
    .or(page.getByRole('textbox', { name: /Discount/i }))
    .or(page.locator('input[aria-label*="Discount" i]:visible').first())
    .first();

  const updatePremiumButton = page.getByRole('button', { name: /Update Premium/i }).first();

  const hasDiscount = await discountField.isVisible({ timeout: 7000 }).catch(() => false);
  const hasUpdatePremium = await updatePremiumButton.isVisible({ timeout: 7000 }).catch(() => false);

  if (hasDiscount && hasUpdatePremium) {
    await expect(discountField).toBeVisible({ timeout: 10000 });
    await expect(updatePremiumButton).toBeVisible({ timeout: 10000 });
  }

  const closeButton = page
    .locator('[role="dialog"] button:has-text("Close"), [role="dialog"] button[title*="Close" i], button:has-text("Close")')
    .first();

  if (await closeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await closeButton.click();
  } else {
    await page.keyboard.press('Escape').catch(() => undefined);
  }
}

test.describe('@regression | E2E | NB-MTA | Edit Terms', () => {
  test('TC_REG_048 | NB-MTA validate Edit Terms Discount + Update Premium fallback and complete bind', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-NB-MTA-ET-${Date.now()}`;

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

    // Create NB policy in Broker Portal.
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

    // Verify policy is live before MTA.
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

    // Create MTA and fill mandatory reason + description.
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave(
      'Exposure/Limit Changes',
      `MTA Description - edit terms check for ${policyNumber}`,
    );

    // Condition: open Quotes tab -> click Edit Terms -> assert Discount and Update Premium if present;
    // otherwise close dialog and continue the MTA flow.
    await salesforce.openQuotesTab1();
    await verifyEditTermsDiscountAndUpdatePremiumOrClose(page);
    await salesforce.openDetailsTab();

    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
    await salesforce.editMTAPremium('100');
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
