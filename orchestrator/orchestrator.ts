/**
 * orchestrator/orchestrator.ts
 *
 * Central QA Orchestrator — ties together the full agent workflow:
 *
 *   Plan → Design → Generate → Execute → Heal → RCA → Final Report
 *
 * Can be used as a programmatic API or run directly:
 *   npx ts-node orchestrator/orchestrator.ts
 */

import { chromium, BrowserContext, Page } from 'playwright';
import * as http from 'http';
import { exec } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { registerLocators, clearRegistry, listRegisteredKeys } from '../healing/locatorRegistry';
import { healLocator, HealerOptions, getHealLog, clearHealLog, printHealSummary } from '../healing/healer';
import { analyze, printAnalyzerResult, UnhealedFailure, AnalyzerResult } from '../rca/rcaAnalyzer';
import type { HealEvent } from '../healing/healer';
import {
  initializeWorkflow,
  updateAgent,
  markWorkflowComplete,
} from '../runtime/workflowStatus';
import type { AgentName as StatusAgentName } from '../runtime/workflowStatus';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentStatus = 'PENDING' | 'RUNNING' | 'PASS' | 'FAIL' | 'SKIPPED';

export interface AgentRecord {
  name: string;
  status: AgentStatus;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  detail?: string;
}

export interface TestStep {
  description: string;
  action: (page: Page) => Promise<void>;
}

export interface TestCase {
  id: string;
  name: string;
  suite: string;
  url: string;
  steps: TestStep[];
}

export interface OrchestratorResult {
  workflowStatus: 'SUCCESS' | 'FAILED';
  executedAgents: AgentRecord[];
  testResults: TestRunResult[];
  healingEvents?: HealEvent[];
  rcaResult?: AnalyzerResult;
  finalSummary: string;
}

