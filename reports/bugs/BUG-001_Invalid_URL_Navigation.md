# Bug Report

## Bug Title
Invalid URL Navigation - net::ERR_NAME_NOT_RESOLVED Error

## Severity
**High** - Test execution failure blocking automated testing

## Test Case Name
`get started link`

## Test File
`tests/example.spec.ts` (Line 10-18)

## Steps to Reproduce
1. Open the test file: `tests/example.spec.ts`
2. Locate the test case: `test('get started link', ...)`
3. Run the Playwright test suite using `npx playwright test`
4. Observe the test execution

### Detailed Steps:
1. Navigate to web URL: `https://playwright.dev123/`
2. Attempt to click element with role 'link' and name 'Get started'
3. Verify that page heading 'Installation' is visible

## Expected Result
- Page navigation to `https://playwright.dev123/` should succeed
- The 'Get started' link should be visible and clickable
- Page should display a heading with text 'Installation'
- Test case should PASS

## Actual Result
- Page navigation fails with network error
- No subsequent test steps are executed
- Test case execution FAILS at navigation step
- Error is raised before any element interaction occurs

## Error Message / Stack Trace
```
Error: page.goto: net::ERR_NAME_NOT_RESOLVED at https://playwright.dev123/
Call log:
  - navigating to "https://playwright.dev123/", waiting until "load"

at C:\Users\smruti.r.a.mohanty\Agentic_QA_Framework\tests\example.spec.ts:11:14
```

### Root Cause
The URL `https://playwright.dev123/` is invalid. The domain includes the string "123" appended to "playwright.dev", which does not resolve to a valid IP address. This is a **DNS resolution failure** (net::ERR_NAME_NOT_RESOLVED).

### Correct URL
The intended URL should be: `https://playwright.dev/` (without the "123" suffix)

## Environment Details

### System Information
- **Operating System**: Windows 10/11
- **Browser**: Chromium (Desktop Chrome)
- **Node.js Version**: Compatible with Playwright 1.58.2
- **npm Version**: Latest compatible version

### Test Environment Configuration
- **Test Framework**: Playwright Test v1.58.2
- **Configuration File**: `playwright.config.ts`
- **Test Directory**: `./tests`
- **Reporter**: HTML (with JSON available)
- **Browser Timeout**: 30 seconds (default)
- **Retries**: 0 (disabled)
- **Workers**: 6 parallel workers

### Test Execution Context
- **Test Project**: Chromium
- **Parallel Execution**: Enabled (fullyParallel: true)
- **Base URL**: None configured
- **Trace Recording**: On first retry

## Timestamp
- **Date**: March 11, 2026
- **Time**: 06:41:36 UTC
- **Duration**: Test suite execution time: 20.1 seconds
- **Test Result**: Failed (1 failed, 3 passed)

## Test Results Summary
```
Running 4 tests using 4 workers

FAILED: [chromium] › tests\example.spec.ts:10:5 › get started link
PASSED: [chromium] › tests\example.spec.ts:1:5 › has title
PASSED: [chromium] › tests\example.spec.ts:19:5 › Login to SauceDemo
PASSED: [chromium] › tests\example.spec.ts (seed test)

Total: 4 tests | Passed: 3 | Failed: 1 | Pass Rate: 75%
```

## Recommendation

### Immediate Fix
Update the test case in `tests/example.spec.ts` line 11:

**Current Code:**
```typescript
await page.goto('https://playwright.dev123/');
```

**Corrected Code:**
```typescript
await page.goto('https://playwright.dev/');
```

### Prevention Measures
1. Implement URL validation in test data
2. Add peer review process for test code changes
3. Use environment-specific URL configuration via `.env` files
4. Add URL validation utility function to catch malformed URLs

## Related Issues
- None documented

## Assigned To
QA Framework Team

---
**Report Generated**: March 11, 2026 06:45 UTC  
**Report Status**: Open  
**Priority**: P1 - Critical Test Failure
