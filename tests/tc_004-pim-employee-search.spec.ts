import { test, expect, Page } from '@playwright/test';
import { registerLocators } from '../healing/locatorRegistry';
import { healLocator, HealerOptions, printHealSummary, clearHealLog } from '../healing/healer';

// ---------------------------------------------------------------------------
// Locator registry  — OrangeHRM PIM Employee Search
// Strategies ordered by healing priority: role → placeholder → css → text
// ---------------------------------------------------------------------------

registerLocators([
  {
    key: 'loginUsername',
    strategies: [
      { type: 'name',        value: 'username' },
      { type: 'placeholder', value: 'Username' },
      { type: 'css',         selector: 'input[name="username"]' },
    ],
  },
  {
    key: 'loginPassword',
    strategies: [
      { type: 'name',        value: 'password' },
      { type: 'placeholder', value: 'Password' },
      { type: 'css',         selector: 'input[name="password"]' },
    ],
  },
  {
    key: 'loginButton',
    strategies: [
      { type: 'role', role: 'button', options: { name: 'Login' } },
      { type: 'css',  selector: 'button[type="submit"]' },
    ],
  },
  {
    key: 'dashboardHeading',
    strategies: [
      { type: 'role', role: 'heading', options: { name: 'Dashboard' } },
      { type: 'text', value: 'Dashboard', exact: true },
    ],
  },
  {
    key: 'pimNavLink',
    strategies: [
      { type: 'role', role: 'link', options: { name: 'PIM' } },
      { type: 'css',  selector: 'a[href*="/pim/viewPimModule"]' },
      { type: 'text', value: 'PIM', exact: true },
    ],
  },
  {
    key: 'pimPageHeading',
    strategies: [
      { type: 'role', role: 'heading', options: { name: 'PIM' } },
      { type: 'css',  selector: '.oxd-topbar-header-breadcrumb h6' },
      { type: 'text', value: 'PIM', exact: true },
    ],
  },
  {
    key: 'employeeNameInput',
    strategies: [
      { type: 'placeholder', value: 'Type for hints...' },
      { type: 'css',         selector: '.oxd-autocomplete-text-input input' },
      { type: 'label',       value: 'Employee Name' },
    ],
  },
  {
    key: 'searchButton',
    strategies: [
      { type: 'role', role: 'button', options: { name: 'Search' } },
      { type: 'css',  selector: 'button.oxd-button--secondary[type="button"]' },
      { type: 'text', value: 'Search', exact: true },
    ],
  },
  {
    key: 'employeeTable',
    strategies: [
      { type: 'role', role: 'table' },
      { type: 'css',  selector: '.oxd-table' },
    ],
  },
]);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL     = 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login';
const PIM_URL      = 'https://opensource-demo.orangehrmlive.com/web/index.php/pim/viewEmployeeList';
const SEARCH_NAME  = 'Charlotte';
const SEARCH_LAST  = 'Smith';
const HEAL_OPTS: HealerOptions      = { strategyTimeout: 10000, promoteOnHeal: true };
const NAV_OPTS: HealerOptions        = { strategyTimeout: 5000,  promoteOnHeal: true };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function strategies(key: string) {
  const map: Record<string, Parameters<typeof healLocator>[2]> = {
    loginUsername:    [{ type: 'name', value: 'username' }, { type: 'placeholder', value: 'Username' }, { type: 'css', selector: 'input[name="username"]' }],
    loginPassword:    [{ type: 'name', value: 'password' }, { type: 'placeholder', value: 'Password' }, { type: 'css', selector: 'input[name="password"]' }],
    loginButton:      [{ type: 'role', role: 'button', options: { name: 'Login' } }, { type: 'css', selector: 'button[type="submit"]' }],
    dashboardHeading: [{ type: 'role', role: 'heading', options: { name: 'Dashboard' } }, { type: 'text', value: 'Dashboard', exact: true }],
    pimNavLink:       [{ type: 'role', role: 'link', options: { name: 'PIM' } }, { type: 'css', selector: 'a[href*="/pim/viewPimModule"]' }, { type: 'text', value: 'PIM', exact: true }],
    pimPageHeading:   [{ type: 'role', role: 'heading', options: { name: 'PIM' } }, { type: 'css', selector: '.oxd-topbar-header-breadcrumb h6' }],
    employeeNameInput:[{ type: 'placeholder', value: 'Type for hints...' }, { type: 'css', selector: '.oxd-form .oxd-autocomplete-text-input:first-of-type input' }],
    searchButton:     [{ type: 'role', role: 'button', options: { name: 'Search' } }, { type: 'css', selector: 'button.oxd-button--secondary[type="button"]' }],
    employeeTable:    [{ type: 'role', role: 'table' }, { type: 'css', selector: '.oxd-table' }],
  };
  if (!map[key]) throw new Error(`[pim-search] Unknown key "${key}"`);
  return map[key];
}

