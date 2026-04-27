// spec: tests/residential-quick-quote.plan.md
// seed: tests/seed.spec.ts

import { expect, test } from '@playwright/test';
import { getMlisPortalUrl } from '../../src/config/env';

// Execute a little slower for stability/observability (scoped to this file only).
test.use({ launchOptions: { slowMo: 100 } });

test.describe('@sanity | E2E | Residential Quick Quote | Scotland', () => {
  test('TC_SAN_012 | Residential quick quote Scotland (multiple products) + enter manually + email quotes + close dialog (slow)', async ({ page }) => {
    test.setTimeout(240000);

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

    // 3) Click Scotland quick quote link
    const scotlandQuickQuoteLink = page
      .getByRole('link', { name: /I am buying or selling a house.*Scotland/i })
      .or(page.getByRole('button', { name: /I am buying or selling a house.*Scotland/i }))
      .first();
    await expect(scotlandQuickQuoteLink).toBeVisible({ timeout: 60000 });
    await scotlandQuickQuoteLink.click();

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
    await reference.fill(`QQ-SC-${Date.now()}`);

    // Scottish postcode (example per plan)
    await postcode.fill('EH1 1RE');
    await postcode.press('Tab').catch(() => undefined);

    // Requirement: enter the address by clicking "Enter manually" (no dropdown search).
    const enterManually = page.getByRole('button', { name: /Enter manually/i }).first();
    if (await enterManually.isVisible({ timeout: 5000 }).catch(() => false)) {
      await enterManually.click();
    }

    // Manual address fields (fill if present)
    const addressLine1 = page.getByRole('textbox', { name: /Address line 1/i }).first();
    if (await addressLine1.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addressLine1.fill('1 High Street');
      const addressLine2 = page.getByRole('textbox', { name: /Address line 2/i }).first();
      if (await addressLine2.isVisible({ timeout: 2000 }).catch(() => false)) await addressLine2.fill('Old Town');

      const town = page.getByRole('textbox', { name: /^Town$/i }).first();
      if (await town.isVisible({ timeout: 2000 }).catch(() => false)) await town.fill('Edinburgh');
    }

    const jurisdictionCheckbox = page.getByRole('checkbox', {
      name: /I confirm the property of interest is based in Scotland/i,
    });
    await expect(jurisdictionCheckbox).toBeVisible({ timeout: 60000 });

    // Cookie dialog can re-appear and intercept clicks; re-accept before checking.
    await acceptCookiesIfVisible();
    await jurisdictionCheckbox.scrollIntoViewIfNeeded();

    try {
      await jurisdictionCheckbox.check({ force: true, timeout: 15000 });
    } catch {
      const labelText = page.getByText(/I confirm the property of interest is based in Scotland/i).first();
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

    // Select 4 different products (each click turns one Select into Remove)
    for (let i = 0; i < 4; i++) {
      const nextSelect = page.getByRole('button', { name: /^Select$/i }).first();
      await expect(nextSelect).toBeVisible({ timeout: 60000 });
      await nextSelect.click();
    }

    // Assertion: all 4 are selected
    const removeButtons = page.getByRole('button', { name: /^Remove$/i });
    await expect.poll(async () => removeButtons.count(), { timeout: 60000 }).toBeGreaterThanOrEqual(4);

    await proceedToStep3.click();

    // Step 3 assertions
    await expect(page.getByText(/Step\s*3\s*of\s*3/i).first()).toBeVisible({ timeout: 60000 });
    await expect(page.getByText(/Premium\s*:/i).first()).toBeVisible({ timeout: 60000 });

    // At least one product table should include the 4 selected products (header row + 4 rows).
    const firstProductsTable = page.getByRole('table').first();
    await expect.poll(async () => firstProductsTable.getByRole('row').count(), { timeout: 60000 }).toBeGreaterThanOrEqual(5);

    await acceptCookiesIfVisible();

    const emailQuotes = page
      .getByRole('button', { name: /Email quotes to my conveyancer and myself/i })
      .or(page.getByRole('link', { name: /Email quotes to my conveyancer and myself/i }))
      .first();
    await expect(emailQuotes).toBeVisible({ timeout: 60000 });

    // T&C text assertion
    await expect(page.getByText(/By ticking this box/i).first()).toBeVisible({ timeout: 60000 });

    // T&C checkbox
    const tcCheckbox = page.getByRole('checkbox', { name: /terms|t\&c|conditions/i }).first();
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
      const anyCheckbox = page.locator('input[type="checkbox"]:visible').first();
      await expect(anyCheckbox).toBeVisible({ timeout: 10000 });
      await anyCheckbox.check({ force: true });
    }

    await emailQuotes.click();

    const confirmationHeading = page
      .getByRole('heading', { name: /Your quick quote has been emailed to you and your conveyancer\./i })
      .first();
    await expect(confirmationHeading).toBeVisible({ timeout: 60000 });

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
