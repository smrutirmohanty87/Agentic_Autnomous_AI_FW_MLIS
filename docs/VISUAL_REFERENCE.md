# Playwright ↔ Dashboard Integration - Visual Reference

## Full System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          PLAYWRIGHT TEST RUNNER                             │
│                     $ npx playwright test tests/sanity                       │
└─────────────────────────────────────────┬────────────────────────────────────┘
                                          │
                    ┌─────────────────────▼─────────────────────┐
                    │      REPORTER LIFECYCLE EVENTS           │
                    │      (CurrentTestReporter)               │
                    └─────────────────────┬─────────────────────┘
                                          │
         ┌────────────────────────────────┼────────────────────────────────┐
         │                                │                                │
         ▼                                ▼                                ▼
    ┌─────────┐                  ┌──────────────┐              ┌──────────────┐
    │onBegin()│                  │onTestBegin() │              │ onTestEnd()  │
    │         │                  │              │              │              │
    │1. Open  │                  │Update:       │              │Update:       │
    │  Browser│                  │• running++   │              │• passed++    │
    │         │                  │• pending--   │              │  OR          │
    │2. Init  │                  │• currentTest │              │• failed++    │
    │  Workflow                  │              │              │              │
    │         │                  │Write:        │              │Write:        │
    │3. Write │                  │• suite-prog  │              │• suite-prog  │
    │  Status │                  │• current-test              │• rca (if fail)
    └────┬────┘                  └──────┬───────┘              └──────┬───────┘
         │                             │                              │
         │              ┌──────────────┴───────────────────────┬──────┘
         │              │                                      │
         ▼              ▼                                      ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │              JSON FILES (Dual Write Location)                    │
    │                                                                  │
    │  ┌─────────────────────┐        ┌──────────────────────────┐   │
    │  │  runtime/           │        │ dashboard-ui/public/     │   │
    │  │ (Runtime copy)      │        │ (Vite served copy)       │   │
    │  │                     │  ◄───► │                          │   │
    │  │ workflow-status.json│   Sync │ workflow-status.json     │   │
    │  │ suite-progress.json │   (by  │ suite-progress.json      │   │
    │  │ current-test.json   │  report│ current-test.json        │   │
    │  │ rca-results.json    │   er)  │ rca-results.json         │   │
    │  └─────────────────────┘        └──────────────────────────┘   │
    └──────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   VITE DEV SERVER    │
                    │                      │
                    │ localhost:5173       │
                    │                      │
                    │ Serves:              │
                    │ • Static HTML        │
                    │ • React components   │
                    │ • JSON files         │
                    │ • CSS/JS bundles     │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼────────────┐
                    │   BROWSER            │
                    │   (Auto-opened)      │
                    │                      │
                    │ React Dashboard      │
                    └──────────┬────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
    ┌──────────┐          ┌──────────┐         ┌──────────┐
    │useWorkflow          │useSuite  │        │useCurrentTest
    │Status Hook          │Progress  │        │Hook
    │                     │Hook      │        │
    │Polls every 1s       │Polls     │        │Polls
    │workflow-status.json │suite-    │        │current-test.json
    │                     │progress  │        │
    └────┬────────────────┼──────────┴─┬──────┴─┬──────┐
         │                │            │        │      │
         ▼                ▼            ▼        ▼      ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                    REACT STATE UPDATES                       │
    │                                                              │
    │  • workflowStatus.agents (agent states)                     │
    │  • workflowStatus.currentAgent (RUNNING agent)              │
    │  • suiteProgress.totalTests                                 │
    │  • suiteProgress.passed/failed/running/pending              │
    │  • currentTest.testName                                     │
    │  • Progress % = (passed + failed) / total * 100             │
    └────────────────────┬──────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌─────────────┐ ┌──────────┐  ┌───────────────┐
    │Live Workflow│ │Suite     │  │Current Test   │
    │Panel        │ │Progress  │  │Panel          │
    │             │ │Panel     │  │               │
    │• Agents     │ │          │  │• Test name    │
    │• Timeline   │ │• Progress│  │• Status       │
    │• Current    │ │  bar     │  │• Duration     │
    │  Running    │ │• Counter │  │               │
    │• Times      │ │          │  │               │
    └─────────────┘ └──────────┘  └───────────────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
                         ▼
                  ┌──────────────────┐
                  │ VISUAL DASHBOARD │
                  │    LIVE UPDATE   │
                  │                  │
                  │ ● LIVE (badge)   │
                  │                  │
                  │ Current: → Test  │
                  │ Progress: 50%    │
                  │ Passed: 5        │
                  │ Failed: 0        │
                  │                  │
                  │ Execution ⟳      │
                  │ Healing ○        │
                  │ RCA ○            │
                  └──────────────────┘
