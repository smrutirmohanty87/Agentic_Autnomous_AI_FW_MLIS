// spec: tests/mlis-policy-creation.plan.md
// seed: tests/seed.spec.ts

import { test } from '@playwright/test';
import {
  CommercialLoginPage,
  CommercialQuoteManagerPage,
  CommercialProductSelectionPage,
  CommercialStatementsOfFactPage,
  CommercialQuotesPage,
  CommercialFinalPolicyDetailsPage,
  CommercialSummaryPage,
  CommercialOrderDialog,
  CommercialPolicyIssuedPage,
} from '../../src/pages/mlis-portal-commercial';
import { getBrokerCredentials } from '../../src/config/env';

test.describe('@sanity | E2E | Commercial | England & Wales', () => {
  test('TC_SAN_003 | Create Commercial England & Wales policy (single product)', async ({ page }) => {
    test.setTimeout(120000);
    const caseRef = `E2E-COMM-${Date.now()}`;

    const loginPage = new CommercialLoginPage(page);
    const quoteManager = new CommercialQuoteManagerPage(page);
    const productSelection = new CommercialProductSelectionPage(page);
    const statements = new CommercialStatementsOfFactPage(page);
    const quotes = new CommercialQuotesPage(page);
    const finalDetails = new CommercialFinalPolicyDetailsPage(page);
    const summary = new CommercialSummaryPage(page);
    const orderDialog = new CommercialOrderDialog(page);
    const policyIssued = new CommercialPolicyIssuedPage(page);

    // 1) Login with valid credentials and accept cookie consent. Verify Quote Manager dashboard loads.
    await loginPage.goto();
    const brokerCreds = getBrokerCredentials();
    await loginPage.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();

    // 2) Click 'England & Wales Start quote' under Commercial. Verify Step 1 Product Selection loads.
    await quoteManager.startCommercialEnglandWalesQuote();
    await productSelection.expectLoaded();

    // 3) Enter case reference and limit of indemnity 500000. Verify fields are populated.
    await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');

    // 4) Select a product and click Proceed. Verify Step 2 Statements of Fact loads.
    await productSelection.selectProductsByIndex([1]);
    await productSelection.proceed();
    await statements.expectLoaded();

    // 5) Confirm all statements of fact and click Proceed. Verify Step 3 Your Quotes loads.
    await statements.confirmAllStatements();
    await statements.proceed();
    await quotes.expectLoaded();

    // 6) Select the first available quote. Verify Step 4 Final Policy Details loads.
    await quotes.selectFirstQuote();
    await finalDetails.expectLoaded();

    // 7) Enter insured name, postcode, address line 1, town/city and click Proceed. Verify Step 5 Summary loads.
    await finalDetails.fillRequiredDetails();
    await finalDetails.proceed();
    await summary.expectLoaded();

    // 8) Verify summary data: case ref, limit £500,000.00, insured name, address, insurer premium.
    await summary.expectSummaryData(caseRef);

    // 9) Click 'Proceed to order', select today's date. Verify 'Order now' button becomes enabled.
    await summary.proceedToOrder();
    await orderDialog.selectTodayAndOrder();

    await policyIssued.expectPolicyIssued();
    await policyIssued.backToQuoteManager();
    await quoteManager.expectLoaded();
  });
});
