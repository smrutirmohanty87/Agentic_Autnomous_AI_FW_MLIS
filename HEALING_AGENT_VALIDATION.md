# Healing Agent Integration - Validation Checklist

## Overview
This checklist validates that the Healing Agent workflow is properly integrated and functioning end-to-end with the dashboard, reporter, and workflow status management.

---

## Phase 1: Setup Verification ✅

### 1.1 Files Created
- [ ] `healing/healingAgent.ts` exists with HealingAgent class
- [ ] File contains `recordFailedTest()` method
- [ ] File contains `performHealing()` method  
- [ ] File exports `getHealingAgent()` singleton function

### 1.2 Files Modified
- [ ] `reporters/currentTestReporter.ts` imports HealingAgent
- [ ] `onBegin()` calls `healingAgent.reset()`
- [ ] `onTestEnd()` calls `healingAgent.recordFailedTest()`
- [ ] `onEnd()` calls `healingAgent.performHealing()`
- [ ] Healing state updates workflow-status.json

### 1.3 Runtime Files Present
- [ ] `runtime/workflow-status.json` exists
- [ ] `dashboard-ui/public/workflow-status.json` exists
- [ ] Both files are identical (dual-write working)

**Validation Command:**
```bash
# Check files exist
test -f healing/healingAgent.ts && echo "✅ healingAgent.ts exists"
test -f reporters/currentTestReporter.ts && echo "✅ currentTestReporter.ts exists"
test -f runtime/workflow-status.json && echo "✅ workflow-status.json exists"
```

---

## Phase 2: State Transition Validation ✅

### 2.1 No Failures Scenario

**Setup:**
```bash
npm run dashboard:ui &  # Start dashboard in background
npm run test:sanity     # Run sanity tests (should all pass)
```

**Expected Workflow States:**
```
Stage 1: Execution
- Execution: RUNNING
- Healing: PENDING
- RCA: PENDING

Stage 2: Execution Complete
- Execution: SUCCESS
- Healing: RUNNING (even with no failures)
- RCA: PENDING

Stage 3: Healing Complete
- Execution: SUCCESS
- Healing: SUCCESS (skipped since no failures)
- RCA: RUNNING

Stage 4: Complete
- Overall: SUCCESS
- All agents: SUCCESS
```

**Validation Steps:**
1. Open dashboard at `http://localhost:5173`
2. Watch LiveWorkflowPanel
3. Verify state transitions occur in order:
   - [ ] Execution goes: PENDING → RUNNING → SUCCESS
   - [ ] Healing goes: PENDING → RUNNING → SUCCESS
   - [ ] RCA goes: PENDING → RUNNING → SUCCESS
   - [ ] Overall shows SUCCESS
4. Verify timing: ~5.5 seconds for healing+RCA stages

**File Check:**
```bash
# Check final workflow-status.json
cat dashboard-ui/public/workflow-status.json | jq '.overallStatus'
# Expected: "SUCCESS"

cat dashboard-ui/public/workflow-status.json | jq '.agents[] | select(.name=="Healing") | .state'
# Expected: "SUCCESS"
```

### 2.2 Test Failure → Healing Success Scenario

**Setup (Create temporary test with recoverable failure):**
```bash
# Create tests/healing-demo-success.spec.ts with:
test('demo: recoverable failure', async ({ page }) => {
  // Simulate a timeout that can be healed
  await page.waitForTimeout(100); // Pass after retry
});
```

**Expected Workflow States:**
```
Stage 1: Execution
- Execution: RUNNING

Stage 2: Test Fails
- Execution: FAILED
- Healing: RUNNING (attempts recovery)

Stage 3: Healing Recovers
- Execution: FAILED
- Healing: SUCCESS (recovered test)
- RCA: RUNNING

Stage 4: Complete
- Overall: SUCCESS (healing recovered all failures)
```

