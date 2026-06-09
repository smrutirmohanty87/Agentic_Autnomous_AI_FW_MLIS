import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { Page } from 'playwright';
import { orchestrate, TestCase } from '../orchestrator/orchestrator';
import { healLocator, HealerOptions } from '../healing/healer';
import { LocatorEntry, LocatorStrategy } from '../healing/locatorRegistry';
import type { DashboardData, AgentStatus } from '../dashboard-ui/src/types/dashboard';

const BASE_URL = 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login';
const SUITE = 'OrangeHRM Login Suite';

const HEAL_OPTS: HealerOptions = {
  strategyTimeout: 10000,
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
      { type: 'label', value: 'Username' },
      { type: 'role', role: 'textbox', options: { name: 'Username' } },
      { type: 'css', selector: 'input.oxd-input[name="username"]' },
    ],
  },
  {
    key: 'loginPassword',
    strategies: [
      { type: 'name', value: 'password' },
      { type: 'placeholder', value: 'Password' },
      { type: 'label', value: 'Password' },
      { type: 'role', role: 'textbox', options: { name: 'Password' } },
      { type: 'css', selector: 'input.oxd-input[name="password"]' },
    ],
  },
  {
    key: 'loginButton',
    strategies: [
      { type: 'role', role: 'button', options: { name: 'Login' } },
      { type: 'css', selector: 'button[type="submit"]' },
      { type: 'text', value: 'Login', exact: true },
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

function strategiesOf(key: string): LocatorStrategy[] {
  const entry = LOCATORS.find(item => item.key === key);
  if (!entry) throw new Error(`No locator entry for key: ${key}`);
  return entry.strategies;
}

async function fill(page: Page, key: string, value: string): Promise<void> {
  const loc = await healLocator(page, key, strategiesOf(key), HEAL_OPTS);
  await loc.fill(value);
}

async function click(page: Page, key: string): Promise<void> {
  const loc = await healLocator(page, key, strategiesOf(key), HEAL_OPTS);
  await loc.click();
}

async function assertVisible(page: Page, key: string): Promise<void> {
  const { expect } = await import('@playwright/test');
  const loc = await healLocator(page, key, strategiesOf(key), HEAL_OPTS);
  await expect(loc).toBeVisible();
}

const TEST_CASES: TestCase[] = [
  {
    id: 'TC_001',
    name: 'Login page loads with self-healing locators',
    suite: SUITE,
    url: BASE_URL,
    steps: [
      {
        description: 'Wait for form to render',
        action: async page => {
          await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 30000 });
        },
      },
      { description: 'Assert Login heading is visible', action: page => assertVisible(page, 'loginHeading') },
      { description: 'Assert Username field is visible', action: page => assertVisible(page, 'loginUsername') },
      { description: 'Assert Password field is visible', action: page => assertVisible(page, 'loginPassword') },
      { description: 'Assert Login button is visible', action: page => assertVisible(page, 'loginButton') },
    ],
  },
  {
    id: 'TC_002',
    name: 'Successful login with self-healing locators',
    suite: SUITE,
    url: BASE_URL,
    steps: [
      {
        description: 'Wait for form to render',
        action: async page => {
          await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 30000 });
        },
      },
      { description: 'Enter username', action: page => fill(page, 'loginUsername', 'Admin') },
      { description: 'Enter password', action: page => fill(page, 'loginPassword', 'admin123') },
      { description: 'Click Login button', action: page => click(page, 'loginButton') },
      { description: 'Wait for Dashboard URL', action: page => page.waitForURL(/\/dashboard/i, { timeout: 60000 }) },
      {
        description: 'Assert Dashboard heading is visible',
        action: async page => {
          await page.waitForLoadState('domcontentloaded');
          await assertVisible(page, 'dashboardHeading');
        },
      },
    ],
  },
  {
    id: 'TC_003',
    name: 'Healing fallback: CSS used when primary name strategy is broken',
    suite: SUITE,
    url: BASE_URL,
    steps: [
      {
        description: 'Wait for form to render',
        action: async page => {
          await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 30000 });
        },
      },
      {
        description: 'Resolve username via broken primary and CSS fallback',
        action: async page => {
          const { expect } = await import('@playwright/test');
          const loc = await healLocator(
            page,
            'loginUsername-fallback-demo',
            [
              { type: 'name', value: '__broken_name_that_does_not_exist__' },
              { type: 'css', selector: 'input[name="username"]' },
            ],
            { ...HEAL_OPTS, strategyTimeout: 500 }
          );
          await expect(loc).toBeVisible();
          await loc.fill('Admin');
        },
      },
    ],
  },
];

