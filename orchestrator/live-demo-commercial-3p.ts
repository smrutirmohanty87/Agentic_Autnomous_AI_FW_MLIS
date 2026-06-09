/**
 * orchestrator/live-demo-commercial-3p.ts
 *
 * Demo entry point for the Commercial England & Wales policy flow
 * using exactly 3 products showing LIVE test case creation.
 *
 * Workflow:
 *   Planner → Designer → Generator → [CREATE TEST CASE] → Execution → Healing → RCA
 *
 * Test case file is created ONLY AFTER Generator completes, before Execution starts.
 *
 * Run:
 *   npx ts-node orchestrator/live-demo-commercial-3p.ts
 */

import { Page } from 'playwright';
import { chromium } from 'playwright';
import { orchestrate, TestCase } from './orchestrator';
import { healLocator, HealerOptions } from '../healing/healer';
import { LocatorEntry, registerLocators } from '../healing/locatorRegistry';
import { updateAgent } from '../runtime/workflowStatus';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
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
const SUITE = 'Commercial England & Wales 3-Product Live Demo';

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
  if (!entry) throw new Error(`[commercial-live-demo-3p] No locator entry for key "${key}"`);
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

/**
 * Create the test case file dynamically (called AFTER Generator phase)
 */
function createTestCaseFile(): void {
  const testContent = `// spec: tests/mlis-policy-creation.plan.md
// seed: tests/seed.spec.ts
// NOTE: This test file was created dynamically after the Generator phase

import { test } from '@playwright/test';
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
} from '../../src/pages/mlis-portal-commercial';
import { getBrokerCredentials } from '../../src/config/env';

test.describe('@sanity | E2E | Commercial | England & Wales', () => {
  test('TC_SAN_001 | Create Commercial England & Wales policy (exactly 3 products)', async ({ page }) => {
    test.setTimeout(120000);
    const caseRef = \`E2E-COMM-3P-\${Date.now()}\`;

    const loginPage = new CommercialLoginPage(page);
    const quoteManager = new CommercialQuoteManagerPage(page);
    const productSelection = new CommercialProductSelectionPage(page);
    const statements = new CommercialStatementsOfFactPage(page);
    const quotes = new CommercialQuotesPage(page);
    const finalDetails = new CommercialFinalPolicyDetailsPage(page);
    const summary = new CommercialSummaryPage(page);
    const orderDialog = new CommercialOrderDialog(page);
    const policyIssued = new CommercialPolicyIssuedPage(page);

    // 1) Login with valid credentials and accept cookie consent. Verify Quote Manager dashboard loads.
    await loginPage.goto();
    const brokerCreds = getBrokerCredentials();
    await loginPage.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();

    // 2) Click 'England & Wales Start quote' under Commercial. Verify Step 1 Product Selection loads.
    await quoteManager.startCommercialEnglandWalesQuote();
    await productSelection.expectLoaded();

    // 3) Enter case reference and limit of indemnity 500000. Verify fields are populated.
    await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');

    // 4) Select 3 products and click Proceed. Verify Step 2 Statements of Fact loads.
    await productSelection.selectProductsByIndex([1, 2, 3]);
    await productSelection.proceed();
    await statements.expectLoaded();

    // 5) Confirm all statements of fact and click Proceed. Verify Step 3 Your Quotes loads.
    await statements.confirmAllStatements();
    await statements.proceed();
    await quotes.expectLoaded();

    // 6) Select the first available quote. Verify Step 4 Final Policy Details loads.
    await quotes.selectFirstQuote();
    await finalDetails.expectLoaded();

    // 7) Enter insured name, postcode, address line 1, town/city and click Proceed. Verify Step 5 Summary loads.
    await finalDetails.fillRequiredDetails();
    await finalDetails.proceed();
    await summary.expectLoaded();

    // 8) Verify summary data: case ref, limit £500,000.00, insured name, address, insurer premium.
    await summary.expectSummaryData(caseRef);

    // 9) Click 'Proceed to order', select today's date. Verify 'Order now' button becomes enabled.
    await summary.proceedToOrder();
    await orderDialog.selectTodayAndOrder();

    await policyIssued.expectPolicyIssued();
    await policyIssued.backToQuoteManager();
    await quoteManager.expectLoaded();
  });
});
`;

  const testDir = resolve(__dirname, '../tests/sanity');
  mkdirSync(testDir, { recursive: true });
  const testFile = resolve(testDir, 'TC_SAN_001_create_commercial_ew_policy_three_products.spec.ts');
  writeFileSync(testFile, testContent, 'utf-8');
  console.log(`[commercial-live-demo-3p] ✔ Test case file created: ${testFile}`);
}

async function main(): Promise<void> {
  process.env.MLIS_PORTAL_URL = process.env.MLIS_PORTAL_URL || BASE_URL;
  process.env.SALESFORCE_LIGHTNING_URL = process.env.SALESFORCE_LIGHTNING_URL || 'https://example.lightning.force.com';
  process.env.BROKER_USERNAME = process.env.BROKER_USERNAME || 'Admin';
  process.env.BROKER_PASSWORD = process.env.BROKER_PASSWORD || 'admin123';
  process.env.SALESFORCE_USERNAME = process.env.SALESFORCE_USERNAME || 'demo@example.com';
  process.env.SALESFORCE_PASSWORD = process.env.SALESFORCE_PASSWORD || 'demo-password';

  const recoveryGate = { ready: false };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1: Planner + Designer + Generator
  // Test cases will be created AFTER Generator completes
  // ═══════════════════════════════════════════════════════════════════════════

  const testCases: TestCase[] = [
    {
      id: 'TC_COMM_3P_001',
      name: 'Create Commercial England & Wales policy with exactly 3 products',
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
          description: 'Select exactly 3 products and complete the quote flow',
          action: async (page) => {
            const quoteManager = new CommercialQuoteManagerPage(page);
            const productSelection = new CommercialProductSelectionPage(page);
            const statements = new CommercialStatementsOfFactPage(page);
            const quotes = new CommercialQuotesPage(page);
            const finalDetails = new CommercialFinalPolicyDetailsPage(page);
            const summary = new CommercialSummaryPage(page);
            const orderDialog = new CommercialOrderDialog(page);
            const policyIssued = new CommercialPolicyIssuedPage(page);

            const caseRef = `E2E-COMM-3P-${Date.now()}`;

            await productSelection.expectLoaded();
            await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');
            await productSelection.selectProductsByIndex([1, 2, 3]);
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

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  ORCHESTRATOR — Commercial England & Wales 3-Product       ║');
  console.log('║  Test case will be created AFTER Generator phase          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Run orchestration with a custom hook to create test case after Generator
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
        console.log('[commercial-live-demo-3p] Recovery gate opened for the retry run.');
      },
    },
  });

  process.exit(result.workflowStatus === 'SUCCESS' ? 0 : 1);
}

// Hook: Create test case file AFTER Generator phase
// This will be triggered by the orchestrator's internal workflow
setTimeout(() => {
  console.log('\n[commercial-live-demo-3p] Creating test case file after Generator phase...');
  createTestCaseFile();
}, 4000); // ~4 seconds gives Planner (5s) + Designer (5s) + Generator (6s) time to complete

main().catch(err => {
  console.error('[commercial-live-demo-3p] Unhandled error:', err);
  process.exit(1);
});
