// spec: tests/mlis-policy-creation.plan.md
// seed: tests/seed.spec.ts

import { expect, test } from '@playwright/test';
import {
  LoginPage,
  QuoteManagerPage,
  ProductSelectionPage,
  StatementsOfFactPage,
} from '../../src/pages/mlis-portal';
import {
  CommercialReferralDetailsPage,
  CommercialReferralSubmitPage,
  CommercialReferralSubmittedPage,
} from '../../src/pages/mlis-portal-commercial';
import { getBrokerCredentials } from '../../src/config/env';

test.describe('@sanity | E2E | Residential | England & Wales', () => {
  test('TC_SAN_021 | Create Residential England & Wales policy via referral with limit greater than 5M', async ({ page }) => {
    test.setTimeout(240000);
    const caseRef = `E2E-RES-REF-LIMITGT5M-${Date.now()}`;

    const loginPage = new LoginPage(page);
    const quoteManager = new QuoteManagerPage(page);
    const productSelection = new ProductSelectionPage(page);
    const statements = new StatementsOfFactPage(page);
    const referralDetails = new CommercialReferralDetailsPage(page);
    const referralSubmit = new CommercialReferralSubmitPage(page);
    const referralSubmitted = new CommercialReferralSubmittedPage(page);

    // 1) Login with valid credentials and verify Quote Manager dashboard loads.
    await loginPage.goto();
    const brokerCreds = getBrokerCredentials();
    await loginPage.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();

    // 2) Start Residential England & Wales quote and verify Product Selection loads.
    await quoteManager.startResidentialEnglandWalesQuote();
    await productSelection.expectLoaded();

    // 3) Enter case reference and limit of indemnity > 5M.
    await productSelection.fillCaseReferenceAndLimit(caseRef, '6000000');

    // 4) Select multiple products and proceed to Statements of Fact.
    await productSelection.selectProductsByIndex([1, 2, 3, 4]);
    await productSelection.proceed();
    await statements.expectLoaded();

    // 5) Mark statements as Cannot confirm and proceed with referral.
    const cannotConfirmButtons = page
      .getByRole('button', { name: /Cannot\s*confirm/i })
      .filter({ hasNotText: /Proceed with referral/i });

    await expect(cannotConfirmButtons.first()).toBeVisible({ timeout: 30000 });
    const count = await cannotConfirmButtons.count();
    for (let i = 0; i < count; i += 1) {
      const button = cannotConfirmButtons.nth(i);
      await button.scrollIntoViewIfNeeded();
      await button.click();
    }

    const proceedWithReferral = page.getByRole('button', { name: /Proceed\s+with\s+ref+err?al/i }).first();
    await expect(proceedWithReferral).toBeVisible({ timeout: 30000 });
    await expect(proceedWithReferral).toBeEnabled({ timeout: 30000 });
    await proceedWithReferral.click();
    await referralDetails.expectLoaded();

    // 6) Fill mandatory referral details.
    await referralDetails.fillRequiredDetails();

    // 7) Move to submit step and verify it loads.
    await referralDetails.submitReferral();
    await referralSubmit.expectLoaded();

    // 8) Submit to underwriter and verify referral submission with valid DA quote number format.
    await referralSubmit.submitToUnderwriter();
    await referralSubmitted.expectLoaded();
    const submittedQuoteNumber = page
      .locator('strong', { hasText: 'Quote number' })
      .locator('xpath=following::p[1]')
      .first();
    await expect(submittedQuoteNumber).toBeVisible({ timeout: 20000 });
    const quoteNumberText = ((await submittedQuoteNumber.textContent()) ?? '').trim();
    expect(quoteNumberText).toMatch(/^DA-MLI-\d{9}$/);

    // 9) Return to Quote Manager and verify home page is loaded.
    await referralSubmitted.backToQuoteManager();
    await quoteManager.expectLoaded();
  });
});
