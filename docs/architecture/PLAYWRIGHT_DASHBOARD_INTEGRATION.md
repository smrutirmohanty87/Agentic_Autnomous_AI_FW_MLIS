# Playwright ↔ Dashboard Integration Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PLAYWRIGHT EXECUTION                              │
│                   (npx playwright test)                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Reporter       │
                    │ (onBegin)       │
                    │ (onTestBegin)   │
                    │ (onTestEnd)     │
                    │ (onEnd)         │
                    └────────┬────────┘
                             │
             ┌───────────────┼───────────────┐
             │               │               │
             ▼               ▼               ▼
      ┌────────────┐  ┌─────────────┐  ┌─────────────┐
      │ Workflow   │  │ Suite       │  │ Current     │
      │ Status     │  │ Progress    │  │ Test        │
      │ JSON       │  │ JSON        │  │ JSON        │
      └────────────┘  └─────────────┘  └─────────────┘
             │               │               │
             ▼               ▼               ▼
    ┌────────────────────────────────────────────┐
    │  runtime/                                  │
    │  ├── workflow-status.json                  │
    │  ├── suite-progress.json                   │
    │  └── current-test.json                     │
    └────────────────────────────────────────────┘
             │               │               │
             ▼               ▼               ▼
    ┌────────────────────────────────────────────┐
    │  dashboard-ui/public/                      │
    │  ├── workflow-status.json (synced)         │
    │  ├── suite-progress.json (synced)          │
    │  └── current-test.json (synced)            │
    └──────────────┬──────────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │  Vite Dev Server   │
         │  localhost:5173    │
         └─────────┬──────────┘
                   │
          ┌────────▼─────────┐
          │   Dashboard UI   │
          │   React App      │
          └──────────────────┘
                   │
         ┌─────────▼──────────┐
         │  useWorkflowStatus │
         │  (polls every 1s)  │
         └─────────┬──────────┘
                   │
          ┌────────▼──────────┐
          │  Live Updates     │
          │  - Agent status   │
          │  - Current test   │
          │  - Progress %     │
          │  - Counters       │
          └───────────────────┘
```

---

## Data Flow

### 1. **Test Execution Begins**
```
npx playwright test tests/sanity
           │
           ▼
  onBegin() called
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
openDashboard() initializeWorkflow()
    │             │
    ▼             ▼
browser opens  workflow-status.json created
                  (RUNNING, Execution agent)
                  │
                  ▼
              Write to:
              - runtime/workflow-status.json
              - dashboard-ui/public/workflow-status.json
```

### 2. **Test Runs**
```
onTestBegin()
     │
     ├─ suite-progress.json updated
     │  (running++, pending--)
     │  (currentTest set)
     │  (progressPct updated)
     │
     └─ Dashboard polls every 1s
        (detects changes)
        (UI updates live)
        
        ↓
        
onTestEnd()
     │
     ├─ suite-progress.json updated
     │  (running--, passed++/failed++)
     │  (progressPct updated)
     │
     └─ Dashboard polls every 1s
        (detects changes)
        (counters update)
```

### 3. **Execution Complete**
```
onEnd()
  │
  ├─ Stage 1: Execution DONE → Healing RUNNING
  │  (3000ms wait)
  │
  ├─ Stage 2: Healing DONE → RCA RUNNING
  │  (2500ms wait)
  │
  └─ Stage 3: All DONE
     (overallStatus: SUCCESS/FAILED)
     (currentAgent: null)
     (suite-progress.json: running=0)
     
Dashboard detects completion:
     │
     ├─ isTestRunning becomes FALSE
     │
     └─ Switches to REPORT MODE
        (shows final results)