**Validation Steps:**
1. Run the test: `npm test tests/healing-demo-success.spec.ts`
2. Watch dashboard LiveWorkflowPanel
3. Verify execution turns RED (FAILED)
4. Verify Healing turns YELLOW (RUNNING)
5. Verify healing simulation takes ~3 seconds
6. Verify Healing turns GREEN (SUCCESS)
7. Verify Overall shows SUCCESS
8. Check terminal output for: `✅ Healing workflow completed`

**File Checks:**
```bash
# Check heal-log.json exists
test -f dashboard-ui/public/heal-log.json && echo "✅ heal-log.json created"

# Check healing attempt recorded
cat dashboard-ui/public/heal-log.json | jq '.[0] | {testName, strategy, success}'
# Expected: success: true or false (based on 50% rate)

# Check workflow-status shows Healing SUCCESS
cat dashboard-ui/public/workflow-status.json | jq '.agents[] | select(.name=="Healing") | {state, durationMs}'
# Expected: state: "SUCCESS", durationMs: ~3000

# Check overall is SUCCESS even though Execution is FAILED
cat dashboard-ui/public/workflow-status.json | jq '.overallStatus'
# Expected: "SUCCESS" (if healing recovered)
```

### 2.3 Test Failure → Healing Failure Scenario

**Setup (Modify healingAgent to always fail):**
In `healing/healingAgent.ts`, change:
```typescript
// Line ~102 in performHealing()
async performHealing(successRate: number = 0.5): Promise<HealingResult> {
  // Change 0.5 to 0.0 to always fail
  const healed = Math.random() < 0.0; // Always false
```

Or in reporter (`reporters/currentTestReporter.ts` line ~452):
```typescript
// Change to 0.0 for this test
const healingResult = await healingAgent.performHealing(0.0);
```

**Expected Workflow States:**
```
Stage 1-2: Same as healing-success

Stage 3: Healing Cannot Recover
- Execution: FAILED
- Healing: FAILED (could not recover)
- RCA: RUNNING

Stage 4: Complete
- Overall: FAILED (healing failed)
```

**Validation Steps:**
1. Modify healing success rate to 0.0
2. Run test with failure
3. Watch dashboard
4. Verify Healing turns RED (FAILED) instead of GREEN
5. Verify Overall shows FAILED
6. Check terminal output shows healing attempts

**File Checks:**
```bash
# Check healing attempts show success: false
cat dashboard-ui/public/heal-log.json | jq '.[] | {testName, success}'
# Expected: success: false

# Check workflow-status shows Healing FAILED
cat dashboard-ui/public/workflow-status.json | jq '.agents[] | select(.name=="Healing") | .state'
# Expected: "FAILED"

# Check overall is FAILED
cat dashboard-ui/public/workflow-status.json | jq '.overallStatus'
# Expected: "FAILED"
```

---

## Phase 3: Reporter Integration Validation ✅

### 3.1 onBegin() Initialization
- [ ] `healingAgent.reset()` is called
- [ ] heal-log.json is cleared
- [ ] healingAgent state starts empty

**Test:**
```typescript
// Add to reporter test
const agent = getHealingAgent();
console.assert(agent.getFailedCount() === 0, 'Healing agent should start empty');
```

### 3.2 onTestEnd() Recording
- [ ] Failed tests are recorded in healing agent
- [ ] `recordFailedTest()` is called for each failure
- [ ] Error message is captured
- [ ] Failure type is classified correctly

**Test:**
```bash
# Run a test that fails
# Check that healingAgent has recorded it
# (Log should show: "recordFailedTest called for: ...")
```

### 3.3 onEnd() Execution
- [ ] Healing workflow transitions state correctly
- [ ] `performHealing()` is awaited
- [ ] Healing result determines Healing agent state
- [ ] workflow-status.json is updated at each stage

**Test:**
```bash
# Run tests
# Check workflow-status.json at each stage
# Verify Stage 1 shows Healing RUNNING
# Verify Stage 2 shows Healing SUCCESS/FAILED
# Verify Stage 3 shows final overall status
```

