import { OrchestratorResult } from '../orchestrator/orchestrator';
import { AnalyzerResult } from '../rca/rcaAnalyzer';
import { RCAReport } from '../rca/rcaDemo';
import { buildDashboardData, renderDashboardLines } from './dashboardData';

function createMockReports(): RCAReport[] {
  const now = new Date().toISOString();
  return [
    {
      testName: 'Successful login with self-healing locators',
      elementKey: 'loginUsername',
      failureType: 'LocatorBreakage',
      affectedElement: 'name="username"',
      rootCause: 'Primary name-based locator no longer matched after UI attribute change.',
      recoveryAction: 'Fallback strategy using placeholder succeeded and was promoted.',
      recoveryStatus: 'SUCCESS',
      confidence: 85,
      recommendation: 'Prefer data-testid for username input to avoid attribute drift.',
      timestamp: now,
      pageUrl: 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login',
    },
    {
      testName: 'Healing fallback demo',
      elementKey: 'dashboardHeading',
      failureType: 'Timeout',
      affectedElement: 'css="h1.dashboard-title"',
      rootCause: 'Dashboard render was delayed and selector did not resolve before timeout.',
      recoveryAction: 'Manual rerun required after timeout.',
      recoveryStatus: 'FAILED',
      confidence: 78,
      recommendation: 'Increase strategyTimeout and wait for dashboard route before assertion.',
      timestamp: now,
      pageUrl: 'https://opensource-demo.orangehrmlive.com/web/index.php/dashboard/index',
    },
  ];
}

function createMockAnalyzerResult(reports: RCAReport[]): AnalyzerResult {
  return {
    testName: 'OrangeHRM Login Suite',
    totalEvents: reports.length,
    healedCount: reports.filter(r => r.recoveryStatus === 'SUCCESS').length,
    unhealedCount: reports.filter(r => r.recoveryStatus === 'FAILED').length,
    overallStatus: 'FAIL',
    reports,
    summary: 'Test "OrangeHRM Login Suite" - 1 healed event(s), 1 unhealed failure(s). Overall: FAIL.',
  };
}

function createMockOrchestratorResult(rcaResult: AnalyzerResult): OrchestratorResult {
  return {
    workflowStatus: 'FAILED',
    executedAgents: [
      { name: 'Planner', status: 'PASS', durationMs: 64, detail: '3 test(s) planned' },
      { name: 'Designer', status: 'PASS', durationMs: 41, detail: '5 locators registered' },
      { name: 'Generator', status: 'PASS', durationMs: 26, detail: '3 plan(s) generated' },
      { name: 'Execution', status: 'FAIL', durationMs: 4200, detail: '2 passed, 1 failed' },
      { name: 'Healing', status: 'PASS', durationMs: 15, detail: '1 heal event(s) recorded' },
      { name: 'RCA', status: 'PASS', durationMs: 34, detail: rcaResult.summary },
    ],
    testResults: [
      { testId: 'TC_001', testName: 'Login page loads', status: 'PASS', durationMs: 950 },
      { testId: 'TC_002', testName: 'Successful login', status: 'PASS', durationMs: 1250 },
      {
        testId: 'TC_003',
        testName: 'Healing fallback: CSS used when primary name strategy is broken',
        status: 'FAIL',
        durationMs: 2000,
        error: 'Timeout while waiting for dashboard heading',
      },
    ],
    rcaResult,
    finalSummary: 'Suite "OrangeHRM Login Suite" - 2/3 test(s) passed, 1 failed. Workflow: FAILED.',
  };
}

function main(): void {
  const reports = createMockReports();
  const analyzerResult = createMockAnalyzerResult(reports);
  const orchestratorResult = createMockOrchestratorResult(analyzerResult);

  const dashboardData = buildDashboardData(
    'OrangeHRM Login Suite',
    orchestratorResult,
    analyzerResult
  );

  const lines = renderDashboardLines(dashboardData);
  console.log(lines.join('\n'));
}

main();
