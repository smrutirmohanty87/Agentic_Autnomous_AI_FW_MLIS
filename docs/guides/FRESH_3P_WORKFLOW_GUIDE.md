# Fresh 3-Product Commercial Workflow — Live Demo Guide

## Overview

This document describes how to run a fresh 3-product commercial workflow with live dashboard integration. The workflow automatically:

✅ Clears all old test results and runtime data  
✅ Initializes fresh workflow status files  
✅ Executes the complete commercial England & Wales 3-product policy creation flow  
✅ Shows live transitions in the dashboard as the workflow progresses  
✅ Displays correct data without stale result contamination  

---

## Quick Start

### Option 1: Integrated Dashboard + Orchestrator (Recommended)

```bash
npm run demo:fresh-3p
```

This command:
1. Starts the dashboard UI on `http://localhost:5173/`
2. Clears all old results
3. Runs the fresh commercial 3-product workflow
4. Dashboard automatically shows live transitions

**Expected output:**
```
[dashboard] ✅ Dashboard started on http://localhost:5173/
[orchestrator] FRESH ORCHESTRATOR — Commercial England & Wales 3-Product
[orchestrator] Old results cleared. Running fresh workflow...
[cleanup] 🧹 Clearing old results and runtime data...
[cleanup] ✔ Cleared test-results/
[cleanup] ✔ Initialized fresh workflow-status.json
...
```

### Option 2: Run Orchestrator Only

```bash
npx ts-node orchestrator/live-demo-commercial-3p-fresh.ts
```

If you already have the dashboard running in another terminal:
```bash
npm run dev --workspace=dashboard-ui
```

---

## What Gets Cleaned

The fresh workflow automatically clears:

```
✔ test-results/              — All previous test execution artifacts
✔ playwright-report/         — Previous HTML reports
✔ heal-log.json              — Previous healing events
✔ rca-results.json           — Previous RCA analysis
✔ current-test.json          — Previous test context
✔ workflow-status.json       — Initialized with FRESH workflow ID
✔ suite-progress.json        — Reset to pending state
```

---

## Workflow Phases

The orchestrator runs through these phases sequentially:

### Phase 1: Planning & Design
- **Planner** analyzes the test requirements
- **Designer** creates the test design
- *Duration:* ~1-2 seconds
- *Status in Dashboard:* Rapid transitions through RUNNING → SUCCESS

### Phase 2: Code Generation
- **Generator** creates the Playwright test case
- Test file saved to: `tests/sanity/TC_SAN_FRESH_001_...spec.ts`
- *Duration:* ~1-2 seconds

### Phase 3: Execution
- **Execution** runs the generated Playwright test
- Test flow:
  1. Login to MLIS portal
  2. Start Commercial England & Wales quote
  3. Select exactly 3 products
  4. Complete statements of fact
  5. Select quote and fill policy details
  6. Verify summary and issue policy
- *Duration:* ~90-120 seconds
- *Status in Dashboard:* Live KPI updates (tests passing, current test display)

### Phase 4: Healing (if needed)
- **Healing** automatically retries failed tests with locator recovery
- Runs in parallel with Execution
- *Status in Dashboard:* Heal events count, recovery status

### Phase 5: Root Cause Analysis
- **RCA** analyzes any failures and produces remediation
- *Status in Dashboard:* RCA events, failure analysis

---

## Live Dashboard Indicators

### LIVE Mode (during test execution)

The dashboard shows:

| Indicator | Meaning |
|-----------|---------|
| **🔴 LIVE badge** | Tests are currently executing |
| **Workflow Timeline** | Shows which agent is running (animated) |
| **KPI Updates** | Real-time counters updating (tests passed, failed, heals) |
| **Current Test Panel** | Shows active test name and current step |
| **Suite Progress** | Real-time progress bar (0% → 100%) |

### Data Freshness Checks

The dashboard automatically:

1. **Detects new workflow starts** — compares `workflowStatus.startedAt` timestamps
2. **Aligns data sources** — ensures suite-progress.json matches workflow-status.json timing
3. **Clears old results** — when timestamps > 2 minutes apart, treats data as stale
4. **Refetches on completion** — when tests finish, fetches fresh final results

---

## File Locations

### Runtime Status Files
These files are created/updated in real-time by the orchestrator:

```
runtime/
├── workflow-status.json      — Current agent states, overall status
├── suite-progress.json       — Test counts (total, passed, failed, running)
├── current-test.json         — Active test context
├── heal-log.json             — All healing events
└── rca-results.json          — RCA analysis results
```

### Generated Test Files
```
tests/sanity/
└── TC_SAN_FRESH_001_create_commercial_ew_policy_three_products.spec.ts
```

### Reports
```
test-results/
└── [latest-run-folder]/      — Playwright execution artifacts

playwright-report/
└── index.html                — HTML report with traces
```

---

## Monitoring the Workflow

### Terminal Output

You'll see real-time console output like:

