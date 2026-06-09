/**
 * rca/rcaAnalyzer.ts
 *
 * Orchestrates full Root Cause Analysis for a Playwright test run.
 *
 * Works at two levels:
 *   1. HealEvent analysis  – delegates to rcaDemo for self-healing events
 *   2. Raw failure analysis – classifies unhealed errors from error messages,
 *      page snapshots, and Playwright TestInfo so every failure produces an
 *      RCA report even when no healing occurred.
 */

import { TestInfo } from '@playwright/test';
import { HealEvent, getHealLog } from '../healing/healer';
import {
  RCAReport,
  FailureType,
  RecoveryStatus,
  analyzeHealEvent,
  printRCAReport,
} from './rcaDemo';

// ---------------------------------------------------------------------------
// Extended types
// ---------------------------------------------------------------------------

/** A failure that the healer could NOT recover from. */
export interface UnhealedFailure {
  testName: string;
  errorMessage: string;
  pageUrl: string;
  timestamp: string;
  /** Raw Playwright error stack, if available */
  stack?: string;
}

export interface AnalyzerResult {
  testName: string;
  totalEvents: number;
  healedCount: number;
  unhealedCount: number;
  overallStatus: 'PASS' | 'PARTIAL_HEAL' | 'FAIL';
  reports: RCAReport[];
  summary: string;
}

// ---------------------------------------------------------------------------
// Error message → FailureType classifier
// ---------------------------------------------------------------------------

function classifyError(message: string): FailureType {
  const msg = message.toLowerCase();
  if (msg.includes('timeout') || msg.includes('exceeded'))           return 'Timeout';
  if (msg.includes('not visible') || msg.includes('hidden'))         return 'ElementNotVisible';
  if (msg.includes('strict mode') || msg.includes('multiple'))       return 'MultipleMatches';
  if (
    msg.includes('locator') ||
    msg.includes('no element') ||
    msg.includes('selector') ||
    msg.includes('does not match') ||
    msg.includes('waiting for') && msg.includes('visible')
  )                                                                   return 'LocatorBreakage';
  return 'Unknown';
}

// ---------------------------------------------------------------------------
// RCA for a raw (unhealed) failure
// ---------------------------------------------------------------------------

function buildUnhealedReport(failure: UnhealedFailure): RCAReport {
  const failureType = classifyError(failure.errorMessage);

  const rootCauseMap: Record<FailureType, string> = {
    Timeout:
      `The test timed out waiting for an element or navigation at "${failure.pageUrl}". ` +
      `Likely causes: slow network on the demo environment, a missing waitFor, or a ` +
      `selector that never matched.`,
    ElementNotVisible:
      `An element was found in the DOM but was not visible at "${failure.pageUrl}". ` +
      `A loading overlay, CSS animation, or conditional rendering may be hiding it.`,
    MultipleMatches:
      `A locator matched more than one element at "${failure.pageUrl}" causing strict-mode ` +
      `violation. The selector needs to be scoped more precisely.`,
    LocatorBreakage:
      `A locator did not match any element at "${failure.pageUrl}". The UI may have been ` +
      `refactored, an attribute renamed, or the element moved in the DOM tree.`,
    Unknown:
      `An unexpected error occurred at "${failure.pageUrl}": ${failure.errorMessage}`,
  };

  const recoveryActionMap: Record<FailureType, string> = {
    Timeout:          'Increase test/action timeout and add explicit waitFor before the failing step.',
    ElementNotVisible:'Add waitFor({ state: "visible" }) or wait for any blocking overlay to close.',
    MultipleMatches:  'Scope the locator with a parent container or switch to a data-testid attribute.',
    LocatorBreakage:  'Update the broken locator to match the current DOM structure.',
    Unknown:          'Inspect the full error stack and page snapshot for additional context.',
  };

  const confidenceMap: Record<FailureType, number> = {
    Timeout: 80, ElementNotVisible: 75, MultipleMatches: 90,
    LocatorBreakage: 85, Unknown: 40,
  };

  const recommendationMap: Record<FailureType, string> = {
    Timeout:
      `Profile the page load time in the CI environment. Consider raising \`navigationTimeout\` ` +
      `in playwright.config.ts and switching \`waitForLoadState\` from 'networkidle' to 'domcontentloaded'.`,
    ElementNotVisible:
      `Use \`locator.waitFor({ state: 'visible' })\` with an adequate timeout. ` +
      `Consider adding \`data-testid\` attributes to avoid fragile CSS selectors.`,
    MultipleMatches:
      `Qualify the selector with a unique parent, or ask the dev team to add a \`data-testid\` ` +
      `to uniquely identify the element.`,
    LocatorBreakage:
      `Replace the broken selector with a resilient locator (role, label, or data-testid). ` +
      `Register fallback strategies in locatorRegistry.ts to enable self-healing next run.`,
    Unknown:
      `Review error details and the page snapshot. Add the element to locatorRegistry.ts ` +
      `with multiple fallback strategies to prevent future unhealed failures.`,
  };

  return {
    testName:        failure.testName,
    elementKey:      'unhealed-failure',
    failureType,
    affectedElement: `error="${failure.errorMessage.slice(0, 120)}"`,
    rootCause:       rootCauseMap[failureType],
    recoveryAction:  recoveryActionMap[failureType],
    recoveryStatus:  'FAILED',
    confidence:      confidenceMap[failureType],
    recommendation:  recommendationMap[failureType],
    timestamp:       failure.timestamp,
    pageUrl:         failure.pageUrl,
  };
}

