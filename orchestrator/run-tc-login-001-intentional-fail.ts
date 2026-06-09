/**
 * orchestrator/run-tc-login-001-intentional-fail.ts
 *
 * Same as TC_LOGIN_001 but with one intentionally broken locator step
 * to force an execution failure and verify post-execution self-heal retry.
 */

import { orchestrate, OrchestratorOptions, TestCase } from './orchestrator';
import { healLocator, HealerOptions } from '../healing/healer';
import { LocatorEntry } from '../healing/locatorRegistry';
import { Page } from 'playwright';

const BASE_URL = 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login';
const SUITE = 'OrangeHRM Authentication (Intentional Fail)';

const HEAL_OPTS: HealerOptions = {
  strategyTimeout: 15_000,
  promoteOnHeal: true,
};

const LOCATORS: LocatorEntry[] = [
  {
    key: 'loginUsername',
    strategies: [
      { type: 'css', selector: 'input[name="username"]' },
      { type: 'placeholder', value: 'Username' },
    ],
  },
  {
    key: 'loginPassword',
    strategies: [
      { type: 'css', selector: 'input[name="password"]' },
      { type: 'placeholder', value: 'Password' },
    ],
  },
  {
    key: 'loginButton',
    strategies: [
      { type: 'css', selector: 'button[type="submit"]' },
      { type: 'role', role: 'button', options: { name: 'Login' } },
    ],
  },
  {
    key: 'dashboardHeading',
    strategies: [
      { type: 'role', role: 'heading', options: { name: 'Dashboard' } },
      { type: 'css', selector: 'h6.oxd-text--h6' },
    ],
  },
  {
    key: 'userDropdown',
    strategies: [
      { type: 'css', selector: '.oxd-userdropdown-tab' },
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
      { type: 'css', selector: 'h5' },
    ],
  },
];

function strategiesOf(key: string) {
  const entry = LOCATORS.find(l => l.key === key);
  if (!entry) throw new Error(`[intentional-fail] No locator entry for key "${key}"`);
  return entry.strategies;
}

const TEST_CASES: TestCase[] = [
  {
    id: 'TC_LOGIN_001_FAIL',
    name: 'TC_LOGIN_001_FAIL — Intentional failing run to validate self-heal retry',
    suite: SUITE,
    url: BASE_URL,
    steps: [
      {
        description: 'Navigate to login page',
        action: async (page: Page) => {
          await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        },
      },
      {
        description: 'Fill username',
        action: async (page: Page) => {
          const locator = await healLocator(page, 'loginUsername', strategiesOf('loginUsername'), HEAL_OPTS);
          await locator.fill('Admin');
        },
      },
      {
        description: 'Fill password',
        action: async (page: Page) => {
          const locator = await healLocator(page, 'loginPassword', strategiesOf('loginPassword'), HEAL_OPTS);
          await locator.fill('admin123');
        },
      },
      {
        description: 'Click login',
        action: async (page: Page) => {
          const locator = await healLocator(page, 'loginButton', strategiesOf('loginButton'), HEAL_OPTS);
          await locator.click();
        },
      },
      {
        description: 'Intentional failure step (non-existing selector)',
        action: async (page: Page) => {
          // This is intentionally broken to force initial execution failure.
          await page.locator('#definitely-does-not-exist').click({ timeout: 2000 });
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
        description: 'Logout',
        action: async (page: Page) => {
          const locator = await healLocator(page, 'logoutMenuItem', strategiesOf('logoutMenuItem'), HEAL_OPTS);
          await locator.click();
        },
      },
    ],
  },
];

const options: OrchestratorOptions = {
  suiteName: 'TC_LOGIN_001_FAIL — Self-heal retry verification',
  testCases: TEST_CASES,
  locatorMap: LOCATORS,
  healerOptions: HEAL_OPTS,
  postExecutionSelfHealRetry: {
    enabled: true,
    maxAttempts: 1,
    strategyTimeoutMs: 20000,
  },
  demoMode: true,
};

orchestrate(options)
  .then(result => {
    console.log('\n══════════════════════════════════════════════');
    console.log(`  WORKFLOW STATUS : ${result.workflowStatus}`);
    console.log(`  TESTS PASSED   : ${result.testResults.filter(r => r.status === 'PASS').length}`);
    console.log(`  TESTS FAILED   : ${result.testResults.filter(r => r.status === 'FAIL').length}`);
    console.log(`  HEAL EVENTS    : ${result.healingEvents?.length ?? 0}`);
    console.log('══════════════════════════════════════════════\n');
    process.exit(result.workflowStatus === 'SUCCESS' ? 0 : 1);
  })
  .catch(err => {
    console.error('[intentional-fail] Fatal error:', err);
    process.exit(1);
  });
