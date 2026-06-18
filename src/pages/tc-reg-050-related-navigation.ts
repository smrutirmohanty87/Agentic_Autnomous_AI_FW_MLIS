import { expect, Page } from '@playwright/test';

export class TCReg050RelatedNavigationPage {
  constructor(private readonly page: Page) {}

  async scrollLightningContainers() {
    await this.page.evaluate(() => {
      window.scrollBy(0, 1200);

      const elements = Array.from(document.querySelectorAll<HTMLElement>('*'));
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        if (overflowY !== 'auto' && overflowY !== 'scroll') continue;
        if (el.scrollHeight <= el.clientHeight) continue;
        el.scrollTop += 1200;
      }
    });
  }

  async resetLightningScrollToTop() {
    await this.page.evaluate(() => {
      window.scrollTo(0, 0);

      const elements = Array.from(document.querySelectorAll<HTMLElement>('*'));
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        if (overflowY !== 'auto' && overflowY !== 'scroll') continue;
        if (el.scrollHeight <= el.clientHeight) continue;
        el.scrollTop = 0;
      }
    });
  }

  async openViewAllFromRelatedCard(titleRegex: RegExp) {
    await this.resetLightningScrollToTop();
    await this.page.waitForTimeout(500);

    const card = this.page.locator('article:visible').filter({ hasText: titleRegex }).first();

    for (let i = 0; i < 40; i += 1) {
      if (await card.isVisible({ timeout: 500 }).catch(() => false)) {
        break;
      }

      await card.scrollIntoViewIfNeeded().catch(() => undefined);
      if (await card.isVisible({ timeout: 500 }).catch(() => false)) {
        break;
      }

      await this.page.mouse.wheel(0, 1200);
      await this.scrollLightningContainers();
      await this.page.waitForTimeout(300);
    }

    await expect(card).toBeVisible({ timeout: 120000 });

    const viewAllLink = card.getByRole('link', { name: /^View All/i }).first();
    const viewAllAnchor = card.locator('a:visible').filter({ hasText: /^View All/i }).first();
    const viewAllButton = card.getByRole('button', { name: /^View All/i }).first();

    const deadline = Date.now() + 120000;
    let clicked = false;
    while (Date.now() < deadline && !clicked) {
      if (await viewAllLink.isVisible({ timeout: 300 }).catch(() => false)) {
        await viewAllLink.click();
        clicked = true;
        break;
      }
      if (await viewAllAnchor.isVisible({ timeout: 300 }).catch(() => false)) {
        await viewAllAnchor.click();
        clicked = true;
        break;
      }
      if (await viewAllButton.isVisible({ timeout: 300 }).catch(() => false)) {
        await viewAllButton.click();
        clicked = true;
        break;
      }

      await this.page.mouse.wheel(0, 1200);
      await this.scrollLightningContainers();
      await this.page.waitForTimeout(300);
    }

    expect(clicked).toBeTruthy();

    const table = this.page.locator('table:visible').first();
    await expect(table).toBeVisible({ timeout: 120000 });
    await expect.poll(async () => table.locator('tbody tr').count(), { timeout: 120000 }).toBeGreaterThan(0);

    return table;
  }

  async assertCr0090IntermediaryName(expectedValue: string) {
    const cr0090ByLabelAttribute = this.page
      .locator('records-record-layout-item[field-label*="CR0090 Intermediary 1 - Name" i], records-record-layout-item[field-label*="CR0090" i]')
      .first();

    const cr0090ByVisibleText = this.page
      .locator('records-record-layout-item:visible, .slds-form-element:visible')
      .filter({ hasText: /CR0090\s*Intermediary\s*1\s*-\s*Name/i })
      .first();

    const cr0090Field = (await cr0090ByLabelAttribute.isVisible({ timeout: 5000 }).catch(() => false))
      ? cr0090ByLabelAttribute
      : cr0090ByVisibleText;

    await expect(cr0090Field).toBeVisible({ timeout: 120000 });
    await expect(cr0090Field).toContainText(expectedValue);

    const cr0090ValueLocator = cr0090Field
      .locator('.slds-form-element__static:visible, lightning-formatted-text:visible, .test-id__field-value:visible, span:visible, div:visible')
      .first();

    const cr0090RawText = (await cr0090ValueLocator.innerText().catch(async () => cr0090Field.innerText())).trim();
    const cr0090Value = cr0090RawText
      .replace(/CR0090\s*Intermediary\s*1\s*-\s*Name/gi, '')
      .trim();

    expect(cr0090Value).toContain(expectedValue);
  }
}
