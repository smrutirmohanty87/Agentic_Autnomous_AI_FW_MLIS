import { HealEvent, getHealLog } from '../healing/healer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FailureType =
  | 'LocatorBreakage'     // primary locator no longer matches the DOM
  | 'ElementNotVisible'   // element exists but is hidden / off-screen
  | 'Timeout'             // element never appeared within the timeout
  | 'MultipleMatches'     // selector matched more than one element
  | 'Unknown';

export type RecoveryStatus = 'SUCCESS' | 'FAILED';

export interface RCAReport {
  testName: string;
  elementKey: string;
  failureType: FailureType;
  affectedElement: string;
  rootCause: string;
  recoveryAction: string;
  recoveryStatus: RecoveryStatus;
  confidence: number;          // 0–100
  recommendation: string;
  timestamp: string;
  pageUrl: string;
}

// ---------------------------------------------------------------------------
// Failure type classifier
// ---------------------------------------------------------------------------

function classifyFailure(event: HealEvent): FailureType {
  const { failedStrategy, healedStrategy } = event;

  // If both strategies are the same type, element was genuinely unstable
  if (failedStrategy.type === healedStrategy.type) return 'ElementNotVisible';

  // Primary was a strict name/css selector and a looser strategy healed it
  if (
    (failedStrategy.type === 'name' || failedStrategy.type === 'css') &&
    (healedStrategy.type === 'role' || healedStrategy.type === 'label' ||
     healedStrategy.type === 'placeholder' || healedStrategy.type === 'text')
  ) {
    return 'LocatorBreakage';
  }

  // CSS fallback healed an attribute-based failure → likely a DOM attribute change
  if (failedStrategy.type === 'name' && healedStrategy.type === 'css') {
    return 'LocatorBreakage';
  }

  return 'Unknown';
}

// ---------------------------------------------------------------------------
// Root cause descriptions
// ---------------------------------------------------------------------------

function describeRootCause(event: HealEvent, failureType: FailureType): string {
  const failed = `${event.failedStrategy.type}`;
  const healed = `${event.healedStrategy.type}`;

  switch (failureType) {
    case 'LocatorBreakage':
      return (
        `The primary locator strategy (type="${failed}") no longer matches any element ` +
        `in the DOM at "${event.pageUrl}". This is typically caused by a UI refactor, ` +
        `attribute rename, or framework upgrade that changed the element's attributes ` +
        `without updating the test locators.`
      );
    case 'ElementNotVisible':
      return (
        `The element identified by strategy (type="${failed}") was present in the DOM ` +
        `but was not visible within the allowed timeout. The element may be hidden by ` +
        `CSS, behind a loading overlay, or rendered off-screen.`
      );
    case 'Timeout':
      return (
        `No strategy resolved within the configured timeout. The page at ` +
        `"${event.pageUrl}" may have been slow to load, or the element was ` +
        `conditionally rendered and never appeared.`
      );
    case 'MultipleMatches':
      return (
        `The locator strategy (type="${failed}") matched multiple elements, causing ` +
        `ambiguity. The healed strategy (type="${healed}") was more specific and ` +
        `resolved to a single element.`
      );
    default:
      return (
        `Strategy (type="${failed}") failed for an unknown reason at "${event.pageUrl}". ` +
        `Strategy (type="${healed}") was used as a fallback.`
      );
  }
}

// ---------------------------------------------------------------------------
// Recovery action descriptions
// ---------------------------------------------------------------------------

function describeRecoveryAction(event: HealEvent): string {
  return (
    `Self-healing engine automatically fell back from strategy[${event.failedStrategyIndex}] ` +
    `(type="${event.failedStrategy.type}") to strategy[${event.healedStrategyIndex}] ` +
    `(type="${event.healedStrategy.type}"). ` +
    `The healed strategy was promoted to the front of the registry so it will ` +
    `be tried first on the next execution.`
  );
}

// ---------------------------------------------------------------------------
// Confidence scorer
// ---------------------------------------------------------------------------

function scoreConfidence(event: HealEvent, failureType: FailureType): number {
  // Higher fallback distance = less confidence (healing jumped many steps)
  const distance = event.healedStrategyIndex - event.failedStrategyIndex;
  let base = 95;
  base -= distance * 10;
  if (failureType === 'Unknown') base -= 15;
  if (failureType === 'Timeout') base -= 10;
  return Math.max(10, Math.min(100, base));
}

// ---------------------------------------------------------------------------
// Recommendation generator
// ---------------------------------------------------------------------------

function recommend(event: HealEvent, failureType: FailureType): string {
  const healed = event.healedStrategy;

  if (failureType === 'LocatorBreakage') {
    return (
      `Update the primary locator for "${event.key}" to use ` +
      `type="${healed.type}" (the strategy that successfully healed the test). ` +
      `Coordinate with the development team to add a stable \`data-testid\` attribute ` +
      `to this element to prevent future breakage.`
    );
  }
  if (failureType === 'ElementNotVisible') {
    return (
      `Investigate whether a loading overlay or animation is delaying visibility of ` +
      `"${event.key}". Consider adding an explicit \`waitFor({ state: 'visible' })\` ` +
      `with a longer timeout, or waiting for the overlay to disappear first.`
    );
  }
  if (failureType === 'Timeout') {
    return (
      `Increase the \`strategyTimeout\` for "${event.key}" or add a \`waitForLoadState\` ` +
      `before resolving this locator. Investigate whether the page has performance ` +
      `degradation on the CI/CD environment.`
    );
  }
  return (
    `Review locator strategies for "${event.key}" and consider migrating to ` +
    `\`data-testid\` attributes for stable, refactor-proof selectors.`
  );
}

