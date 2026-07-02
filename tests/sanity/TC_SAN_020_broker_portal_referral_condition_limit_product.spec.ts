import { expect, test } from '@playwright/test';
import {
  CommercialLoginPage,
  CommercialQuoteManagerPage,
  CommercialProductSelectionPage,
  CommercialStatementsOfFactPage,
  CommercialReferralDetailsPage,
  CommercialReferralSubmitPage,
  CommercialPolicyIssuedPage,
} from '../../src/pages/mlis-portal-commercial';
import { getBrokerCredentials } from '../../src/config/env';

test.describe('@sanity | E2E | Broker Portal | Conditional Referral', () => {
  test('TC_SAN_020 | Trigger referral when limit exceeds 5M and product is Contaminated Land failed/further action search', async ({ page }) => {
    test.setTimeout(240000);

    const caseRef = `E2E-COND-REF-${Date.now()}`;
    const selectedProductName = "Contaminated Land - 'Failed' or 'Further Action' Environmental Search";
    const limitOfIndemnity = '6000000';

    const loginPage = new CommercialLoginPage(page);
    const quoteManager = new CommercialQuoteManagerPage(page);
    const productSelection = new CommercialProductSelectionPage(page);
    const statements = new CommercialStatementsOfFactPage(page);
    const referralDetails = new CommercialReferralDetailsPage(page);
    const referralSubmit = new CommercialReferralSubmitPage(page);
    const policyIssued = new CommercialPolicyIssuedPage(page);

    const shouldReferralTrigger =
      Number(limitOfIndemnity.replace(/,/g, '')) > 5000000 &&
      /Contaminated\s*Land\s*-\s*'Failed'\s*or\s*'Further\s*Action'\s*Environmental\s*Search/i.test(selectedProductName);

    const selectProductByName = async (name: string) => {
      const filterInput = page.getByRole('textbox', { name: /filter this product list/i }).first();
      if (await filterInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await filterInput.fill(name);
      } else {
        const fallbackFilterInput = page.locator('input[placeholder*="Enter keywords to search for a product" i]').first();
        await expect(fallbackFilterInput).toBeVisible({ timeout: 15000 });
        await fallbackFilterInput.fill(name);
      }

      await page.waitForTimeout(800);

      const productNamePattern = new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
      const productLabel = page.locator('p, span, div').filter({ hasText: productNamePattern }).first();
      await expect(productLabel, `Product row not found for: ${name}`).toBeVisible({ timeout: 30000 });
      await productLabel.scrollIntoViewIfNeeded().catch(() => undefined);

      let selectButton = productLabel
        .locator('xpath=ancestor::*[self::article or self::tr or self::li or self::div][1]')
        .getByRole('button', { name: /^Select$/i })
        .first();

      if (!(await selectButton.isVisible({ timeout: 3000 }).catch(() => false))) {
        selectButton = page
          .locator(`xpath=//*[normalize-space(.)="${name.replace(/"/g, '\\"')}"]/following::button[normalize-space()="Select"][1]`)
          .first();
      }

      await expect(selectButton, `Select button not found for product: ${name}`).toBeVisible({ timeout: 20000 });
      await selectButton.click();

      const removeButton = page.getByRole('button', { name: /^Remove$/i }).first();
      await expect(removeButton).toBeVisible({ timeout: 15000 });
    };

    // 1) Login with valid credentials and verify Quote Manager dashboard loads.
    await loginPage.goto();
    const brokerCreds = getBrokerCredentials();
    await loginPage.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();

    // 2) Start Commercial England & Wales quote and verify Product Selection loads.
    await quoteManager.startCommercialEnglandWalesQuote();
    await productSelection.expectLoaded();

    // 3) Enter case reference and condition limit of indemnity (>5M).
    const caseRefInput = page.getByRole('textbox', { name: 'My case reference/ file number' });
    await caseRefInput.fill(caseRef);
    await caseRefInput.press('Tab');

    const limitInput = page.getByRole('spinbutton', { name: 'Limit of indemnity' });
    await limitInput.fill(limitOfIndemnity);
    await limitInput.press('Tab');
    await expect(limitInput).toHaveValue(/6,000,000\.00|6000000/, { timeout: 10000 });

    // 4) Select the required condition product and proceed to Statements of Fact.
    await selectProductByName(selectedProductName);
    await productSelection.proceed();

    await statements.expectLoaded();

    // Assert condition setup before cloning referral path.
    expect(shouldReferralTrigger).toBe(true);

    // 5) Mark statements as Cannot confirm and proceed with referral.
    await statements.proceedWithReferral();
    await referralDetails.expectLoaded();

    // 6) Fill mandatory referral details.
    await referralDetails.fillRequiredDetails();

    // 7) Move to submit step and verify it loads.
    await referralDetails.submitReferral();
    await referralSubmit.expectLoaded();

    // 8) Submit to underwriter and verify policy is issued with a valid policy number.
    await referralSubmit.submitToUnderwriter();
    await policyIssued.expectPolicyIssued(/^[A-Z]{2,3}-MLI-\d{9}$/);

    // 9) Return to Quote Manager and verify home page is loaded.
    await policyIssued.backToQuoteManager();
    await quoteManager.expectLoaded();
  });
});
