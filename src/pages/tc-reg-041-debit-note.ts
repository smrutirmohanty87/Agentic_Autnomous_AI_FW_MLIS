import { expect, Page } from '@playwright/test';

export class TCReg041DebitNotePage {
  constructor(private readonly page: Page) {}

  async openAndCloseDebitNote(): Promise<void> {
    const previewWaitMs = 2500;
    const debitNoteRow = this.page.locator('table tbody tr:visible').filter({ hasText: /Debit\s*Note/i }).first();
    await expect(debitNoteRow).toBeVisible({ timeout: 120000 });

    const debitNoteLink = debitNoteRow
      .locator('th[scope="row"] a:visible, td[data-label] a:visible, td a:visible')
      .first();
    await expect(debitNoteLink).toBeVisible({ timeout: 30000 });

    const popupPromise = this.page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
    const previousUrl = this.page.url();
    await debitNoteLink.click();

    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState('domcontentloaded');
      await popup.waitForTimeout(previewWaitMs);
      await popup.close();
      return;
    }

    await this.page.waitForTimeout(1500);

    const closeButton = this.page
      .locator('[role="dialog"] button:has-text("Close"), [role="dialog"] button[title*="Close"], [role="dialog"] button.slds-button_icon')
      .first();

    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.page.waitForTimeout(previewWaitMs);
      await closeButton.click();
    } else if (this.page.url() !== previousUrl) {
      await this.page.waitForTimeout(previewWaitMs);
      await this.page.goBack().catch(() => undefined);
    } else {
      await this.page.waitForTimeout(previewWaitMs);
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
  }
}
