// spec: specs/TC_PIM_001_Add_Employee_Test_Plan.md
// seed: tests/login.spec.ts

import { test, expect } from '@playwright/test';

test.describe('PIM Module – Employee Management', () => {
  test('Add New Employee (John Agentic) and Verify Profile Creation', async ({ page }) => {
    test.setTimeout(180000);

    // Phase 1 – Login
    // 1. Navigate to login page
    await page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/auth/login', {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });
    await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 60000 });

    // 2. Fill username
    await page.locator('input[name="username"]').fill('Admin');

    // 3. Fill password
    await page.locator('input[name="password"]').fill('admin123');

    // 4. Click login button
    await page.locator('button[type="submit"]').click();

    // 5. Wait for dashboard URL
    await page.waitForURL('**/dashboard/index', { timeout: 30000 });

    // Phase 2 – Navigate to PIM → Add Employee
    // 6. Click PIM sidebar link
    await page.locator('a:has-text("PIM")').click();

    // 7. Click Add Employee
    await page.locator('a:has-text("Add Employee")').click();

    // 8. Assert Add Employee heading is visible
    await expect(page.locator('h6:has-text("Add Employee")')).toBeVisible({ timeout: 10000 });

    // Phase 3 – Fill Form
    // 9. Fill first name
    await page.locator('input[name="firstName"]').fill('John');

    // 10. Fill last name
    await page.locator('input[name="lastName"]').fill('Agentic');

    // Phase 4 – Save
    // 11. Click Save button
    await page.locator('button[type="submit"]:has-text("Save")').click();

    // 12. Wait for personal details URL
    await page.waitForURL('**/viewPersonalDetails/**', { timeout: 60000 });

    // Phase 5 – Verify Profile
    // 17. Toast check skipped – toast disappears before waitForURL resolves; success confirmed via URL redirect below.

    // 13. Assert URL contains /viewPersonalDetails/
    await expect(page).toHaveURL(/\/viewPersonalDetails\//);

    // 14. Assert Personal Details heading is visible
    await expect(page.locator('h6:has-text("Personal Details")')).toBeVisible({ timeout: 10000 });

    // 15. Assert first name value
    await expect(page.locator('input[name="firstName"]')).toHaveValue('John', { timeout: 10000 });

    // 16. Assert last name value
    await expect(page.locator('input[name="lastName"]')).toHaveValue('Agentic', { timeout: 10000 });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot();
      await testInfo.attach('screenshot-on-failure', { body: screenshot, contentType: 'image/png' });
    }
  });
});