---

## Phase 4: Dashboard Display Validation ✅

### 4.1 LiveWorkflowPanel Updates
- [ ] Workflow panel shows live agent states
- [ ] Healing agent state is visible in panel
- [ ] State changes happen in real-time (as JSON updates)
- [ ] Timestamps are correct

**Manual Check:**
1. Open dashboard: http://localhost:5173
2. Run tests: `npm test`
3. Watch workflow panel update in real-time
4. Verify each state transition visible

### 4.2 Live Mode Management
- [ ] Dashboard stays in LIVE mode during Healing/RCA
- [ ] Current test shows "Pipeline — Healing & RCA in progress…"
- [ ] Progress bar stays at 100%
- [ ] Mode switches to REPORT after completion

**Manual Check:**
1. Watch dashboard during test run
2. After tests complete, dashboard should:
   - Show LIVE badge (not REPORT)
   - Show pipeline status message
   - Keep progress at 100%
   - Show running=1 in suite-progress
3. After RCA completes:
   - Mode switches to REPORT
   - Results show all agent timings

### 4.3 Healing Metrics Display
- [ ] Healing duration displayed (should be ~3000ms)
- [ ] Healing state shows SUCCESS or FAILED
- [ ] Heal-log accessible from dashboard (if UI includes it)

---

## Phase 5: File Integrity Validation ✅

### 5.1 workflow-status.json Format
```bash
# Verify JSON structure
cat dashboard-ui/public/workflow-status.json | jq '.'

# Should have:
# - workflowId
# - startedAt, completedAt
# - overallStatus
# - currentAgent
# - agents[] array with all 6 agents:
#   - Planner, Designer, Generator, Execution, Healing, RCA

# Each agent should have:
# - name
# - state: PENDING|RUNNING|SUCCESS|FAILED
# - startedAt (if started)
# - finishedAt (if completed)
# - durationMs (if completed)
```

### 5.2 heal-log.json Format
```bash
# Verify heal-log.json structure
cat dashboard-ui/public/heal-log.json | jq '.[]'

# Each entry should have:
# - testName
# - attemptNumber
# - strategy
# - success (boolean)
# - timestamp
# - recoveryAction (optional)
```

### 5.3 Dual-Write Verification
```bash
# Both files should be identical
diff runtime/workflow-status.json dashboard-ui/public/workflow-status.json
diff runtime/heal-log.json dashboard-ui/public/heal-log.json

# Expected: No output (files identical)
```

---

## Phase 6: State Transition Timing Validation ✅

### 6.1 Healing Duration
- [ ] Healing simulation takes ~3 seconds (configurable)
- [ ] Duration logged in workflow-status.json
- [ ] Dashboard shows correct durationMs for Healing agent

**Verification:**
```bash
# Check healing duration
cat dashboard-ui/public/workflow-status.json | \
  jq '.agents[] | select(.name=="Healing") | .durationMs'
# Expected: ~3000 (may vary slightly)
```

### 6.2 Overall Pipeline Timing
- [ ] Execution: actual test duration (varies)
- [ ] Healing: ~3000ms
- [ ] RCA: ~2500ms
- [ ] Total pipeline: Execution + 5.5 seconds

**Verification:**
```bash
# Get all agent timings
cat dashboard-ui/public/workflow-status.json | \
  jq '.agents[] | {name, durationMs}'
```

---

## Phase 7: Error Handling Validation ✅

### 7.1 No Failures Path
- [ ] Healing RUNNING transitions to SUCCESS (no-op)
- [ ] heal-log.json remains empty
- [ ] No recovery attempts logged
- [ ] Overall SUCCESS without healing

**Test:**
```bash
npm run test:sanity
# Verify: No failures → Healing SUCCESS → Overall SUCCESS
```