// ---------------------------------------------------------------------------
// Main analyzer entry points
// ---------------------------------------------------------------------------

/**
 * Analyze all events in the current heal log plus any unhealed failures.
 * Returns a consolidated `AnalyzerResult` with individual RCA reports.
 */
export function analyze(
  testName: string,
  unhealedFailures: UnhealedFailure[] = []
): AnalyzerResult {
  const healEvents: HealEvent[] = [...getHealLog()];
  const healedReports  = healEvents.map(e => analyzeHealEvent(e, testName));
  const unhealedReports = unhealedFailures.map(buildUnhealedReport);
  const reports = [...healedReports, ...unhealedReports];

  const healedCount   = healedReports.length;
  const unhealedCount = unhealedReports.length;

  let overallStatus: AnalyzerResult['overallStatus'];
  if (unhealedCount === 0 && healedCount === 0) overallStatus = 'PASS';
  else if (unhealedCount === 0)                 overallStatus = 'PARTIAL_HEAL';
  else                                          overallStatus = 'FAIL';

  const summary =
    `Test "${testName}" — ` +
    `${healedCount} healed event(s), ${unhealedCount} unhealed failure(s). ` +
    `Overall: ${overallStatus}.`;

  return { testName, totalEvents: reports.length, healedCount, unhealedCount, overallStatus, reports, summary };
}

/**
 * Playwright `afterEach` integration helper.
 *
 * Pass `testInfo` from Playwright and optionally a page URL.
 * When the test has failed, the error message is extracted automatically.
 *
 * Usage:
 *   test.afterEach(async ({ page }, testInfo) => {
 *     await analyzeFromTestInfo(testInfo, page.url());
 *   });
 */
export async function analyzeFromTestInfo(
  testInfo: TestInfo,
  pageUrl = ''
): Promise<AnalyzerResult> {
  const unhealedFailures: UnhealedFailure[] = [];

  if (testInfo.status === 'failed' || testInfo.status === 'timedOut') {
    const err = testInfo.errors[0];
    unhealedFailures.push({
      testName:     testInfo.title,
      errorMessage: err?.message ?? 'Unknown error',
      pageUrl,
      timestamp:    new Date().toISOString(),
      stack:        err?.stack,
    });
  }

  const result = analyze(testInfo.title, unhealedFailures);
  printAnalyzerResult(result);
  return result;
}

// ---------------------------------------------------------------------------
// Console renderer
// ---------------------------------------------------------------------------

export function printAnalyzerResult(result: AnalyzerResult): void {
  const divider = '═'.repeat(60);
  console.log(`\n${divider}`);
  console.log('RCA Analyzer Result');
  console.log(divider);
  console.log(`Test:            ${result.testName}`);
  console.log(`Total Events:    ${result.totalEvents}`);
  console.log(`  Healed:        ${result.healedCount}`);
  console.log(`  Unhealed:      ${result.unhealedCount}`);
  console.log(`Overall Status:  ${result.overallStatus}`);
  console.log(`Summary:         ${result.summary}`);
  console.log(divider);

  if (result.reports.length === 0) {
    console.log('  No RCA reports generated — test passed cleanly.\n');
    return;
  }

  result.reports.forEach((report, idx) => {
    console.log(`\n  [${idx + 1}/${result.reports.length}]`);
    printRCAReport(report);
  });
}
