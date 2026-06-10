/**
 * orchestrator/live-demo-mta.ts
 *
 * Live demo for MTA workflow with generator-timed testcase materialization.
 * The testcase file is created only after Generator completes.
 */

import * as dotenv from 'dotenv';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { orchestrate, TestCase } from './orchestrator';
import { HealerOptions } from '../healing/healer';
import { LocatorEntry } from '../healing/locatorRegistry';
import {
  CommercialLoginPage,
  CommercialQuoteManagerPage,
  CommercialProductSelectionPage,
} from '../src/pages/mlis-portal-commercial';
import { getBrokerCredentials, getMlisPortalUrl } from '../src/config/env';

dotenv.config({ path: resolve(__dirname, '../.env') });

const BASE_URL = getMlisPortalUrl();
const SUITE = 'MTA Live Demo Workflow';
const GENERATED_TEST_FILE = resolve(__dirname, '../tests/sanity/TC_SAN_MTA_001_live_generated.spec.ts');

const HEAL_OPTS: HealerOptions = {
  strategyTimeout: 10_000,
  promoteOnHeal: true,
};

const LOCATORS: LocatorEntry[] = [
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

function writeGeneratedMtaSpec(): void {
  const content = `// Generated at Generator phase for live MTA demo\nimport { test, expect } from '@playwright/test';\nimport { getMlisPortalUrl } from '../../src/config/env';\n\ntest.describe('@sanity | MTA | Live Generated', () => {\n  test('TC_SAN_MTA_001 | Mid Term Adjustment live generated testcase', async ({ page }) => {\n    test.setTimeout(120000);\n    await page.goto(getMlisPortalUrl(), { waitUntil: 'domcontentloaded' });\n    await expect(page.getByRole('textbox', { name: /Email address/i })).toBeVisible();\n  });\n});\n`;

  mkdirSync(resolve(__dirname, '../tests/sanity'), { recursive: true });
  writeFileSync(GENERATED_TEST_FILE, content, 'utf-8');
  console.log(`[live-demo-mta] Generated testcase at Generator phase: ${GENERATED_TEST_FILE}`);
}

async function main(): Promise<void> {
  getMlisPortalUrl();
  getBrokerCredentials();

  if (existsSync(GENERATED_TEST_FILE)) {
    unlinkSync(GENERATED_TEST_FILE);
    console.log(`[live-demo-mta] Removed pre-existing testcase before run: ${GENERATED_TEST_FILE}`);
  }

  const recoveryGate = { ready: false };

  const testCases: TestCase[] = [
    {
      id: 'TC_MTA_001',
      name: 'Create base policy and initiate MTA flow (live demo)',
      suite: SUITE,
      url: BASE_URL,
      steps: [
        {
          description: 'Login to MLIS portal and load quote manager',
          action: async (page) => {
            const loginPage = new CommercialLoginPage(page);
            const quoteManager = new CommercialQuoteManagerPage(page);
            const brokerCreds = getBrokerCredentials();
            await loginPage.goto();
            await loginPage.login(brokerCreds.username, brokerCreds.password);
            await quoteManager.expectLoaded();
          },
        },
        {
          description: 'Navigate to quote manager and start a commercial quote as MTA base',
          action: async (page) => {
            const loginPage = new CommercialLoginPage(page);
            const quoteManager = new CommercialQuoteManagerPage(page);
            const productSelection = new CommercialProductSelectionPage(page);
            await loginPage.goto();
            await quoteManager.expectLoaded();
            await quoteManager.startCommercialEnglandWalesQuote();
            await productSelection.expectLoaded();
            await productSelection.fillCaseReferenceAndLimit(`MTA-BASE-${Date.now()}`, '500000');
            await productSelection.selectProductsByIndex([1]);

            if (!recoveryGate.ready) {
              throw new Error('Intentional MTA live-demo failure to trigger Healing and RCA');
            }
          },
        },
      ],
    },
  ];

  const result = await orchestrate({
    suiteName: SUITE,
    testCases,
    locatorMap: LOCATORS,
    healerOptions: HEAL_OPTS,
    demoMode: true,
    onAfterGenerator: () => {
      writeGeneratedMtaSpec();
    },
    postExecutionSelfHealRetry: {
      enabled: true,
      maxAttempts: 1,
      strategyTimeoutMs: 10_000,
      onBeforeRetry: () => {
        recoveryGate.ready = true;
        console.log('[live-demo-mta] Recovery gate opened for retry run.');
      },
    },
  });

  process.exit(result.workflowStatus === 'SUCCESS' ? 0 : 1);
}

main().catch(err => {
  console.error('[live-demo-mta] Unhandled error:', err);
  process.exit(1);
});
