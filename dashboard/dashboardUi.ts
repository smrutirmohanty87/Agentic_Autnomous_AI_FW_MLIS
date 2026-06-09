/// <reference types="node" />

import { writeFileSync } from 'fs';
import { join } from 'path';
import { OrchestratorResult } from '../orchestrator/orchestrator';
import { AnalyzerResult } from '../rca/rcaAnalyzer';
import { RCAReport } from '../rca/rcaDemo';
import { buildDashboardData, DashboardData, FailureBucket } from './dashboardData';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function statusClass(value: string): string {
  const normalized = value.toUpperCase();
  if (normalized === 'PASS' || normalized === 'SUCCESS') return 'ok';
  if (normalized === 'PARTIAL_HEAL') return 'warn';
  return 'bad';
}

function createMockReports(): RCAReport[] {
  const now = new Date().toISOString();
  return [
    {
      testName: 'PIM employee search',
      elementKey: 'employeeNameInput',
      failureType: 'MultipleMatches',
      affectedElement: 'placeholder="Type for hints..."',
      rootCause: 'Two autocomplete fields share the same placeholder in PIM filters.',
      recoveryAction: 'Fallback CSS scoped to first autocomplete input was used.',
      recoveryStatus: 'SUCCESS',
      confidence: 90,
      recommendation: 'Use unique data-testid for Employee Name and Supervisor Name fields.',
      timestamp: now,
      pageUrl: 'https://opensource-demo.orangehrmlive.com/web/index.php/pim/viewEmployeeList',
    },
  ];
}

function createMockAnalyzerResult(reports: RCAReport[]): AnalyzerResult {
  return {
    testName: 'OrangeHRM PIM Suite',
    totalEvents: reports.length,
    healedCount: reports.filter(r => r.recoveryStatus === 'SUCCESS').length,
    unhealedCount: reports.filter(r => r.recoveryStatus === 'FAILED').length,
    overallStatus: 'PARTIAL_HEAL',
    reports,
    summary: 'Test "OrangeHRM PIM Suite" - 1 healed event(s), 0 unhealed failure(s). Overall: PARTIAL_HEAL.',
  };
}

function createMockOrchestratorResult(rcaResult: AnalyzerResult): OrchestratorResult {
  return {
    workflowStatus: 'SUCCESS',
    executedAgents: [
      { name: 'Planner', status: 'PASS', durationMs: 72, detail: '2 test(s) planned' },
      { name: 'Designer', status: 'PASS', durationMs: 55, detail: '9 locators registered' },
      { name: 'Generator', status: 'PASS', durationMs: 38, detail: '2 plan(s) generated' },
      { name: 'Execution', status: 'PASS', durationMs: 5600, detail: '2 passed, 0 failed' },
      { name: 'Healing', status: 'PASS', durationMs: 20, detail: '1 healed locator promoted' },
      { name: 'RCA', status: 'PASS', durationMs: 27, detail: rcaResult.summary },
    ],
    testResults: [
      {
        testId: 'TC_004',
        testName: 'Login, open PIM, search employee by name, verify row',
        status: 'PASS',
        durationMs: 3100,
      },
      {
        testId: 'TC_005',
        testName: 'Direct PIM access and records visibility',
        status: 'PASS',
        durationMs: 1800,
      },
    ],
    rcaResult,
    finalSummary: 'Suite "OrangeHRM PIM Suite" - 2/2 test(s) passed. Workflow: SUCCESS.',
  };
}

