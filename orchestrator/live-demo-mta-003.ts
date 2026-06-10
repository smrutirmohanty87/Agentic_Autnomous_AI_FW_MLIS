/**
 * orchestrator/live-demo-mta-003.ts
 *
 * Live MTA workflow demo using real env-backed MLIS/Salesforce flows.
 * Testcase file is generated only when the workflow reaches Generator.
 */

import * as dotenv from 'dotenv';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { resolve } from 'path';
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

dotenv.config({ path: resolve(__dirname, '../.env') });

const SUITE = 'MTA Live Demo Workflow 003';
const GENERATED_TEST_FILE = resolve(__dirname, '../tests/sanity/TC_SAN_MTA_003_live_generated.spec.ts');

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

function writeGeneratedMtaSpec(): void {
  const content = `// Generated at Generator phase for live MTA demo 003\nimport { test } from '@playwright/test';\nimport {\n  FinalPolicyDetailsPage,\n  LoginPage,\n  OrderDialog,\n  PolicyIssuedPage,\n  ProductSelectionPage,\n  QuoteManagerPage,\n  QuotesPage,\n  StatementsOfFactPage,\n  SummaryPage,\n} from '../../src/pages/mlis-portal';\nimport { BrokerPortalPage } from '../../src/pages/broker-portal-policy';\nimport { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';\nimport { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';\n\ntest.describe('@sanity | MTA | Live Generated', () => {\n  test('TC_SAN_MTA_003 | Mid Term Adjustment live generated testcase', async ({ page }) => {\n    test.setTimeout(900000);\n    const caseRef = \`LIVE-MTA-\${Date.now()}\`;\n\n    const brokerLogin = new LoginPage(page);\n    const quoteManager = new QuoteManagerPage(page);\n    const productSelection = new ProductSelectionPage(page);\n    const statements = new StatementsOfFactPage(page);\n    const quotes = new QuotesPage(page);\n    const finalDetails = new FinalPolicyDetailsPage(page);\n    const summary = new SummaryPage(page);\n    const orderDialog = new OrderDialog(page);\n    const policyIssued = new PolicyIssuedPage(page);\n    const brokerPortal = new BrokerPortalPage(page);\n    const salesforce = new SalesforcePortalPage(page);\n\n    await brokerLogin.goto();\n    const brokerCreds = getBrokerCredentials();\n    await brokerLogin.login(brokerCreds.username, brokerCreds.password);\n    await quoteManager.expectLoaded();\n    await quoteManager.acceptCookiesIfVisible();\n\n    await quoteManager.startResidentialEnglandWalesQuote();\n    await productSelection.expectLoaded();\n    await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');\n    await productSelection.selectProductsByIndex([1]);\n    await productSelection.proceed();\n\n    await statements.expectLoaded();\n    await statements.confirmAllStatements();\n    await statements.proceed();\n\n    await quotes.expectLoaded();\n    await quotes.selectFirstQuote();\n\n    await finalDetails.expectLoaded();\n    await finalDetails.fillRequiredDetails();\n    await finalDetails.proceed();\n\n    await summary.expectLoaded();\n    await summary.expectSummaryData(caseRef);\n    await summary.proceedToOrder();\n    await orderDialog.selectTodayAndOrder();\n\n    await policyIssued.expectPolicyIssued();\n    const policyNumber = await policyIssued.getIssuedPolicyNumber();\n    await policyIssued.backToQuoteManager();\n\n    await brokerPortal.expectQuoteManagerLoaded();\n    await brokerPortal.searchPolicy(policyNumber);\n    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');\n\n    await salesforce.goto();\n    const sfCreds = getSalesforceCredentials();\n    await salesforce.login(sfCreds.username, sfCreds.password);\n    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);\n    await salesforce.openRelatedTab();\n    await salesforce.openInsurancePolicyFromRelated(policyNumber);\n\n    await salesforce.openCreateMTADialog();\n    await salesforce.fillMTAReasonAndSave('Non Material Amendment');\n    await salesforce.fillIntermediaryReference(\`MTA-REF-\${Date.now()}\`);\n    await salesforce.editMTAPremium('111');\n    await salesforce.bindMTA();\n  });\n});\n`;

  mkdirSync(resolve(__dirname, '../tests/sanity'), { recursive: true });
  writeFileSync(GENERATED_TEST_FILE, content, 'utf-8');
  console.log(`[live-demo-mta-003] Generated testcase at Generator phase: ${GENERATED_TEST_FILE}`);
}

async function main(): Promise<void> {
  // Validate required env-backed runtime config exists.
  getMlisPortalUrl();
  getBrokerCredentials();
  getSalesforceCredentials();

  if (existsSync(GENERATED_TEST_FILE)) {
    unlinkSync(GENERATED_TEST_FILE);
    console.log(`[live-demo-mta-003] Removed pre-existing testcase before run: ${GENERATED_TEST_FILE}`);
  }

  const recoveryGate = { ready: false };

  const testCases: TestCase[] = [
    {
      id: 'TC_MTA_003',
      name: 'Create policy then perform MTA (live demo 003)',
      suite: SUITE,
      url: getMlisPortalUrl(),
      steps: [
        {
          description: 'Login to MLIS portal and load quote manager',
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
          description: 'Create base policy then execute MTA in Salesforce',
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

            const caseRef = `MTA-BASE-${Date.now()}`;

            await quoteManager.expectLoaded();
            await quoteManager.startResidentialEnglandWalesQuote();
            await productSelection.expectLoaded();
            await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');
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
            await summary.expectSummaryData(caseRef);
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

            await salesforce.openCreateMTADialog();
            await salesforce.fillMTAReasonAndSave('Non Material Amendment');
            await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
            await salesforce.editMTAPremium('111');

            if (!recoveryGate.ready) {
              throw new Error('Intentional MTA live-demo failure to trigger Healing and RCA');
            }

            await salesforce.bindMTA();
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
        console.log('[live-demo-mta-003] Recovery gate opened for retry run.');
      },
    },
  });

  process.exit(result.workflowStatus === 'SUCCESS' ? 0 : 1);
}

main().catch(err => {
  console.error('[live-demo-mta-003] Unhandled error:', err);
  process.exit(1);
});
