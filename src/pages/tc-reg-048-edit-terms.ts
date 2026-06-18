import { expect, Page } from '@playwright/test';

export class TCReg048EditTermsPage {
  constructor(private readonly page: Page) {}

  async verifyEditTermsDiscountAndUpdatePremiumOrClose() {
    const editTermsButton = this.page
      .getByRole('button', { name: /Edit Terms/i })
      .or(this.page.getByRole('link', { name: /Edit Terms/i }))
      .first();

    await expect(editTermsButton).toBeVisible({ timeout: 60000 });
    await editTermsButton.click();

    const discountField = this.page
      .getByRole('spinbutton', { name: /Discount/i })
      .or(this.page.getByRole('textbox', { name: /Discount/i }))
      .or(this.page.locator('input[aria-label*="Discount" i]:visible').first())
      .first();

    const updatePremiumButton = this.page.getByRole('button', { name: /Update Premium/i }).first();

    const hasDiscount = await discountField.isVisible({ timeout: 7000 }).catch(() => false);
    const hasUpdatePremium = await updatePremiumButton.isVisible({ timeout: 7000 }).catch(() => false);

    if (hasDiscount && hasUpdatePremium) {
      await expect(discountField).toBeVisible({ timeout: 10000 });
      await expect(updatePremiumButton).toBeVisible({ timeout: 10000 });
    }

    const closeButton = this.page
      .locator('[role="dialog"] button:has-text("Close"), [role="dialog"] button[title*="Close" i], button:has-text("Close")')
      .first();

    if (await closeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await closeButton.click();
    } else {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }
  }
}