function renderFailureRows(rows: FailureBucket[]): string {
  if (rows.length === 0) {
    return '<tr><td colspan="3">No failures detected.</td></tr>';
  }

  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return rows
    .map(row => {
      const width = total > 0 ? Math.round((row.count / total) * 100) : 0;
      return `
        <tr>
          <td>${escapeHtml(row.type)}</td>
          <td>${row.count}</td>
          <td>
            <div class="meter">
              <span style="width: ${width}%"></span>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

function renderDashboardHtml(data: DashboardData): string {
  const recommendations = data.topRecommendations.length
    ? data.topRecommendations
        .map(item => `<li>${escapeHtml(item)}</li>`)
        .join('')
    : '<li>No recommendations available.</li>';

  const testRows = data.slowestTests.length
    ? data.slowestTests
        .map(
          test => `
          <tr>
            <td>${escapeHtml(test.id)}</td>
            <td>${escapeHtml(test.name)}</td>
            <td><span class="pill ${statusClass(test.status)}">${escapeHtml(test.status)}</span></td>
            <td>${test.durationMs} ms</td>
          </tr>
        `
        )
        .join('')
    : '<tr><td colspan="4">No test execution data.</td></tr>';

  const agentRows = data.agentHealth.length
    ? data.agentHealth
        .map(
          agent => `
          <tr>
            <td>${escapeHtml(agent.name)}</td>
            <td><span class="pill ${statusClass(agent.status)}">${escapeHtml(agent.status)}</span></td>
            <td>${agent.durationMs} ms</td>
            <td>${escapeHtml(agent.detail || '-')}</td>
          </tr>
        `
        )
        .join('')
    : '<tr><td colspan="4">No agent execution data.</td></tr>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>QA Dashboard UI</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

    :root {
      --bg-1: #08141d;
      --bg-2: #133045;
      --surface: rgba(8, 20, 29, 0.74);
      --surface-2: rgba(18, 45, 64, 0.68);
      --text: #f6fbff;
      --muted: #9fc2d7;
      --line: rgba(146, 195, 222, 0.28);
      --ok: #2eb67d;
      --warn: #e3b341;
      --bad: #eb5757;
      --accent: #15c4da;
      --accent-2: #5be7a9;
      --card-shadow: 0 18px 45px rgba(2, 9, 14, 0.45);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: 'Space Grotesk', sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at 8% 12%, rgba(91, 231, 169, 0.22), transparent 35%),
        radial-gradient(circle at 90% 18%, rgba(21, 196, 218, 0.2), transparent 38%),
        linear-gradient(160deg, var(--bg-1), var(--bg-2));
      min-height: 100vh;
    }

    .grid-overlay {
      position: fixed;
      inset: 0;
      pointer-events: none;
      background-image:
        linear-gradient(rgba(159, 194, 215, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(159, 194, 215, 0.05) 1px, transparent 1px);
      background-size: 28px 28px;
      mask-image: radial-gradient(circle at center, black 40%, transparent 88%);
    }

    .container {
      width: min(1120px, 100% - 2rem);
      margin: 2rem auto 3rem;
      display: grid;
      gap: 1rem;
      position: relative;
      z-index: 1;
    }

    .panel {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 18px;
      box-shadow: var(--card-shadow);
      backdrop-filter: blur(6px);
      animation: rise 480ms ease forwards;
      opacity: 0;
      transform: translateY(12px);
    }

    .hero {
      padding: 1.2rem 1.3rem;
      background: linear-gradient(130deg, rgba(19, 56, 79, 0.82), rgba(8, 20, 29, 0.86));
    }

    .hero h1 {
      margin: 0;
      font-size: clamp(1.3rem, 2vw, 1.8rem);
      letter-spacing: 0.03em;
    }

    .hero p {
      margin: 0.45rem 0 0;
      color: var(--muted);
      font-size: 0.95rem;
    }

    .status-line {
      margin-top: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.7rem;
      flex-wrap: wrap;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 0.8rem;
    }

    .kpi {
      padding: 0.85rem;
      background: var(--surface-2);
      border-radius: 14px;
      border: 1px solid var(--line);
      animation-delay: 100ms;
    }

    .kpi .label {
      color: var(--muted);
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .kpi .value {
      margin-top: 0.35rem;
      font-size: 1.3rem;
      font-weight: 700;
    }

    .kpi .hint {
      margin-top: 0.2rem;
      font-size: 0.8rem;
      color: var(--muted);
    }

    .section {
      padding: 1rem;
      animation-delay: 180ms;
    }

    .section h2 {
      margin: 0 0 0.8rem;
      font-size: 1rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 12px;
      overflow: hidden;
      font-size: 0.9rem;
    }

    th, td {
      text-align: left;
      padding: 0.66rem 0.72rem;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
    }

    th {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      color: var(--muted);
      background: rgba(7, 17, 25, 0.5);
    }

    .meter {
      background: rgba(116, 175, 207, 0.2);
      border: 1px solid rgba(146, 195, 222, 0.3);
      border-radius: 999px;
      overflow: hidden;
      height: 10px;
      min-width: 110px;
    }

    .meter span {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--accent-2));
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-family: 'IBM Plex Mono', monospace;
      border: 1px solid currentColor;
    }

    .pill::before {
      content: '';
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 12px currentColor;
    }

    .ok { color: var(--ok); }
    .warn { color: var(--warn); }
    .bad { color: var(--bad); }

    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .recommendations {
      margin: 0;
      padding-left: 1.1rem;
      display: grid;
      gap: 0.5rem;
    }

    .summary {
      margin: 0;
      color: var(--muted);
      line-height: 1.6;
      font-size: 0.95rem;
    }

    .stamp {
      color: var(--muted);
      font-size: 0.8rem;
      font-family: 'IBM Plex Mono', monospace;
      letter-spacing: 0.03em;
    }

    @keyframes rise {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .panel:nth-of-type(1) { animation-delay: 0ms; }
    .panel:nth-of-type(2) { animation-delay: 90ms; }
    .panel:nth-of-type(3) { animation-delay: 160ms; }
    .panel:nth-of-type(4) { animation-delay: 220ms; }
    .panel:nth-of-type(5) { animation-delay: 280ms; }

    @media (max-width: 980px) {
      .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .two-col { grid-template-columns: 1fr; }
      .container { width: min(1120px, 100% - 1rem); margin-top: 1rem; }
      .hero { padding: 1rem; }
    }
  </style>
</head>
<body>
  <div class="grid-overlay"></div>
  <main class="container">
    <section class="panel hero">
      <h1>${escapeHtml(data.suiteName)}</h1>
      <p>Autonomous QA workflow health overview with execution, healing, and RCA visibility.</p>
      <div class="status-line">
        <span class="pill ${statusClass(data.kpi.workflowStatus)}">${escapeHtml(data.kpi.workflowStatus)}</span>
        <span class="stamp">generated ${escapeHtml(data.generatedAt)}</span>
      </div>
    </section>

    <section class="panel section">
      <h2>Key Metrics</h2>
      <div class="kpi-grid">
        <article class="kpi">
          <div class="label">Pass Rate</div>
          <div class="value">${data.kpi.passRate}%</div>
          <div class="hint">${data.kpi.passedTests}/${data.kpi.totalTests} tests passed</div>
        </article>
        <article class="kpi">
          <div class="label">Agents</div>
          <div class="value">${data.kpi.passedAgents}/${data.kpi.totalAgents}</div>
          <div class="hint">failed: ${data.kpi.failedAgents}</div>
        </article>
        <article class="kpi">
          <div class="label">Healing</div>
          <div class="value">${data.kpi.healedCount}</div>
          <div class="hint">unhealed: ${data.kpi.unhealedCount}</div>
        </article>
        <article class="kpi">
          <div class="label">Failed Tests</div>
          <div class="value">${data.kpi.failedTests}</div>
          <div class="hint">total: ${data.kpi.totalTests}</div>
        </article>
        <article class="kpi">
          <div class="label">Workflow</div>
          <div class="value">${escapeHtml(data.kpi.workflowStatus)}</div>
          <div class="hint">suite health state</div>
        </article>
      </div>
    </section>

    <section class="panel section">
      <h2>Failure Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Failure Type</th>
            <th>Count</th>
            <th>Distribution</th>
          </tr>
        </thead>
        <tbody>
          ${renderFailureRows(data.failureBreakdown)}
        </tbody>
      </table>
    </section>

    <section class="panel section two-col">
      <div>
        <h2>Slowest Tests</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${testRows}
          </tbody>
        </table>
      </div>
      <div>
        <h2>Agent Health</h2>
        <table>
          <thead>
            <tr>
              <th>Agent</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            ${agentRows}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel section two-col">
      <div>
        <h2>Top Recommendations</h2>
        <ul class="recommendations">${recommendations}</ul>
      </div>
      <div>
        <h2>Summary</h2>
        <p class="summary">${escapeHtml(data.summary)}</p>
      </div>
    </section>
  </main>
</body>
</html>`;
}

function main(): void {
  const reports = createMockReports();
  const analyzerResult = createMockAnalyzerResult(reports);
  const orchestratorResult = createMockOrchestratorResult(analyzerResult);
  const data = buildDashboardData('OrangeHRM PIM Suite', orchestratorResult, analyzerResult);

  const html = renderDashboardHtml(data);
  const outputPath = join(__dirname, 'dashboard-ui.html');
  writeFileSync(outputPath, html, 'utf-8');

  console.log(`Dashboard UI generated: ${outputPath}`);
}

main();
