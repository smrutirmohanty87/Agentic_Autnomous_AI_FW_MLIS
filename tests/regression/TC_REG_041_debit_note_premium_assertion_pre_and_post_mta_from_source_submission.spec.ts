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

function parseMoney(value: string): number {
  const normalized = value.replace(/[^\d.-]/g, '');
  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) {
    throw new Error(`Unable to parse money value: ${value}`);
  }
  return parsed;
}

async function openAndCloseDebitNote(page: Page): Promise<void> {
  const previewWaitMs = 2500;
  const debitNoteRow = page.locator('table tbody tr:visible').filter({ hasText: /Debit\s*Note/i }).first();
  await expect(debitNoteRow).toBeVisible({ timeout: 120000 });

  const debitNoteLink = debitNoteRow
    .locator('th[scope="row"] a:visible, td[data-label] a:visible, td a:visible')
    .first();
  await expect(debitNoteLink).toBeVisible({ timeout: 30000 });

  const popupPromise = page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
  const previousUrl = page.url();
  await debitNoteLink.click();

  const popup = await popupPromise;
  if (popup) {
    await popup.waitForLoadState('domcontentloaded');
    await popup.waitForTimeout(previewWaitMs);
    await popup.close();
    return;
  }

  await page.waitForTimeout(1500);

  const closeButton = page
    .locator('[role="dialog"] button:has-text("Close"), [role="dialog"] button[title*="Close"], [role="dialog"] button.slds-button_icon')
    .first();

  if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.waitForTimeout(previewWaitMs);
    await closeButton.click();
  } else if (page.url() !== previousUrl) {
    await page.waitForTimeout(previewWaitMs);
    await page.goBack().catch(() => undefined);
  } else {
    await page.waitForTimeout(previewWaitMs);
    await page.keyboard.press('Escape').catch(() => undefined);
  }
}

test.describe('@regression | E2E | Notes & Attachments | MTA | Source Submission', () => {
  test('TC_REG_041 | Assert Debit Note premium before and after MTA from Source Submission', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-DEBIT-MTA-${Date.now()}`;
    const mtaPremium = '125';

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

    // Create new policy in Broker Portal.
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

    // Notes & Attachments -> open and close Debit Note.
    await salesforce.openNotesAndAttachmentsFromRelatedTab();
    await openAndCloseDebitNote(page);

    // Open Insurance Policy and perform MTA.
    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelatedStable(policyNumber);

    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Non Material Amendment', 'MTA Description - mandatory field update');
    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
    await salesforce.editMTAPremium(mtaPremium);
    await salesforce.bindMTA();

    // Details tab -> Source Submission Name -> open policy/submission link.
    const detailsTab = page.getByRole('tab', { name: /^Details$/i }).first();
    await expect(detailsTab).toBeVisible({ timeout: 120000 });
    await detailsTab.click();
    await page.evaluate(() => window.scrollBy(0, 1200));

    const sourceSubmissionLink = await pickFirstVisible([
      page
        .locator('records-record-layout-item:has-text("Source Submission Name") a:visible')
        .filter({ hasText: /DA-MLI-|CP-MLI-|Sub-/i }),
      page
        .locator('[data-label="Source Submission Name"] a:visible')
        .filter({ hasText: /DA-MLI-|CP-MLI-|Sub-/i }),
      page.locator('records-record-layout-item:has-text("Source Submission Name") a:visible').first(),
      page.locator('[data-label="Source Submission Name"] a:visible').first(),
    ], 120000);

    await sourceSubmissionLink.click();
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);

    // From Source Submission -> Related -> Notes & Attachments -> open and close Debit Note again.
    await salesforce.openRelatedTab();
    await salesforce.openNotesAndAttachmentsFromRelatedTab();
    await openAndCloseDebitNote(page);
  });
});