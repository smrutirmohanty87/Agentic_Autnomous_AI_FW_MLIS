/**
 * orchestrator/demo.ts
 *
 * Standalone demo that drives the full QA Orchestrator pipeline
 * against the OrangeHRM public demo site.
 *
 * Run:
 *   npx ts-node orchestrator/demo.ts
 *
 * Workflow executed:
 *   Planner → Designer → Generator → Execution → Healing → RCA → Final Report
 */

import { Page } from 'playwright';
import { orchestrate, TestCase, OrchestratorResult } from './orchestrator';
import { healLocator, HealerOptions } from '../healing/healer';
import { LocatorEntry } from '../healing/locatorRegistry';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL  = 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login';
const SUITE     = 'OrangeHRM Login Suite';

const HEAL_OPTS: HealerOptions = {
  strategyTimeout: 10000,
  promoteOnHeal: true,
};

// ---------------------------------------------------------------------------
// Locator map (single source of truth — shared by Designer + every test step)
// ---------------------------------------------------------------------------

const LOCATORS: LocatorEntry[] = [
  {
    key: 'loginHeading',
    strategies: [
      { type: 'role', role: 'heading', options: { name: 'Login' } },
      { type: 'text', value: 'Login', exact: true },
      { type: 'css',  selector: 'h5.orangehrm-login-title' },
    ],
  },
  {
    key: 'loginUsername',
    strategies: [
      { type: 'name',        value: 'username' },
      { type: 'placeholder', value: 'Username' },
      { type: 'label',       value: 'Username' },
      { type: 'role',        role: 'textbox', options: { name: 'Username' } },
      { type: 'css',         selector: 'input.oxd-input[name="username"]' },
    ],
  },
  {
    key: 'loginPassword',
    strategies: [
      { type: 'name',        value: 'password' },
      { type: 'placeholder', value: 'Password' },
      { type: 'label',       value: 'Password' },
      { type: 'role',        role: 'textbox', options: { name: 'Password' } },
      { type: 'css',         selector: 'input.oxd-input[name="password"]' },
    ],
  },
  {
    key: 'loginButton',
    strategies: [
      { type: 'role', role: 'button', options: { name: 'Login' } },
      { type: 'css',  selector: 'button[type="submit"]' },
      { type: 'text', value: 'Login', exact: true },
    ],
  },
  {
    key: 'dashboardHeading',
    strategies: [
      { type: 'role', role: 'heading', options: { name: 'Dashboard' } },
      { type: 'text', value: 'Dashboard', exact: true },
      { type: 'css',  selector: 'h6.oxd-text--h6' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helper — resolve a locator by key from the shared LOCATORS array
// ---------------------------------------------------------------------------

function strategiesOf(key: string) {
  const entry = LOCATORS.find(l => l.key === key);
  if (!entry) throw new Error(`[demo] No locator entry for key "${key}"`);
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

// ---------------------------------------------------------------------------
// Test case definitions
// ---------------------------------------------------------------------------

const TEST_CASES: TestCase[] = [
  // ------------------------------------------------------------------
  // TC_001 — Verify Login page loads
  // ------------------------------------------------------------------
  {
    id:    'TC_001',
    name:  'Login page loads with self-healing locators',
    suite: SUITE,
    url:   BASE_URL,
    steps: [
      {
        description: 'Wait for form to render',
        action: async (page) => {
          await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 30000 });
        },
      },
      {
        description: 'Assert Login heading is visible',
        action: (page) => assertVisible(page, 'loginHeading'),
      },
      {
        description: 'Assert Username field is visible',
        action: (page) => assertVisible(page, 'loginUsername'),
      },
      {
        description: 'Assert Password field is visible',
        action: (page) => assertVisible(page, 'loginPassword'),
      },
      {
        description: 'Assert Login button is visible',
        action: (page) => assertVisible(page, 'loginButton'),
      },
    ],
  },

  // ------------------------------------------------------------------
  // TC_002 — Successful login → Dashboard
  // ------------------------------------------------------------------
  {
    id:    'TC_002',
    name:  'Successful login with self-healing locators',
    suite: SUITE,
    url:   BASE_URL,
    steps: [
      {
        description: 'Wait for form to render',
        action: async (page) => {
          await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 30000 });
        },
      },
      {
        description: 'Enter username: Admin',
        action: (page) => fill(page, 'loginUsername', 'Admin'),
      },
      {
        description: 'Enter password: admin123',
        action: (page) => fill(page, 'loginPassword', 'admin123'),
      },
      {
        description: 'Click Login button',
        action: (page) => click(page, 'loginButton'),
      },
      {
        description: 'Wait for Dashboard URL',
        action: (page) => page.waitForURL(/\/dashboard/i, { timeout: 60000 }),
      },
      {
        description: 'Assert Dashboard heading is visible',
        action: async (page) => {
          await page.waitForLoadState('domcontentloaded');
          await assertVisible(page, 'dashboardHeading');
        },
      },
    ],
  },

  // ------------------------------------------------------------------
  // TC_003 — Healing fallback demo (broken primary → CSS heals)
  // ------------------------------------------------------------------
  {
    id:    'TC_003',
    name:  'Healing fallback: CSS used when primary name strategy is broken',
    suite: SUITE,
    url:   BASE_URL,
    steps: [
      {
        description: 'Wait for form to render',
        action: async (page) => {
          await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 30000 });
        },
      },
      {
        description: 'Resolve username via broken primary → CSS fallback',
        action: async (page) => {
          const { expect } = await import('@playwright/test');
          const loc = await healLocator(
            page,
            'loginUsername-fallback-demo',
            [
              { type: 'name', value: '__broken_name_that_does_not_exist__' },
              { type: 'css',  selector: 'input[name="username"]' },
            ],
            { ...HEAL_OPTS, strategyTimeout: 500 }   // fail fast on broken strategy
          );
          await expect(loc).toBeVisible();
          await loc.fill('Admin');
        },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const result: OrchestratorResult = await orchestrate({
    suiteName:     SUITE,
    testCases:     TEST_CASES,
    locatorMap:    LOCATORS,
    healerOptions: HEAL_OPTS,
  });

  process.exit(result.workflowStatus === 'SUCCESS' ? 0 : 1);
}

main().catch(err => {
  console.error('[demo] Unhandled error:', err);
  process.exit(1);
});
