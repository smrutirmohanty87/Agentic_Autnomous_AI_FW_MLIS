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

function logStep(step: string, details: string) {
  // Consistent test logs to identify where a flow issue occurs.
  console.log(`[TC_REG_043][${step}] ${details}`);
}

async function setStatusReasonInternalReferral(page: Page) {
  logStep('STATUS-REASON', 'Open Status Reason edit and select Internal referral');

  const editStatusReasonButton = page
    .getByRole('button', { name: /Edit Status Reason/i })
    .or(page.getByRole('button', { name: /Edit.*Status Reason/i }))
    .first();

  await expect(editStatusReasonButton).toBeVisible({ timeout: 60000 });
  await editStatusReasonButton.click();

  const statusReasonCombobox = page.getByRole('combobox', { name: /Status Reason/i }).first();
  await expect(statusReasonCombobox).toBeVisible({ timeout: 30000 });
  await statusReasonCombobox.click();

  const internalReferralOption = page.getByRole('option', { name: /Internal referral/i }).first();
  await expect(internalReferralOption).toBeVisible({ timeout: 15000 });
  await internalReferralOption.click();

  const saveButton = page.getByRole('button', { name: /^Save$/i }).first();
  await expect(saveButton).toBeVisible({ timeout: 15000 });
  await saveButton.click();
  await page.waitForTimeout(1500);

  logStep('STATUS-REASON', 'Status Reason updated to Internal referral');
}

async function verifyNoDocumentsInNotesAndAttachments(salesforce: SalesforcePortalPage, page: Page, context: string) {
  logStep('NOTES-CHECK', `${context}: open Notes & Attachments and verify no documents`);

  await salesforce.openRelatedTab();
  await salesforce.openNotesAndAttachmentsFromRelatedTab();

  const rows = page.locator('table tbody tr');
  const noRecordsMessage = page.getByText(/No records to display|No records found|No data available/i).first();

  await expect
    .poll(
      async () => {
        if (await noRecordsMessage.isVisible({ timeout: 500 }).catch(() => false)) return 0;
        return rows.count();
      },
      { timeout: 60000 },
    )
    .toBe(0);

  logStep('NOTES-CHECK', `${context}: verified Notes & Attachments contains no documents`);
}

test.describe('@regression | E2E | MTA | Cancel and Reissue', () => {
  test('TC_REG_043 | Create MTA then Cancel and Reissue then Create MTA', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();
    logStep('START', 'Begin MTA -> CNR (new flow) -> MTA scenario');

    const caseRef = `E2E-MTA-CNR-MTA-${Date.now()}`;

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

    // Create a fresh policy in Broker Portal.
    logStep('NB-01', 'Login to Broker Portal and start new quote');
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
    logStep('NB-02', 'Order completed for newly created policy');

    await policyIssued.expectPolicyIssued();
    const policyNumber = await policyIssued.getIssuedPolicyNumber();
    logStep('NB-03', `Policy created: ${policyNumber}`);
    await policyIssued.backToQuoteManager();

    // Verify policy is live.
    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');
    logStep('NB-04', 'Policy status verified as Live in Broker Portal');

    // Login to Salesforce.
    logStep('SF-01', 'Login to Salesforce and open policy');
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password);

    // Global Search -> open exact policy.
    let openedFromSearch = false;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
        openedFromSearch = true;
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);
      }
    }
    expect(openedFromSearch).toBeTruthy();

    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumber);
    logStep('SF-02', 'Insurance Policy record opened from Related tab');

    // MTA #1
    logStep('MTA1-01', 'Open Create MTA dialog');
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Non Material Amendment');

    logStep('MTA1-02', 'Set Status Reason to Internal referral before intermediary reference');
    await setStatusReasonInternalReferral(page);

    logStep('MTA1-03', 'Fill intermediary reference, edit premium, bind MTA #1');
    await salesforce.fillIntermediaryReference(`MTA1-REF-${Date.now()}`);
    await salesforce.editMTAPremium('100');
    await salesforce.bindMTA();
    logStep('MTA1-04', 'MTA #1 bind completed');

    //await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    await salesforce.openRelatedTab();
    await verifyNoDocumentsInNotesAndAttachments(salesforce, page, 'After MTA #1 completion');

    // Start Cancel and Reissue.
    logStep('CNR-01', 'Open Cancel and Reissue dialog and submit details');
    //await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    // await salesforce.openRelatedTab();
    // await salesforce.openInsurancePolicyFromRelatedStable(policyNumber);
    await salesforce.openCancelAndReissueDialog();
    await salesforce.completeCancelAndReissueDialog({
      reasonForCR: 'User Error Correction',
      description: `CNR after MTA test (${policyNumber})`,
    });

    // MTA-CNR flow is always the new flow:
    // on Quote Journey / Final policy details, return to submission, then bind.
    await expect(page.getByRole('heading', { name: /Quote Journey/i })).toBeVisible({ timeout: 120000 });
    await expect(page.getByRole('heading', { name: /Final policy details/i })).toBeVisible({ timeout: 120000 });
    await page.waitForTimeout(5000);

    const returnToSubmission = page
      .getByRole('button', { name: /Return to submission/i })
      .or(page.getByRole('link', { name: /Return to submission/i }))
      .first();
    await expect(returnToSubmission).toBeVisible({ timeout: 60000 });
    await returnToSubmission.click();
    await page.waitForTimeout(5000);

    logStep('CNR-02', 'Bind from returned submission (new flow)');
    await salesforce.bindMTA();
    logStep('CNR-03', 'CNR bind completed');

    // Open policy again after CnR, then run MTA #2.
    logStep('MTA2-01', 'Re-open policy and start MTA #2 (same flow as MTA #1)');
    // await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    // await salesforce.openRelatedTab();
    // await salesforce.openInsurancePolicyFromRelatedStable(policyNumber);

    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Non Material Amendment');

    logStep('MTA2-02', 'Set Status Reason to Internal referral before intermediary reference');
    await setStatusReasonInternalReferral(page);

    logStep('MTA2-03', 'Fill intermediary reference, edit premium, bind MTA #2');
    await salesforce.fillIntermediaryReference(`MTA2-REF-${Date.now()}`);
    await salesforce.editMTAPremium('100');
    await salesforce.bindMTA();
    logStep('MTA2-04', 'MTA #2 bind completed');

    logStep('END', 'Flow completed: MTA #1 -> Notes check -> CNR -> MTA #2 (same as MTA #1)');
  });
});
