// spec: tests/mlis-policy-creation.plan.md
// seed: tests/seed.spec.ts

import { test } from '@playwright/test';
import {
  CommercialLoginPage,
  CommercialQuoteManagerPage,
  CommercialProductSelectionPage,
  CommercialStatementsOfFactPage,
  CommercialReferralDetailsPage,
  CommercialReferralSubmitPage,
  CommercialReferralSubmittedPage,
} from '../../src/pages/mlis-portal-commercial';
import { getBrokerCredentials } from '../../src/config/env';

test.describe('@sanity | E2E | Commercial | England & Wales', () => {
  test('TC_SAN_004 | Create Commercial England & Wales policy (single product) via referral', async ({ page }) => {
    test.setTimeout(180000);
    const caseRef = `E2E-COMM-REF-${Date.now()}`;

    const loginPage = new CommercialLoginPage(page);
    const quoteManager = new CommercialQuoteManagerPage(page);
    const productSelection = new CommercialProductSelectionPage(page);
    const statements = new CommercialStatementsOfFactPage(page);
    const referralDetails = new CommercialReferralDetailsPage(page);
    const referralSubmit = new CommercialReferralSubmitPage(page);
    const referralSubmitted = new CommercialReferralSubmittedPage(page);

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

    // 4) Select a single product and click Proceed. Verify Step 2 Statements of Fact loads.
    await productSelection.selectProductsByIndex([1]);
    await productSelection.proceed();
    await statements.expectLoaded();

    // 5) Do not confirm all statements. Mark all as Cannot confirm and proceed with referral.
    await statements.proceedWithReferral();
    await referralDetails.expectLoaded();

    // 6) Fill mandatory referral details.
    await referralDetails.fillRequiredDetails();

    // 7) Move to submit step and verify it loads.
    await referralDetails.submitReferral();
    await referralSubmit.expectLoaded();

    // 8) Submit to underwriter and verify referral submitted page.
    await referralSubmit.submitToUnderwriter();
    await referralSubmitted.expectLoaded();

    // 9) Return to Quote Manager and assert home page is loaded.
    await referralSubmitted.backToQuoteManager();
    await quoteManager.expectLoaded();
  });
});
