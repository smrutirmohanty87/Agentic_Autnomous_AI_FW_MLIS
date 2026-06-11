# Playwright ↔ Dashboard Integration Validation

## Quick Start (5 minutes)

### Terminal 1: Start Dashboard
```bash
cd dashboard-ui
npm run dev
```
✓ Dashboard running on http://localhost:5173

### Terminal 2: Run Tests
```bash
cd <root>
npx playwright test tests/sanity
```

**Expected Result:**
- Browser opens automatically at http://localhost:5173
- Dashboard shows "● LIVE"
- Current test updates as tests run
- Execution agent shows "RUNNING"
- Counters update in real-time

---

## Detailed Validation Checklist

### Phase 1: Initialization (First 2 seconds)

- [ ] **Reporter loads**: Console shows `[reporter] 🌐 Dashboard opened at http://localhost:5173`
- [ ] **Dashboard visible**: Browser automatically navigates to dashboard
- [ ] **Workflow file created**: `runtime/workflow-status.json` exists
- [ ] **Sync verified**: `dashboard-ui/public/workflow-status.json` contains same data
- [ ] **Live mode active**: Dashboard shows "● LIVE" badge
- [ ] **Execution agent RUNNING**: LiveWorkflowPanel shows `Execution: RUNNING`

### Phase 2: Test Execution (During tests)

For each test that runs:

- [ ] **Current test updates**: `CurrentTestPanel` shows test name changing
- [ ] **Running counter increments**: Suite progress shows `running: N`
- [ ] **Pending counter decrements**: Suite progress shows `pending: M`
- [ ] **Progress bar advances**: `progressPct` increases with each test completion
- [ ] **Test passes**: Passed count increments, status shows "PASSED"
- [ ] **Test fails (if any)**: Failed count increments, RCA appears in dashboard

### Phase 3: Completion (Last 10 seconds)

- [ ] **Execution DONE**: Agent transitions from RUNNING to SUCCESS/FAILED
- [ ] **Healing RUNNING**: Healing agent shows RUNNING (3s synthetic delay)
- [ ] **Healing DONE**: Healing agent transitions to SUCCESS
- [ ] **RCA RUNNING**: RCA agent shows RUNNING (2.5s synthetic delay)
- [ ] **RCA DONE**: RCA agent transitions to SUCCESS
- [ ] **Overall DONE**: `overallStatus` becomes SUCCESS or FAILED
- [ ] **Dashboard switches modes**: Automatically transitions to REPORT MODE

### Phase 4: Report Mode

- [ ] **Live badge gone**: No more "● LIVE" indicator
- [ ] **Final results visible**: Summary card shows test count, passed/failed
- [ ] **Agent durations visible**: Each agent shows execution time in milliseconds
- [ ] **Timeline displays**: Workflow timeline shows all stage progressions
- [ ] **Charts render**: Visualization panel shows test trend and event distribution

---

## Command-Line Validation

### 1. Check Reporter is Configured
```bash
grep -A 2 "reporter:" playwright.config.ts
```
Expected output:
```
reporter: [
  ['html'],
  ['./reporters/currentTestReporter.ts'],
],
```

### 2. Check Reporter File Exists
```bash
ls -la reporters/currentTestReporter.ts
```

### 3. Check Reporter has Dashboard Opening Code
```bash
grep -n "openDashboard\|DASHBOARD_URL" reporters/currentTestReporter.ts
```
Expected: Multiple matches including function definition and onBegin call

### 4. Verify Files Are Being Written
```bash
# During test execution, in another terminal:
watch -n 0.5 'ls -lah runtime/*.json dashboard-ui/public/*.json'
```
Expected: Timestamp updates every second as reporter writes

### 5. Verify API Endpoints
```bash
# Check all three endpoints are serving
curl -s http://localhost:5173/workflow-status.json | jq .overallStatus
curl -s http://localhost:5173/suite-progress.json | jq .totalTests
curl -s http://localhost:5173/current-test.json | jq .testName
```

---

## Test Scenarios

### Scenario A: All Tests Pass

```bash
npx playwright test tests/example.spec.ts
```

**Expected Timeline:**
```
0s   → Dashboard opens, Execution RUNNING
5s   → Current test updates live
15s  → All tests pass, Execution SUCCESS
18s  → Healing RUNNING
21s  → Healing SUCCESS
23.5s→ RCA RUNNING
26s  → RCA SUCCESS, Dashboard REPORT MODE
```

### Scenario B: Test Fails (if available)

```bash
# Create failing test or run known failing suite
npx playwright test tests/sanity --grep "@failing"
```

**Expected:**
- Failed count increments
- RCA appears with failure classification
- Execution agent shows SUCCESS (reporter completes)
- Final report shows failed test

### Scenario C: Multiple Test Files

```bash
npx playwright test tests/
```

**Expected:**
- Current test cycles through multiple files
- Progress smoothly advances
- All metrics update correctly
- Final report aggregates all results

---

## File System Validation

After running tests, verify these files exist and contain data:

