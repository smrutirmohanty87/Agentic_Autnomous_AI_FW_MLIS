/**
 * orchestrator/live-demo-residential-3p-fresh.ts
 *
 * Fresh 3-Product Residential Workflow with runtime cleanup
 *
 * This orchestrator:
 * 1. Clears all old result data from test-results/ and runtime/
 * 2. Initializes fresh workflow-status.json and suite-progress.json
 * 3. Runs the full Residential England & Wales 3-product workflow
 * 4. Displays live transitions in real-time
 * 5. Ensures the dashboard shows only current data
 *
 * Run:
 *   npx ts-node orchestrator/live-demo-residential-3p-fresh.ts
 */

import * as dotenv from 'dotenv';
import { orchestrate, TestCase } from './orchestrator';
import { HealerOptions } from '../healing/healer';
import { LocatorEntry } from '../healing/locatorRegistry';
import { writeFileSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { resolve } from 'path';
import {
  LoginPage,
  QuoteManagerPage,
  ProductSelectionPage,
  StatementsOfFactPage,
  QuotesPage,
  FinalPolicyDetailsPage,
  SummaryPage,
  OrderDialog,
  PolicyIssuedPage,
} from '../src/pages/mlis-portal';
import { getBrokerCredentials, getMlisPortalUrl } from '../src/config/env';

dotenv.config({ path: resolve(__dirname, '../.env') });

const BASE_URL = getMlisPortalUrl();
const SUITE = 'Residential England & Wales 3-Product Fresh Demo';
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

function syncToPublic(filename: string, data: string): void {
  const publicDir = resolve(ROOT_DIR, 'dashboard-ui/public');
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(resolve(publicDir, filename), data, 'utf-8');
}

function clearOldResults(): void {
  console.log('\n[cleanup] Clearing old results and runtime data...\n');

  const testResultsDir = resolve(ROOT_DIR, 'test-results');
  if (readdirSync(testResultsDir).length > 0) {
    rmSync(testResultsDir, { recursive: true, force: true });
    mkdirSync(testResultsDir, { recursive: true });
    console.log('[cleanup] Initialized fresh test-results/');
  }

  const reportDir = resolve(ROOT_DIR, 'playwright-report');
  if (readdirSync(reportDir).length > 0) {
    rmSync(reportDir, { recursive: true, force: true });
    mkdirSync(reportDir, { recursive: true });
    console.log('[cleanup] Initialized fresh playwright-report/');
  }

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
      { name: 'RCA', state: 'PENDING' },
      { name: 'Healing', state: 'PENDING' },
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

  const workflowStatusStr = JSON.stringify(freshWorkflowStatus, null, 2);
  const suiteProgressStr = JSON.stringify(freshSuiteProgress, null, 2);

  writeFileSync(resolve(runtimeDir, 'workflow-status.json'), workflowStatusStr, 'utf-8');
  syncToPublic('workflow-status.json', workflowStatusStr);
  console.log('[cleanup] Initialized fresh workflow-status.json');

  writeFileSync(resolve(runtimeDir, 'suite-progress.json'), suiteProgressStr, 'utf-8');
  syncToPublic('suite-progress.json', suiteProgressStr);
  console.log('[cleanup] Initialized fresh suite-progress.json');

  writeFileSync(resolve(runtimeDir, 'heal-log.json'), JSON.stringify([], null, 2), 'utf-8');
  writeFileSync(resolve(runtimeDir, 'rca-results.json'), JSON.stringify({}, null, 2), 'utf-8');
  writeFileSync(resolve(runtimeDir, 'current-test.json'), JSON.stringify({}, null, 2), 'utf-8');
  console.log('[cleanup] Cleared heal-log.json, rca-results.json, current-test.json');

  console.log('\n[cleanup] Fresh runtime initialized.\n');
}

function createTestCaseFile(): void {
  const testContent = `// spec: tests/mlis-policy-creation.plan.md
// seed: tests/seed.spec.ts
// NOTE: This test file was created dynamically after the Generator phase for fresh workflow

import { test } from '@playwright/test';
import {
  LoginPage,
  QuoteManagerPage,
  ProductSelectionPage,
  StatementsOfFactPage,
  QuotesPage,
  FinalPolicyDetailsPage,
  SummaryPage,
  OrderDialog,
  PolicyIssuedPage,
} from '../../src/pages/mlis-portal';
import { getBrokerCredentials } from '../../src/config/env';

test.describe('@sanity | E2E | Residential | England & Wales | Fresh 3P', () => {
  test('TC_SAN_FRESH_RES_001 | Create Residential England & Wales policy (exactly 3 products)', async ({ page }) => {
    test.setTimeout(120000);
    const caseRef = \`E2E-RES-3P-FRESH-\${Date.now()}\`;

    const loginPage = new LoginPage(page);
    const quoteManager = new QuoteManagerPage(page);
    const productSelection = new ProductSelectionPage(page);
    const statements = new StatementsOfFactPage(page);
    const quotes = new QuotesPage(page);
    const finalDetails = new FinalPolicyDetailsPage(page);
    const summary = new SummaryPage(page);
    const orderDialog = new OrderDialog(page);
    const policyIssued = new PolicyIssuedPage(page);

    await loginPage.goto();
    const brokerCreds = getBrokerCredentials();
    await loginPage.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();

    await quoteManager.startResidentialEnglandWalesQuote();
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
  const testFile = resolve(testDir, 'TC_SAN_FRESH_RES_001_create_residential_ew_policy_three_products.spec.ts');
  writeFileSync(testFile, testContent, 'utf-8');
  console.log(`[fresh-demo-residential] Test case file created: ${testFile}`);
}

async function main(): Promise<void> {
  getMlisPortalUrl();
  getBrokerCredentials();

  clearOldResults();

  const testCases: TestCase[] = [
    {
      id: 'TC_RES_3P_FRESH_001',
      name: 'Create Residential England & Wales policy with exactly 3 products (Fresh Run)',
      suite: SUITE,
      url: BASE_URL,
      steps: [
        {
          description: 'Login to MLIS portal and load quote manager',
          action: async (page) => {
            const loginPage = new LoginPage(page);
            const quoteManager = new QuoteManagerPage(page);
            const brokerCreds = getBrokerCredentials();
            await loginPage.goto();
            await loginPage.login(brokerCreds.username, brokerCreds.password);
            await quoteManager.expectLoaded();
          },
        },
        {
          description: 'Open Quote Manager and start Residential England & Wales quote',
          action: async (page) => {
            const quoteManager = new QuoteManagerPage(page);
            await quoteManager.expectLoaded();
            await quoteManager.startResidentialEnglandWalesQuote();
          },
        },
        {
          description: 'Select exactly 3 products and complete the quote flow',
          action: async (page) => {
            const quoteManager = new QuoteManagerPage(page);
            const productSelection = new ProductSelectionPage(page);
            const statements = new StatementsOfFactPage(page);
            const quotes = new QuotesPage(page);
            const finalDetails = new FinalPolicyDetailsPage(page);
            const summary = new SummaryPage(page);
            const orderDialog = new OrderDialog(page);
            const policyIssued = new PolicyIssuedPage(page);

            const caseRef = `E2E-RES-3P-FRESH-${Date.now()}`;

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

  console.log('\n================ FRESH RESIDENTIAL 3-PRODUCT WORKFLOW ================\n');

  const result = await orchestrate({
    suiteName: SUITE,
    testCases,
    locatorMap: LOCATORS,
    healerOptions: HEAL_OPTS,
    demoMode: true,
    onAfterGenerator: () => {
      console.log('[fresh-demo-residential] Creating test case file after Generator phase...');
      createTestCaseFile();
    },
    postExecutionSelfHealRetry: {
      enabled: true,
      maxAttempts: 1,
      strategyTimeoutMs: 10_000,
    },
  });

  console.log('\n================ RESIDENTIAL WORKFLOW COMPLETE ================\n');

  process.exit(result.workflowStatus === 'SUCCESS' ? 0 : 1);
}

main().catch(err => {
  console.error('[fresh-demo-residential] Unhandled error:', err);
  process.exit(1);
});
