import { expect, test } from '@playwright/test';
import { getMlisPortalUrl } from '../../src/config/env';

test.describe('@sanity | UI | Broker Portal | Footer Links', () => {
  test('TC_SAN_019 | Verify Terms and Conditions, Privacy Policy, and Cookies footer links', async ({ page, context }) => {
    test.setTimeout(180000);

    const acceptCookiesIfVisible = async (targetPage = page) => {
      const acceptInDialog = targetPage
        .getByRole('alertdialog')
        .getByRole('button', { name: /accept all/i })
        .first();
      const acceptButton = targetPage.getByRole('button', { name: /accept all/i }).first();

      if (await acceptInDialog.isVisible({ timeout: 2500 }).catch(() => false)) {
        await acceptInDialog.click().catch(() => undefined);
      } else if (await acceptButton.isVisible({ timeout: 2500 }).catch(() => false)) {
        await acceptButton.click().catch(() => undefined);
      }
    };

    const baseUrl = getMlisPortalUrl().replace(/\/broker-zone\/?$/i, '/');
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await acceptCookiesIfVisible();

    const openFooterLinkAndAssert = async (linkName: RegExp, urlMustContain: RegExp) => {
      const footer = page.locator('footer').first();
      if (await footer.isVisible({ timeout: 2000 }).catch(() => false)) {
        await footer.scrollIntoViewIfNeeded();
      } else {
        await page.mouse.wheel(0, 5000);
      }

      const link = page.getByRole('link', { name: linkName }).first();
      await expect(link).toBeVisible({ timeout: 30000 });

      const popupPromise = context.waitForEvent('page', { timeout: 4000 }).catch(() => null);
      await link.click();
      const popup = await popupPromise;

      const targetPage = popup ?? page;
      if (!targetPage.isClosed()) {
        await targetPage.waitForLoadState('domcontentloaded').catch(() => undefined);
        await acceptCookiesIfVisible(targetPage);
        await expect(targetPage).toHaveURL(urlMustContain, { timeout: 30000 });
      } else {
        await expect(page).toHaveURL(urlMustContain, { timeout: 30000 });
      }

      if (popup) {
        if (!popup.isClosed()) {
          await popup.close().catch(() => undefined);
        }
      } else {
        await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
        await acceptCookiesIfVisible(page);
        await expect(page).toHaveURL(new RegExp(baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), { timeout: 30000 });
      }
    };

    await openFooterLinkAndAssert(/Terms\s*(?:and|&)\s*Conditions?/i, /terms.*conditions|conditions.*terms/i);
    await openFooterLinkAndAssert(/Privacy\s*Policy/i, /privacy.*policy|policy.*privacy/i);
    await openFooterLinkAndAssert(/Cookies?|Cookie\s*Policy/i, /cookies?|cookie-policy/i);
  });
});