export interface TestRunResult {
  testId: string;
  testName: string;
  status: 'PASS' | 'FAIL';
  durationMs: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Agent registry
// ---------------------------------------------------------------------------

const AGENTS = [
  'Planner',
  'Designer',
  'Generator',
  'Execution',
  'Healing',
  'RCA',
] as const;



type AgentName = typeof AGENTS[number];

function makeAgentRecord(name: AgentName): AgentRecord {
  return { name, status: 'PENDING' };
}

function startAgent(record: AgentRecord): void {
  record.status = 'RUNNING';
  record.startedAt = new Date().toISOString();
  console.log(`\n[orchestrator] ▶ ${record.name} agent — RUNNING`);
  try { updateAgent(record.name as StatusAgentName, 'RUNNING'); } catch { /* status file may not exist in isolated tests */ }
}

function finishAgent(record: AgentRecord, status: 'PASS' | 'FAIL', detail?: string): void {
  record.status = status;
  record.finishedAt = new Date().toISOString();
  record.durationMs = record.startedAt
    ? Date.now() - new Date(record.startedAt).getTime()
    : 0;
  record.detail = detail;
  const icon = status === 'PASS' ? '✔' : '✘';
  console.log(`[orchestrator] ${icon} ${record.name} agent — ${status}${detail ? ` | ${detail}` : ''}`);
  const agentState = status === 'PASS' ? 'SUCCESS' : 'FAILED';
  try { updateAgent(record.name as StatusAgentName, agentState); } catch { /* status file may not exist in isolated tests */ }
}

// ---------------------------------------------------------------------------
// Built-in Planner phase
// ---------------------------------------------------------------------------

function runPlanner(testCases: TestCase[], agents: Record<AgentName, AgentRecord>): void {
  startAgent(agents.Planner);
  if (testCases.length === 0) {
    finishAgent(agents.Planner, 'FAIL', 'No test cases provided');
    throw new Error('[orchestrator] Planner: no test cases to plan.');
  }
  console.log(`[orchestrator]   Planned ${testCases.length} test case(s):`);
  testCases.forEach(tc => console.log(`    • [${tc.id}] ${tc.name} (suite: ${tc.suite})`));
  finishAgent(agents.Planner, 'PASS', `${testCases.length} test(s) planned`);
}

// ---------------------------------------------------------------------------
// Built-in Designer phase
// ---------------------------------------------------------------------------

function runDesigner(
  testCases: TestCase[],
  locatorMap: Parameters<typeof registerLocators>[0],
  agents: Record<AgentName, AgentRecord>
): void {
  startAgent(agents.Designer);
  clearRegistry();
  registerLocators(locatorMap);
  const keys = listRegisteredKeys();
  console.log(`[orchestrator]   Registered ${keys.length} locator key(s): ${keys.join(', ')}`);
  finishAgent(agents.Designer, 'PASS', `${keys.length} locators registered`);
}

// ---------------------------------------------------------------------------
// Built-in Generator phase
// ---------------------------------------------------------------------------

function runGenerator(testCases: TestCase[], agents: Record<AgentName, AgentRecord>): void {
  startAgent(agents.Generator);
  console.log(`[orchestrator]   Generated ${testCases.length} test execution plan(s).`);
  finishAgent(agents.Generator, 'PASS', `${testCases.length} plan(s) generated`);
}

// ---------------------------------------------------------------------------
// Built-in Execution phase
// ---------------------------------------------------------------------------

async function runExecution(
  testCases: TestCase[],
  healerOptions: HealerOptions,
  agents: Record<AgentName, AgentRecord>,
  options: { trackExecutionAgent?: boolean; phaseLabel?: string } = {}
): Promise<{ results: TestRunResult[]; unhealedFailures: UnhealedFailure[] }> {
  const { trackExecutionAgent = true, phaseLabel = 'Execution' } = options;

  if (trackExecutionAgent) {
    startAgent(agents.Execution);
  }

  const browser = await chromium.launch({ headless: true });
  const results: TestRunResult[] = [];
  const unhealedFailures: UnhealedFailure[] = [];

  try {
    for (const tc of testCases) {
      const context: BrowserContext = await browser.newContext();
      const page: Page = await context.newPage();
      const start = Date.now();
      let error: string | undefined;

      try {
        await page.goto(tc.url, { timeout: 60000 });
        await page.waitForLoadState('domcontentloaded');

        for (const step of tc.steps) {
          console.log(`[orchestrator]     Step: ${step.description}`);
          await step.action(page);
        }

        results.push({ testId: tc.id, testName: tc.name, status: 'PASS', durationMs: Date.now() - start });
        console.log(`[orchestrator]   ✔ ${tc.id} – ${tc.name} PASS (${Date.now() - start}ms)`);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        results.push({ testId: tc.id, testName: tc.name, status: 'FAIL', durationMs: Date.now() - start, error });
        unhealedFailures.push({
          testName: tc.name,
          errorMessage: error,
          pageUrl: page.url(),
          timestamp: new Date().toISOString(),
        });
        console.error(`[orchestrator]   ✘ ${tc.id} – ${tc.name} FAIL | ${error}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const execStatus: 'PASS' | 'FAIL' = failed === 0 ? 'PASS' : 'FAIL';
  if (trackExecutionAgent) {
    finishAgent(agents.Execution, execStatus, `${passed} passed, ${failed} failed`);
  } else {
    console.log(`[orchestrator] ${phaseLabel}: ${passed} passed, ${failed} failed`);
  }

  return { results, unhealedFailures };
}

// ---------------------------------------------------------------------------
// Built-in Healing phase
// ---------------------------------------------------------------------------

function runHealing(agents: Record<AgentName, AgentRecord>): void {
  startAgent(agents.Healing);
  const log = getHealLog();
  if (log.length === 0) {
    finishAgent(agents.Healing, 'PASS', 'No healing events — all primary strategies succeeded');
  } else {
    printHealSummary();
    finishAgent(agents.Healing, 'PASS', `${log.length} heal event(s) recorded`);
  }
}

// ---------------------------------------------------------------------------
// Built-in RCA phase
// ---------------------------------------------------------------------------

function runRCA(
  testName: string,
  unhealedFailures: UnhealedFailure[],
  agents: Record<AgentName, AgentRecord>
): AnalyzerResult {
  startAgent(agents.RCA);
  const result = analyze(testName, unhealedFailures);
  printAnalyzerResult(result);
  const rcaStatus: 'PASS' | 'FAIL' = result.overallStatus === 'FAIL' ? 'FAIL' : 'PASS';
  finishAgent(agents.RCA, rcaStatus, result.summary);
  return result;
}

// ---------------------------------------------------------------------------
// Final report renderer
// ---------------------------------------------------------------------------

function printFinalReport(result: OrchestratorResult): void {
  const divider = '═'.repeat(60);
  console.log(`\n${divider}`);
  console.log('ORCHESTRATOR — FINAL REPORT');
  console.log(divider);
  console.log(`Workflow Status: ${result.workflowStatus}`);
  console.log(`\nExecuted Agents:`);
  for (const agent of result.executedAgents) {
    const icon = agent.status === 'PASS' ? '✔' : agent.status === 'FAIL' ? '✘' : '○';
    const dur = agent.durationMs !== undefined ? ` (${agent.durationMs}ms)` : '';
    console.log(`  ${icon} ${agent.name}${dur}${agent.detail ? ' — ' + agent.detail : ''}`);
  }

  console.log(`\nTest Results:`);
  for (const tr of result.testResults) {
    const icon = tr.status === 'PASS' ? '✔' : '✘';
    console.log(`  ${icon} [${tr.testId}] ${tr.testName} — ${tr.status} (${tr.durationMs}ms)${tr.error ? '\n      Error: ' + tr.error : ''}`);
  }

  console.log(`\nFinal Summary:\n  ${result.finalSummary}`);
  console.log(`${divider}\n`);
}

// ---------------------------------------------------------------------------
// Main orchestrate() API
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Dashboard auto-launch helper
// ---------------------------------------------------------------------------

const DASHBOARD_URL = 'http://localhost:5173';

/**
 * Checks if the Vite dashboard is reachable, then opens it in the default
 * browser once per run. Non-blocking — never throws.
 */
function openDashboard(): void {
  const req = http.get(DASHBOARD_URL, (res) => {
    res.resume();
    if (res.statusCode && res.statusCode < 400) {
      const cmd =
        process.platform === 'win32'
          ? `start "" "${DASHBOARD_URL}"`
          : process.platform === 'darwin'
          ? `open "${DASHBOARD_URL}"`
          : `xdg-open "${DASHBOARD_URL}"`;
      exec(cmd, (err) => {
        if (err) {
          console.log(`[orchestrator] Dashboard reachable but could not auto-open browser: ${err.message}`);
        } else {
          console.log(`[orchestrator] 🌐 Dashboard opened at ${DASHBOARD_URL}`);
        }
      });
    }
  });
  req.on('error', () => { /* dashboard not running — silently skip */ });
  req.setTimeout(2000, () => req.destroy());
}

/** Pause execution for `ms` milliseconds (used in demo mode only). */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main orchestrate() API
// ---------------------------------------------------------------------------

export interface OrchestratorOptions {
  suiteName: string;
  testCases: TestCase[];
  locatorMap: Parameters<typeof registerLocators>[0];
  healerOptions?: HealerOptions;
  /**
   * Optional hook fired immediately after Generator completes successfully.
   * Useful for live demos that want to materialize generated test artifacts
   * only when the flow reaches the Generator stage.
   */
  onAfterGenerator?: () => void | Promise<void>;
  /**
   * Optional post-execution self-heal retry mode.
   * When enabled, failed tests are re-run with aggressive healer options.
   * Default: disabled (keeps existing behavior unchanged).
   */
  postExecutionSelfHealRetry?: {
    enabled?: boolean;
    maxAttempts?: number;
    strategyTimeoutMs?: number;
    onBeforeRetry?: () => void | Promise<void>;
  };
  /**
   * Demo mode — adds artificial delays to Planner, Designer and Generator so
   * users can watch each agent card transition on the live dashboard.
   * Default: false (production mode, no delays).
   */
  demoMode?: boolean;
}

export async function orchestrate(options: OrchestratorOptions): Promise<OrchestratorResult> {
  const {
    suiteName,
    testCases,
    locatorMap,
    healerOptions = { strategyTimeout: 10000, promoteOnHeal: true },
    onAfterGenerator,
    postExecutionSelfHealRetry,
    demoMode = false,
  } = options;

  const retryEnabled = postExecutionSelfHealRetry?.enabled ?? false;
  const retryMaxAttempts = Math.max(1, Math.min(3, postExecutionSelfHealRetry?.maxAttempts ?? 1));
  const retryHealerOptions: HealerOptions = {
    ...healerOptions,
    promoteOnHeal: true,
    strategyTimeout: postExecutionSelfHealRetry?.strategyTimeoutMs ?? Math.max(15000, healerOptions.strategyTimeout ?? 10000),
  };

  // Demo-mode delays (ms) — keep 0 in production
  // Increased delays to 5s/5s/6s for better visibility of each agent transition
  const delay = {
    planner:  demoMode ? 5000 : 0,
    designer: demoMode ? 5000 : 0,
    generator: demoMode ? 6000 : 0,
  };

  clearHealLog();

  // Initialize live workflow status tracking
  initializeWorkflow(`run-${Date.now()}`);

  // Auto-launch dashboard in default browser (once per run, non-blocking)
  openDashboard();

  const agentRecords = Object.fromEntries(
    AGENTS.map(name => [name, makeAgentRecord(name)])
  ) as Record<AgentName, AgentRecord>;

  const divider = '═'.repeat(60);
  console.log(`\n${divider}`);
  console.log(`ORCHESTRATOR — ${suiteName}`);
  console.log(divider);

  let testResults: TestRunResult[] = [];
  let unhealedFailures: UnhealedFailure[] = [];
  let rcaResult: AnalyzerResult | undefined;
  let healingEvents: HealEvent[] = [];

  try {
    // 1. Planner
    runPlanner(testCases, agentRecords);
    if (delay.planner) await sleep(delay.planner);

    // 2. Designer
    runDesigner(testCases, locatorMap, agentRecords);
    if (delay.designer) await sleep(delay.designer);

    // 3. Generator
    runGenerator(testCases, agentRecords);
    if (onAfterGenerator) {
      await onAfterGenerator();
    }
    if (delay.generator) await sleep(delay.generator);

    // 4. Execution
    const execOut = await runExecution(testCases, healerOptions, agentRecords);
    testResults = execOut.results;
    unhealedFailures = execOut.unhealedFailures;

    // 5. Healing (with optional post-execution retry mode)
    startAgent(agentRecords.Healing);

    let retryAttemptsUsed = 0;
    let recoveredCount = 0;

    if (retryEnabled) {
      let remainingFailedIds = new Set(testResults.filter(r => r.status === 'FAIL').map(r => r.testId));

      while (remainingFailedIds.size > 0 && retryAttemptsUsed < retryMaxAttempts) {
        retryAttemptsUsed += 1;
        const failedCases = testCases.filter(tc => remainingFailedIds.has(tc.id));
        if (failedCases.length === 0) break;

        if (retryAttemptsUsed === 1 && postExecutionSelfHealRetry?.onBeforeRetry) {
          await postExecutionSelfHealRetry.onBeforeRetry();
        }

        try { updateAgent('Execution', 'RUNNING'); } catch { /* status file may not exist in isolated tests */ }

        console.log(
          `[orchestrator] Healing retry ${retryAttemptsUsed}/${retryMaxAttempts}: ` +
          `re-running ${failedCases.length} failed test(s) with aggressive locator recovery...`
        );

        const retryOut = await runExecution(
          failedCases,
          retryHealerOptions,
          agentRecords,
          { trackExecutionAgent: false, phaseLabel: `Healing Retry #${retryAttemptsUsed}` }
        );

        // Merge retry results back into the main test result set
        for (const rr of retryOut.results) {
          const idx = testResults.findIndex(tr => tr.testId === rr.testId);
          const prevFailed = idx >= 0 && testResults[idx].status === 'FAIL';

          if (idx >= 0) testResults[idx] = rr;
          else testResults.push(rr);

          if (prevFailed && rr.status === 'PASS') {
            recoveredCount += 1;
          }
        }

        remainingFailedIds = new Set(testResults.filter(r => r.status === 'FAIL').map(r => r.testId));
        unhealedFailures = retryOut.unhealedFailures;

        const retryExecStatus: 'PASS' | 'FAIL' = remainingFailedIds.size === 0 ? 'PASS' : 'FAIL';
        try { updateAgent('Execution', retryExecStatus === 'PASS' ? 'SUCCESS' : 'FAILED'); } catch { /* status file may not exist in isolated tests */ }
      }
    }

    healingEvents = [...getHealLog()];
    const stillFailed = testResults.filter(r => r.status === 'FAIL').length;
    if (retryEnabled) {
      if (stillFailed === 0) {
        // Reconcile the Execution agent when post-execution retries recover all failures.
        agentRecords.Execution.status = 'PASS';
        agentRecords.Execution.detail =
          `Recovered after healing retries: attempts=${retryAttemptsUsed}, recovered=${recoveredCount}`;
        try { updateAgent('Execution', 'SUCCESS'); } catch { /* status file may not exist in isolated tests */ }
        console.log('[orchestrator] ✔ Execution agent reconciled to PASS after successful healing retries');
      } else {
        agentRecords.Execution.status = 'FAIL';
        agentRecords.Execution.detail =
          `Healing retries exhausted: attempts=${retryAttemptsUsed}, remainingFailed=${stillFailed}`;
        try { updateAgent('Execution', 'FAILED'); } catch { /* status file may not exist in isolated tests */ }
      }
    }

    if (retryEnabled) {
      finishAgent(
        agentRecords.Healing,
        'PASS',
        `Self-heal retry enabled: attempts=${retryAttemptsUsed}, recovered=${recoveredCount}, remainingFailed=${stillFailed}, healEvents=${healingEvents.length}`
      );
    } else if (healingEvents.length === 0) {
      finishAgent(agentRecords.Healing, 'PASS', 'No healing events — all primary strategies succeeded');
    } else {
      printHealSummary();
      finishAgent(agentRecords.Healing, 'PASS', `${healingEvents.length} heal event(s) recorded`);
    }

    // 6. RCA
    rcaResult = runRCA(suiteName, unhealedFailures, agentRecords);

  } catch (err) {
    console.error(`[orchestrator] Fatal error: ${String(err)}`);
  } finally {
    clearHealLog();
  }

  const anyFail = testResults.some(r => r.status === 'FAIL');
  const workflowStatus: OrchestratorResult['workflowStatus'] = anyFail ? 'FAILED' : 'SUCCESS';
  markWorkflowComplete(workflowStatus);

  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const finalSummary =
    `Suite "${suiteName}" — ${passed}/${testResults.length} test(s) passed, ` +
    `${failed} failed. ` +
    `Healed: ${healingEvents.length} event(s). ` +
    `Workflow: ${workflowStatus}.`;

  const result: OrchestratorResult = {
    workflowStatus,
    executedAgents: Object.values(agentRecords),
    testResults,
    healingEvents,
    rcaResult,
    finalSummary,
  };

  printFinalReport(result);
  // --- Write runtime dashboard artifact so the UI reflects this run's results ---
  try {
    // Compute execution duration: prefer the Execution agent duration, otherwise
    // fall back to wall-clock between earliest agent start and latest finish.
    let executionDurationMs: number | undefined = undefined;
    const executionAgent = Object.values(agentRecords).find(a => a.name === 'Execution');
    if (executionAgent && executionAgent.durationMs != null) {
      executionDurationMs = executionAgent.durationMs;
    } else {
      const starts = Object.values(agentRecords)
        .map(a => a.startedAt)
        .filter(Boolean)
        .map(s => new Date(s!).getTime());
      const finishes = Object.values(agentRecords)
        .map(a => a.finishedAt)
        .filter(Boolean)
        .map(s => new Date(s!).getTime());
      if (starts.length > 0 && finishes.length > 0) {
        const minStart = Math.min(...starts);
        const maxFinish = Math.max(...finishes);
        executionDurationMs = maxFinish - minStart;
      }
    }

    const rcaEventsCount = result.rcaResult ? (result.rcaResult.reports ? result.rcaResult.reports.length : 0) : 0;

    const payload = {
      title: 'Agentic QA Platform',
      generatedAt: new Date().toISOString(),
      kpis: {
        workflowStatus: result.workflowStatus,
        testsPassed: result.testResults.filter(r => r.status === 'PASS').length,
        testsFailed: result.testResults.filter(r => r.status === 'FAIL').length,
        healEvents: result.healingEvents ? result.healingEvents.length : 0,
        rcaEvents: rcaEventsCount,
        executionDurationMs,
      },
      agents: result.executedAgents.map(a => ({ name: a.name, status: a.status === 'PASS' ? 'SUCCESS' : 'FAILED', durationMs: a.durationMs })),
      rcaSummary: result.rcaResult ? (result.rcaResult.reports ?? []) : [],
      healingAnalytics: result.healingEvents ?? [],
      workflowTimeline: ['Requirement', 'Planner', 'Designer', 'Generator', 'Execution', 'Healing', 'RCA'],
      visualizations: {
        testTrend: result.testResults.map((t, i) => ({ run: t.testId, passed: result.testResults.slice(0, i + 1).filter(x => x.status === 'PASS').length, failed: result.testResults.slice(0, i + 1).filter(x => x.status === 'FAIL').length })),
        eventDistribution: [
          { name: 'Heal', value: result.healingEvents ? result.healingEvents.length : 0 },
          { name: 'RCA', value: rcaEventsCount },
          { name: 'Failed', value: result.testResults.filter(r => r.status === 'FAIL').length },
        ],
        agentDurations: result.executedAgents.map(a => ({ agent: a.name, durationMs: a.durationMs })),
      },
    };

    const outPath = resolve(__dirname, '../dashboard-ui/public/agentic-qa-runtime.json');
    writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`[orchestrator] Dashboard runtime artifact written: ${outPath}`);
  } catch (e) {
    console.warn('[orchestrator] Could not write dashboard runtime artifact:', e);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Demo entry point  (npx ts-node orchestrator/orchestrator.ts)
// ---------------------------------------------------------------------------

if (require.main === module) {
  const { expect } = require('@playwright/test') as typeof import('@playwright/test');

  const HEAL_OPTS: HealerOptions = { strategyTimeout: 10000, promoteOnHeal: true };

  const loginLocators: Parameters<typeof registerLocators>[0] = [
    {
      key: 'loginUsername',
      strategies: [
        { type: 'name',        value: 'username' },
        { type: 'placeholder', value: 'Username' },
        { type: 'css',         selector: 'input.oxd-input[name="username"]' },
      ],
    },
    {
      key: 'loginPassword',
      strategies: [
        { type: 'name',        value: 'password' },
        { type: 'placeholder', value: 'Password' },
        { type: 'css',         selector: 'input.oxd-input[name="password"]' },
      ],
    },
    {
      key: 'loginButton',
      strategies: [
        { type: 'role', role: 'button', options: { name: 'Login' } },
        { type: 'css',  selector: 'button[type="submit"]' },
      ],
    },
    {
      key: 'dashboardHeading',
      strategies: [
        { type: 'role', role: 'heading', options: { name: 'Dashboard' } },
        { type: 'text', value: 'Dashboard', exact: true },
      ],
    },
  ];

  const BASE_URL = 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login';

  const testCases: TestCase[] = [
    {
      id: 'TC_001',
      name: 'Login page loads',
      suite: 'OrangeHRM Login Suite',
      url: BASE_URL,
      steps: [
        {
          description: 'Verify Login page heading is visible',
          action: async (page: Page) => {
            const loc = await healLocator(page, 'loginUsername', [
              { type: 'name', value: 'username' },
              { type: 'placeholder', value: 'Username' },
            ], { ...HEAL_OPTS, strategyTimeout: 10000 });
            const { expect: exp } = require('@playwright/test') as typeof import('@playwright/test');
            await exp(loc).toBeVisible();
          },
        },
      ],
    },
    {
      id: 'TC_002',
      name: 'Successful login',
      suite: 'OrangeHRM Login Suite',
      url: BASE_URL,
      steps: [
        {
          description: 'Fill username',
          action: async (page: Page) => {
            const loc = await healLocator(page, 'loginUsername', loginLocators[0].strategies, HEAL_OPTS);
            await loc.fill('Admin');
          },
        },
        {
          description: 'Fill password',
          action: async (page: Page) => {
            const loc = await healLocator(page, 'loginPassword', loginLocators[1].strategies, HEAL_OPTS);
            await loc.fill('admin123');
          },
        },
        {
          description: 'Click Login button',
          action: async (page: Page) => {
            const loc = await healLocator(page, 'loginButton', loginLocators[2].strategies, HEAL_OPTS);
            await loc.click();
          },
        },
        {
          description: 'Verify Dashboard is displayed',
          action: async (page: Page) => {
            await page.waitForURL(/\/dashboard/i, { timeout: 60000 });
            const loc = await healLocator(page, 'dashboardHeading', loginLocators[3].strategies, HEAL_OPTS);
            const { expect: exp } = require('@playwright/test') as typeof import('@playwright/test');
            await exp(loc).toBeVisible();
          },
        },
      ],
    },
  ];

  orchestrate({
    suiteName: 'OrangeHRM Login Suite',
    testCases,
    locatorMap: loginLocators,
    healerOptions: HEAL_OPTS,
  }).catch(err => {
    console.error('[orchestrator] Unhandled error:', err);
    process.exit(1);
  });
}
