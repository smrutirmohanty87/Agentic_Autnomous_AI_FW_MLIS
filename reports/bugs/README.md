# Bug Reports Index

## Overview
This directory contains detailed bug reports generated from Playwright test execution failures.

## Bug Reports

### 1. Invalid URL Navigation - net::ERR_NAME_NOT_RESOLVED Error
- **Report File**: [BUG-001_Invalid_URL_Navigation.md](./BUG-001_Invalid_URL_Navigation.md)
- **Status**: Open
- **Severity**: High (P1 - Critical)
- **Test Case**: `get started link`
- **Test File**: `tests/example.spec.ts`
- **Error Type**: DNS Resolution Failure
- **Root Cause**: Invalid URL with "123" suffix appended to domain
- **Date Reported**: March 11, 2026

---

## Quick Reference

| Bug ID | Title | Test Case | Severity | Status | Date | File |
|--------|-------|-----------|----------|--------|------|------|
| BUG-001 | Invalid URL Navigation | get started link | High | Open | 2026-03-11 | [Link](./BUG-001_Invalid_URL_Navigation.md) |

## Test Execution Summary
- **Total Tests Run**: 4
- **Passed**: 3 (75%)
- **Failed**: 1 (25%)
- **Test Suite Duration**: 20.1 seconds
- **Execution Date**: March 11, 2026 06:41:36 UTC

## Report Generation Details
- **Framework**: Playwright Test v1.58.2
- **Browser**: Chromium (Desktop Chrome)
- **Test Environment**: Windows 10/11
- **Report Format**: Markdown with detailed error analysis

## How to Use This Report

1. **For Development Teams**: Review the "Root Cause" and "Recommendation" sections for immediate fixes
2. **For QA Leads**: Use the severity and status for prioritization and resource allocation
3. **For DevOps**: Reference the "Environment Details" section for CI/CD configuration
4. **For Documentation**: Refer to "Steps to Reproduce" for test procedure documentation

## Next Steps
1. Fix the identified URL issue in the test case
2. Re-run the test suite to verify resolution
3. Update bug status from Open to Resolved
4. Add prevention measures as recommended

---
**Last Updated**: March 11, 2026  
**Report Generator**: Agentic QA Framework - Playwright Test Analysis
