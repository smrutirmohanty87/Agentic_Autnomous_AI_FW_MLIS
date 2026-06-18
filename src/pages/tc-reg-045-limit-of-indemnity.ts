import { expect, Page } from '@playwright/test';
import { TCRegSharedUtilsPage } from './tc-reg-shared-utils';

export class TCReg045LimitOfIndemnityPage {
  private readonly utils: TCRegSharedUtilsPage;

  constructor(private readonly page: Page) {
    this.utils = new TCRegSharedUtilsPage(page);
  }

  async clickChangeLimit() {
    const tryDirectOrMenu = async (): Promise<boolean> => {
      const directAction = this.page
        .getByRole('button', { name: /Change\s*(of)?\s*Limit\s*of\s*Indeminity|Change\s*(of)?\s*Limit\s*of\s*Indemnity/i })
        .or(this.page.getByRole('link', { name: /Change\s*(of)?\s*Limit\s*of\s*Indeminity|Change\s*(of)?\s*Limit\s*of\s*Indemnity/i }))
        .or(this.page.locator('button, a').filter({ hasText: /Change\s*(of)?\s*Limit\s*of\s*Indem/i }))
        .first();

      if (await directAction.isVisible({ timeout: 3000 }).catch(() => false)) {
        await directAction.click();
        return true;
      }

      const showMoreActions = this.page.getByRole('button', { name: /Show more actions/i }).first();
      if (await showMoreActions.isVisible({ timeout: 3000 }).catch(() => false)) {
        await showMoreActions.click();
        const menuAction = await this.utils.pickFirstVisible([
          this.page.getByRole('menuitem', { name: /Change\s*(of)?\s*Limit\s*of\s*Indem/i }),
          this.page.locator('[role="menuitem"]').filter({ hasText: /Change\s*(of)?\s*Limit\s*of\s*Indem/i }),
          this.page.locator('a, button').filter({ hasText: /Change\s*(of)?\s*Limit\s*of\s*Indem/i }),
        ], 10000);
        await menuAction.click();
        return true;
      }

      return false;
    };

    await this.page.evaluate(() => window.scrollTo(0, 0));

    if (await tryDirectOrMenu()) {
      return;
    }

    const quotesTab = this.page.getByRole('tab', { name: /^Quotes$/i }).first();
    if (await quotesTab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await quotesTab.click();
      const quoteLink = await this.utils.pickFirstVisible([
        this.page.locator('table tbody tr a:visible'),
        this.page.locator('[role="tabpanel"] a:visible'),
      ], 30000);
      await quoteLink.click();
      await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
      await this.page.evaluate(() => window.scrollTo(0, 0));
      if (await tryDirectOrMenu()) {
        return;
      }
    }

    throw new Error('Unable to find Change of Limit of Indemnity action in direct buttons/links or Show more actions menu.');
  }

  async setLimitValueAndSave(value: string) {
    const limitInput = await this.utils.pickFirstVisible([
      this.page.getByRole('spinbutton', { name: /Limit of indemnity|Limit of Indemnity/i }),
      this.page.getByRole('textbox', { name: /Limit of indemnity|Limit of Indemnity/i }),
      this.page.locator('input[aria-label*="Limit of indemnity" i], input[aria-label*="Limit of Indemnity" i]'),
      this.page.locator('input[name*="Limit" i]'),
    ], 60000);
    await limitInput.click();
    await limitInput.fill(value);

    const saveButton = await this.utils.pickFirstVisible([
      this.page.getByRole('button', { name: /^Save$/i }),
      this.page.locator('button:has-text("Save")'),
    ], 60000);
    await saveButton.click();
  }

  async verifyLimitFieldUpdated(expectedValue: string) {
    await this.page.evaluate(() => window.scrollBy(0, 1400));
    const limitField = await this.utils.pickFirstVisible([
      this.page.locator('records-record-layout-item:has-text("Limit of Indemnity")'),
      this.page.locator('[data-label="Limit of Indemnity"]'),
      this.page.locator('[data-label="Limit of indemnity"]'),
    ], 60000);

    const expectedDigits = this.utils.digitsOnly(expectedValue);
    const renderedText = await limitField.innerText();
    const renderedDigits = this.utils.digitsOnly(renderedText);
    expect(renderedDigits).toContain(expectedDigits);
  }

  async refreshMultipleAndWait(times = 3) {
    for (let i = 0; i < times; i += 1) {
      await this.page.reload();
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(1200);
    }
  }

  async expectValidationErrorAndCancel() {
    const errorBanner = await this.utils.pickFirstVisible([
      this.page.locator('[role="alert"]:visible'),
      this.page.locator('.slds-has-error:visible'),
      this.page.locator('text=/Review the errors|error|invalid|must be/i'),
    ], 30000);
    await expect(errorBanner).toBeVisible({ timeout: 30000 });

    const cancelButton = await this.utils.pickFirstVisible([
      this.page.getByRole('button', { name: /^Cancel$/i }),
      this.page.locator('button:has-text("Cancel")'),
    ], 30000);
    await cancelButton.click();
  }
}