### 7.2 Multiple Failures Path
- [ ] Multiple failed tests recorded
- [ ] Multiple healing attempts logged
- [ ] All must succeed for Healing SUCCESS
- [ ] Any failure causes Healing FAILED

**Test:**
```bash
# Create test file with 3 tests, 2 fail
# Expected:
# - 2 tests in heal-log.json
# - Healing SUCCESS only if both recovered (50% chance each = 25% overall)
```

### 7.3 Reporter Errors
- [ ] Reporter continues if healing fails
- [ ] RCA runs regardless of healing state
- [ ] Overall status correctly reflects healing failure
- [ ] No crash if healing service errors

---

## Phase 8: Integration Validation ✅

### 8.1 No Test Modifications
- [ ] Tests run unchanged (no test code modified)
- [ ] Test execution timing identical to before
- [ ] No extra test hooks or modifications
- [ ] Healing is transparent to tests

### 8.2 Backward Compatibility
- [ ] Existing tests still pass/fail normally
- [ ] Reporter still generates HTML report
- [ ] RCA results unchanged
- [ ] Suite-progress.json format unchanged

### 8.3 Dashboard Compatibility
- [ ] Live polling works with Healing state
- [ ] Healing state in workflow-status.json readable by dashboard
- [ ] No breaking changes to dashboard components
- [ ] LiveWorkflowPanel updates correctly

---

## Validation Commands Summary

```bash
# 1. Verify files exist
test -f healing/healingAgent.ts && echo "✅ healingAgent.ts"
test -f reporters/currentTestReporter.ts && echo "✅ Reporter modified"

# 2. Run tests with all passing
npm run test:sanity

# 3. Check workflow states (no failures)
cat dashboard-ui/public/workflow-status.json | jq '.overallStatus'
# Expected: "SUCCESS"

# 4. Check healing state
cat dashboard-ui/public/workflow-status.json | jq '.agents[] | select(.name=="Healing") | .state'
# Expected: "SUCCESS"

# 5. Check heal-log exists but empty (no failures)
test -f dashboard-ui/public/heal-log.json && echo "✅ heal-log.json exists"
cat dashboard-ui/public/heal-log.json | jq 'length'
# Expected: 0 (no healing attempts if no failures)

# 6. Verify dual-write
diff runtime/workflow-status.json dashboard-ui/public/workflow-status.json && echo "✅ Files identical"
```

---

## Success Criteria

✅ **All validations pass when:**
1. HealingAgent service is properly initialized and reset
2. Failed tests are correctly recorded during execution
3. Healing workflow executes after test completion
4. Healing state transitions occur: PENDING → RUNNING → SUCCESS/FAILED
5. workflow-status.json is updated at each stage
6. heal-log.json records all healing attempts
7. Dashboard displays state transitions in real-time
8. Overall status correctly reflects healing outcome
9. No test files were modified
10. All existing functionality preserved

---

## Troubleshooting

### Issue: Healing state not updating
**Solution:**
- Check reporter imports HealingAgent correctly
- Verify `onEnd()` method calls `performHealing()`
- Check workflow-status.json is being written to both directories
- Monitor console for [reporter] log messages

### Issue: heal-log.json not created
**Solution:**
- Ensure at least one test fails during run
- Check `onTestEnd()` calls `healingAgent.recordFailedTest()`
- Verify heal-log targets are writable

### Issue: Dashboard not showing Healing state
**Solution:**
- Ensure dashboard-ui is running: `npm run dashboard:ui`
- Check http://localhost:5173 is accessible
- Verify workflow-status.json is in public/ directory
- Check browser console for fetch errors

### Issue: Overall status incorrect
**Solution:**
- Check `finalOverallStatus` calculation in `onEnd()`
- Verify healing result is properly returned from `performHealing()`
- Check both Execution and Healing states in calculation

---

## Sign-Off

- [ ] All 8 validation phases completed
- [ ] No blocking issues found
- [ ] Healing Agent workflow ready for production
- [ ] Date: _______________
- [ ] Validator: _______________
