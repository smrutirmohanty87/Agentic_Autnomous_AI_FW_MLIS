/**
 * orchestrator/demo-pim-crud.ts
 *
 * Full Agentic QA Pipeline — OrangeHRM Employee CRUD Lifecycle
 *
 * Requirement:
 *   As an HR Administrator:
 *   1. Login → 2. Navigate to PIM → 3. Add "John Agentic" → 4. Save → 5. Verify creation
 *   6. Search employee → 7. Edit nickname to "JohnBot" → 8. Save → 9. Verify nickname
 *   10. Delete employee → 11. Verify gone → 12. Logout
 *
 * Run:
 *   npx ts-node orchestrator/demo-pim-crud.ts
 *
 * Agents (demo-mode delays for dashboard visibility):
 *   Planner (2s) → Designer (2s) → Generator (3s) → Execution → Healing → RCA
 */

import { Page } from 'playwright';
import { orchestrate, TestCase } from './orchestrator';
import {
  BASE_URL, EMPLOYEE_FIRST, EMPLOYEE_LAST, NICKNAME, CRUD_LOCATORS, HEAL_OPTS,
  heal, loginAs, navToPim, navToEmployeeList, searchEmployee,
} from '../tests/tc_006-helpers';

// ---------------------------------------------------------------------------
// Suite constant
// ---------------------------------------------------------------------------

const SUITE = 'OrangeHRM PIM — Employee CRUD Lifecycle';
const LOCATORS = CRUD_LOCATORS;

// Shared state — profile URL captured in TC_C01 for reference
let empProfileUrl = '';

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

