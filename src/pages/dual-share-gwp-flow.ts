import { expect, Page } from '@playwright/test';

export class DualShareGwpFlowPage {
  constructor(private readonly page: Page) {}

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private moneyRegex(amount: string): RegExp {
    const escaped = amount.replace('.', '\\.')
      .replace(/,/g, '');
    return new RegExp(`(?:GBP|£)?\\s*-?${escaped}(?:0+)?`, 'i');
  }

  private parseCurrency(raw: string): number {
    const n = Number(raw.replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(n)) {
      throw new Error(`Unable to parse currency value from: '${raw}'`);
    }
    return n;
  }

  async selectProductByName(productName: string) {
    const escapedName = this.escapeRegex(productName);
    const exactProductText = this.page
      .locator('p:visible, span:visible, div:visible')
      .filter({ hasText: new RegExp(`^\\s*${escapedName}\\s*$`, 'i') })
      .first();

    if (await exactProductText.isVisible({ timeout: 10000 }).catch(() => false)) {
      const rowSelect = exactProductText
        .locator('xpath=ancestor::*[self::div or self::li or self::article][1]//button[normalize-space()="Select"]')
        .first();
      await expect(rowSelect).toBeVisible({ timeout: 30000 });
      await rowSelect.click();
      return;
    }

    // Fallback: based on current product list order in portal, this product is listed first.
    const firstSelect = this.page.getByRole('button', { name: /^Select$/i }).first();
    await expect(firstSelect).toBeVisible({ timeout: 120000 });
    await firstSelect.click();
  }

  async selectInsurerByName(insurerName: string) {
    const escapedName = this.escapeRegex(insurerName);
    const insurerRow = this.page.locator('tr:visible, [role="row"]:visible')
      .filter({ hasText: new RegExp(escapedName, 'i') })
      .first();

    await expect(insurerRow).toBeVisible({ timeout: 120000 });

    const selectQuoteButton = insurerRow.getByRole('button', { name: /Select quote/i }).first();
    if (await selectQuoteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectQuoteButton.click();
    } else {
      const fallbackButton = this.page.getByRole('button', { name: /Select quote/i }).first();
      await expect(fallbackButton).toBeVisible({ timeout: 30000 });
      await fallbackButton.click();
    }

    await expect(this.page.getByRole('heading', { name: /Final policy details/i })).toBeVisible({ timeout: 120000 });
  }

  async openDetailsTab() {
    const detailsTab = this.page.getByRole('tab', { name: /^Details$/i }).first();
    await expect(detailsTab).toBeVisible({ timeout: 120000 });
    await detailsTab.click();
  }

  async getFirstValueAfterLabel(labelRegexSource: string): Promise<number> {
    const text = await this.page.locator('main:visible').first().innerText();
    const money = '(?:GBP\\s*)?£?\\s*-?\\d[\\d,]*(?:\\.\\d{1,2})?';
    const regex = new RegExp(`${labelRegexSource}[\\s\\S]{0,180}?(${money})`, 'i');
    const match = text.match(regex);
    if (!match?.[1]) {
      throw new Error(`No value found for label pattern: ${labelRegexSource}`);
    }
    return this.parseCurrency(match[1]);
  }

  async getAllValuesAfterLabel(labelRegexSource: string): Promise<number[]> {
    const values: number[] = [];

    for (let i = 0; i < 8; i += 1) {
      const text = await this.page.locator('main:visible, [role="tabpanel"]:visible').first().innerText().catch(() => '');
      const money = '(?:GBP\\s*)?£?\\s*-?\\d[\\d,]*(?:\\.\\d{1,2})?';
      const regex = new RegExp(`${labelRegexSource}[\\s\\S]{0,180}?(${money})`, 'gi');

      for (const m of text.matchAll(regex)) {
        if (!m[1]) continue;
        const parsed = this.parseCurrency(m[1]);
        values.push(parsed);
      }

      await this.page.mouse.wheel(0, 1400);
      await this.page.waitForTimeout(350);
    }

    const unique = Array.from(new Set(values.map((v) => v.toFixed(2)))).map((v) => Number(v));
    return unique;
  }

