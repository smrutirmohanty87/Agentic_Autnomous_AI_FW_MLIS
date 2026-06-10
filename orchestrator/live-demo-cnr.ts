/**
 * orchestrator/live-demo-cnr.ts
 *
 * Live demo for CNR workflow using real env-based MLIS/Salesforce flows.
 * Testcase file is generated only after Generator completes.
 */

import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import * as dotenv from 'dotenv';
import { orchestrate, TestCase } from './orchestrator';
import { HealerOptions } from '../healing/healer';
import { LocatorEntry } from '../healing/locatorRegistry';
import {
  FinalPolicyDetailsPage,
  LoginPage,
  OrderDialog,
  PolicyIssuedPage,
  ProductSelectionPage,
  QuoteManagerPage,
  QuotesPage,
  StatementsOfFactPage,
  SummaryPage,
} from '../src/pages/mlis-portal';
import { BrokerPortalPage } from '../src/pages/broker-portal-policy';
import { SalesforcePortalPage } from '../src/pages/salesforce-cancellation';
import { getBrokerCredentials, getMlisPortalUrl, getSalesforceCredentials } from '../src/config/env';

const SUITE = 'CNR Live Demo Workflow';
const GENERATED_TEST_FILE = resolve(__dirname, '../tests/sanity/TC_SAN_CNR_001_live_generated.spec.ts');

// Standalone ts-node scripts do not automatically load .env like playwright.config.ts does.
dotenv.config({ path: resolve(__dirname, '../.env') });

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

function writeGeneratedCnrSpec(): void {
  const content = `// Generated at Generator phase for live CNR demo\nimport { test } from '@playwright/test';\nimport {\n  FinalPolicyDetailsPage,\n  LoginPage,\n  OrderDialog,\n  PolicyIssuedPage,\n  ProductSelectionPage,\n  QuoteManagerPage,\n  QuotesPage,\n  StatementsOfFactPage,\n  SummaryPage,\n} from '../../src/pages/mlis-portal';\nimport { BrokerPortalPage } from '../../src/pages/broker-portal-policy';\nimport { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';\nimport { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';\n\ntest.describe('@sanity | CNR | Live Generated', () => {\n  test('TC_SAN_CNR_001 | Cancel and Reissue live generated testcase', async ({ page }) => {\n    test.setTimeout(900000);\n    const caseRef = \`LIVE-CNR-\${Date.now()}\`;\n\n    const brokerLogin = new LoginPage(page);\n    const quoteManager = new QuoteManagerPage(page);\n    const productSelection = new ProductSelectionPage(page);\n    const statements = new StatementsOfFactPage(page);\n    const quotes = new QuotesPage(page);\n    const finalDetails = new FinalPolicyDetailsPage(page);\n    const summary = new SummaryPage(page);\n    const orderDialog = new OrderDialog(page);\n    const policyIssued = new PolicyIssuedPage(page);\n    const brokerPortal = new BrokerPortalPage(page);\n    const salesforce = new SalesforcePortalPage(page);\n\n    await brokerLogin.goto();\n    const brokerCreds = getBrokerCredentials();\n    await brokerLogin.login(brokerCreds.username, brokerCreds.password);\n    await quoteManager.expectLoaded();\n    await quoteManager.acceptCookiesIfVisible();\n\n    await quoteManager.startResidentialEnglandWalesQuote();\n    await productSelection.expectLoaded();\n    await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');\n    await productSelection.selectProductsByIndex([1]);\n    await productSelection.proceed();\n\n    await statements.expectLoaded();\n    await statements.confirmAllStatements();\n    await statements.proceed();\n    await quotes.expectLoaded();\n    await quotes.selectFirstQuote();\n\n    await finalDetails.expectLoaded();\n    await finalDetails.fillRequiredDetails();\n    await finalDetails.proceed();\n    await summary.expectLoaded();\n    await summary.expectSummaryData(caseRef);\n    await summary.proceedToOrder();\n    await orderDialog.selectTodayAndOrder();\n\n    await policyIssued.expectPolicyIssued();\n    const policyNumber = await policyIssued.getIssuedPolicyNumber();\n    await policyIssued.backToQuoteManager();\n\n    await brokerPortal.expectQuoteManagerLoaded();\n    await brokerPortal.searchPolicy(policyNumber);\n    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');\n\n    await salesforce.goto();\n    const sfCreds = getSalesforceCredentials();\n    await salesforce.login(sfCreds.username, sfCreds.password);\n    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);\n    await salesforce.openRelatedTab();\n    await salesforce.openInsurancePolicyFromRelated(policyNumber);\n    await salesforce.openCancelAndReissueDialog();\n  });\n});\n`;

  mkdirSync(resolve(__dirname, '../tests/sanity'), { recursive: true });
  writeFileSync(GENERATED_TEST_FILE, content, 'utf-8');
  console.log(`[live-demo-cnr] Generated testcase at Generator phase: ${GENERATED_TEST_FILE}`);
}

