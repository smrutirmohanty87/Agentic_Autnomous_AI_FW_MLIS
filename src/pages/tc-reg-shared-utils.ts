import { expect, Locator, Page } from '@playwright/test';

export class TCRegSharedUtilsPage {
  constructor(private readonly page: Page) {}

  async pickFirstVisible(candidates: Locator[], timeoutMs = 30000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      for (const candidate of candidates) {
        const target = candidate.first();
        if (await target.isVisible().catch(() => false)) {
          return target;
        }
      }
      await this.page.waitForTimeout(300);
    }
    throw new Error('Unable to find a visible locator from provided candidates.');
  }

  parseMoney(value: string): number {
    const normalized = value.replace(/[^\d.-]/g, '');
    const parsed = Number.parseFloat(normalized);
    if (Number.isNaN(parsed)) {
      throw new Error(`Unable to parse money value: ${value}`);
    }
    return parsed;
  }

  extractMtaPremiumForRow(sourceText: string, rowRegex: RegExp): number {
    const text = sourceText.replace(/\r/g, '');
    const rowIndex = text.search(rowRegex);
    if (rowIndex === -1) {
      throw new Error(`Unable to find quotes row matching ${rowRegex}`);
    }

    const windowText = text.slice(rowIndex, rowIndex + 500);
    const moneyMatches = windowText.match(/£\s*\d[\d,]*(?:\.\d{1,2})?/g) ?? [];
    if (moneyMatches.length < 3) {
      throw new Error(`Unable to extract premium columns for ${rowRegex}. Found: ${moneyMatches.join(', ')}`);
    }

    return this.parseMoney(moneyMatches[1]);
  }

  digitsOnly(value: string): string {
    return value.replace(/\D/g, '');
  }

  async assertRiskIdVisible() {
    const riskIdPattern = /\bDAU\/\d{8}\/[A-Z]{4}\/\d{2}\/\d{2}\b/;
    const highlightsTopLeft = this.page.locator(
      '.slds-page-header, .forceHighlightsPanel, [data-aura-class*="forceHighlightsPanel"]',
    ).first();

    await expect
      .poll(async () => {
        await this.page.waitForLoadState('domcontentloaded');

        const topLeftText = await highlightsTopLeft.innerText().catch(() => '');
        if (riskIdPattern.test(topLeftText)) {
          return topLeftText.match(riskIdPattern)?.[0] ?? '';
        }

        const bodyText = await this.page.locator('body').innerText();
        return bodyText.match(riskIdPattern)?.[0] ?? '';
      }, { timeout: 180000, intervals: [2000, 5000] })
      .toMatch(riskIdPattern);

    const finalTopLeftText = await highlightsTopLeft.innerText().catch(() => '');
    const finalBodyText = await this.page.locator('body').innerText();
    const generatedRiskId =
      finalTopLeftText.match(riskIdPattern)?.[0]
      ?? finalBodyText.match(riskIdPattern)?.[0]
      ?? '';

    expect(
      generatedRiskId,
      'Expected Risk ID in format DAU/########/AAAA/##/## after Bind MTA (top-left highlights).',
    ).toMatch(riskIdPattern);
  }
}
