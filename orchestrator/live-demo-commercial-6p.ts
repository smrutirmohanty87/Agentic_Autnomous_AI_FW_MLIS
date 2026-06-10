/**
 * orchestrator/live-demo-commercial-6p.ts
 *
 * Demo entry point for the Commercial England & Wales policy flow
 * using exactly 6 products while showing every agent live on the dashboard.
 *
 * Run:
 *   npx ts-node orchestrator/live-demo-commercial-6p.ts
 */

import * as dotenv from 'dotenv';
import { orchestrate, TestCase } from './orchestrator';
import { HealerOptions } from '../healing/healer';
import { LocatorEntry } from '../healing/locatorRegistry';
import { mkdirSync, unlinkSync, existsSync, writeFileSync } from 'fs';
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
import { getBrokerCredentials, getMlisPortalUrl } from '../src/config/env';

dotenv.config({ path: resolve(__dirname, '../.env') });

const BASE_URL = getMlisPortalUrl();
const SUITE = 'Commercial England & Wales 6-Product Live Demo';
const GENERATED_TEST_FILE = resolve(__dirname, '../tests/sanity/TC_SAN_001_create_commercial_ew_policy_six_products.spec.ts');

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

function writeGeneratedSixProductSpec(): void {
  const content = `// spec: tests/mlis-policy-creation.plan.md
// seed: tests/seed.spec.ts

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
  test('TC_SAN_001 | Create Commercial England & Wales policy (exactly 6 products)', async ({ page }) => {
    test.setTimeout(120000);
    const caseRef = \`E2E-COMM-6P-\${Date.now()}\`;

    const loginPage = new CommercialLoginPage(page);
    const quoteManager = new CommercialQuoteManagerPage(page);
    const productSelection = new CommercialProductSelectionPage(page);
    const statements = new CommercialStatementsOfFactPage(page);
    const quotes = new CommercialQuotesPage(page);
    const finalDetails = new CommercialFinalPolicyDetailsPage(page);
    const summary = new CommercialSummaryPage(page);
    const orderDialog = new CommercialOrderDialog(page);
    const policyIssued = new CommercialPolicyIssuedPage(page);

    await loginPage.goto();
    const brokerCreds = getBrokerCredentials();
    await loginPage.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();

    await quoteManager.startCommercialEnglandWalesQuote();
    await productSelection.expectLoaded();
    await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');

    await productSelection.selectProductsByIndex([1, 2, 3, 4, 5, 6]);
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

  mkdirSync(resolve(__dirname, '../tests/sanity'), { recursive: true });
  writeFileSync(GENERATED_TEST_FILE, content, 'utf-8');
  console.log(`[commercial-live-demo-6p] Generated testcase at Generator phase: ${GENERATED_TEST_FILE}`);
}

async function main(): Promise<void> {
  getMlisPortalUrl();
  getBrokerCredentials();

  // Ensure the testcase does not exist before the demo reaches Generator.
  if (existsSync(GENERATED_TEST_FILE)) {
    unlinkSync(GENERATED_TEST_FILE);
    console.log(`[commercial-live-demo-6p] Removed pre-existing testcase before run: ${GENERATED_TEST_FILE}`);
  }

  const recoveryGate = { ready: false };

  const testCases: TestCase[] = [
    {
      id: 'TC_COMM_6P_001',
      name: 'Create Commercial England & Wales policy with exactly 6 products',
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
          description: 'Select exactly 6 products and complete the quote flow',
          action: async (page) => {
            const quoteManager = new CommercialQuoteManagerPage(page);
            const productSelection = new CommercialProductSelectionPage(page);
            const statements = new CommercialStatementsOfFactPage(page);
            const quotes = new CommercialQuotesPage(page);
            const finalDetails = new CommercialFinalPolicyDetailsPage(page);
            const summary = new CommercialSummaryPage(page);
            const orderDialog = new CommercialOrderDialog(page);
            const policyIssued = new CommercialPolicyIssuedPage(page);

            const caseRef = `E2E-COMM-6P-${Date.now()}`;

            await productSelection.expectLoaded();
            await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');
            await productSelection.selectProductsByIndex([1, 2, 3, 4, 5, 6]);
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
    onAfterGenerator: () => {
      writeGeneratedSixProductSpec();
    },
    postExecutionSelfHealRetry: {
      enabled: true,
      maxAttempts: 1,
      strategyTimeoutMs: 10_000,
      onBeforeRetry: () => {
        recoveryGate.ready = true;
        console.log('[commercial-live-demo-6p] Recovery gate opened for the retry run.');
      },
    },
  });

  process.exit(result.workflowStatus === 'SUCCESS' ? 0 : 1);
}

main().catch(err => {
  console.error('[commercial-live-demo-6p] Unhandled error:', err);
  process.exit(1);
});
