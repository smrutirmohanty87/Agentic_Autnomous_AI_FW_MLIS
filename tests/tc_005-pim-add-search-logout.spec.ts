import { test, expect, Page } from '@playwright/test';
import { healLocator, HealerOptions, printHealSummary, clearHealLog } from '../healing/healer';

// ---------------------------------------------------------------------------
// Locators
// ---------------------------------------------------------------------------

const STRATS: Record<string, Parameters<typeof healLocator>[2]> = {
  loginUsername:          [{ type: 'name', value: 'username' },          { type: 'css', selector: 'input[name="username"]' }],
  loginPassword:          [{ type: 'name', value: 'password' },          { type: 'css', selector: 'input[name="password"]' }],
  loginButton:            [{ type: 'role', role: 'button', options: { name: 'Login' } }, { type: 'css', selector: 'button[type="submit"]' }],
  pimNavLink:             [{ type: 'role', role: 'link', options: { name: 'PIM' } }, { type: 'css', selector: 'a[href*="/pim/"]' }, { type: 'text', value: 'PIM', exact: true }],
  addEmployeeNavLink:     [{ type: 'text', value: 'Add Employee', exact: true }, { type: 'css', selector: 'a[href*="addEmployee"]' }],
  addEmployeeHeading:     [{ type: 'css', selector: 'h6:has-text("Add Employee")' }, { type: 'text', value: 'Add Employee', exact: true }],
  firstNameInput:         [{ type: 'name', value: 'firstName' }, { type: 'css', selector: 'input[name="firstName"]' }],
  lastNameInput:          [{ type: 'name', value: 'lastName' },  { type: 'css', selector: 'input[name="lastName"]' }],
  saveButton:             [{ type: 'css', selector: 'button[type="submit"]:has-text("Save")' }, { type: 'role', role: 'button', options: { name: 'Save' } }],
  personalDetailsHeading: [{ type: 'css', selector: 'h6:has-text("Personal Details")' }, { type: 'text', value: 'Personal Details', exact: true }],
  searchButton:           [{ type: 'role', role: 'button', options: { name: 'Search' } }, { type: 'css', selector: 'button.oxd-button--secondary[type="button"]' }],
  userDropdown:           [{ type: 'css', selector: '.oxd-userdropdown-tab' }],
  logoutLink:             [{ type: 'text', value: 'Logout', exact: true }, { type: 'css', selector: 'a:has-text("Logout")' }],
};

const OPTS: HealerOptions = { strategyTimeout: 15_000, promoteOnHeal: true };
const BASE_URL = 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loc(page: Page, key: string) {
  return healLocator(page, key, STRATS[key], OPTS);
}

async function login(page: Page): Promise<void> {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 30_000 });
  await (await loc(page, 'loginUsername')).fill('Admin');
  await (await loc(page, 'loginPassword')).fill('admin123');
  await (await loc(page, 'loginButton')).click();
  await page.waitForURL(/\/dashboard/i, { timeout: 60_000 });
  await page.waitForLoadState('domcontentloaded');
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('OrangeHRM — HR Admin: Add Employee, Search & Logout', () => {
  test.beforeEach(() => clearHealLog());
  test.afterEach(() => printHealSummary());

  test('TC_HR_001 — Login, add John Agentic, search for them, verify result, logout', async ({ page }) => {
    test.setTimeout(180_000);

    // ── Step 1: Login ───────────────────────────────────────────────────────
    await login(page);
    await expect(page).toHaveURL(/\/dashboard/i);

    // ── Step 2: Navigate to PIM ─────────────────────────────────────────────
    await page.locator('.oxd-sidepanel-body').waitFor({ state: 'visible', timeout: 15_000 });
    await (await loc(page, 'pimNavLink')).click();
    await page.waitForURL(/\/pim\//i, { timeout: 30_000 });

    // ── Step 3: Open Add Employee ───────────────────────────────────────────
    await (await loc(page, 'addEmployeeNavLink')).click();
    await page.waitForLoadState('domcontentloaded');
    await expect(await loc(page, 'addEmployeeHeading')).toBeVisible({ timeout: 15_000 });

    // ── Step 4: Fill in employee details ────────────────────────────────────
    await (await loc(page, 'firstNameInput')).fill('John');
    await (await loc(page, 'lastNameInput')).fill('Agentic');

    // ── Step 5: Save ────────────────────────────────────────────────────────
    await (await loc(page, 'saveButton')).click();
    await page.waitForURL(/\/viewPersonalDetails\//i, { timeout: 60_000 });
    await expect(await loc(page, 'personalDetailsHeading')).toBeVisible({ timeout: 15_000 });

    const empMatch = page.url().match(/empNumber\/(\d+)/);
    console.log(`[TC_HR_001] Employee created — empNumber: ${empMatch ? empMatch[1] : 'unknown'}`);

    // ── Step 6: Navigate to Employee List ───────────────────────────────────
    await (await loc(page, 'pimNavLink')).click();
    await page.waitForURL(/\/pim\//i, { timeout: 30_000 });

    const listLink = page.locator('a[href*="viewEmployeeList"], a:has-text("Employee List")').first();
    await listLink.waitFor({ state: 'visible', timeout: 15_000 });
    await listLink.click();
    await page.waitForURL(/viewEmployeeList/i, { timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

    // ── Step 7: Search for the new employee ─────────────────────────────────
    // The Employee List page has multiple autocomplete inputs.
    // The first one is always "Employee Name" — use .first() to avoid strict-mode errors.
    const searchInput = page.locator('.oxd-autocomplete-text-input input').first();
    await searchInput.waitFor({ state: 'visible', timeout: 15_000 });
    await searchInput.fill('John Agentic');

    // Accept autocomplete suggestion if it appears
    const suggestion = page.locator('.oxd-autocomplete-dropdown li').filter({ hasText: 'John Agentic' }).first();
    const hasSuggestion = await suggestion.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasSuggestion) await suggestion.click();

    await (await loc(page, 'searchButton')).click();
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});

    // ── Step 8: Verify result row ────────────────────────────────────────────
    const rows = page.locator('.oxd-table-body .oxd-table-row');
    await expect(rows.first()).toBeVisible({ timeout: 20_000 });

    const resultCell = page.locator('.oxd-table-body').getByText('John Agentic', { exact: false });
    await expect(resultCell.first()).toBeVisible({ timeout: 15_000 });
    console.log('[TC_HR_001] "John Agentic" found in search results ✓');

    // ── Step 9: Logout ───────────────────────────────────────────────────────
    await (await loc(page, 'userDropdown')).click();
    await (await loc(page, 'logoutLink')).click();
    await page.waitForURL(/\/auth\/login/i, { timeout: 30_000 });
    await expect(page.locator('input[name="username"]')).toBeVisible({ timeout: 10_000 });
    console.log('[TC_HR_001] Logged out successfully ✓');
  });
});