```

---

## Files Modified

| File | Purpose | Changes |
|------|---------|---------|
| `reporters/currentTestReporter.ts` | Playwright reporter | Added: imports for `http` & `exec`, `openDashboard()` function, auto-open call in `onBegin()` |
| `dashboard-ui/src/hooks/useWorkflowStatus.ts` | Dashboard polling | Fixed: removed `stopPolling()` on 404, added cache-busting headers (already done) |
| `playwright.config.ts` | Already configured | No changes needed (reporter already registered) |

---

## Workflow Status Lifecycle

```
┌────────────────────────────────────────────┐
│  PLANNER       DESIGNER     GENERATOR       │
│  SUCCESS       SUCCESS      SUCCESS         │
│  (0ms)         (0ms)        (0ms)           │
└────────────────────────────────────────────┘
         (conceptually pre-run)
                  │
                  ▼
         ┌─────────────────┐
         │    EXECUTION    │
         │    RUNNING      │
         └────────┬────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
    ┌─────────┐       ┌─────────┐
    │ SUCCESS │       │ FAILED  │
    └────┬────┘       └────┬────┘
         │                 │
         └────────┬────────┘
                  │
                  ▼
        ┌──────────────────┐
        │ HEALING RUNNING  │
        │ (3000ms delay)   │
        └─────────┬────────┘
                  │
                  ▼
        ┌──────────────────┐
        │ RCA RUNNING      │
        │ (2500ms delay)   │
        └─────────┬────────┘
                  │
                  ▼
        ┌──────────────────────────┐
        │ ALL SUCCESS/FAILED       │
        │ overallStatus = FINAL    │
        │ currentAgent = null      │
        │ Dashboard → REPORT MODE  │
        └──────────────────────────┘
```

---

## Dashboard Behavior

### LIVE MODE (while tests run)

```
┌─────────────────────────────────────────────────────┐
│  Agentic QA Platform                    ● LIVE      │
├─────────────────────────────────────────────────────┤
│ Started: 6/6/2026 5:48:00 AM                        │
├─────────────────────────────────────────────────────┤
│ Suite Progress                                      │
│ ███████░░░░░░░ 50% (5/10 tests)                    │
│ ✓ Passed: 4  ✗ Failed: 0  ○ Pending: 5             │
├─────────────────────────────────────────────────────┤
│ Current Test                                        │
│ → tests/sanity/login.spec.ts › Login Page          │
├─────────────────────────────────────────────────────┤
│ Live Workflow                          ● RUNNING    │
│ Currently Running: ⟳ Execution                      │
│                                                     │
│ Planner   ✓ SUCCESS     Designer ✓ SUCCESS          │
│ Generator ✓ SUCCESS     Execution ⟳ RUNNING        │
│ Healing   ○ PENDING     RCA ○ PENDING              │
│                                                     │
│ Elapsed: 23s · polling every 1s                    │
└─────────────────────────────────────────────────────┘
```

### REPORT MODE (after completion)

```
┌─────────────────────────────────────────────────────┐
│  Agentic QA Platform                                │
├─────────────────────────────────────────────────────┤
│ Completed: 6/6/2026 5:48:45 AM                      │
├─────────────────────────────────────────────────────┤
│ Workflow Summary                                    │
│ Status: SUCCESS                                     │
│ Total: 10  Passed: 10  Failed: 0                    │
│ Duration: 45s                                       │
├─────────────────────────────────────────────────────┤
│ Agent Status                                        │
│                                                     │
│ Planner   ✓ SUCCESS (0ms)                           │
│ Designer  ✓ SUCCESS (0ms)                           │
│ Generator ✓ SUCCESS (0ms)                           │
│ Execution ✓ SUCCESS (28500ms)                       │
│ Healing   ✓ SUCCESS (3000ms)                        │
│ RCA       ✓ SUCCESS (2500ms)                        │
│                                                     │
│ Timeline & Charts                                   │
│ [Visualization data from agentic-qa-runtime.json]   │
└─────────────────────────────────────────────────────┘
```

---

## Validation Steps

### 1. **Start Dashboard**
```bash
cd dashboard-ui
npm run dev
# Runs on http://localhost:5173
```

### 2. **Run Playwright Tests**
```bash
# Test runs with reporter
npx playwright test tests/sanity

