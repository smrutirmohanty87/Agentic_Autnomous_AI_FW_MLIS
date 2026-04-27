import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});

test('Login to SauceDemo', async ({ page }) => {
  // Navigate to the SauceDemo login page
  await page.goto('https://www.saucedemo.com');

  // Enter username
  await page.fill('#user-name', 'standard_user');

  // Enter password
  await page.fill('#password', 'secret_sauce');

  // Click the login button
  await page.click('#login-button');

  // Verify successful login by checking the presence of the Products header
  await expect(page.locator('.title')).toHaveText('Products');
});
