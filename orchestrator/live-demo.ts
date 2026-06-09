/**
 * orchestrator/live-demo.ts
 *
 * Interactive demo entry point for showing the live dashboard pipeline.
 * Prompts for a test case description, then runs the orchestrator with
 * demo-mode delays so the dashboard visibly transitions through:
 * Planner → Designer → Generator → Execution → Healing → RCA.
 *
 * Run:
 *   npx ts-node orchestrator/live-demo.ts
 */

import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { Page } from 'playwright';
import { orchestrate, TestCase } from './orchestrator';
import { healLocator, HealerOptions } from '../healing/healer';
import { LocatorEntry } from '../healing/locatorRegistry';

const BASE_URL = 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login';
const DEFAULT_SUITE = 'Live Demo Test Suite';
const DEFAULT_OBJECTIVE = 'Verify OrangeHRM login with live healing and re-execution';

const HEAL_OPTS: HealerOptions = {
  strategyTimeout: 10_000,
  promoteOnHeal: true,
};

const LOCATORS: LocatorEntry[] = [
  {
    key: 'loginHeading',
    strategies: [
      { type: 'role', role: 'heading', options: { name: 'Login' } },
      { type: 'text', value: 'Login', exact: true },
      { type: 'css', selector: 'h5.orangehrm-login-title' },
    ],
  },
  {
    key: 'loginUsername',
    strategies: [
      { type: 'name', value: 'username' },
      { type: 'placeholder', value: 'Username' },
      { type: 'css', selector: 'input.oxd-input[name="username"]' },
    ],
  },
  {
    key: 'loginPassword',
    strategies: [
      { type: 'name', value: 'password' },
      { type: 'placeholder', value: 'Password' },
      { type: 'css', selector: 'input.oxd-input[name="password"]' },
    ],
  },
  {
    key: 'loginButton',
    strategies: [
      { type: 'role', role: 'button', options: { name: 'Login' } },
      { type: 'css', selector: 'button[type="submit"]' },
    ],
  },
  {
    key: 'dashboardHeading',
    strategies: [
      { type: 'role', role: 'heading', options: { name: 'Dashboard' } },
      { type: 'text', value: 'Dashboard', exact: true },
      { type: 'css', selector: 'h6.oxd-text--h6' },
    ],
  },
];

function strategiesOf(key: string) {
  const entry = LOCATORS.find(item => item.key === key);
  if (!entry) throw new Error(`[live-demo] No locator entry for key "${key}"`);
  return entry.strategies;
}

async function fill(page: Page, key: string, value: string): Promise<void> {
  const locator = await healLocator(page, key, strategiesOf(key), HEAL_OPTS);
  await locator.fill(value);
}

async function click(page: Page, key: string): Promise<void> {
  const locator = await healLocator(page, key, strategiesOf(key), HEAL_OPTS);
  await locator.click();
}

async function assertVisible(page: Page, key: string): Promise<void> {
  const { expect } = await import('@playwright/test');
  const locator = await healLocator(page, key, strategiesOf(key), HEAL_OPTS);
  await expect(locator).toBeVisible();
}

async function buildTestCases(objective: string, recoveryGate: { ready: boolean }): Promise<TestCase[]> {
  return [
    {
      id: 'TC_LIVE_001',
      name: `${objective} - login page loads`,
      suite: DEFAULT_SUITE,
      url: BASE_URL,
      steps: [
        {
          description: 'Wait for login form',
          action: async (page) => {
            await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 30_000 });
          },
        },
        { description: 'Assert login heading visible', action: (page) => assertVisible(page, 'loginHeading') },
        { description: 'Assert username visible', action: (page) => assertVisible(page, 'loginUsername') },
      ],
    },
    {
      id: 'TC_LIVE_002',
      name: `${objective} - demonstrate healing and re-execution`,
      suite: DEFAULT_SUITE,
      url: BASE_URL,
      steps: [
        {
          description: 'Wait for login form',
          action: async (page) => {
            await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 30_000 });
          },
        },
        {
          description: 'Fill username with healable locator',
          action: async (page) => {
            const locator = await healLocator(
              page,
              'loginUsername-live-demo',
              [
                { type: 'name', value: '__broken_name_that_needs_healing__' },
                { type: 'css', selector: 'input[name="username"]' },
              ],
              { ...HEAL_OPTS, strategyTimeout: 500 }
            );
            await locator.fill('Admin');
          },
        },
        { description: 'Fill password', action: (page) => fill(page, 'loginPassword', 'admin123') },
        { description: 'Click login', action: (page) => click(page, 'loginButton') },
        {
          description: 'Wait for dashboard',
          action: async (page) => {
            await page.waitForURL(/\/dashboard/i, { timeout: 60_000 });
            await page.waitForLoadState('domcontentloaded');
            await assertVisible(page, 'dashboardHeading');
          },
        },
        {
          description: 'Gate the first pass so retry is visible',
          action: async () => {
            if (!recoveryGate.ready) {
              throw new Error('Intentional live-demo failure to trigger Healing and re-execution');
            }
          },
        },
      ],
    },
  ];
}

async function main(): Promise<void> {
  const rl = createInterface({ input, output });

  try {
    const suiteAnswer = (await rl.question(`Suite name [${DEFAULT_SUITE}]: `)).trim();
    const objectiveAnswer = (await rl.question(`Test objective [${DEFAULT_OBJECTIVE}]: `)).trim();

    const suiteName = suiteAnswer || DEFAULT_SUITE;
    const objective = objectiveAnswer || DEFAULT_OBJECTIVE;

    const recoveryGate = { ready: false };
    const testCases = await buildTestCases(objective, recoveryGate);

    console.log('\n[live-demo] Starting live demo run...');
    console.log(`[live-demo] Suite: ${suiteName}`);
    console.log(`[live-demo] Objective: ${objective}`);
    console.log('[live-demo] The dashboard will show Planner → Designer → Generator → Execution → Healing → RCA.');

    const result = await orchestrate({
      suiteName,
      testCases,
      locatorMap: LOCATORS,
      healerOptions: HEAL_OPTS,
      demoMode: true,
      postExecutionSelfHealRetry: {
        enabled: true,
        maxAttempts: 1,
        strategyTimeoutMs: 10_000,
        onBeforeRetry: () => {
          recoveryGate.ready = true;
          console.log('[live-demo] Recovery gate opened for the retry run.');
        },
      },
    });

    process.exit(result.workflowStatus === 'SUCCESS' ? 0 : 1);
  } finally {
    rl.close();
  }
}

main().catch(err => {
  console.error('[live-demo] Unhandled error:', err);
  process.exit(1);
});