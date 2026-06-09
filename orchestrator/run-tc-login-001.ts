/**
 * orchestrator/run-tc-login-001.ts
 *
 * Full agentic QA pipeline for TC_LOGIN_001:
 *   Planner → Designer → Generator → Execution → Healing → RCA
 *
 * Each agent writes its state to workflow-status.json so the live dashboard
 * shows the transition in real time.
 *
 * Run:
 *   npx ts-node orchestrator/run-tc-login-001.ts
 */

import { orchestrate, OrchestratorOptions, TestCase } from './orchestrator';
import { healLocator, HealerOptions } from '../healing/healer';
import { LocatorEntry } from '../healing/locatorRegistry';
import { Page } from 'playwright';

// ── Constants ────────────────────────────────────────────────────────────────
const BASE_URL = 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login';
const SUITE    = 'OrangeHRM Authentication';

const HEAL_OPTS: HealerOptions = {
  strategyTimeout: 15_000,
  promoteOnHeal:   true,
};

// ── Locator map ──────────────────────────────────────────────────────────────
const LOCATORS: LocatorEntry[] = [
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
      { type: 'css',  selector: 'h6.oxd-text--h6' },
    ],
  },
  {
    key: 'userDropdown',
    strategies: [
      { type: 'css', selector: '.oxd-userdropdown-tab' },
      { type: 'role', role: 'button', options: { name: 'Admin' } },
    ],
  },
  {
    key: 'logoutMenuItem',
    strategies: [
      { type: 'role', role: 'menuitem', options: { name: 'Logout' } },
      { type: 'text', value: 'Logout', exact: true },
    ],
  },
  {
    key: 'loginHeading',
    strategies: [
      { type: 'role', role: 'heading', options: { name: 'Login' } },
      { type: 'css',  selector: 'h5' },
    ],
  },
];

// ── Helper ───────────────────────────────────────────────────────────────────
function strategiesOf(key: string) {
  const entry = LOCATORS.find(l => l.key === key);
  if (!entry) throw new Error(`[run-tc-login-001] No locator entry for key "${key}"`);
  return entry.strategies;
}

// ── Test case ────────────────────────────────────────────────────────────────
const TEST_CASES: TestCase[] = [
  {
    id:    'TC_LOGIN_001',
    name:  'TC_LOGIN_001 — OrangeHRM Login and Logout Verification',
    suite: SUITE,
    url:   BASE_URL,
    steps: [
      {
        description: 'Navigate to OrangeHRM login page',
        action: async (page: Page) => {
          await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        },
      },
      {
        description: 'Verify Login heading is visible',
        action: async (page: Page) => {
          const locator = await healLocator(page, 'loginHeading', strategiesOf('loginHeading'), HEAL_OPTS);
          await locator.waitFor({ state: 'visible', timeout: 20_000 });
        },
      },
      {
        description: 'Fill username = Admin',
        action: async (page: Page) => {
          const locator = await healLocator(page, 'loginUsername', strategiesOf('loginUsername'), HEAL_OPTS);
          await locator.fill('Admin');
        },
      },
      {
        description: 'Fill password = admin123',
        action: async (page: Page) => {
          const locator = await healLocator(page, 'loginPassword', strategiesOf('loginPassword'), HEAL_OPTS);
          await locator.fill('admin123');
        },
      },
      {
        description: 'Click Login button',
        action: async (page: Page) => {
          const locator = await healLocator(page, 'loginButton', strategiesOf('loginButton'), HEAL_OPTS);
          await locator.click();
        },
      },
      {
        description: 'Verify Dashboard page is displayed',
        action: async (page: Page) => {
          await page.waitForURL('**/dashboard**', { timeout: 60_000 });
          const locator = await healLocator(page, 'dashboardHeading', strategiesOf('dashboardHeading'), HEAL_OPTS);
          await locator.waitFor({ state: 'visible', timeout: 20_000 });
        },
      },
      {
        description: 'Open user dropdown',
        action: async (page: Page) => {
          const locator = await healLocator(page, 'userDropdown', strategiesOf('userDropdown'), HEAL_OPTS);
          await locator.click();
        },
      },
      {
        description: 'Click Logout',
        action: async (page: Page) => {
          const locator = await healLocator(page, 'logoutMenuItem', strategiesOf('logoutMenuItem'), HEAL_OPTS);
          await locator.click();
        },
      },
      {
        description: 'Verify redirected back to Login page',
        action: async (page: Page) => {
          await page.waitForURL('**/auth/login**', { timeout: 60_000 });
          const locator = await healLocator(page, 'loginHeading', strategiesOf('loginHeading'), HEAL_OPTS);
          await locator.waitFor({ state: 'visible', timeout: 20_000 });
        },
      },
    ],
  },
];

// ── Run ──────────────────────────────────────────────────────────────────────
const options: OrchestratorOptions = {
  suiteName:  'TC_LOGIN_001 — OrangeHRM Login and Logout',
  testCases:  TEST_CASES,
  locatorMap: LOCATORS,
  healerOptions: HEAL_OPTS,
  postExecutionSelfHealRetry: {
    enabled: true,
    maxAttempts: 1,
    strategyTimeoutMs: 20000,
  },
  demoMode:   true,   // adds 2s/2s/3s delays so each agent is visible on the live dashboard
};

orchestrate(options).then(result => {
  console.log('\n══════════════════════════════════════════════');
  console.log(`  WORKFLOW STATUS : ${result.workflowStatus}`);
  console.log(`  TESTS PASSED   : ${result.testResults.filter(r => r.status === 'PASS').length}`);
  console.log(`  TESTS FAILED   : ${result.testResults.filter(r => r.status === 'FAIL').length}`);
  console.log(`  HEAL EVENTS    : ${result.healingEvents?.length ?? 0}`);
  console.log('══════════════════════════════════════════════\n');
  process.exit(result.workflowStatus === 'SUCCESS' ? 0 : 1);
}).catch(err => {
  console.error('[run-tc-login-001] Fatal error:', err);
  process.exit(1);
});