# OR run a single test file
npx playwright test tests/example.spec.ts

# OR run with debug
npx playwright test tests/sanity --debug
```

### 3. **Expected Console Output**

**Playwright:**
```
[reporter] 🌐 Dashboard opened at http://localhost:5173

Running 10 tests using 1 worker
  [chromium] › tests/sanity/login.spec.ts › Login page loads
  [chromium] › tests/sanity/api.spec.ts › API responds
  ... (more tests)

  10 passed (45s)
```

**Dashboard:**
```
Agentic QA Platform
Started: 6/6/2026 5:48:00 AM

Suite Progress: ███████░░░░░░░ 50%
✓ Passed: 4  ✗ Failed: 0  ○ Pending: 5

Current Test: → tests/sanity/login.spec.ts › Login Page

Live Workflow (● LIVE)
Currently Running: ⟳ Execution
...
Elapsed: 23s · polling every 1s
```

### 4. **Verify Live Updates**

- [ ] Dashboard opens automatically when tests start
- [ ] Current test updates as tests run
- [ ] Passed count increments with each passing test
- [ ] Failed count increments with any failed test
- [ ] Progress % bar advances smoothly
- [ ] Execution agent shows "RUNNING" during test execution
- [ ] Execution agent transitions to "SUCCESS" when done
- [ ] Healing and RCA agents show "RUNNING" during pipeline stages
- [ ] Dashboard switches to REPORT MODE after completion
- [ ] Final results display all agent timings

### 5. **API Endpoints Verification**

```bash
# Check workflow status is being served
curl http://localhost:5173/workflow-status.json

# Check suite progress is being served
curl http://localhost:5173/suite-progress.json

# Check current test is being served
curl http://localhost:5173/current-test.json
```

---

## Reporter Lifecycle Events

| Event | Purpose | When Called |
|-------|---------|-------------|
| `onBegin()` | Initialize workflow, open dashboard | Before first test |
| `onTestBegin()` | Update current test, increment running | Before each test |
| `onTestEnd()` | Update passed/failed, compute RCA | After each test |
| `onEnd()` | Pipeline stages, mark complete | After all tests |

---

## Key Features

✅ **Single Reporter** - `currentTestReporter.ts` handles all integration  
✅ **Reuses Existing Infrastructure** - Uses `workflow-status.json` and dashboard polling  
✅ **Zero Test Modifications** - Tests remain untouched  
✅ **Auto-Open Dashboard** - No manual browser opening required  
✅ **Live Metrics** - Current test, progress %, passed/failed counts  
✅ **Pipeline Visualization** - Full agent workflow with timings  
✅ **RCA Automation** - Error classification on test failures  
✅ **Dual Mode UI** - LIVE mode during execution, REPORT mode after completion

---

## Troubleshooting

### Dashboard doesn't open
- Ensure `npm run dev` is running in `dashboard-ui/` first
- Check firewall isn't blocking localhost:5173

### Live updates not showing
- Verify `reporters/currentTestReporter.ts` is in playwright.config.ts
- Check `runtime/workflow-status.json` exists and is updating
- Open browser DevTools Console to check for fetch errors

### Tests run slower than expected
- Reporter uses 3s + 2.5s delays for pipeline stages
- This is intentional for visual dashboard feedback
- Remove delays if timing is critical

### No RCA results appearing
- RCA is only generated for failed tests
- Run a test that fails to see RCA data

---

## Next Steps (Optional)

1. **Add Dashboard URL Configuration**
   - Environment variable for custom dashboard URL
   - Useful for CI/CD integration

2. **Add Notification Integration**
   - Slack/Teams notification when tests complete
   - Failures trigger alerts

3. **Add Test Result Export**
   - Export workflow data to JSON/CSV
   - Integrate with external reporting systems

4. **Add Dashboard Filtering**
   - Filter tests by status, project, duration
   - Search tests by name
