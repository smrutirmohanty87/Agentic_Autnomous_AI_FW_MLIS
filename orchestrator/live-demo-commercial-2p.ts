/**
 * orchestrator/live-demo-commercial-2p.ts
 *
 * Demo entry point for the cloned Commercial England & Wales policy flow
 * using exactly 2 products while showing every agent live on the dashboard.
 *
 * Run:
 *   npx ts-node orchestrator/live-demo-commercial-2p.ts
 */

import { Page } from 'playwright';
import { orchestrate, TestCase } from './orchestrator';
import { healLocator, HealerOptions } from '../healing/healer';
import { LocatorEntry } from '../healing/locatorRegistry';
import {
  CommercialLoginPage,
  CommercialQuoteManagerPage,
  CommercialProductSelectionPage,
  CommercialStatementsOfFactPage,
  CommercialQuotesPage,
  CommercialFinalPolicyDetailsPage,
  CommercialSummaryPage,
  CommercialOrderDialog,
  CommercialPolicyIssuedPage,
} from '../src/pages/mlis-portal-commercial';
import { getBrokerCredentials } from '../src/config/env';

const BASE_URL = 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login';
const SUITE = 'Commercial England & Wales 2-Product Live Demo';

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

function strategiesOf(key: string) {
  const entry = LOCATORS.find(item => item.key === key);
  if (!entry) throw new Error(`[commercial-live-demo] No locator entry for key "${key}"`);
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

async function main(): Promise<void> {
  process.env.MLIS_PORTAL_URL = process.env.MLIS_PORTAL_URL || BASE_URL;
  process.env.SALESFORCE_LIGHTNING_URL = process.env.SALESFORCE_LIGHTNING_URL || 'https://example.lightning.force.com';
  process.env.BROKER_USERNAME = process.env.BROKER_USERNAME || 'Admin';
  process.env.BROKER_PASSWORD = process.env.BROKER_PASSWORD || 'admin123';
  process.env.SALESFORCE_USERNAME = process.env.SALESFORCE_USERNAME || 'demo@example.com';
  process.env.SALESFORCE_PASSWORD = process.env.SALESFORCE_PASSWORD || 'demo-password';

  const recoveryGate = { ready: false };

  const testCases: TestCase[] = [
    {
      id: 'TC_COMM_2P_001',
      name: 'Create Commercial England & Wales policy with exactly 2 products',
      suite: SUITE,
      url: BASE_URL,
      steps: [
        {
          description: 'Open login page and wait for form',
          action: async (page) => {
            await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
            await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 60_000 });
          },
        },
        {
          description: 'Login with healable locators',
          action: async (page) => {
            const brokerCreds = getBrokerCredentials();
            await fill(page, 'loginUsername', brokerCreds.username);
            await fill(page, 'loginPassword', brokerCreds.password);
            await click(page, 'loginButton');
            await page.waitForURL(/\/dashboard/i, { timeout: 60_000 });
            await page.waitForLoadState('domcontentloaded');
            await assertVisible(page, 'dashboardHeading');
          },
        },
        {
          description: 'Open Quote Manager and start Commercial England & Wales quote',
          action: async (page) => {
            const loginPage = new CommercialLoginPage(page);
            const quoteManager = new CommercialQuoteManagerPage(page);
            await loginPage.goto();
            await quoteManager.expectLoaded();
            await quoteManager.startCommercialEnglandWalesQuote();
          },
        },
        {
          description: 'Select exactly 2 products and complete the quote flow',
          action: async (page) => {
            const quoteManager = new CommercialQuoteManagerPage(page);
            const productSelection = new CommercialProductSelectionPage(page);
            const statements = new CommercialStatementsOfFactPage(page);
            const quotes = new CommercialQuotesPage(page);
            const finalDetails = new CommercialFinalPolicyDetailsPage(page);
            const summary = new CommercialSummaryPage(page);
            const orderDialog = new CommercialOrderDialog(page);
            const policyIssued = new CommercialPolicyIssuedPage(page);

            const caseRef = `E2E-COMM-2P-${Date.now()}`;

            await productSelection.expectLoaded();
            await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');
            await productSelection.selectProductsByIndex([1, 2]);
            await productSelection.proceed();
            await statements.expectLoaded();
            await statements.confirmAllStatements();
            await statements.proceed();
            await quotes.expectLoaded();
            await quotes.selectFirstQuote();
            await finalDetails.expectLoaded();
            await finalDetails.fillRequiredDetails();
            await finalDetails.proceed();
            await summary.expectLoaded();
            await summary.expectSummaryData(caseRef);

            if (!recoveryGate.ready) {
              throw new Error('Intentional live-demo failure to trigger Healing and re-execution');
            }

            await summary.proceedToOrder();
            await orderDialog.selectTodayAndOrder();
            await policyIssued.expectPolicyIssued();
            await policyIssued.backToQuoteManager();
            await quoteManager.expectLoaded();
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
    postExecutionSelfHealRetry: {
      enabled: true,
      maxAttempts: 1,
      strategyTimeoutMs: 10_000,
      onBeforeRetry: () => {
        recoveryGate.ready = true;
        console.log('[commercial-live-demo] Recovery gate opened for the retry run.');
      },
    },
  });

  process.exit(result.workflowStatus === 'SUCCESS' ? 0 : 1);
}

main().catch(err => {
  console.error('[commercial-live-demo] Unhandled error:', err);
  process.exit(1);
});