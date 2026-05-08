import { expect, test } from '@playwright/test';
import { getMlisPortalUrl } from '../../src/config/env';

test.describe('@sanity | UI | Registration | Broker Portal', () => {
  test('DT-MLIS-DF25.5.0 | MLIS Sanity | Verify user able to create the User registration', async ({ page }) => {
    test.setTimeout(180000);

    const acceptCookiesIfVisible = async () => {
      const acceptInDialog = page
        .getByRole('alertdialog')
        .getByRole('button', { name: /accept all/i })
        .first();
      const acceptButton = page.getByRole('button', { name: /accept all/i }).first();

      if (await acceptInDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        await acceptInDialog.click().catch(() => undefined);
      } else if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await acceptButton.click().catch(() => undefined);
      }
    };

    // Step 1: Open Broker Portal home URL.
    const baseUrl = getMlisPortalUrl().replace(/\/broker-zone\/?$/i, '/');
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await acceptCookiesIfVisible();

    // Step 2: Verify home page loaded — heading and Sign up for free link present.
    await expect(page.getByRole('heading', { name: /Home of legal indemnity insurance/i }).first())
      .toBeVisible({ timeout: 30000 });

    const signUpForFree = page.getByRole('link', { name: /sign up for free/i }).first();
    await expect(signUpForFree).toBeVisible({ timeout: 30000 });

    // Step 3: Click "Sign up for free" — navigates to /mlisportal/broker-registration.
    await signUpForFree.click();
    await expect(page).toHaveURL(/broker-registration/i, { timeout: 30000 });
    await expect(page).toHaveTitle(/Broker-Registration|Register/i, { timeout: 30000 });

    // Step 4: Verify registration heading is present.
    await expect(page.getByRole('heading', { name: /Register/i }).first()).toBeVisible({ timeout: 20000 });

    // Step 5: Verify Email address field and Proceed button are visible.
    const emailField = page.locator('input[type="text"], input[type="email"]').first();
    await expect(emailField).toBeVisible({ timeout: 20000 });

    const referralCodeField = page.getByRole('textbox', { name: /referral code/i }).first();
    await expect(referralCodeField).toBeVisible({ timeout: 20000 });

    const proceedButton = page.getByRole('button', { name: /^Proceed$/i }).first();
    await expect(proceedButton).toBeVisible({ timeout: 20000 });
    await expect(proceedButton).toBeEnabled({ timeout: 10000 });

    // Step 6: Fill in a valid email address and click Proceed.
    const timestamp = Date.now();
    const testEmail = `autouser.${timestamp}@testdual.com`;
    await emailField.fill(testEmail);
    await proceedButton.click();

    // Step 7: Wait for the full registration form to appear after Proceed.
    await expect(page.getByText('Your details')).toBeVisible({ timeout: 30000 });
    // Dismiss cookie banner if it reappears over the form.
    await acceptCookiesIfVisible();

    // Step 8: Fill Your details.
    await page.locator('input[name="forename"]').fill('Test');
    await page.locator('input[name="surname"]').fill('AutoUser');
    await page.locator('input[name="phoneNumber"]').fill('01234567890');
    // Email address field is pre-populated from step 1; verify it carries the value.
    await expect(page.locator('input[name="emailAddress"]')).toHaveValue(testEmail, { timeout: 10000 });

    // Step 9: Select jurisdiction — England & Wales (click via label as SLDS span intercepts pointer events).
    const ewLabel = page.getByText('England & Wales').first();
    await ewLabel.scrollIntoViewIfNeeded();
    await ewLabel.click({ force: true });

    // Step 10: Fill Firm details.
    await page.locator('input[name="firmName"]').fill('Auto Test Firm Ltd');
    await page.locator('input[name="crn"]').fill('12345678');
    await page.locator('input[name="nameContact"]').fill('Accounts Contact');
    await page.locator('input[name="accountsEmail"]').fill(`accounts.${timestamp}@testdual.com`);
    await page.locator('input[name="accountsPhone"]').fill('01234567891');

    // Step 11: Select Intermediary type — pick UK Broker and verify selection.
    const intermediaryBtn = page.locator('button[name="intermediaryType"]').first();
    await intermediaryBtn.scrollIntoViewIfNeeded();
    await intermediaryBtn.click();
    await page.waitForTimeout(400);

    const ukBrokerOption = page.getByRole('option', { name: /^UK Broker$/i }).first();
    if (await ukBrokerOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await ukBrokerOption.click();
    } else {
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }
    await expect(intermediaryBtn).toContainText(/UK Broker|Broker/i, { timeout: 10000 });
    await page.waitForTimeout(200);

    // Step 12: Select Payment type — open dropdown then use keyboard to pick first option.
    const paymentBtn = page.locator('button[name="paymentType"]').first();
    await paymentBtn.scrollIntoViewIfNeeded();
    await paymentBtn.click();
    await page.waitForTimeout(400);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // Step 13: Fill office postcode, click Search address, then select an address from dropdown.
    await page.locator('input[name="location"]').fill('EC3A 2BJ');
    const searchAddressBtn = page.getByRole('button', { name: /search address/i }).first();
    await searchAddressBtn.scrollIntoViewIfNeeded();
    await searchAddressBtn.click();

    const addressCombobox = page
      .getByRole('combobox')
      .filter({ hasText: /please select address/i })
      .first();

    await expect(addressCombobox).toBeVisible({ timeout: 30000 });
    await addressCombobox.click();

    const allAddressOptions = page.getByRole('option');
    await expect.poll(async () => allAddressOptions.count(), { timeout: 30000 }).toBeGreaterThan(0);

    const preferredAddress = page.getByRole('option', { name: /EC3A|Leadenhall|London/i }).first();
    const addressToPick =
      (await preferredAddress.isVisible({ timeout: 2000 }).catch(() => false)) ? preferredAddress : allAddressOptions.first();
    await expect(addressToPick).toBeVisible({ timeout: 30000 });
    await addressToPick.click();
    await page.waitForTimeout(500);

    // Step 14: Accept T&C — custom checkbox can require role-click fallback.
    const tandcHeading = page.getByRole('heading', { name: /terms and conditions/i }).last();
    await tandcHeading.scrollIntoViewIfNeeded();

    const tandcRoleCheckbox = page.getByRole('checkbox').last();
    await tandcRoleCheckbox.scrollIntoViewIfNeeded();
    await tandcRoleCheckbox.click({ force: true }).catch(() => undefined);

    const tandcInput = page.locator('input[name="tandc"]').first();
    if (!(await tandcInput.isChecked().catch(() => false))) {
      await tandcInput.evaluate((el) => {
        const input = el as HTMLInputElement;
        input.checked = true;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
    await expect(tandcInput).toBeChecked({ timeout: 10000 });
    await page.waitForTimeout(300);

    // Step 15: Click Register to submit the form.
    const registerButton = page.getByRole('button', { name: /^Register$/i }).first();
    await expect(registerButton).toBeVisible({ timeout: 10000 });
    await expect(registerButton).toBeEnabled({ timeout: 10000 });
    await registerButton.scrollIntoViewIfNeeded();
    await registerButton.click();

    // Step 16: Confirm registration success — URL change or in-page confirmation message.
    await page.waitForFunction(
      () =>
        /confirmation|success|login|broker-zone/i.test(location.href) ||
        document.body.innerText.match(/thank you|registration successful|account created|verify your email|check your email/i) !== null,
      { timeout: 30000 }
    );

    // Pause so the result screen is visible.
    await page.waitForTimeout(5000);
  });
});