async function main(): Promise<void> {
  // Validate env-backed runtime config is available (throws with clear message if missing).
  getMlisPortalUrl();
  getBrokerCredentials();
  getSalesforceCredentials();

  if (existsSync(GENERATED_TEST_FILE)) {
    unlinkSync(GENERATED_TEST_FILE);
    console.log(`[live-demo-cnr] Removed pre-existing testcase before run: ${GENERATED_TEST_FILE}`);
  }

  const recoveryGate = { ready: false };

  const testCases: TestCase[] = [
    {
      id: 'TC_CNR_001',
      name: 'Create base policy and initiate CNR flow (live demo)',
      suite: SUITE,
      url: getMlisPortalUrl(),
      steps: [
        {
          description: 'Login to MLIS portal using .env broker credentials',
          action: async (page) => {
            const brokerLogin = new LoginPage(page);
            const quoteManager = new QuoteManagerPage(page);
            const brokerCreds = getBrokerCredentials();
            await brokerLogin.goto();
            await brokerLogin.login(brokerCreds.username, brokerCreds.password);
            await quoteManager.expectLoaded();
            await quoteManager.acceptCookiesIfVisible();
          },
        },
        {
          description: 'Create base live policy then open Salesforce Cancel and Reissue dialog',
          action: async (page) => {
            const quoteManager = new QuoteManagerPage(page);
            const productSelection = new ProductSelectionPage(page);
            const statements = new StatementsOfFactPage(page);
            const quotes = new QuotesPage(page);
            const finalDetails = new FinalPolicyDetailsPage(page);
            const summary = new SummaryPage(page);
            const orderDialog = new OrderDialog(page);
            const policyIssued = new PolicyIssuedPage(page);
            const brokerPortal = new BrokerPortalPage(page);
            const salesforce = new SalesforcePortalPage(page);

            await quoteManager.expectLoaded();
            await quoteManager.startResidentialEnglandWalesQuote();
            await productSelection.expectLoaded();
            await productSelection.fillCaseReferenceAndLimit(`CNR-BASE-${Date.now()}`, '500000');
            await productSelection.selectProductsByIndex([1]);
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
            await summary.proceedToOrder();
            await orderDialog.selectTodayAndOrder();
            await policyIssued.expectPolicyIssued();
            const policyNumber = await policyIssued.getIssuedPolicyNumber();
            await policyIssued.backToQuoteManager();

            await brokerPortal.expectQuoteManagerLoaded();
            await brokerPortal.searchPolicy(policyNumber);
            await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

            await salesforce.goto();
            const sfCreds = getSalesforceCredentials();
            await salesforce.login(sfCreds.username, sfCreds.password);
            await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
            await salesforce.openRelatedTab();
            await salesforce.openInsurancePolicyFromRelated(policyNumber);
            await salesforce.openCancelAndReissueDialog();

            if (!recoveryGate.ready) {
              throw new Error('Intentional CNR live-demo failure to trigger Healing and RCA');
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
      writeGeneratedCnrSpec();
    },
    postExecutionSelfHealRetry: {
      enabled: true,
      maxAttempts: 1,
      strategyTimeoutMs: 10_000,
      onBeforeRetry: () => {
        recoveryGate.ready = true;
        console.log('[live-demo-cnr] Recovery gate opened for retry run.');
      },
    },
  });

  process.exit(result.workflowStatus === 'SUCCESS' ? 0 : 1);
}

main().catch(err => {
  console.error('[live-demo-cnr] Unhandled error:', err);
  process.exit(1);
});
