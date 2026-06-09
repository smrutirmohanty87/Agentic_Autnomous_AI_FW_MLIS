/**
 * tests/tc_006-pim-employee-crud.spec.ts
 *
 * HR Administrator — Employee CRUD lifecycle:
 *   Login → Add Employee → Save → Search → Edit Nickname → Save → Delete → Verify Gone → Logout
 *
 * Self-healing locators via healLocator().
 * Run standalone:  npx playwright test tests/tc_006-pim-employee-crud.spec.ts --reporter=list
 * Run via orch:    npx ts-node orchestrator/demo-pim-crud.ts
 */

import { test, expect, Page } from '@playwright/test';
import { printHealSummary, clearHealLog } from '../healing/healer';
import {
  BASE_URL, EMPLOYEE_FIRST, EMPLOYEE_LAST, NICKNAME,
  heal, loginAs, navToPim, navToEmployeeList, searchEmployee,
} from './tc_006-helpers';

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('OrangeHRM PIM — Employee CRUD Lifecycle', () => {
  test.beforeEach(() => clearHealLog());
  test.afterEach(() => printHealSummary());

  // Shared state between tests (empNumber from TC_HR_C01 → used in C03/C04)
  let createdEmpNumber = '';

  // ─────────────────────────────────────────────────────────────────────────
  // TC_HR_C01 — Create employee
  // ─────────────────────────────────────────────────────────────────────────
  test('TC_HR_C01 — Login and add employee John Agentic', async ({ page }) => {
    test.setTimeout(120_000);

    await loginAs(page);
    await navToPim(page);
    await (await heal(page, 'addEmployeeNavLink')).click();
    await page.waitForLoadState('domcontentloaded');
    await expect(await heal(page, 'addEmployeeHeading')).toBeVisible({ timeout: 15_000 });

    await (await heal(page, 'firstNameInput')).fill(EMPLOYEE_FIRST);
    await (await heal(page, 'lastNameInput')).fill(EMPLOYEE_LAST);
    await (await heal(page, 'saveButton')).click();

    await page.waitForURL(/\/viewPersonalDetails\//i, { timeout: 60_000 });
    await expect(await heal(page, 'personalDetailsHeading')).toBeVisible({ timeout: 15_000 });

    const empMatch = page.url().match(/empNumber\/(\d+)/);
    createdEmpNumber = empMatch ? empMatch[1] : '';
    console.log(`[TC_HR_C01] Employee created — empNumber: ${createdEmpNumber} ✓`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC_HR_C02 — Search and verify employee appears in list
  // ─────────────────────────────────────────────────────────────────────────
  test('TC_HR_C02 — Search for John Agentic in Employee List', async ({ page }) => {
    test.setTimeout(120_000);

    await loginAs(page);
    await navToEmployeeList(page);
    await searchEmployee(page, `${EMPLOYEE_FIRST} ${EMPLOYEE_LAST}`);

    const rows = page.locator('.oxd-table-body .oxd-table-row');
    await expect(rows.first()).toBeVisible({ timeout: 20_000 });

    const resultCell = page.locator('.oxd-table-body').getByText(`${EMPLOYEE_FIRST} ${EMPLOYEE_LAST}`, { exact: false });
    await expect(resultCell.first()).toBeVisible({ timeout: 15_000 });
    console.log(`[TC_HR_C02] "${EMPLOYEE_FIRST} ${EMPLOYEE_LAST}" found in search results ✓`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC_HR_C03 — Edit nickname
  // ─────────────────────────────────────────────────────────────────────────
  test('TC_HR_C03 — Edit nickname to JohnBot and verify', async ({ page }) => {
    test.setTimeout(180_000);

    await loginAs(page);
    await navToEmployeeList(page);
    await searchEmployee(page, `${EMPLOYEE_FIRST} ${EMPLOYEE_LAST}`);

    // Click the employee row to open profile
    const firstRow = page.locator('.oxd-table-body .oxd-table-row').first();
    await firstRow.waitFor({ state: 'visible', timeout: 20_000 });
    await firstRow.locator('.oxd-icon-button').first().click();
    await page.waitForURL(/\/viewPersonalDetails\//i, { timeout: 30_000 });
    await page.waitForLoadState('domcontentloaded');

    // Locate the Nick Name input — it's after the label "Nick Name"
    // OrangeHRM renders labels as <label> with spans; the input follows in the same row
    const nicknameLabel = page.locator('label:has-text("Nick Name")');
    await nicknameLabel.waitFor({ state: 'visible', timeout: 15_000 });
    // The input is in the same .oxd-grid-item as the label
    const nicknameInput = nicknameLabel.locator('..').locator('..').locator('input');
    await nicknameInput.waitFor({ state: 'visible', timeout: 10_000 });
    await nicknameInput.clear();
    await nicknameInput.fill(NICKNAME);

    // Save Personal Details
    const saveBtn = page.locator('button[type="submit"]').filter({ hasText: 'Save' }).first();
    await saveBtn.click();

    const toast = page.locator('.oxd-toast-container .oxd-toast--success');
    await expect(toast).toBeVisible({ timeout: 15_000 });
    await page.waitForLoadState('domcontentloaded');
    await expect(nicknameInput).toHaveValue(NICKNAME, { timeout: 15_000 });
    console.log(`[TC_HR_C03] Nickname verified as "${NICKNAME}" ✓`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC_HR_C04 — Delete employee and verify they're gone
  // ─────────────────────────────────────────────────────────────────────────
  test('TC_HR_C04 — Delete John Agentic and verify removal', async ({ page }) => {
    test.setTimeout(180_000);

    await loginAs(page);
    await navToEmployeeList(page);
    await searchEmployee(page, `${EMPLOYEE_FIRST} ${EMPLOYEE_LAST}`);

    const firstRow = page.locator('.oxd-table-body .oxd-table-row').first();
    await firstRow.waitFor({ state: 'visible', timeout: 20_000 });
    await firstRow.locator('.oxd-icon-button').nth(1).click();

    const confirmBtn = await heal(page, 'deleteConfirmButton');
    await confirmBtn.click();

    const toast = page.locator('.oxd-toast-container .oxd-toast--success');
    await expect(toast).toBeVisible({ timeout: 15_000 });
    console.log('[TC_HR_C04] Delete confirmed ✓');

    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    const searchInput2 = page.locator('.oxd-autocomplete-text-input input').first();
    await searchInput2.clear();
    await searchInput2.fill(`${EMPLOYEE_FIRST} ${EMPLOYEE_LAST}`);
    await (await heal(page, 'searchButton')).click();
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});

    const noRecords = page.locator('.oxd-table-filter-header-title span, .orangehrm-horizontal-padding span')
      .filter({ hasText: /\(0\) Records Found|No Records Found/i });
    await expect(noRecords.first()).toBeVisible({ timeout: 20_000 });
    console.log('[TC_HR_C04] No Records Found — deletion verified ✓');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TC_HR_C05 — Logout
  // ─────────────────────────────────────────────────────────────────────────
  test('TC_HR_C05 — Logout from application', async ({ page }) => {
    test.setTimeout(60_000);

    await loginAs(page);
    await (await heal(page, 'userDropdown')).click();
    await (await heal(page, 'logoutLink')).click();
    await page.waitForURL(/\/auth\/login/i, { timeout: 30_000 });
    await expect(page.locator('input[name="username"]')).toBeVisible({ timeout: 10_000 });
    console.log('[TC_HR_C05] Logged out successfully ✓');
  });
});