async function locate(page: Page, key: string) {
  return healLocator(page, key, strategies(key), HEAL_OPTS);
}

async function loginAs(page: Page, username: string, password: string): Promise<void> {
  await page.goto(BASE_URL);
  await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 30000 });

  const userInput = await locate(page, 'loginUsername');
  await userInput.fill(username);

  const passInput = await locate(page, 'loginPassword');
  await passInput.fill(password);

  const loginBtn = await locate(page, 'loginButton');
  await loginBtn.click();

  await page.waitForURL(/\/dashboard/i, { timeout: 60000 });
  await page.waitForLoadState('domcontentloaded');
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('OrangeHRM PIM — Employee Search', () => {
  test.use({ navigationTimeout: 60000, actionTimeout: 20000 });

  test.beforeEach(() => clearHealLog());
  test.afterEach(() => printHealSummary());

  // -------------------------------------------------------------------------
  // TC_004 — Full end-to-end: login → PIM → search → verify
  // -------------------------------------------------------------------------
  test('TC_004 – Login, navigate to PIM, search employee, verify record', async ({ page }) => {
    test.setTimeout(120000);

    // Step 1: Login as Admin
    await loginAs(page, 'Admin', 'admin123');

    // Step 2: Wait for sidebar to be ready, then navigate to PIM
    await page.locator('.oxd-sidepanel-body').waitFor({ state: 'visible', timeout: 15000 });
    const pimLink = await healLocator(page, 'pimNavLink', strategies('pimNavLink'), NAV_OPTS);
    await pimLink.click();
    await page.waitForURL(/\/pim\//i, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');

    // Step 3: Verify PIM module is displayed
    const pimHeading = await locate(page, 'pimPageHeading');
    await expect(pimHeading).toBeVisible();

    // Step 4: Type employee first name in the Employee Name autocomplete (first field)
    const nameInput = page.locator('.oxd-autocomplete-text-input input').first();
    await nameInput.waitFor({ state: 'visible', timeout: 15000 });
    // Use pressSequentially to fire Vue keyboard events that trigger the autocomplete
    await nameInput.click();
    await nameInput.pressSequentially(SEARCH_NAME, { delay: 80 });

    // Wait for autocomplete dropdown to appear and select the matching suggestion
    const suggestion = page.locator('.oxd-autocomplete-dropdown').locator(`text=${SEARCH_NAME}`).first();
    await suggestion.waitFor({ state: 'visible', timeout: 20000 });
    await suggestion.click();

    // Step 5: Click Search button
    const searchBtn = await locate(page, 'searchButton');
    await searchBtn.click();

    // Wait for results to load
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.oxd-table-body .oxd-table-row').first().waitFor({ state: 'visible', timeout: 20000 });

    // Step 6: Verify employee record is displayed in the results table
    const table = await locate(page, 'employeeTable');
    await expect(table).toBeVisible();

    // Assert at least one row containing the searched employee name is visible
    const employeeRow = page.locator('.oxd-table-body .oxd-table-row')
      .filter({ hasText: SEARCH_NAME });
    await expect(employeeRow.first()).toBeVisible();

    // Assert the last name appears in the same row
    const matchingRow = page.locator('.oxd-table-body .oxd-table-row')
      .filter({ hasText: SEARCH_LAST })
      .filter({ hasText: SEARCH_NAME });
    await expect(matchingRow.first()).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // TC_005 — Direct PIM URL access (after login) + verify table renders
  // -------------------------------------------------------------------------
  test('TC_005 – Direct PIM URL access, verify Employee List table and records count', async ({ page }) => {
    // Login first
    await loginAs(page, 'Admin', 'admin123');

    // Navigate directly to PIM Employee List URL
    await page.goto(PIM_URL);
    await page.waitForLoadState('domcontentloaded');

    // Verify PIM heading
    const pimHeading = await locate(page, 'pimPageHeading');
    await expect(pimHeading).toBeVisible();

    // Verify table is rendered
    const table = await locate(page, 'employeeTable');
    await expect(table).toBeVisible();

    // Verify at least one data row exists
    const rows = page.locator('.oxd-table-body .oxd-table-row');
    await expect(rows.first()).toBeVisible();

    // Verify records count text is present
    const recordsText = page.locator('span').filter({ hasText: /Records Found/ });
    await expect(recordsText.first()).toBeVisible();
  });
});
