import { OrchestratorResult, AgentRecord, TestRunResult } from '../orchestrator/orchestrator';
import { AnalyzerResult } from '../rca/rcaAnalyzer';
import { FailureType, RCAReport } from '../rca/rcaDemo';

export interface DashboardKpi {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
  totalAgents: number;
  passedAgents: number;
  failedAgents: number;
  healedCount: number;
  unhealedCount: number;
  workflowStatus: OrchestratorResult['workflowStatus'];
}

export interface FailureBucket {
  type: FailureType;
  count: number;
}

export interface AgentHealthRow {
  name: string;
  status: AgentRecord['status'];
  durationMs: number;
  detail: string;
}

export interface SlowTestRow {
  id: string;
  name: string;
  status: TestRunResult['status'];
  durationMs: number;
}

export interface DashboardData {
  generatedAt: string;
  suiteName: string;
  kpi: DashboardKpi;
  failureBreakdown: FailureBucket[];
  slowestTests: SlowTestRow[];
  agentHealth: AgentHealthRow[];
  topRecommendations: string[];
  summary: string;
}

function toPercent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Number(((value / total) * 100).toFixed(2));
}

function buildFailureBreakdown(reports: RCAReport[]): FailureBucket[] {
  const counts = new Map<FailureType, number>();
  for (const report of reports) {
    counts.set(report.failureType, (counts.get(report.failureType) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}

function buildAgentHealth(rows: AgentRecord[]): AgentHealthRow[] {
  return rows.map(row => ({
    name: row.name,
    status: row.status,
    durationMs: row.durationMs ?? 0,
    detail: row.detail ?? '',
  }));
}

function buildSlowTests(rows: TestRunResult[], limit = 5): SlowTestRow[] {
  return [...rows]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, limit)
    .map(row => ({
      id: row.testId,
      name: row.testName,
      status: row.status,
      durationMs: row.durationMs,
    }));
}

function uniqueRecommendations(reports: RCAReport[], limit = 3): string[] {
  const set = new Set<string>();
  for (const report of reports) {
    if (report.recommendation.trim()) set.add(report.recommendation.trim());
    if (set.size >= limit) break;
  }
  return Array.from(set);
}

export function buildDashboardData(
  suiteName: string,
  orchestratorResult: OrchestratorResult,
  rcaResult?: AnalyzerResult
): DashboardData {
  const tests = orchestratorResult.testResults;
  const agents = orchestratorResult.executedAgents;
  const reports = rcaResult?.reports ?? orchestratorResult.rcaResult?.reports ?? [];

  const passedTests = tests.filter(t => t.status === 'PASS').length;
  const failedTests = tests.filter(t => t.status === 'FAIL').length;
  const passedAgents = agents.filter(a => a.status === 'PASS').length;
  const failedAgents = agents.filter(a => a.status === 'FAIL').length;
  const healedCount = rcaResult?.healedCount ?? orchestratorResult.rcaResult?.healedCount ?? 0;
  const unhealedCount = rcaResult?.unhealedCount ?? orchestratorResult.rcaResult?.unhealedCount ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    suiteName,
    kpi: {
      totalTests: tests.length,
      passedTests,
      failedTests,
      passRate: toPercent(passedTests, tests.length),
      totalAgents: agents.length,
      passedAgents,
      failedAgents,
      healedCount,
      unhealedCount,
      workflowStatus: orchestratorResult.workflowStatus,
    },
    failureBreakdown: buildFailureBreakdown(reports),
    slowestTests: buildSlowTests(tests),
    agentHealth: buildAgentHealth(agents),
    topRecommendations: uniqueRecommendations(reports),
    summary: orchestratorResult.finalSummary,
  };
}

export function renderDashboardLines(data: DashboardData): string[] {
  const lines: string[] = [];

  lines.push('============================================================');
  lines.push(`QA Dashboard | ${data.suiteName}`);
  lines.push(`Generated At: ${data.generatedAt}`);
  lines.push('============================================================');
  lines.push('KPIs');
  lines.push(`  Workflow:       ${data.kpi.workflowStatus}`);
  lines.push(`  Tests:          ${data.kpi.passedTests}/${data.kpi.totalTests} passed (${data.kpi.passRate}%)`);
  lines.push(`  Agents:         ${data.kpi.passedAgents}/${data.kpi.totalAgents} passed`);
  lines.push(`  Healing:        ${data.kpi.healedCount} healed, ${data.kpi.unhealedCount} unhealed`);

  lines.push('');
  lines.push('Failure Breakdown');
  if (data.failureBreakdown.length === 0) {
    lines.push('  None');
  } else {
    for (const row of data.failureBreakdown) {
      lines.push(`  - ${row.type}: ${row.count}`);
    }
  }

  lines.push('');
  lines.push('Slowest Tests');
  if (data.slowestTests.length === 0) {
    lines.push('  None');
  } else {
    for (const row of data.slowestTests) {
      lines.push(`  - [${row.id}] ${row.name} | ${row.status} | ${row.durationMs}ms`);
    }
  }

  lines.push('');
  lines.push('Agent Health');
  if (data.agentHealth.length === 0) {
    lines.push('  None');
  } else {
    for (const row of data.agentHealth) {
      lines.push(`  - ${row.name} | ${row.status} | ${row.durationMs}ms${row.detail ? ` | ${row.detail}` : ''}`);
    }
  }

  lines.push('');
  lines.push('Top Recommendations');
  if (data.topRecommendations.length === 0) {
    lines.push('  None');
  } else {
    for (const recommendation of data.topRecommendations) {
      lines.push(`  - ${recommendation}`);
    }
  }

  lines.push('');
  lines.push('Summary');
  lines.push(`  ${data.summary}`);
  lines.push('============================================================');

  return lines;
}
