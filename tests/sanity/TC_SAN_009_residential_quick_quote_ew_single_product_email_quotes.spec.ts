// spec: tests/residential-quick-quote.plan.md
// seed: tests/seed.spec.ts

import { expect, test } from '@playwright/test';
import { getMlisPortalUrl } from '../../src/config/env';

test.describe('@sanity | E2E | Residential Quick Quote | England & Wales', () => {
  test('TC_SAN_009 | Residential quick quote E&W (single product) + email quotes + close dialog', async ({ page }) => {
    test.setTimeout(180000);

    const acceptCookiesIfVisible = async () => {
      const dialog = page.getByRole('alertdialog', { name: /DUAL uses cookies/i }).first();
      const acceptInDialog = dialog.getByRole('button', { name: /accept all/i }).first();
      const accept = page.getByRole('button', { name: /accept all/i }).first();
      if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        await acceptInDialog.click().catch(() => undefined);
        await expect(dialog).toBeHidden({ timeout: 20000 }).catch(() => undefined);
      } else if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) {
        await accept.click().catch(() => undefined);
      }
    };

    const portalUrl = getMlisPortalUrl();
    const homeUrl = (() => {
      // Env typically points at /mlisportal/broker-zone; quick quote is on /mlisportal/
      try {
        const url = new URL(portalUrl);
        url.pathname = url.pathname.replace(/\/broker-zone\/?$/i, '/');
        return url.toString();
      } catch {
        return portalUrl;
      }
    })();

    // 1) Navigate to home page
    await page.goto(homeUrl, { waitUntil: 'domcontentloaded' });

    // 2) Accept cookies (if shown)
    await acceptCookiesIfVisible();

    // Home page assertion
    await expect(page).toHaveURL(/\/mlisportal\/?$/i, { timeout: 60000 });
    await expect(page.getByRole('link', { name: /^Home$/i }).first()).toBeVisible({ timeout: 60000 });
    await expect(page.getByRole('heading', { name: /Home of legal indemnity insurance/i }).first()).toBeVisible({
      timeout: 60000,
    });

    // 3) Click England & Wales quick quote link
    const ewQuickQuoteLink = page
      .getByRole('link', { name: /I am buying or selling a house.*England.*Wales/i })
      .or(page.getByRole('button', { name: /I am buying or selling a house.*England.*Wales/i }))
      .first();
    await expect(ewQuickQuoteLink).toBeVisible({ timeout: 60000 });
    await ewQuickQuoteLink.click();

    await expect(page).toHaveURL(/quick-quote-residential/i, { timeout: 60000 });

    // Cookie dialog can appear after navigation too.
    await acceptCookiesIfVisible();

    // Step 1 assertions
    await expect(page.getByText(/Step\s*1\s*of\s*3/i).first()).toBeVisible({ timeout: 60000 });
    await expect(
      page.getByRole('heading', { name: /Legal indemnity quick quotes for house buyers or sellers/i }).first(),
    ).toBeVisible({ timeout: 60000 });

    const yourName = page.getByPlaceholder(/Your name\s*\*/i).first();
    const yourEmail = page.getByPlaceholder(/Your email address\s*\*/i).first();
    const firm = page.getByPlaceholder(/Conveyancing firm\s*\*/i).first();
    const conveyancerEmail = page.getByPlaceholder(/Conveyancer'?s email address\s*\*/i).first();
    const reference = page.getByPlaceholder(/Reference\s*\*/i).first();
    const postcode = page.getByPlaceholder(/Please enter postcode of property to be insured\s*\*/i).first();

    await expect(yourName).toBeVisible({ timeout: 60000 });
    await yourName.fill('John Smith');
    await yourEmail.fill('john.smith@test.com');
    await firm.fill('Smith & Partners');
    await conveyancerEmail.fill('conveyancer@smithpartners.com');
    await reference.fill(`QQ-EW-${Date.now()}`);

    await postcode.fill('EC3A2BJ');
    await postcode.press('Tab').catch(() => undefined);

    // Postcode search + pick address (if the UI presents it)
    const searchAddress = page.getByRole('button', { name: /Search address/i }).first();

    if (await searchAddress.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchAddress.click();

      const addressCombobox = page
        .getByRole('combobox')
        .filter({ hasText: /Please select address/i })
        .first();

      await expect(addressCombobox).toBeVisible({ timeout: 60000 });
      await addressCombobox.click();

      // Options are loaded async; wait for at least one option to render.
      const allOptions = page.getByRole('option');
      await expect.poll(async () => allOptions.count(), { timeout: 60000 }).toBeGreaterThan(0);

      const preferred = page.getByRole('option', { name: /Nexus.*Leadenhall|Leadenhall.*EC3A|EC3A.*Leadenhall/i }).first();
      const optionToPick = (await preferred.isVisible({ timeout: 2000 }).catch(() => false)) ? preferred : allOptions.first();
      await expect(optionToPick).toBeVisible({ timeout: 60000 });
      await optionToPick.click();

      // Address fields should auto-populate once an address is selected.
      const addressLine1 = page.getByRole('textbox', { name: /Address line 1/i }).first();
      if (await addressLine1.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(addressLine1).toHaveValue(/\S+/, { timeout: 60000 });
      }
      const town = page.getByRole('textbox', { name: /^Town$/i }).first();
      if (await town.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(town).toHaveValue(/\S+/, { timeout: 60000 });
      }
    }

    const jurisdictionCheckbox = page.getByRole('checkbox', {
      name: /I confirm the property of interest is based in England or Wales/i,
    });
    await expect(jurisdictionCheckbox).toBeVisible({ timeout: 60000 });
    // Cookie dialog can re-appear and intercept clicks; re-accept before checking.
    await acceptCookiesIfVisible();
    await jurisdictionCheckbox.scrollIntoViewIfNeeded();

    try {
      await jurisdictionCheckbox.check({ force: true, timeout: 15000 });
    } catch {
      // Fallback: click the visible label text which typically toggles the checkbox.
      const labelText = page.getByText(/I confirm the property of interest is based in England or Wales/i).first();
      await expect(labelText).toBeVisible({ timeout: 15000 });
      await labelText.click({ force: true, timeout: 15000 });
      await expect(jurisdictionCheckbox).toBeChecked({ timeout: 15000 });
    }

    await expect(jurisdictionCheckbox).toBeChecked({ timeout: 15000 });

    await acceptCookiesIfVisible();

    const proceedToStep2 = page
      .getByRole('button', { name: /Proceed to step 2/i })
      .or(page.getByText(/Proceed to step 2/i))
      .first();
    await expect(proceedToStep2).toBeVisible({ timeout: 60000 });
    await proceedToStep2.click();

    // Step 2 assertions
    await expect(page.getByText(/Step\s*2\s*of\s*3/i).first()).toBeVisible({ timeout: 60000 });
    await expect(
      page.getByRole('heading', { name: /Legal indemnity quick quotes for house buyers or sellers/i }).first(),
    ).toBeVisible({ timeout: 60000 });

    await acceptCookiesIfVisible();

    const proceedToStep3 = page.getByRole('button', { name: /Proceed to step 3/i }).first();
    await expect(proceedToStep3).toBeVisible({ timeout: 60000 });

    // Select first product
    const firstSelect = page.getByRole('button', { name: /^Select$/i }).first();
    await expect(firstSelect).toBeVisible({ timeout: 60000 });
    await firstSelect.click();

    // Verify selection toggles to Remove
    await expect(page.getByRole('button', { name: /^Remove$/i }).first()).toBeVisible({ timeout: 30000 });

    await proceedToStep3.click();

    // Step 3 assertions
    await expect(page.getByText(/Step\s*3\s*of\s*3/i).first()).toBeVisible({ timeout: 60000 });
    await expect(page.getByText(/Premium\s*:/i).first()).toBeVisible({ timeout: 60000 });

    await acceptCookiesIfVisible();

    const emailQuotes = page
      .getByRole('button', { name: /Email quotes to my conveyancer and myself/i })
      .or(page.getByRole('link', { name: /Email quotes to my conveyancer and myself/i }))
      .first();
    await expect(emailQuotes).toBeVisible({ timeout: 60000 });

    // T&C text assertion (ensures we are at the final action area)
    await expect(page.getByText(/By ticking this box/i).first()).toBeVisible({ timeout: 60000 });

    // T&C checkbox
    const tcCheckbox = page
      .getByRole('checkbox', { name: /terms|t\&c|conditions/i })
      .first();

    if (await tcCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await acceptCookiesIfVisible();
      await tcCheckbox.scrollIntoViewIfNeeded();
      try {
        await tcCheckbox.check({ force: true, timeout: 15000 });
      } catch {
        const tcText = page.getByText(/By ticking this box/i).first();
        await expect(tcText).toBeVisible({ timeout: 15000 });
        await tcText.click({ force: true, timeout: 15000 });
        await expect(tcCheckbox).toBeChecked({ timeout: 15000 });
      }
    } else {
      // Fallback: check the first visible checkbox on the page (kept minimal, only used when label-based lookup fails)
      const anyCheckbox = page.locator('input[type="checkbox"]:visible').first();
      await expect(anyCheckbox).toBeVisible({ timeout: 10000 });
      await anyCheckbox.check({ force: true });
    }

    await emailQuotes.click();

    const confirmationHeading = page
      .getByRole('heading', { name: /Your quick quote has been emailed to you and your conveyancer\./i })
      .first();
    await expect(confirmationHeading).toBeVisible({ timeout: 60000 });

    // Confirmation dialog assertion
    await expect(page.getByRole('button', { name: /Close this window/i }).first()).toBeVisible({ timeout: 60000 });

    const closeWindow = page.getByRole('button', { name: /Close this window/i }).first();
    await expect(closeWindow).toBeVisible({ timeout: 60000 });
    await closeWindow.click();

    await expect(confirmationHeading).toBeHidden({ timeout: 60000 });

    // Verify still on Step 3 with key actions available
    await expect(page.getByText(/Step\s*3\s*of\s*3/i).first()).toBeVisible({ timeout: 60000 });
    await expect(emailQuotes).toBeVisible({ timeout: 60000 });
    await expect(page.getByRole('button', { name: /New quick quote/i }).first()).toBeVisible({ timeout: 60000 });
  });
});