```

---

## Execution Timeline

```
Time    Event                          Dashboard State
────────────────────────────────────────────────────────────────
0s      npx playwright test
        │
        ├─ Reporter.onBegin()
        │  ├─ openDashboard()
        │  │  └─ Browser opens
        │  └─ writeWorkflow()
        │     └─ Execution: RUNNING
        │
        ▼ Dashboard detects
          workflow-status.json
          exists with RUNNING
          │
          ▼ useWorkflowStatus
            gets data
            │
            ▼ isTestRunning = true
              │
              ▼ LIVE MODE activates
                │
                ▼ LiveWorkflowPanel
                  mounts
────────────────────────────────────────────────────────────────
1s      Test 1 starts
        │
        ├─ Reporter.onTestBegin()
        │  └─ running=1, pending=4
        │
        ▼ Dashboard polls and
          updates:
          • Current test = "Test 1"
          • Progress = 0% (0/5)
          • Running counter = 1
          • Pending = 4
────────────────────────────────────────────────────────────────
5s      Test 1 passes
        │
        ├─ Reporter.onTestEnd()
        │  ├─ running=0, pending=4
        │  └─ passed=1
        │
        ▼ Dashboard polls and
          updates:
          • Progress = 20% (1/5)
          • Passed = 1
────────────────────────────────────────────────────────────────
6-20s   Tests 2-5 execute
        
        (Repeat: onTestBegin → execute → onTestEnd)
        
        ▼ Dashboard continuous
          updates:
          • Current test updates
          • Passed increments
          • Progress advances
          • Counters update
────────────────────────────────────────────────────────────────
20s     All tests done
        │
        ├─ Reporter.onEnd()
        │  │
        │  ├─ Stage 1: Execution → Healing RUNNING
        │  │  (writeWorkflow with new state)
        │  │  wait 3000ms
        │  │
        │  ├─ Stage 2: Healing → RCA RUNNING
        │  │  (writeWorkflow with new state)
        │  │  wait 2500ms
        │  │
        │  └─ Stage 3: All SUCCESS
        │     (writeWorkflow final state)
        │     overallStatus = SUCCESS
        │     currentAgent = null
        │
        ▼ Dashboard detects
          state changes:
          │
          ├─ Healing: RUNNING
          │  (polls ~20s)
          │
          ├─ RCA: RUNNING
          │  (polls ~23s)
          │
          └─ All: SUCCESS
             running = 0
             (polls ~25.5s)
             │
             ▼ isTestRunning = false
               │
               ▼ LIVE MODE deactivates
                 │
                 ▼ REPORT MODE activates
                   │
                   ▼ Dashboard displays
                     final results
────────────────────────────────────────────────────────────────
26s     Complete
        
        Dashboard shows:
        • Final status: SUCCESS
        • Total tests: 5
        • Passed: 5, Failed: 0
        • All agent times
        • Charts and timeline
```

---

## Component Interaction Diagram

```
                            ┌─────────────────┐
                            │  Playwright     │
                            │  Test Config    │
                            └────────┬────────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │   Playwright Test Runner       │
                    │   (with reporters array)       │
                    └────────────┬───────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  currentTestReporter    │
                    │  [implements Reporter]  │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 │               │               │
         ┌───────▼────┐   ┌──────▼──────┐   ┌───▼──────┐
         │  onBegin() │   │onTestBegin()│   │onTestEnd()
         └───────┬────┘   └──────┬──────┘   └───┬──────┘
                 │               │              │
         ┌───────▼────────────────▼──────────────▼────┐
         │    Write JSON Files (dual location)        │
         └───────┬────────────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