// ---------------------------------------------------------------------------
// Core: generate one RCA report from a single HealEvent
// ---------------------------------------------------------------------------

export function analyzeHealEvent(event: HealEvent, testName = 'Unknown Test'): RCAReport {
  const failureType = classifyFailure(event);
  const recoveryStatus: RecoveryStatus = 'SUCCESS'; // event only exists if healing succeeded

  return {
    testName,
    elementKey: event.key,
    failureType,
    affectedElement: `${event.failedStrategy.type}="${
      'value' in event.failedStrategy
        ? event.failedStrategy.value
        : 'selector' in event.failedStrategy
        ? event.failedStrategy.selector
        : event.failedStrategy.role
    }"`,
    rootCause: describeRootCause(event, failureType),
    recoveryAction: describeRecoveryAction(event),
    recoveryStatus,
    confidence: scoreConfidence(event, failureType),
    recommendation: recommend(event, failureType),
    timestamp: event.timestamp,
    pageUrl: event.pageUrl,
  };
}

// ---------------------------------------------------------------------------
// Batch: generate RCA reports for all events in the current heal log
// ---------------------------------------------------------------------------

export function generateRCAReports(testName = 'Unknown Test'): RCAReport[] {
  return getHealLog().map(event => analyzeHealEvent(event, testName));
}

// ---------------------------------------------------------------------------
// Renderer: print a formatted RCA report to the console
// ---------------------------------------------------------------------------

export function printRCAReport(report: RCAReport): void {
  const divider = '─'.repeat(60);
  console.log(`\n${divider}`);
  console.log('RCA Report');
  console.log(divider);
  console.log(`Test Name:         ${report.testName}`);
  console.log(`Element Key:       ${report.elementKey}`);
  console.log(`Timestamp:         ${report.timestamp}`);
  console.log(`Page URL:          ${report.pageUrl}`);
  console.log(divider);
  console.log(`Failure Type:      ${report.failureType}`);
  console.log(`Affected Element:  ${report.affectedElement}`);
  console.log(`\nRoot Cause:\n  ${report.rootCause}`);
  console.log(`\nRecovery Action:\n  ${report.recoveryAction}`);
  console.log(`\nRecovery Status:   ${report.recoveryStatus}`);
  console.log(`Confidence:        ${report.confidence}%`);
  console.log(`\nRecommendation:\n  ${report.recommendation}`);
  console.log(`${divider}\n`);
}

export function printAllRCAReports(testName = 'Unknown Test'): void {
  const reports = generateRCAReports(testName);
  if (reports.length === 0) {
    console.log('[rca] No healing events found — no RCA reports to generate.');
    return;
  }
  console.log(`\n[rca] Generating ${reports.length} RCA report(s) for: "${testName}"`);
  reports.forEach(printRCAReport);
}

// ---------------------------------------------------------------------------
// Demo entry point  (npx ts-node rca/rcaDemo.ts)
// ---------------------------------------------------------------------------

if (require.main === module) {
  const { getHealLog, clearHealLog } = require('../healing/healer') as typeof import('../healing/healer');

  // Seed the heal log with three representative mock events
  const mockEvents: HealEvent[] = [
    {
      key: 'loginUsername',
      failedStrategyIndex: 0,
      failedStrategy:  { type: 'name', value: 'username' },
      healedStrategyIndex: 1,
      healedStrategy:  { type: 'placeholder', value: 'Username' },
      timestamp: new Date().toISOString(),
      pageUrl: 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login',
    },
    {
      key: 'loginButton',
      failedStrategyIndex: 0,
      failedStrategy:  { type: 'css', selector: 'button.login-btn' },
      healedStrategyIndex: 1,
      healedStrategy:  { type: 'role', role: 'button', options: { name: 'Login' } },
      timestamp: new Date().toISOString(),
      pageUrl: 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login',
    },
    {
      key: 'dashboardHeading',
      failedStrategyIndex: 0,
      failedStrategy:  { type: 'css', selector: 'h1.dashboard-title' },
      healedStrategyIndex: 2,
      healedStrategy:  { type: 'text', value: 'Dashboard', exact: true },
      timestamp: new Date().toISOString(),
      pageUrl: 'https://opensource-demo.orangehrmlive.com/web/index.php/dashboard/index',
    },
  ];

  // Push mock events directly into the module-level healLog array
  const log = getHealLog() as HealEvent[];
  // getHealLog returns a copy — push via the internal array by re-exporting
  // workaround: use the exported clearHealLog + direct push via Object.assign
  clearHealLog();
  mockEvents.forEach(e => (log as HealEvent[]).push(e));

  // Override generateRCAReports to use our mock data directly
  const reports = mockEvents.map(e =>
    analyzeHealEvent(e, 'TC_001 – OrangeHRM Login Verification')
  );

  const divider = '─'.repeat(60);
  console.log(`\n[rca] RCA Demo — ${reports.length} mock heal event(s)\n`);
  reports.forEach((r, i) => {
    console.log(`  [${i + 1}/${reports.length}]`);
    printRCAReport(r);
  });

  console.log(divider);
  console.log('Demo complete.\n');
}
