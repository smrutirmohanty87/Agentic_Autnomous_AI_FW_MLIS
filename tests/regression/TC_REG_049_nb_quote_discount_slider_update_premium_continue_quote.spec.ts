import { expect, Locator, Page, test } from '@playwright/test';
import {
  FinalPolicyDetailsPage,
  LoginPage,
  OrderDialog,
  ProductSelectionPage,
  QuoteManagerPage,
  QuotesPage,
  StatementsOfFactPage,
  SummaryPage,
} from '../../src/pages/mlis-portal';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { getBrokerCredentials, getDefaultUwCredentials } from '../../src/config/env';

async function firstVisible(candidates: Locator[]): Promise<Locator | null> {
  for (const candidate of candidates) {
    if (await candidate.isVisible({ timeout: 2000 }).catch(() => false)) {
      return candidate;
    }
  }
  return null;
}

async function adjustDiscountAndContinueQuote(page: Page) {
  const slider = await firstVisible([
    page.getByRole('slider', { name: /Discount/i }).first(),
    page.locator('input[type="range"][aria-label*="Discount" i]:visible').first(),
    page.locator('input[type="range"]:visible').first(),
    page.locator('[role="slider"][aria-label*="Discount" i]:visible').first(),
  ]);

  if (!slider) {
    throw new Error('Discount slider was not found on Quotes tab.');
  }

  const sliderTag = await slider
    .evaluate((el) => el.tagName.toLowerCase())
    .catch(() => '');

  if (sliderTag === 'input') {
    await slider.evaluate((el) => {
      const input = el as HTMLInputElement;
      const min = Number(input.min || '0');
      const max = Number(input.max || '100');
      const current = Number(input.value || '0');
      let next = current < 10 ? 10 : current + 1;
      if (next > max) next = max;
      if (next < min) next = min;
      input.value = String(next);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const currentValue = await slider
      .evaluate((el) => Number((el as HTMLInputElement).value || '0'))
      .catch(() => 0);
    expect(currentValue).toBeGreaterThanOrEqual(10);
  } else {
    await slider.click();
    for (let i = 0; i < 100; i += 1) {
      await page.keyboard.press('ArrowRight').catch(() => undefined);
    }

    const ariaValueNow = await slider.getAttribute('aria-valuenow').catch(() => null);
    if (ariaValueNow) {
      expect(Number(ariaValueNow)).toBeGreaterThanOrEqual(10);
    }
  }

  const updatePremiumButton = page.getByRole('button', { name: /Update Premium/i }).first();
  await expect(updatePremiumButton).toBeVisible({ timeout: 60000 });
  await updatePremiumButton.click();

  const continueQuoteButton = page
    .getByRole('button', { name: /Continue Quote/i })
    .or(page.getByRole('link', { name: /Continue Quote/i }))
    .first();
  await expect(continueQuoteButton).toBeVisible({ timeout: 60000 });
  await continueQuoteButton.click();
}

async function completeQuoteJourneyAfterContinue(
  page: Page,
  quotes: QuotesPage,
  finalDetails: FinalPolicyDetailsPage,
  summary: SummaryPage,
  orderDialog: OrderDialog,
  salesforce: SalesforcePortalPage,
) {
  await page.waitForLoadState('domcontentloaded');

  await quotes.expectLoaded();
  await quotes.selectFirstQuote();

  await finalDetails.expectLoaded();
  await finalDetails.fillRequiredDetails();
  await finalDetails.proceed();

  await summary.expectLoaded();
  await summary.proceedToOrder();
  await orderDialog.selectTodayAndOrder();

  await salesforce.clickReturnToSubmission();
}

async function clickSaveAndExitFromQuotes(page: Page) {
  const saveAndExit = page
    .getByRole('button', { name: /Save\s*(?:&|and)\s*Exit/i })
    .or(page.getByRole('link', { name: /Save\s*(?:&|and)\s*Exit/i }))
    .first();

  await expect(saveAndExit).toBeVisible({ timeout: 60000 });
  await saveAndExit.click();
}

async function searchQuoteManagerByReference(page: Page, reference: string) {
  const searchAllFields = page.getByRole('textbox', { name: /Search all fields/i }).first();
  await expect(searchAllFields).toBeVisible({ timeout: 60000 });
  await searchAllFields.fill(reference);

  const searchButton = page
    .getByRole('link', { name: /^Search$/i })
    .or(page.getByRole('button', { name: /^Search$/i }))
    .first();
  await expect(searchButton).toBeVisible({ timeout: 15000 });
  await searchButton.click();

  const matchingRow = page.locator('table tbody tr').filter({ hasText: reference }).first();
  await expect(matchingRow).toBeVisible({ timeout: 60000 });
}

async function getGridMliReference(page: Page, caseReference: string) {
  const matchingRow = page.locator('table tbody tr').filter({ hasText: caseReference }).first();
  await expect(matchingRow).toBeVisible({ timeout: 60000 });

  const rowText = (await matchingRow.innerText()).replace(/\s+/g, ' ');
  const referenceMatch = rowText.match(/(?:DA|CP)-MLI-\d{9}/i);

  if (!referenceMatch) {
    throw new Error(`Unable to extract broker reference from Quote Manager row for case ref: ${caseReference}`);
  }

  return referenceMatch[0];
}

async function searchSalesforceWithFallback(salesforce: SalesforcePortalPage, primaryReference: string, fallbackReference: string) {
  const references = [primaryReference, fallbackReference];

  for (const reference of references) {
    try {
      await salesforce.searchAndOpenExactFromGlobalSearchGrid(reference);
      return;
    } catch {
      try {
        await salesforce.searchPolicyInGlobalSearch(reference);
        return;
      } catch {
        // Try next candidate reference.
      }
    }
  }

  throw new Error(
    `[salesforce] Unable to open record from global search using references: ${primaryReference}, ${fallbackReference}`,
  );
}
async function verifyEditTermsDiscountAndUpdatePremiumOrClose(page: Page) {
  const editTermsButton = page
    .getByRole('button', { name: /Edit Terms/i })
    .or(page.getByRole('link', { name: /Edit Terms/i }))
    .first();

  await expect(editTermsButton).toBeVisible({ timeout: 60000 });
  await editTermsButton.click();

  const discountField = page
    .getByRole('spinbutton', { name: /Discount/i })
    .or(page.getByRole('textbox', { name: /Discount/i }))
    .or(page.locator('input[aria-label*="Discount" i]:visible').first())
    .first();

  const updatePremiumButton = page.getByRole('button', { name: /Update Premium/i }).first();

  const hasDiscount = await discountField.isVisible({ timeout: 7000 }).catch(() => false);
  const hasUpdatePremium = await updatePremiumButton.isVisible({ timeout: 7000 }).catch(() => false);

  if (hasDiscount && hasUpdatePremium) {
    await expect(discountField).toBeVisible({ timeout: 10000 });
    await expect(updatePremiumButton).toBeVisible({ timeout: 10000 });
  }

  const closeButton = page
    .locator('[role="dialog"] button:has-text("Close"), [role="dialog"] button[title*="Close" i], button:has-text("Close")')
    .first();

  if (await closeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await closeButton.click();
  } else {
    await page.keyboard.press('Escape').catch(() => undefined);
  }
}

test.describe('@regression | E2E | NB | Quotes Discount Slider', () => {
  test('TC_REG_049 | Save and exit quote, then update discount on Salesforce Quotes tab and continue quote', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-NB-DISC-${Date.now()}`;

    const brokerLogin = new LoginPage(page);
    const quoteManager = new QuoteManagerPage(page);
    const productSelection = new ProductSelectionPage(page);
    const statements = new StatementsOfFactPage(page);
    const quotes = new QuotesPage(page);
    const finalDetails = new FinalPolicyDetailsPage(page);
    const summary = new SummaryPage(page);
    const orderDialog = new OrderDialog(page);
    const salesforce = new SalesforcePortalPage(page);

    // Create NB quote up to Your Quotes page in Broker Portal.
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
    await clickSaveAndExitFromQuotes(page);
    await quoteManager.expectLoaded();

    await searchQuoteManagerByReference(page, caseRef);
    const policyNumber = await getGridMliReference(page, caseRef);

    // Login to Salesforce with dedicated default underwriter credentials.
    await salesforce.goto();
    const sfCreds = getDefaultUwCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password);

    // Open policy, go to Quotes tab, adjust discount slider, update premium, continue quote.
    await searchSalesforceWithFallback(salesforce, policyNumber, caseRef);
    await salesforce.openQuotesTab1();
    await adjustDiscountAndContinueQuote(page);

    // Continue quote flow: wait for page, select quote, proceed, order, then return to submission.
    await completeQuoteJourneyAfterContinue(page, quotes, finalDetails, summary, orderDialog, salesforce);
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelatedStable(policyNumber);

    // Create MTA and fill mandatory reason + description.
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave(
      'Exposure/Limit Changes',
      `MTA Description - edit terms check for ${policyNumber}`,
    );

    // Condition: open Quotes tab -> click Edit Terms -> assert Discount and Update Premium if present;
    // otherwise close dialog and continue the MTA flow.
    await salesforce.openQuotesTab1();
    await verifyEditTermsDiscountAndUpdatePremiumOrClose(page);
    await salesforce.openDetailsTab();

    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
    await salesforce.editMTAPremium('100');
    await salesforce.bindMTA();

    // Wait for policy update and assert top-left Risk ID is shown in expected Salesforce format.
    const riskIdPattern = /\bDAU\/\d{8}\/[A-Z]{4}\/\d{2}\/\d{2}\b/;
    const highlightsTopLeft = page.locator(
      '.slds-page-header, .forceHighlightsPanel, [data-aura-class*="forceHighlightsPanel"]',
    ).first();

    await expect
      .poll(async () => {
        await page.waitForLoadState('domcontentloaded');

        const topLeftText = await highlightsTopLeft.innerText().catch(() => '');
        if (riskIdPattern.test(topLeftText)) {
          return topLeftText.match(riskIdPattern)?.[0] ?? '';
        }

        const bodyText = await page.locator('body').innerText();
        return bodyText.match(riskIdPattern)?.[0] ?? '';
      }, { timeout: 180000, intervals: [2000, 5000] })
      .toMatch(riskIdPattern);

    const finalTopLeftText = await highlightsTopLeft.innerText().catch(() => '');
    const finalBodyText = await page.locator('body').innerText();
    const generatedRiskId =
      finalTopLeftText.match(riskIdPattern)?.[0]
      ?? finalBodyText.match(riskIdPattern)?.[0]
      ?? '';

    expect(
      generatedRiskId,
      'Expected Risk ID in format DAU/########/AAAA/##/## after Bind MTA (top-left highlights).',
    ).toMatch(riskIdPattern);

  });
});
