import { expect, test } from '@playwright/test';
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

test.describe('@regression | E2E | Claims', () => {
  test('TC_REG_034 | Create Claim on a live policy and submit mandatory details', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-CLAIM-${Date.now()}`;

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

    // Create fresh policy in Broker Portal.
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

    // Confirm policy is live before Salesforce claim flow.
    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    // Open policy in Salesforce.
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    try {
      await salesforce.login(sfCreds.username, sfCreds.password);
    } catch {
      // Retry once for intermittent Salesforce contentDoor redirect flake.
      await salesforce.goto();
      await salesforce.login(sfCreds.username, sfCreds.password);
    }

    const searchAndOpenPolicyWithRetry = async (ref: string, attempts = 2) => {
      let lastError: unknown;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          await salesforce.searchAndOpenExactFromGlobalSearchGrid(ref);
          await salesforce.openRelatedTab();
          await salesforce.openInsurancePolicyFromRelated(ref);
          return;
        } catch (error) {
          lastError = error;
          if (attempt < attempts) {
            await page.reload({ waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(3000);
          }
        }
      }
      throw lastError;
    };

    await searchAndOpenPolicyWithRetry(policyNumber);

    // Claims flow: Create Claim, select claim coverage, then complete mandatory claim journey.
    await salesforce.openCreateClaimDialog();
    await salesforce.selectClaimCoverage();

    // Continue claim flow: wait claim number, set risk location + save, set dates, final submit.
    await salesforce.completeClaimPostCreationFlowAndAssertIncurred();

    // Keep the page visible briefly for headed verification.
    await page.waitForTimeout(5000);
  });
});