const TEST_CASES: TestCase[] = [

  // ─── TC_C01 — Login + Add Employee ───────────────────────────────────────
  {
    id:    'TC_C01',
    name:  'Login and add employee John Agentic',
    suite: SUITE,
    url:   BASE_URL,
    steps: [
      { description: 'Login as Admin',          action: (p) => loginAs(p) },
      { description: 'Navigate to PIM',          action: (p) => navToPim(p) },
      { description: 'Click Add Employee',       action: async (p) => { await (await heal(p, 'addEmployeeNavLink')).click(); await p.waitForLoadState('domcontentloaded'); } },
      { description: 'Assert Add Employee form', action: async (p) => { const { expect } = await import('@playwright/test'); await expect(await heal(p, 'addEmployeeHeading')).toBeVisible({ timeout: 15_000 }); } },
      { description: 'Fill First Name: John',    action: (p) => heal(p, 'firstNameInput').then(l => l.fill(EMPLOYEE_FIRST)) },
      { description: 'Fill Last Name: Agentic',  action: (p) => heal(p, 'lastNameInput').then(l => l.fill(EMPLOYEE_LAST)) },
      { description: 'Click Save',               action: (p) => heal(p, 'saveButton').then(l => l.click()) },
      { description: 'Wait for Personal Details URL', action: (p) => p.waitForURL(/\/viewPersonalDetails\//i, { timeout: 60_000 }) },
      {
        description: 'Assert Personal Details visible + capture empNumber',
        action: async (p) => {
          const { expect } = await import('@playwright/test');
          await expect(await heal(p, 'personalDetailsHeading')).toBeVisible({ timeout: 15_000 });
          empProfileUrl = p.url();
          const m = empProfileUrl.match(/empNumber\/(\d+)/);
          console.log(`[TC_C01] Employee created — empNumber: ${m ? m[1] : 'unknown'} ✓`);
        },
      },
    ],
  },

  // ─── TC_C02 — Search and verify ──────────────────────────────────────────
  {
    id:    'TC_C02',
    name:  'Search for John Agentic in Employee List',
    suite: SUITE,
    url:   BASE_URL,
    steps: [
      { description: 'Login as Admin',          action: (p) => loginAs(p) },
      { description: 'Navigate to Employee List', action: (p) => navToEmployeeList(p) },
      { description: 'Search for John Agentic',  action: (p) => searchEmployee(p, `${EMPLOYEE_FIRST} ${EMPLOYEE_LAST}`) },
      {
        description: 'Verify employee row visible',
        action: async (p) => {
          const { expect } = await import('@playwright/test');
          const rows = p.locator('.oxd-table-body .oxd-table-row');
          await expect(rows.first()).toBeVisible({ timeout: 20_000 });
          const cell = p.locator('.oxd-table-body').getByText(`${EMPLOYEE_FIRST} ${EMPLOYEE_LAST}`, { exact: false });
          await expect(cell.first()).toBeVisible({ timeout: 15_000 });
          console.log(`[TC_C02] "${EMPLOYEE_FIRST} ${EMPLOYEE_LAST}" found in results ✓`);
        },
      },
    ],
  },

  // ─── TC_C03 — Edit Nickname ───────────────────────────────────────────────
  {
    id:    'TC_C03',
    name:  `Edit nickname to "${NICKNAME}"`,
    suite: SUITE,
    url:   BASE_URL,
    steps: [
      { description: 'Login as Admin',           action: (p) => loginAs(p) },
      { description: 'Navigate to Employee List', action: (p) => navToEmployeeList(p) },
      { description: 'Search for John Agentic',    action: (p) => searchEmployee(p, `${EMPLOYEE_FIRST} ${EMPLOYEE_LAST}`) },
      {
        description: 'Open employee profile',
        action: async (p) => {
          const firstRow = p.locator('.oxd-table-body .oxd-table-row').first();
          await firstRow.waitFor({ state: 'visible', timeout: 20_000 });
          await firstRow.locator('.oxd-icon-button').first().click();
          await p.waitForURL(/\/viewPersonalDetails\//i, { timeout: 30_000 });
          await p.waitForLoadState('domcontentloaded');
        },
      },
      {
        description: `Enter nickname: ${NICKNAME}`,
        action: async (p) => {
          // OrangeHRM Personal Details — Nick Name input is the 4th text input
          // in the top personal-info grid (after First, Middle, Last)
          // Use the label span text to locate the parent cell, then grab its input
          const nicknameInput = p.locator('.oxd-grid-item').filter({ hasText: /nick\s*name/i }).locator('input').first();
          const fallback      = p.locator('input.oxd-input').nth(3); // 4th input on Personal Details
          const target = await nicknameInput.isVisible({ timeout: 8_000 }).catch(() => false)
            ? nicknameInput
            : fallback;
          await target.waitFor({ state: 'visible', timeout: 15_000 });
          await target.clear();
          await target.fill(NICKNAME);
        },
      },
      {
        description: 'Save Personal Details',
        action: async (p) => {
          const saveBtn = p.locator('button[type="submit"]').filter({ hasText: 'Save' }).first();
          await saveBtn.click();
          const { expect } = await import('@playwright/test');
          const toast = p.locator('.oxd-toast-container .oxd-toast--success');
          await expect(toast).toBeVisible({ timeout: 15_000 });
        },
      },
      {
        description: `Verify nickname = "${NICKNAME}"`,
        action: async (p) => {
          await p.waitForLoadState('domcontentloaded');
          const { expect } = await import('@playwright/test');
          const nicknameInput = p.locator('.oxd-grid-item').filter({ hasText: /nick\s*name/i }).locator('input').first();
          const fallback      = p.locator('input.oxd-input').nth(3);
          const target = await nicknameInput.isVisible({ timeout: 5_000 }).catch(() => false)
            ? nicknameInput
            : fallback;
          await expect(target).toHaveValue(NICKNAME, { timeout: 15_000 });
          console.log(`[TC_C03] Nickname verified as "${NICKNAME}" ✓`);
        },
      },
    ],
  },

  // ─── TC_C04 — Delete and verify gone ─────────────────────────────────────
  {
    id:    'TC_C04',
    name:  'Delete John Agentic and verify removal from search',
    suite: SUITE,
    url:   BASE_URL,
    steps: [
      { description: 'Login as Admin',            action: (p) => loginAs(p) },
      { description: 'Navigate to Employee List',  action: (p) => navToEmployeeList(p) },
      { description: 'Search for John Agentic',    action: (p) => searchEmployee(p, `${EMPLOYEE_FIRST} ${EMPLOYEE_LAST}`) },
      {
        description: 'Click delete icon on first row',
        action: async (p) => {
          const firstRow = p.locator('.oxd-table-body .oxd-table-row').first();
          await firstRow.waitFor({ state: 'visible', timeout: 20_000 });
          await firstRow.locator('.oxd-icon-button').nth(1).click();
        },
      },
      {
        description: 'Confirm deletion',
        action: async (p) => {
          const confirmBtn = await heal(p, 'deleteConfirmButton');
          await confirmBtn.click();
          const { expect } = await import('@playwright/test');
          const toast = p.locator('.oxd-toast-container .oxd-toast--success');
          await expect(toast).toBeVisible({ timeout: 15_000 });
          console.log('[TC_C04] Deletion confirmed ✓');
        },
      },
      {
        description: 'Re-search and verify No Records Found',
        action: async (p) => {
          await p.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
          await searchEmployee(p, `${EMPLOYEE_FIRST} ${EMPLOYEE_LAST}`);
          const { expect } = await import('@playwright/test');
          // OrangeHRM shows "(0) Records Found" or "No Records Found"
          const noRecords = p.locator('.oxd-table-filter-header-title span, .orangehrm-horizontal-padding span')
            .filter({ hasText: /\(0\) Records Found|No Records Found/i });
          await expect(noRecords.first()).toBeVisible({ timeout: 20_000 });
          console.log('[TC_C04] "(0) Records Found" — employee deleted ✓');
        },
      },
    ],
  },

  // ─── TC_C05 — Logout ─────────────────────────────────────────────────────
  {
    id:    'TC_C05',
    name:  'Logout from application',
    suite: SUITE,
    url:   BASE_URL,
    steps: [
      { description: 'Login as Admin',   action: (p) => loginAs(p) },
      { description: 'Click user dropdown', action: (p) => heal(p, 'userDropdown').then(l => l.click()) },
      { description: 'Click Logout',        action: (p) => heal(p, 'logoutLink').then(l => l.click()) },
      { description: 'Verify login page',   action: async (p) => {
        await p.waitForURL(/\/auth\/login/i, { timeout: 30_000 });
        const { expect } = await import('@playwright/test');
        await expect(p.locator('input[name="username"]')).toBeVisible({ timeout: 10_000 });
        console.log('[TC_C05] Logged out successfully ✓');
      }},
    ],
  },
];

// ---------------------------------------------------------------------------
// Run via full Agentic QA pipeline
// ---------------------------------------------------------------------------

orchestrate({
  suiteName:     SUITE,
  testCases:     TEST_CASES,
  locatorMap:    LOCATORS,
  healerOptions: HEAL_OPTS,
  demoMode:      true,   // Planner 2s · Designer 2s · Generator 3s
}).then(result => {
  process.exit(result.workflowStatus === 'SUCCESS' ? 0 : 1);
});