runtime/              dashboard-ui/public/
workflow-*.json       workflow-*.json
suite-progress.json   suite-progress.json
current-test.json     current-test.json
    │                         │
    │     ┌───────────────────┘
    │     │
    │     ▼
    │  ┌──────────────────┐
    │  │ Vite Dev Server  │
    │  │ (HTTP serving)   │
    │  └────────┬─────────┘
    │           │
    │           ▼
    │  ┌──────────────────────┐
    │  │ Browser              │
    │  │ (React App)          │
    │  └────────┬─────────────┘
    │           │
    │     ┌─────┴──────┐
    │     │            │
    │     ▼            ▼
    │  useWorkflow   useSuite
    │  Status        Progress
    │  (polls        (polls
    │   every 1s)    every 1s)
    │     │            │
    │     ├────┬───────┤
    │     │    │       │
    │     ▼    ▼       ▼
    │  ┌─────────────────────┐
    │  │  React State        │
    │  │  (all metrics)      │
    │  └────────┬────────────┘
    │           │
    │     ┌─────┴────┬────┬────┐
    │     │          │    │    │
    │     ▼          ▼    ▼    ▼
    │  ┌────────────────────────────────┐
    │  │  Live Dashboard Components    │
    │  │  • LiveWorkflowPanel          │
    │  │  • SuiteProgressPanel         │
    │  │  • CurrentTestPanel           │
    │  │  • KpiCards                   │
    │  │  • etc.                       │
    │  └────────────┬───────────────────┘
    │              │
    │              ▼
    │         ┌──────────────┐
    │         │ Browser View │
    │         │ Real-time    │
    │         │ Dashboard    │
    │         └──────────────┘
    │
    └─► (Also polled by
         dashboard for
         final metrics)
```

---

## Data Schema Flow

```
Test Lifecycle Event
       │
       ▼
Reporter Captures Event
       │
       ├─ Event Type: onBegin | onTestBegin | onTestEnd | onEnd
       │
       ▼
Update Internal State
       │
       ├─ Counters: passed, failed, running, pending, total
       │ RCA Entries: [{ testName, failureType, ... }]
       │
       ▼
Build JSON Payloads
       │
       ├─ workflow-status.json
       │  {
       │    workflowId: "run-1234567890"
       │    startedAt: "2026-06-06T05:48:00.000Z"
       │    overallStatus: "RUNNING" | "SUCCESS" | "FAILED"
       │    currentAgent: "Execution" | null
       │    agents: [
       │      { name: "Planner", state: "SUCCESS", durationMs: 0 }
       │      { name: "Execution", state: "RUNNING", startedAt: "..." }
       │      ...
       │    ]
       │  }
       │
       ├─ suite-progress.json
       │  {
       │    totalTests: 5
       │    passed: 2
       │    failed: 0
       │    running: 1
       │    pending: 2
       │    progressPct: 40
       │    currentTest: "Test name"
       │    startedAt: "..."
       │    durationMs: 1234
       │  }
       │
       └─ current-test.json
          {
            status: "RUNNING" | "PASSED" | "FAILED" | "IDLE"
            testName: "Suite › Test Name"
            startedAt: "..."
            durationMs: 1234
          }
       │
       ▼
