/**
 * orchestrator/demo-pim.ts
 *
 * Full orchestrator pipeline — Add Employee & Verify in OrangeHRM PIM.
 *
 * Run:
 *   npx ts-node orchestrator/demo-pim.ts
 *
 * Workflow (with demo-mode delays so each step is visible on the dashboard):
 *   Planner (2s) → Designer (2s) → Generator (3s) → Execution → Healing → RCA
 *
 * Requirement:
 *   Add a new employee "John Agentic" and verify the profile record exists.
 */

import { Page } from 'playwright';
import { orchestrate, TestCase } from './orchestrator';
import { healLocator, HealerOptions } from '../healing/healer';
import { LocatorEntry } from '../healing/locatorRegistry';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login';
const SUITE    = 'OrangeHRM PIM — Add Employee & Verify';

const HEAL_OPTS: HealerOptions = {
  strategyTimeout: 10_000,
  promoteOnHeal:   true,
};

// ---------------------------------------------------------------------------
// Locator map — login + PIM add-employee + verify
// ---------------------------------------------------------------------------

const LOCATORS: LocatorEntry[] = [
  {
    key: 'loginUsername',
    strategies: [
      { type: 'name',        value: 'username' },
      { type: 'placeholder', value: 'Username' },
      { type: 'css',         selector: 'input.oxd-input[name="username"]' },
    ],
  },
  {
    key: 'loginPassword',
    strategies: [
      { type: 'name',        value: 'password' },
      { type: 'placeholder', value: 'Password' },
      { type: 'css',         selector: 'input.oxd-input[name="password"]' },
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
      { type: 'css',  selector: 'h6.oxd-text--h6' },
    ],
  },
  {
    key: 'pimNavLink',
    strategies: [
      { type: 'text', value: 'PIM',          exact: true },
      { type: 'css',  selector: 'a:has-text("PIM")' },
    ],
  },
  {
    key: 'addEmployeeLink',
    strategies: [
      { type: 'text', value: 'Add Employee', exact: true },
      { type: 'css',  selector: 'a:has-text("Add Employee")' },
    ],
  },
  {
    key: 'addEmployeeHeading',
    strategies: [
      { type: 'text', value: 'Add Employee', exact: true },
      { type: 'css',  selector: 'h6:has-text("Add Employee")' },
    ],
  },
  {
    key: 'firstNameInput',
    strategies: [
      { type: 'name', value: 'firstName' },
      { type: 'css',  selector: 'input[name="firstName"]' },
    ],
  },
  {
    key: 'lastNameInput',
    strategies: [
      { type: 'name', value: 'lastName' },
      { type: 'css',  selector: 'input[name="lastName"]' },
    ],
  },
  {
    key: 'saveButton',
    strategies: [
      { type: 'css',  selector: 'button[type="submit"]:has-text("Save")' },
      { type: 'role', role: 'button', options: { name: 'Save' } },
    ],
  },
  {
    key: 'personalDetailsHeading',
    strategies: [
      { type: 'text', value: 'Personal Details', exact: true },
      { type: 'css',  selector: 'h6:has-text("Personal Details")' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Healer helpers
// ---------------------------------------------------------------------------

function strategiesOf(key: string) {
  const entry = LOCATORS.find(l => l.key === key);
  if (!entry) throw new Error(`[demo-pim] No locator entry for key "${key}"`);
  return entry.strategies;
}

async function fill(page: Page, key: string, value: string): Promise<void> {
  const loc = await healLocator(page, key, strategiesOf(key), HEAL_OPTS);
  await loc.fill(value);
}

async function click(page: Page, key: string): Promise<void> {
  const loc = await healLocator(page, key, strategiesOf(key), HEAL_OPTS);
  await loc.click();
}

async function assertVisible(page: Page, key: string): Promise<void> {
  const { expect } = await import('@playwright/test');
  const loc = await healLocator(page, key, strategiesOf(key), HEAL_OPTS);
  await expect(loc).toBeVisible();
}

async function assertValue(page: Page, key: string, expected: string): Promise<void> {
  const { expect } = await import('@playwright/test');
  const loc = await healLocator(page, key, strategiesOf(key), HEAL_OPTS);
  await expect(loc).toHaveValue(expected, { timeout: 10_000 });
}

/** Reusable login + navigate to a URL after authentication. */
async function loginAndGoto(page: Page, afterLoginUrl?: string): Promise<void> {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 60_000 });
  await page.locator('input[name="username"]').fill('Admin');
  await page.locator('input[name="password"]').fill('admin123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard/i, { timeout: 60_000 });
  if (afterLoginUrl) await page.goto(afterLoginUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

const TEST_CASES: TestCase[] = [

  // ─── TC_PIM_001 — Login ───────────────────────────────────────────────────
  {
    id:    'TC_PIM_001',
    name:  'Login to OrangeHRM as Admin',
    suite: SUITE,
    url:   BASE_URL,
    steps: [
      {
        description: 'Wait for login form',
        action: async (page) => {
          await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 60_000 });
        },
      },
      { description: 'Enter username: Admin',   action: (page) => fill(page, 'loginUsername', 'Admin') },
      { description: 'Enter password: admin123', action: (page) => fill(page, 'loginPassword', 'admin123') },
      { description: 'Click Login button',       action: (page) => click(page, 'loginButton') },
      {
        description: 'Wait for Dashboard URL',
        action: (page) => page.waitForURL(/\/dashboard/i, { timeout: 60_000 }),
      },
      {
        description: 'Assert Dashboard heading visible',
        action: async (page) => {
          await page.waitForLoadState('domcontentloaded');
          await assertVisible(page, 'dashboardHeading');
        },
      },
    ],
  },

  // ─── TC_PIM_002 — Navigate to Add Employee ────────────────────────────────
  {
    id:    'TC_PIM_002',
    name:  'Navigate to PIM → Add Employee',
    suite: SUITE,
    url:   BASE_URL,
    steps: [
      {
        description: 'Login as Admin',
        action: (page) => loginAndGoto(page),
      },
      { description: 'Click PIM sidebar link',           action: (page) => click(page, 'pimNavLink') },
      { description: 'Click Add Employee link',           action: (page) => click(page, 'addEmployeeLink') },
      {
        description: 'Assert Add Employee heading visible',
        action: async (page) => {
          await page.waitForLoadState('domcontentloaded');
          await assertVisible(page, 'addEmployeeHeading');
        },
      },
    ],
  },

  // ─── TC_PIM_003 — Add Employee + Verify ──────────────────────────────────
  {
    id:    'TC_PIM_003',
    name:  'Add Employee "John Agentic" and verify profile exists',
    suite: SUITE,
    url:   BASE_URL,
    steps: [
      {
        description: 'Login as Admin and open Add Employee page',
        action: async (page) => {
          await loginAndGoto(page);
          await click(page, 'pimNavLink');
          await click(page, 'addEmployeeLink');
          await page.waitForLoadState('domcontentloaded');
        },
      },
      { description: 'Assert Add Employee heading visible', action: (page) => assertVisible(page, 'addEmployeeHeading') },
      { description: 'Fill First Name: John',               action: (page) => fill(page, 'firstNameInput', 'John') },
      { description: 'Fill Last Name: Agentic',             action: (page) => fill(page, 'lastNameInput', 'Agentic') },
      { description: 'Click Save button',                   action: (page) => click(page, 'saveButton') },
      {
        description: 'Wait for Personal Details URL (save confirmed)',
        action: (page) => page.waitForURL(/\/viewPersonalDetails\//i, { timeout: 60_000 }),
      },
      { description: 'Assert Personal Details heading visible', action: (page) => assertVisible(page, 'personalDetailsHeading') },
      { description: 'Verify First Name = John',               action: (page) => assertValue(page, 'firstNameInput', 'John') },
      { description: 'Verify Last Name = Agentic',             action: (page) => assertValue(page, 'lastNameInput', 'Agentic') },
    ],
  },
];

// ---------------------------------------------------------------------------
// Run — demo mode ON so Planner/Designer/Generator are visible on dashboard
// ---------------------------------------------------------------------------

orchestrate({
  suiteName:    SUITE,
  testCases:    TEST_CASES,
  locatorMap:   LOCATORS,
  healerOptions: HEAL_OPTS,
  demoMode:     true,          // Planner 2s · Designer 2s · Generator 3s delays
}).then(result => {
  process.exit(result.workflowStatus === 'SUCCESS' ? 0 : 1);
});
