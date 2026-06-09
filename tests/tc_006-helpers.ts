/**
 * tests/tc_006-helpers.ts
 *
 * Shared helpers and constants for the PIM Employee CRUD workflow.
 * Imported by both the Playwright spec and the orchestrator demo.
 * Does NOT contain any test.describe / test() calls.
 */

import { Page } from 'playwright';
import { healLocator, HealerOptions } from '../healing/healer';
import { LocatorEntry } from '../healing/locatorRegistry';

export const BASE_URL      = 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login';
export const EMPLOYEE_FIRST = 'John';
export const EMPLOYEE_LAST  = 'Agentic';
export const NICKNAME       = 'JohnBot';

export const HEAL_OPTS: HealerOptions = { strategyTimeout: 15_000, promoteOnHeal: true };

export const CRUD_LOCATORS: LocatorEntry[] = [
  { key: 'loginUsername',       strategies: [{ type: 'name', value: 'username' },         { type: 'css', selector: 'input[name="username"]' }] },
  { key: 'loginPassword',       strategies: [{ type: 'name', value: 'password' },         { type: 'css', selector: 'input[name="password"]' }] },
  { key: 'loginButton',         strategies: [{ type: 'role', role: 'button', options: { name: 'Login' } }, { type: 'css', selector: 'button[type="submit"]' }] },
  { key: 'pimNavLink',          strategies: [{ type: 'role', role: 'link',   options: { name: 'PIM' } }, { type: 'css', selector: 'a[href*="/pim/"]' }] },
  { key: 'addEmployeeNavLink',  strategies: [{ type: 'text', value: 'Add Employee', exact: true }, { type: 'css', selector: 'a[href*="addEmployee"]' }] },
  { key: 'addEmployeeHeading',  strategies: [{ type: 'css', selector: 'h6:has-text("Add Employee")' }] },
  { key: 'firstNameInput',      strategies: [{ type: 'name', value: 'firstName' }, { type: 'css', selector: 'input[name="firstName"]' }] },
  { key: 'lastNameInput',       strategies: [{ type: 'name', value: 'lastName' },  { type: 'css', selector: 'input[name="lastName"]' }] },
  { key: 'saveButton',          strategies: [{ type: 'css', selector: 'button[type="submit"]:has-text("Save")' }, { type: 'role', role: 'button', options: { name: 'Save' } }] },
  { key: 'personalDetailsHeading', strategies: [{ type: 'css', selector: 'h6:has-text("Personal Details")' }] },
  { key: 'searchButton',        strategies: [{ type: 'role', role: 'button', options: { name: 'Search' } }, { type: 'css', selector: 'button.oxd-button--secondary[type="button"]' }] },
  { key: 'deleteConfirmButton', strategies: [{ type: 'css', selector: '.oxd-button--label-danger:has-text("Yes, Delete")' }, { type: 'role', role: 'button', options: { name: 'Yes, Delete' } }] },
  { key: 'userDropdown',        strategies: [{ type: 'css', selector: '.oxd-userdropdown-tab' }] },
  { key: 'logoutLink',          strategies: [{ type: 'text', value: 'Logout', exact: true }, { type: 'css', selector: 'a:has-text("Logout")' }] },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export async function heal(page: Page, key: string) {
  const entry = CRUD_LOCATORS.find(l => l.key === key)!;
  return healLocator(page, key, entry.strategies, HEAL_OPTS);
}

export async function loginAs(page: Page, user = 'Admin', pass = 'admin123'): Promise<void> {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 30_000 });
  await (await heal(page, 'loginUsername')).fill(user);
  await (await heal(page, 'loginPassword')).fill(pass);
  await (await heal(page, 'loginButton')).click();
  await page.waitForURL(/\/dashboard/i, { timeout: 60_000 });
  await page.waitForLoadState('domcontentloaded');
}

export async function navToPim(page: Page): Promise<void> {
  await page.locator('.oxd-sidepanel-body').waitFor({ state: 'visible', timeout: 15_000 });
  await (await heal(page, 'pimNavLink')).click();
  await page.waitForURL(/\/pim\//i, { timeout: 30_000 });
  await page.waitForLoadState('domcontentloaded');
}

export async function navToEmployeeList(page: Page): Promise<void> {
  await navToPim(page);
  const listLink = page.locator('a[href*="viewEmployeeList"], a:has-text("Employee List")').first();
  await listLink.waitFor({ state: 'visible', timeout: 15_000 });
  await listLink.click();
  await page.waitForURL(/viewEmployeeList/i, { timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
}

export async function searchEmployee(page: Page, name: string): Promise<void> {
  const searchInput = page.locator('.oxd-autocomplete-text-input input').first();
  await searchInput.waitFor({ state: 'visible', timeout: 15_000 });
  await searchInput.fill(name);

  const suggestion = page.locator('.oxd-autocomplete-dropdown li')
    .filter({ hasText: name }).first();
  if (await suggestion.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await suggestion.click();
  }

  await (await heal(page, 'searchButton')).click();
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
}