function strategyToText(strategy: LocatorStrategy): string {
  switch (strategy.type) {
    case 'name':
    case 'label':
    case 'text':
    case 'placeholder':
    case 'testid':
      return `${strategy.type}=${strategy.value}`;
    case 'css':
      return `css=${strategy.selector}`;
    case 'role':
      return `role=${strategy.role}`;
  }
}

function mapAgentStatus(status: string): AgentStatus {
  if (status === 'PASS') return 'SUCCESS';
  if (status === 'FAIL') return 'FAILED';
  return 'RUNNING';
}

async function main(): Promise<void> {
  const orchestratorResult = await orchestrate({
    suiteName: SUITE,
    testCases: TEST_CASES,
    locatorMap: LOCATORS,
    healerOptions: HEAL_OPTS,
  });

  const passed = orchestratorResult.testResults.filter(t => t.status === 'PASS').length;
  const failed = orchestratorResult.testResults.filter(t => t.status === 'FAIL').length;
  const healEvents = orchestratorResult.healingEvents ?? [];
  const rcaReports = orchestratorResult.rcaResult?.reports ?? [];

  const payload: DashboardData = {
    title: 'Agentic QA Platform',
    generatedAt: new Date().toISOString(),
    kpis: {
      workflowStatus: orchestratorResult.workflowStatus === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
      testsPassed: passed,
      testsFailed: failed,
      healEvents: healEvents.length,
      rcaEvents: rcaReports.length,
    },
    agents: orchestratorResult.executedAgents.map(agent => ({
      name: agent.name as DashboardData['agents'][number]['name'],
      status: mapAgentStatus(agent.status),
      durationMs: agent.durationMs ?? 0,
    })),
    rcaSummary: rcaReports.map(report => ({
      failureType: report.failureType,
      rootCause: report.rootCause,
      recoveryAction: report.recoveryAction,
      confidence: report.confidence,
    })),
    healingAnalytics: healEvents.map(event => ({
      failedLocator: strategyToText(event.failedStrategy),
      recoveredLocator: strategyToText(event.healedStrategy),
      recoveryStatus: 'SUCCESS',
    })),
    workflowTimeline: ['Requirement', 'Planner', 'Designer', 'Generator', 'Execution', 'Healing', 'RCA'],
    visualizations: {
      testTrend: [{ run: 'Current Run', passed, failed }],
      eventDistribution: [
        { name: 'Heal', value: healEvents.length },
        { name: 'RCA', value: rcaReports.length },
        { name: 'Failed', value: failed },
      ],
      agentDurations: orchestratorResult.executedAgents.map(agent => ({
        agent: agent.name,
        durationMs: agent.durationMs ?? 0,
      })),
    },
  };

  const outputPath = resolve(__dirname, '../dashboard-ui/public/agentic-qa-runtime.json');
  writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf-8');

  console.log(`[dashboard-export] Wrote runtime dashboard artifact: ${outputPath}`);
  console.log(`[dashboard-export] Tests: ${passed} passed / ${failed} failed | Heal events: ${healEvents.length} | RCA: ${rcaReports.length}`);
}

main().catch(err => {
  console.error('[dashboard-export] Failed to generate artifacts:', err);
  process.exit(1);
});
