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

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function toGbDate(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function parseUiDate(value: string): Date | null {
  const text = value.trim();
  const gb = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (gb) {
    return new Date(Number(gb[3]), Number(gb[2]) - 1, Number(gb[1]));
  }

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

test.describe('@regression | E2E | Cancel and Reissue | MTA', () => {
  test('TC_REG_042 | Cancel and reissue date today then MTA effective date cannot be yesterday', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-CNR-MTA-DATE-${Date.now()}`;

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

    // Verify policy is live before CnR.
    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    // Login to Salesforce and open policy.
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password);

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

    // Cancel and Reissue with today's commencement date.
    await salesforce.openCancelAndReissueDialog();
    await salesforce.completeCancelAndReissueDialog({
      reasonForCR: 'User Error Correction',
      description: `CNR date rule test (${policyNumber})`,
    });

    await salesforce.completeReissueFinalPolicyDetails();
    await salesforce.completeReissueSummary();

    // Match TC_REG_015 behavior: if Summary is still shown after first click, wait and retry once.
    const reissueSummaryHeading = page.getByRole('heading', { name: /summary/i }).first();
    const reissueProceedToOrder = page.getByRole('button', { name: /proceed to order/i }).first();
    if (await reissueSummaryHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.waitForTimeout(4000);
      if (await reissueSummaryHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
        await reissueProceedToOrder.click();
      }
    }

    const todayDate = new Date();
    const todayGb = toGbDate(todayDate);

    const commencementDateInput = page.getByRole('textbox', { name: /commencement date/i }).first();
    const genericDateInput = page.locator('input[placeholder="DD/MM/YYYY"]:visible').first();
    if (await commencementDateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await commencementDateInput.fill(todayGb);
      await page.getByRole('heading', { name: /final policy details/i }).first().click().catch(() => undefined);
    } else if (await genericDateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await genericDateInput.fill(todayGb);
      await page.getByRole('heading', { name: /final policy details/i }).first().click().catch(() => undefined);
    }

    const orderNow = page.getByRole('button', { name: /order now/i }).first();
    if (await orderNow.isVisible({ timeout: 10000 }).catch(() => false)) {
      await orderNow.click();
    }

    const returnToSubmission = page
      .getByRole('button', { name: /Return to submission/i })
      .or(page.getByRole('link', { name: /Return to submission/i }))
      .first();
    const insurancePolicyHeading = page.getByRole('heading', { name: /Insurance Policy/i }).first();

    await expect
      .poll(
        async () => {
          if (await returnToSubmission.isVisible({ timeout: 500 }).catch(() => false)) return 'return';
          if (await insurancePolicyHeading.isVisible({ timeout: 500 }).catch(() => false)) return 'policy';
          return '';
        },
        { timeout: 180000 },
      )
      .not.toBe('');

    if (await returnToSubmission.isVisible({ timeout: 2000 }).catch(() => false)) {
      await salesforce.clickReturnToSubmission();
      await salesforce.openRelatedTab();
      await salesforce.openInsurancePolicyFromRelated(policyNumber);
    } else {
      await expect(insurancePolicyHeading).toBeVisible({ timeout: 120000 });
    }

    // Start MTA after CnR.
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Non Material Amendment', 'MTA Description - mandatory field update');
    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
    await salesforce.editMTAPremium('100');

    const yesterday = new Date(todayDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayGb = toGbDate(yesterday);
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowGb = toGbDate(tomorrow);

    // Try to bind with a date before CnR (invalid). If blocked, retry with current/future date.
    let invalidBindBlocked = false;
    try {
      await salesforce.bindMTA(yesterdayGb);
    } catch {
      invalidBindBlocked = true;
    }

    const bindMTAButton = page.getByRole('button', { name: /Bind MTA/i }).first();
    const editMtaPremiumButton = page.getByRole('button', { name: /Edit MTA Premium/i }).first();
    const bindDialog = page.locator('[role="dialog"]:visible').first();

    const bindStillBlocked =
      (await bindMTAButton.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await editMtaPremiumButton.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await bindDialog.isVisible({ timeout: 3000 }).catch(() => false));

    // If invalid bind is blocked (expected), bind again with current/future valid date.
    if (invalidBindBlocked || bindStillBlocked) {
      try {
        await salesforce.bindMTA(todayGb);
      } catch {
        await salesforce.bindMTA(tomorrowGb);
      }
    }

    // After successful current/future bind, wait for the next page/state to settle before asserting.
    await expect
      .poll(
        async () => {
          const createMtaVisible = await page.getByRole('button', { name: /Create MTA/i }).first().isVisible().catch(() => false);
          const statusLabelVisible = await page.locator('p:visible').filter({ hasText: /^New\/MTA\/Renewal$/ }).first().isVisible().catch(() => false);
          const insurancePolicyHeadingVisible = await page
            .getByRole('heading', { name: /Insurance Policy/i })
            .first()
            .isVisible()
            .catch(() => false);
          return createMtaVisible || statusLabelVisible || insurancePolicyHeadingVisible;
        },
        { timeout: 180000 },
      )
      .toBeTruthy();

    const mtaStatusValue = page
      .locator('p:visible')
      .filter({ hasText: /^New\/MTA\/Renewal$/ })
      .first()
      .locator('xpath=following-sibling::p[1]')
      .first();
    await expect(mtaStatusValue).toBeVisible({ timeout: 120000 });
    await expect(mtaStatusValue).toContainText(/MTA/i);

    const effectiveDateValue = page
      .locator('p:visible')
      .filter({ hasText: /^Effective Date$/ })
      .first()
      .locator('xpath=following-sibling::p[1]')
      .first();
    await expect(effectiveDateValue).toBeVisible({ timeout: 120000 });

    const effectiveDateText = (await effectiveDateValue.innerText()).trim();
    const effectiveDate = parseUiDate(effectiveDateText);
    expect(effectiveDate, `Unable to parse Effective Date from UI value: ${effectiveDateText}`).not.toBeNull();

    if (effectiveDate) {
      expect(effectiveDate.getTime()).toBeGreaterThanOrEqual(todayDate.setHours(0, 0, 0, 0));
      expect(effectiveDate.getTime()).not.toBe(yesterday.setHours(0, 0, 0, 0));
    }
  });
});