```
[cleanup] 🧹 Clearing old results and runtime data...
[cleanup] ✔ Cleared test-results/
[cleanup] ✔ Initialized fresh workflow-status.json
[fresh-demo] ✔ Test case file created: tests/sanity/TC_SAN_FRESH_001...

[orchestrator] ▶ Planner agent — RUNNING
[orchestrator] ✔ Planner agent — SUCCESS (17ms)
[orchestrator] ▶ Designer agent — RUNNING
[orchestrator] ✔ Designer agent — SUCCESS (20ms)
[orchestrator] ▶ Generator agent — RUNNING
[fresh-demo] Creating test case file after Generator phase...
[fresh-demo] ✔ Test case file created: tests/sanity/TC_SAN_FRESH_001...
[orchestrator] ✔ Generator agent — SUCCESS (26ms)
[orchestrator] ▶ Execution agent — RUNNING
  ▶ TC_COMM_3P_FRESH_001 (step 1/3) Login and load quote manager
  ✔ TC_COMM_3P_FRESH_001 (step 2/3) Start Commercial quote
  ▶ TC_COMM_3P_FRESH_001 (step 3/3) Select 3 products and complete flow
```

### Dashboard Visualization

1. Open `http://localhost:5173/` in your browser
2. Watch the **Workflow Timeline** showing live agent progression
3. View **KPI Cards** updating in real-time:
   - Total Tests: 1
   - Tests Passed: 0 → 1 (as test progresses)
   - Tests Failed: 0
   - Success Rate: 0% → 100%
4. **Current Test Panel** shows which step is executing
5. **Suite Progress** shows the live progress bar

---

## Troubleshooting

### Dashboard Shows Old Data

If the dashboard displays old results:

1. **Clear browser cache:** `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
2. **Hard refresh dashboard:** `Ctrl+F5` (or `Cmd+Shift+R` on Mac)
3. **Check runtime files:**
   ```bash
   cat runtime/workflow-status.json
   cat runtime/suite-progress.json
   ```
   - Verify `workflowId` is recent
   - Verify `overallStatus` is `RUNNING` or just completed

### Orchestrator Doesn't Start

1. **Verify environment variables:**
   ```bash
   cat .env
   ```
   - Check `MLIS_PORTAL_URL` is set
   - Check `BROKER_USERNAME` and `BROKER_PASSWORD` are set

2. **Check Node.js and dependencies:**
   ```bash
   npm install
   npx playwright install
   ```

### Test Fails During Execution

The orchestrator has built-in recovery:

1. **Healing Agent** automatically retries with locator recovery strategies
2. **RCA Agent** analyzes failure and provides remediation
3. Dashboard shows healing events in real-time

Check the logs:
```bash
cat runtime/heal-log.json
cat runtime/rca-results.json
```

---

## Environment Setup

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **Playwright** (auto-installed via `npm install`)

### Installation

```bash
npm install
npx playwright install
```

### Environment Variables

Create/update `.env`:

```env
MLIS_PORTAL_URL=https://your-mlis-portal-url
BROKER_USERNAME=your-broker-email
BROKER_PASSWORD=your-broker-password
TEST_ENV=SIT2
```

---

## Architecture Insights

### Why Old Data Gets Cleared

1. **Runtime files are regenerated** — each fresh run creates new `workflow-status.json` with fresh `workflowId` and `startedAt` timestamp
2. **Suite progress resets** — initialized with `running: 0`, `passed: 0`, `failed: 0`
3. **Result artifacts cleaned** — `test-results/` and `playwright-report/` directories cleared
4. **Dashboard detects transitions** — compares timestamps to identify new vs. old runs

### Dashboard Data Alignment

The dashboard uses sophisticated logic to prevent stale data display:

```typescript
// Only trust suite-progress if it aligns with workflow-status timing
const suiteAlignedWithWorkflow = Math.abs(
  new Date(workflowStatus.startedAt).getTime() -
  new Date(suiteProgress.startedAt).getTime()
) <= 120000; // 2 minutes tolerance

// Use fresh data source when available
const useSuiteForReport = hasCompletedRun && 
  (!workflowCompleted || suiteAlignedWithWorkflow);
```

---

## Next Steps

### Extend the Workflow

To add more test cases or modify the 3-product flow:

1. Edit `orchestrator/live-demo-commercial-3p-fresh.ts`
2. Modify the `testCases` array in the `main()` function
3. Update page object methods in `src/pages/mlis-portal-commercial.ts`
4. Run `npm run demo:fresh-3p`

### View Final Reports

After the workflow completes:

```bash
# View HTML report
npm run test:report

# Inspect test results
cat test-results/*/results.json
```

### Debug Test Execution

To pause and debug during test execution:

```bash
npm run test:debug
```

---

## Success Criteria

A successful fresh 3-product commercial workflow shows:

✅ Dashboard clears old data at startup  
✅ Workflow timeline animates through all 6 agents  
✅ KPI cards show correct real-time updates  
✅ Current test panel displays active test and step  
✅ Suite progress bar fills from 0% to 100%  
✅ Test passes with policy successfully issued  
✅ Dashboard shows "1 Passed, 0 Failed" final results  
✅ No stale data from previous runs visible  

---

## Support

For issues or questions:

1. Check terminal output for error messages
2. Inspect runtime JSON files in `runtime/` directory
3. Review browser console for dashboard errors (F12)
4. Check `test-results/` for detailed execution logs