Write to Disk (Dual Location)
       │
       ├─ runtime/*.json
       └─ dashboard-ui/public/*.json (synced)
       │
       ▼
Vite Serves Static Files
       │
       ├─ HTTP GET /workflow-status.json
       ├─ HTTP GET /suite-progress.json
       └─ HTTP GET /current-test.json
       │
       ▼
Browser Polling (every 1s)
       │
       ├─ fetch("/workflow-status.json?t=timestamp")
       ├─ fetch("/suite-progress.json?t=timestamp")
       └─ fetch("/current-test.json?t=timestamp")
       │
       ▼
React Hook Updates State
       │
       ├─ setWorkflowStatus(data)
       ├─ setSuiteProgress(data)
       └─ setCurrentTest(data)
       │
       ▼
Component Re-renders
       │
       ├─ LiveWorkflowPanel
       ├─ SuiteProgressPanel
       ├─ CurrentTestPanel
       └─ Other components
       │
       ▼
Browser Updates Display
       │
       └─ User sees live updates ✓
```

---

## Key Transition Points

### 1. Dashboard Opening
```
Reporter.onBegin()
       │
       ├─ http.get("http://localhost:5173")
       │  └─ Check if dashboard is running
       │
       ├─ SUCCESS → exec(open command)
       │  └─ Browser opens to dashboard
       │
       └─ FAIL → Silently skip
          └─ No error, tests continue
```

### 2. Live Mode Activation
```
Dashboard detects workflow-status.json exists
       │
       └─ overallStatus === "RUNNING"
          │
          ├─ isTestRunning = true
          ├─ isLive = true
          │
          └─ Render LiveWorkflowPanel
             └─ Show "● LIVE" badge
```

### 3. Mode Transition
```
All tests complete (onEnd)
       │
       ├─ Stage 1: Execution → Healing (3s)
       ├─ Stage 2: Healing → RCA (2.5s)
       │
       └─ Final: overallStatus set to SUCCESS/FAILED
          currentAgent = null
          running = 0
          │
          └─ Dashboard detects:
             ├─ isTestRunning = false
             ├─ isLive = false
             │
             └─ Render REPORT MODE
                └─ Show final results
```

---

## Live Update Sequence

```
Timeline                 Dashboard State
────────────────────────────────────────────────────
T +0s
  │
  ├─ onBegin()
  │  └─ writeworkflow(RUNNING)
  │
  └─ Browser detects update
     └─ Shows "● LIVE"

T +1s
  │
  ├─ Test 1 starts
  │  └─ onTestBegin()
  │     └─ running=1
  │
  └─ Browser polls
     └─ Updates current test

T +5s
  │
  ├─ Test 1 finishes
  │  └─ onTestEnd()
  │     └─ passed=1
  │
  └─ Browser polls
     └─ Passed counter: 0→1

T +6s
  │
  ├─ Test 2 starts
  │
  └─ Browser polls
     └─ Current test: Test 1→Test 2

T +20s (all done)
  │
  ├─ onEnd() - Stage 1
  │  └─ Healing RUNNING
  │
  └─ Browser polls
     └─ Healing agent starts

T +23s
  │
  ├─ onEnd() - Stage 2
  │  └─ RCA RUNNING
  │
  └─ Browser polls
     └─ RCA agent starts

T +25.5s
  │
  ├─ onEnd() - Stage 3
  │  └─ All SUCCESS
  │
  └─ Browser detects
     └─ Mode switch to REPORT

T +26s
  Dashboard shows final report
  • All agents complete
  • Final timings visible
  • Results summary
  • Charts rendered
```

---

## Error Handling Paths

```
Scenario: Dashboard Not Running

$ npx playwright test
       │
       ├─ onBegin()
       │  ├─ openDashboard()
       │  │  └─ http.get() fails
       │  │     └─ req.on('error')
       │  │        └─ Silently skip
       │  │
       │  └─ Tests continue normally
       │     └─ Reporter still writes JSON
       │
       └─ Result: ✓ Tests pass (no dashboard)
          User can manually open dashboard later
          Dashboard will show historical data


Scenario: 404 on First Poll

Dashboard starts, workflow-status.json not yet created

$ npm run dev
       │
       └─ Browser ready @ localhost:5173
          │
          └─ useWorkflowStatus starts polling
             │
             ├─ First poll: 404 Not Found
             │  └─ Previous fix: Don't stop polling!
             │
             └─ Keep polling every 1s
                │
                └─ When orchestrator/Playwright starts
                   └─ File appears
                   └─ Next poll: 200 OK
                   └─ useWorkflowStatus updates
                   └─ Dashboard detects RUNNING


Scenario: Network Error During Polling

useWorkflowStatus polling
       │
       ├─ Network error occurs
       │  └─ catch block triggers
       │  └─ setError(message)
       │  └─ Keep polling
       │
       └─ Next poll (1s later)
          └─ Network recovered
          └─ Data fetched successfully
          └─ UI updates resume
```

---

## Success Indicators

```
✓ Browser Opens
  └─ [reporter] 🌐 Dashboard opened at http://localhost:5173

✓ Dashboard Shows LIVE
  └─ "● LIVE" badge visible in top right

✓ Current Test Updates
  └─ Test name changes as tests progress

✓ Counters Increment
  └─ Passed/Failed/Running counters update

✓ Progress Advances
  └─ Progress bar smoothly moves forward

✓ Execution Agent RUNNING
  └─ Execution shows ⟳ RUNNING with animation

✓ Pipeline Transitions
  └─ Healing → RCA agents show transitions

✓ Mode Switches
  └─ After completion, switches to REPORT MODE

✓ Final Results Visible
  └─ All agent times, summary, charts displayed
```

---

This visual reference should help understand the complete integration from test execution to live dashboard display.
