import { test, expect } from '@playwright/test';

test.describe('OrangeHRM Login Verification', () => {
  test('TC_001 - OrangeHRM Login Verification', async ({ page }) => {
    // 1. Open OrangeHRM website
    await page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/auth/login');

    // 2. Verify Login page displayed
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // 3. Enter username Admin
    await page.locator('input[name="username"]').fill('Admin');

    // 4. Enter password admin123
    await page.locator('input[name="password"]').fill('admin123');

    // 5. Click Login button
    await page.locator('button[type="submit"]').click();

    // 6. Verify Dashboard page displayed
    await expect(page).toHaveURL(/\/dashboard\b/i);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
