import { test, expect } from '@playwright/test';
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

test.describe('@regression | E2E | MTA', () => {
  test('TC_REG_022 | Create  MTAs CNR and MTA assert premiums on Quotes tab', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-MTA2-${Date.now()}`;

    const mtaPremium1 = '100';
    const mtaPremium2 = '200';

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

    // Create a fresh policy in Broker Portal
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

    // Verify policy is live
    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    // Login to Salesforce Portal
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password);

    // Step 5-6: Global Search → open the exact policy number from the results grid
    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);

    // Navigate to Related tab → open Insurance Policy record
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumber);

    // MTA #1
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Non Material Amendment');
    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
    await salesforce.editMTAPremium(mtaPremium1);
    await salesforce.bindMTA();

    // // Re-open Insurance Policy record for MTA #2
    // await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    // await salesforce.openRelatedTab();
    // await salesforce.openInsurancePolicyFromRelated(policyNumber);

    // // MTA #2
    // await salesforce.openCreateMTADialog();
    // await salesforce.fillMTAReasonAndSave('Non Material Amendment');
    // await salesforce.fillIntermediaryReference(`MTA2-REF-${Date.now()}`);
    // await salesforce.editMTAPremium(mtaPremium2);
    // await salesforce.bindMTA();

    // Start Cancel and Reissue (new flow)
    await salesforce.openCancelAndReissueDialog();
    await salesforce.completeCancelAndReissueDialog({
      reasonForCR: 'User Error Correction',
      description: `Cancel and reissue after MTA test (${policyNumber})`,
    });

    // Required flow change: once on Final policy details, wait, return to submission, then bind MTA.
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

    // Bind from the returned submission in CnR new flow
    await salesforce.bindMTA();

    // Independent step: after CnR, create a 3rd MTA on the same policy.
    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelatedStable(policyNumber);

    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Non Material Amendment');
    await salesforce.fillIntermediaryReference(`MTA3-REF-${Date.now()}`);
    await salesforce.editMTAPremium(mtaPremium2);
    await salesforce.bindMTA();

  });
});

