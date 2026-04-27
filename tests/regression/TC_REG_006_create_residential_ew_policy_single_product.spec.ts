// spec: tests/mlis-policy-creation.plan.md
// seed: tests/seed.spec.ts

import { test } from '@playwright/test';
import {
  LoginPage,
  QuoteManagerPage,
  ProductSelectionPage,
  StatementsOfFactPage,
  QuotesPage,
  FinalPolicyDetailsPage,
  SummaryPage,
  OrderDialog,
  PolicyIssuedPage,
} from '../../src/pages/mlis-portal';
import { getBrokerCredentials } from '../../src/config/env';

test.describe('@regression | E2E | Residential | England & Wales', () => {
  test('TC_REG_006 | Create Residential England & Wales policy (single product)', async ({ page }) => {
    test.setTimeout(120000);
    const caseRef = `E2E-SINGLE-${Date.now()}`;

    const loginPage = new LoginPage(page);
    const quoteManager = new QuoteManagerPage(page);
    const productSelection = new ProductSelectionPage(page);
    const statements = new StatementsOfFactPage(page);
    const quotes = new QuotesPage(page);
    const finalDetails = new FinalPolicyDetailsPage(page);
    const summary = new SummaryPage(page);
    const orderDialog = new OrderDialog(page);
    const policyIssued = new PolicyIssuedPage(page);

    // 1) Login with valid credentials and accept cookie consent. Verify Quote Manager dashboard loads.
    await loginPage.goto();
    const brokerCreds = getBrokerCredentials();
    await loginPage.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();
    await quoteManager.acceptCookiesIfVisible();

    // 2) Click 'England & Wales Start quote' under Residential. Verify Step 1 Product Selection loads.
    await quoteManager.startResidentialEnglandWalesQuote();
    await productSelection.expectLoaded();

    // 3) Enter case reference 'E2E-SINGLE-{timestamp}' and limit of indemnity 500000. Verify fields are populated.
    await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');

    // 4) Select product 'Absence of easement - Access (Pedestrian & Vehicular)' and click Proceed. Verify Step 2 Statements of Fact loads.
    await productSelection.selectProductsByIndex([1]);
    await productSelection.proceed();
    await statements.expectLoaded();

    // 5) Confirm all statements of fact and click Proceed. Verify Step 3 Your Quotes loads with multiple insurer quotes.
    await statements.confirmAllStatements();
    await statements.proceed();
    await quotes.expectLoaded();

    // 6) Select the first available quote. Verify Step 4 Final Policy Details loads.
    await quotes.selectFirstQuote();
    await finalDetails.expectLoaded();

    // 7) Enter insured name 'E2E Test Client', postcode 'EC3A 2BJ', address line 1 '52-54 Leadenhall Street', town/city 'London' and click Proceed. Verify Step 5 Summary loads.
    await finalDetails.fillRequiredDetails();
    await finalDetails.proceed();
    await summary.expectLoaded();

    // 8) Verify summary data: case ref, limit £500,000.00, insured name, address, insurer premium.
    await summary.expectSummaryData(caseRef);

    // 9) Click 'Proceed to order', select today's date from calendar. Verify 'Order now' button becomes enabled.
    await summary.proceedToOrder();
    await orderDialog.selectTodayAndOrder();

    await policyIssued.expectPolicyIssued();
    await policyIssued.backToQuoteManager();
    await quoteManager.expectLoaded();
  });
});