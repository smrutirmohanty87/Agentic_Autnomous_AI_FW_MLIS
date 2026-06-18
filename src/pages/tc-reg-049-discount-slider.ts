import { expect, Locator, Page } from '@playwright/test';
import {
  FinalPolicyDetailsPage,
  OrderDialog,
  QuotesPage,
  SummaryPage,
} from './mlis-portal';
import { SalesforcePortalPage } from './salesforce-cancellation';
import { TCReg048EditTermsPage } from './tc-reg-048-edit-terms';

export class TCReg049DiscountSliderPage {
  private readonly reg048: TCReg048EditTermsPage;

  constructor(private readonly page: Page) {
    this.reg048 = new TCReg048EditTermsPage(page);
  }

  private async firstVisible(candidates: Locator[]): Promise<Locator | null> {
    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 2000 }).catch(() => false)) {
        return candidate;
      }
    }
    return null;
  }

  async adjustDiscountAndContinueQuote() {
    const slider = await this.firstVisible([
      this.page.getByRole('slider', { name: /Discount/i }).first(),
      this.page.locator('input[type="range"][aria-label*="Discount" i]:visible').first(),
      this.page.locator('input[type="range"]:visible').first(),
      this.page.locator('[role="slider"][aria-label*="Discount" i]:visible').first(),
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
        await this.page.keyboard.press('ArrowRight').catch(() => undefined);
      }

      const ariaValueNow = await slider.getAttribute('aria-valuenow').catch(() => null);
      if (ariaValueNow) {
        expect(Number(ariaValueNow)).toBeGreaterThanOrEqual(10);
      }
    }

    const updatePremiumButton = this.page.getByRole('button', { name: /Update Premium/i }).first();
    await expect(updatePremiumButton).toBeVisible({ timeout: 60000 });
    await updatePremiumButton.click();

    const continueQuoteButton = this.page
      .getByRole('button', { name: /Continue Quote/i })
      .or(this.page.getByRole('link', { name: /Continue Quote/i }))
      .first();
    await expect(continueQuoteButton).toBeVisible({ timeout: 60000 });
    await continueQuoteButton.click();
  }

  async completeQuoteJourneyAfterContinue(
    quotes: QuotesPage,
    finalDetails: FinalPolicyDetailsPage,
    summary: SummaryPage,
    orderDialog: OrderDialog,
    salesforce: SalesforcePortalPage,
  ) {
    await this.page.waitForLoadState('domcontentloaded');

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

  async clickSaveAndExitFromQuotes() {
    const saveAndExit = this.page
      .getByRole('button', { name: /Save\s*(?:&|and)\s*Exit/i })
      .or(this.page.getByRole('link', { name: /Save\s*(?:&|and)\s*Exit/i }))
      .first();

    await expect(saveAndExit).toBeVisible({ timeout: 60000 });
    await saveAndExit.click();
  }

  async searchQuoteManagerByReference(reference: string) {
    const searchAllFields = this.page.getByRole('textbox', { name: /Search all fields/i }).first();
    await expect(searchAllFields).toBeVisible({ timeout: 60000 });
    await searchAllFields.fill(reference);

    const searchButton = this.page
      .getByRole('link', { name: /^Search$/i })
      .or(this.page.getByRole('button', { name: /^Search$/i }))
      .first();
    await expect(searchButton).toBeVisible({ timeout: 15000 });
    await searchButton.click();

    const matchingRow = this.page.locator('table tbody tr').filter({ hasText: reference }).first();
    await expect(matchingRow).toBeVisible({ timeout: 60000 });
  }

  async getGridMliReference(caseReference: string) {
    const matchingRow = this.page.locator('table tbody tr').filter({ hasText: caseReference }).first();
    await expect(matchingRow).toBeVisible({ timeout: 60000 });

    const rowText = (await matchingRow.innerText()).replace(/\s+/g, ' ');
    const referenceMatch = rowText.match(/(?:DA|CP)-MLI-\d{9}/i);

    if (!referenceMatch) {
      throw new Error(`Unable to extract broker reference from Quote Manager row for case ref: ${caseReference}`);
    }

    return referenceMatch[0];
  }

  async searchSalesforceWithFallback(salesforce: SalesforcePortalPage, primaryReference: string, fallbackReference: string) {
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

  async verifyEditTermsDiscountAndUpdatePremiumOrClose() {
    await this.reg048.verifyEditTermsDiscountAndUpdatePremiumOrClose();
  }
}