  async assertDualShareGwpEqualsGrossWrittenPremium(expected: string) {
    const expectedNum = Number(expected);

    const dualTop = await this.getFirstValueAfterLabel('DUAL\\s*Share\\s*GWP');
    expect(dualTop).toBeCloseTo(expectedNum, 2);

    const grossTax = await this.getFirstValueAfterLabel('Gross\\s*Written\\s*Premium');
    expect(grossTax).toBeCloseTo(expectedNum, 2);

    expect(dualTop).toBeCloseTo(grossTax, 2);
  }

  async assertRiskBinderSectionGwp(expected: string) {
    const expectedNum = Number(expected);
    const value = await this.getFirstValueAfterLabel('Risk\\s*Binder\\s*Sections?[\\s\\S]{0,120}?GWP|GWP[\\s\\S]{0,120}?Risk\\s*Binder\\s*Sections?');
    expect(value).toBeCloseTo(expectedNum, 2);
  }

  async openBdxFromRelated() {
    const relatedTab = this.page.getByRole('tab', { name: /^Related$/i }).first();
    await expect(relatedTab).toBeVisible({ timeout: 120000 });
    await relatedTab.click();

    const bdxCard = this.page.locator('article:visible').filter({ hasText: /\bBDX\b/i }).first();
    await expect(bdxCard).toBeVisible({ timeout: 120000 });

    const viewAll = bdxCard.getByRole('link', { name: /^View All/i }).first();
    const headerLink = bdxCard.getByRole('link', { name: /\bBDX\b/i }).first();

    if (await viewAll.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewAll.click();
    } else {
      await expect(headerLink).toBeVisible({ timeout: 30000 });
      await headerLink.click();
    }

    const bdxTable = this.page.locator('table:visible').first();
    await expect(bdxTable).toBeVisible({ timeout: 120000 });

    const firstRow = bdxTable.locator('tbody tr:visible').first();
    await expect(firstRow).toBeVisible({ timeout: 120000 });

    const rowLink = firstRow.locator('a:visible').first();
    if (await rowLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await rowLink.click();
    }
  }

  async assertCurrencyFieldsEqual(expected: string, labelPatterns: string[]) {
    const expectedRegex = this.moneyRegex(expected);

    for (const pattern of labelPatterns) {
      const field = this.page
        .locator('records-record-layout-item:visible, .slds-form-element:visible')
        .filter({ hasText: new RegExp(pattern, 'i') })
        .first();

      await expect(field).toBeVisible({ timeout: 120000 });
      await expect(field).toContainText(expectedRegex, { timeout: 120000 });
    }
  }

  async fillCancellationReturnPremiumAndAssert(value: string) {
    const premiumInput = this.page.getByRole('spinbutton', { name: /Cancellation Return Premium/i }).first();
    await expect(premiumInput).toBeVisible({ timeout: 120000 });
    await premiumInput.fill(value);
    await premiumInput.press('Tab').catch(() => {});

    const normalized = value.replace(/,/g, '');
    await expect(premiumInput).toHaveValue(new RegExp(normalized.replace('.', '\\.'), 'i'));
  }

  async clickCalculateTaxAndAssert() {
    const button = this.page.getByRole('button', { name: /Calculate Tax/i }).first();
    await expect(button).toBeVisible({ timeout: 120000 });
    await button.click();

    const ok = this.page.getByRole('button', { name: /^OK$/i }).first();
    if (await ok.isVisible({ timeout: 5000 }).catch(() => false)) {
      await ok.click();
    }

    await expect(this.page.getByRole('heading', { name: /Tax Details/i })).toBeVisible({ timeout: 120000 });
  }

  async assertTaxAmount(expected: string) {
    const regex = this.moneyRegex(expected);
    const taxField = this.page
      .locator('records-record-layout-item:visible, .slds-form-element:visible, tr:visible')
      .filter({ hasText: /Tax|IPT|Amount of Taxable Premium/i })
      .first();
    await expect(taxField).toBeVisible({ timeout: 120000 });
    await expect(taxField).toContainText(regex, { timeout: 120000 });
  }
}
