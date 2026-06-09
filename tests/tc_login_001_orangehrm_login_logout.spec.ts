import { test, expect } from '@playwright/test';

test.describe('TC_LOGIN_001 – OrangeHRM Login and Logout', () => {
  test('TC_LOGIN_001 - Login with valid credentials and logout successfully', async ({ page }) => {
    test.setTimeout(90000);

    // Step 1: Navigate to login page
    await page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/auth/login', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Step 2: Verify login page is displayed
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('input[name="username"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('input[name="password"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 20000 });

    // Step 3: Enter valid credentials
    await page.locator('input[name="username"]').fill('Admin');
    await page.locator('input[name="password"]').fill('admin123');

    // Step 4: Submit login form
    await page.locator('button[type="submit"]').click();

    // Step 5: Verify Dashboard page is displayed
    await expect(page).toHaveURL(/\/dashboard\b/i, { timeout: 60000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20000 });

    // Step 6: Open user menu and logout
    await page.locator('.oxd-userdropdown-tab').click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();

    // Step 7: Verify logout – redirected back to login page
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 60000 });
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible({ timeout: 20000 });
  });
});