```
runtime/
├── workflow-status.json          # Contains agent states and timings
├── suite-progress.json           # Contains test counters and progress
├── current-test.json             # Contains last executed test
├── rca-results.json              # Contains failure analysis (if any)
└── heal-log.json                 # Contains healing events (empty for Playwright)

dashboard-ui/public/
├── workflow-status.json          # Synced copy
├── suite-progress.json           # Synced copy
└── current-test.json             # Synced copy
```

### Check File Timestamps

All three files should update in sequence during test execution:

```bash
# Run this during test execution in another terminal
watch -n 1 'echo "=== workflow-status ==="; stat -f "%Sm" runtime/workflow-status.json; echo "=== suite-progress ==="; stat -f "%Sm" runtime/suite-progress.json; echo "=== current-test ==="; stat -f "%Sm" runtime/current-test.json'
```

---

## Dashboard Component Validation

### Check Polling Hook Works

Open browser DevTools → Network tab:

- [ ] Multiple GET requests to `/workflow-status.json` at 1s intervals
- [ ] Each request has `Cache-Control: no-cache` header
- [ ] Each request has unique `?t=<timestamp>` query param
- [ ] Response status is 200 OK

### Check State Updates

Open browser DevTools → React DevTools (if installed):

1. Find `useWorkflowStatus` hook
   - [ ] `workflowStatus` state contains full agent data
   - [ ] `isLive` state is `true` during execution
   - [ ] `error` state is `null` (no errors)

2. Find `useSuiteProgress` hook
   - [ ] `totalTests` matches actual test count
   - [ ] `running` decrements as tests finish
   - [ ] `passed` and `failed` increment correctly

3. Find `LiveWorkflowPanel` component
   - [ ] Renders only when `isTestRunning === true`
   - [ ] Displays all 6 agents
   - [ ] Current agent has visual highlight
   - [ ] State icons change (PENDING → RUNNING → SUCCESS)

---

## Performance Validation

### Reporter Performance

```bash
# Measure total time
time npx playwright test tests/sanity
```

Expected overhead: < 500ms (mostly pipeline stage delays)

### Dashboard Responsiveness

During test execution:

- [ ] Dashboard remains responsive
- [ ] No lag when clicking buttons
- [ ] Charts render smoothly
- [ ] No console errors in DevTools

### Network Performance

Monitor Network tab during dashboard polling:

- [ ] Each poll takes < 50ms (local file fetch)
- [ ] No failed requests
- [ ] No stuck pending requests

---

## Integration Points Summary

| Component | File | Trigger | Output |
|-----------|------|---------|--------|
| **Playwright** | tests/*.spec.ts | `npx playwright test` | Test results |
| **Reporter** | reporters/currentTestReporter.ts | Test lifecycle | JSON files |
| **Runtime** | runtime/*.json | Reporter writes | Status data |
| **Sync** | reporter + workflowStatus.ts | Reporter lifecycle | dashboard-ui/public/* |
| **Vite** | dashboard-ui/vite.config.ts | npm run dev | HTTP server |
| **Dashboard** | dashboard-ui/src/* | HTTP polling | UI updates |
| **Browser** | localhost:5173 | Auto-open + polling | Visual feedback |

---

## Cleanup & Reset

To reset and re-run:

```bash
# Clear all runtime data
rm -f runtime/*.json dashboard-ui/public/*.json

# Clear test results
rm -rf playwright-report/ test-results/

# Re-run
npx playwright test tests/sanity
```

---

## Success Criteria ✓

All of the following should be true:

1. ✓ Dashboard opens automatically when tests start
2. ✓ Current test updates live as tests run
3. ✓ Passed/failed counters update correctly
4. ✓ Progress % advances smoothly
5. ✓ Execution agent shows RUNNING during test execution
6. ✓ Execution agent shows SUCCESS/FAILED at completion
7. ✓ Healing and RCA agents transition through states
8. ✓ Dashboard switches to REPORT MODE after completion
9. ✓ No test code modifications were needed
10. ✓ No page object modifications were needed
11. ✓ Reuses existing workflow status infrastructure
12. ✓ Reuses existing LiveWorkflowPanel component
13. ✓ Only one reporter implementation used
14. ✓ Only one dashboard instance runs

---

## Troubleshooting Guide

| Problem | Solution |
|---------|----------|
| Dashboard doesn't open | Ensure `npm run dev` is running in `dashboard-ui/` |
| Live updates not appearing | Check Network tab → `/workflow-status.json` returns 200 |
| Agents stuck on RUNNING | Verify reporter file has agent state transitions in `onEnd()` |
| Missing current test | Check `reporters/currentTestReporter.ts` has `onTestBegin()` implementation |
| No RCA data | Run a failing test to generate RCA entries |
| Charts not rendering | Check browser console for JS errors, reload page |

---

## Next Test Run

After validation, the integration is complete and ready for daily use:

```bash
# Start dashboard (terminal 1)
cd dashboard-ui && npm run dev

# Run tests (terminal 2)
npx playwright test
```

Every test run will now automatically display live execution on the dashboard!
