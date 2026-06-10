/**
 * orchestrator/live-demo-commercial-3p-fresh.ts
 *
 * Fresh 3-Product Commercial Workflow with runtime cleanup
 *
 * This orchestrator:
 * 1. Clears all old result data from test-results/ and runtime/
 * 2. Initializes fresh workflow-status.json and suite-progress.json
 * 3. Runs the full Commercial England & Wales 3-product workflow
 * 4. Displays live transitions in real-time
 * 5. Ensures the dashboard shows only current data
 *
 * Workflow:
 *   Planner → Designer → Generator → [CREATE TEST CASE] → Execution → Healing → RCA
 *
 * Run:
 *   npx ts-node orchestrator/live-demo-commercial-3p-fresh.ts
 *
 * Watch dashboard at http://localhost:5173/ (run: npm run dev --workspace=dashboard-ui)
 */

import * as dotenv from 'dotenv';
import { orchestrate, TestCase } from './orchestrator';
import { HealerOptions } from '../healing/healer';
import { LocatorEntry } from '../healing/locatorRegistry';
import { writeFileSync, mkdirSync, rmSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
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
import { getBrokerCredentials, getMlisPortalUrl } from '../src/config/env';

dotenv.config({ path: resolve(__dirname, '../.env') });

const BASE_URL = getMlisPortalUrl();
const SUITE = 'Commercial England & Wales 3-Product Fresh Demo';
const ROOT_DIR = resolve(__dirname, '..');

const HEAL_OPTS: HealerOptions = {
  strategyTimeout: 10_000,
  promoteOnHeal: true,
};

const LOCATORS: LocatorEntry[] = [
  {
    key: 'mlisEmail',
    strategies: [
      { type: 'label', value: 'Email address' },
      { type: 'placeholder', value: 'Email address' },
      { type: 'css', selector: 'input[name="username"], input[type="email"]' },
    ],
  },
  {
    key: 'mlisPassword',
    strategies: [
      { type: 'name', value: 'password' },
      { type: 'placeholder', value: 'Password' },
      { type: 'css', selector: 'input[type="password"]' },
    ],
  },
  {
    key: 'mlisLoginButton',
    strategies: [
      { type: 'role', role: 'button', options: { name: 'Login' } },
      { type: 'css', selector: 'button[type="submit"], button:has-text("Login")' },
    ],
  },
  {
    key: 'quoteManagerHeading',
    strategies: [
      { type: 'role', role: 'heading', options: { name: /Quote manager/i } },
      { type: 'text', value: 'Quote manager' },
    ],
  },
];

/**
 * Clear all old test results and runtime data
 */
function clearOldResults(): void {
  console.log('\n[cleanup] 🧹 Clearing old results and runtime data...\n');

  // Clear test-results directory
  const testResultsDir = resolve(ROOT_DIR, 'test-results');
  if (readdirSync(testResultsDir).length > 0) {
    rmSync(testResultsDir, { recursive: true, force: true });
    mkdirSync(testResultsDir, { recursive: true });
    console.log('[cleanup] ✔ Cleared test-results/');
  }

  // Clear playwright-report
  const reportDir = resolve(ROOT_DIR, 'playwright-report');
  if (readdirSync(reportDir).length > 0) {
    rmSync(reportDir, { recursive: true, force: true });
    mkdirSync(reportDir, { recursive: true });
    console.log('[cleanup] ✔ Cleared playwright-report/');
  }

  // Initialize fresh runtime status files
  const runtimeDir = resolve(ROOT_DIR, 'runtime');
  const freshWorkflowStatus = {
    workflowId: `run-${Date.now()}`,
    startedAt: new Date().toISOString(),
    overallStatus: 'PENDING',
    currentAgent: null,
    agents: [
      { name: 'Planner', state: 'PENDING' },
      { name: 'Designer', state: 'PENDING' },
      { name: 'Generator', state: 'PENDING' },
      { name: 'Execution', state: 'PENDING' },
      { name: 'Healing', state: 'PENDING' },
      { name: 'RCA', state: 'PENDING' },
    ],
  };

  const freshSuiteProgress = {
    totalTests: 1,
    passed: 0,
    failed: 0,
    running: 0,
    pending: 1,
    currentTest: null,
    progressPct: 0,
    startedAt: null,
    durationMs: 0,
    suiteStatus: 'PENDING',
    updatedAt: new Date().toISOString(),
  };

  writeFileSync(
    resolve(runtimeDir, 'workflow-status.json'),
    JSON.stringify(freshWorkflowStatus, null, 2),
    'utf-8'
  );
  console.log('[cleanup] ✔ Initialized fresh workflow-status.json');

  writeFileSync(
    resolve(runtimeDir, 'suite-progress.json'),
    JSON.stringify(freshSuiteProgress, null, 2),
    'utf-8'
  );
  console.log('[cleanup] ✔ Initialized fresh suite-progress.json');

  // Clear heal and RCA logs
  const healLogPath = resolve(runtimeDir, 'heal-log.json');
  const rcaResultsPath = resolve(runtimeDir, 'rca-results.json');
  const currentTestPath = resolve(runtimeDir, 'current-test.json');

  writeFileSync(healLogPath, JSON.stringify([], null, 2), 'utf-8');
  console.log('[cleanup] ✔ Cleared heal-log.json');

  writeFileSync(rcaResultsPath, JSON.stringify({}, null, 2), 'utf-8');
  console.log('[cleanup] ✔ Cleared rca-results.json');

  writeFileSync(currentTestPath, JSON.stringify({}, null, 2), 'utf-8');
  console.log('[cleanup] ✔ Cleared current-test.json');

  console.log('\n[cleanup] ✅ All old data cleared. Fresh runtime initialized.\n');
}

/**
 * Create the test case file dynamically (called AFTER Generator phase)
 */
function createTestCaseFile(): void {
  const testContent = `// spec: tests/mlis-policy-creation.plan.md
// seed: tests/seed.spec.ts
// NOTE: This test file was created dynamically after the Generator phase for fresh workflow

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

test.describe('@sanity | E2E | Commercial | England & Wales | Fresh 3P', () => {
  test('TC_SAN_FRESH_001 | Create Commercial England & Wales policy (exactly 3 products)', async ({ page }) => {
    test.setTimeout(120000);
    const caseRef = \`E2E-COMM-3P-FRESH-\${Date.now()}\`;

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

  const testDir = resolve(ROOT_DIR, 'tests/sanity');
  mkdirSync(testDir, { recursive: true });
  const testFile = resolve(testDir, 'TC_SAN_FRESH_001_create_commercial_ew_policy_three_products.spec.ts');
  writeFileSync(testFile, testContent, 'utf-8');
  console.log(`[fresh-demo] ✔ Test case file created: ${testFile}`);
}

async function main(): Promise<void> {
  // Verify environment
  getMlisPortalUrl();
  getBrokerCredentials();

  // PHASE 0: Cleanup old results
  clearOldResults();

  const recoveryGate = { ready: false };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1: Planner + Designer + Generator
  // Test cases will be created AFTER Generator completes
  // ═══════════════════════════════════════════════════════════════════════════

  const testCases: TestCase[] = [
    {
      id: 'TC_COMM_3P_FRESH_001',
      name: 'Create Commercial England & Wales policy with exactly 3 products (Fresh Run)',
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

            const caseRef = `E2E-COMM-3P-FRESH-${Date.now()}`;

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
  console.log('║  FRESH ORCHESTRATOR — Commercial England & Wales 3-Product  ║');
  console.log('║  Old results cleared. Running fresh workflow...             ║');
  console.log('║  Watch dashboard at http://localhost:5173/                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Run orchestration with a custom hook to create test case after Generator
  const result = await orchestrate({
    suiteName: SUITE,
    testCases,
    locatorMap: LOCATORS,
    healerOptions: HEAL_OPTS,
    demoMode: true,
    onAfterGenerator: () => {
      console.log('\n[fresh-demo] Creating test case file after Generator phase...');
      createTestCaseFile();
    },
    postExecutionSelfHealRetry: {
      enabled: true,
      maxAttempts: 1,
      strategyTimeoutMs: 10_000,
      onBeforeRetry: () => {
        recoveryGate.ready = true;
        console.log('[fresh-demo] Recovery gate opened for the retry run.');
      },
    },
  });

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  WORKFLOW COMPLETE                                           ║');
  console.log('║  Dashboard automatically displaying fresh results             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  process.exit(result.workflowStatus === 'SUCCESS' ? 0 : 1);
}

main().catch(err => {
  console.error('[fresh-demo] Unhandled error:', err);
  process.exit(1);
});
