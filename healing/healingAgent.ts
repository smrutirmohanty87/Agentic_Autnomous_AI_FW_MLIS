/**
 * healing/healingAgent.ts
 *
 * Healing Agent Workflow Service
 *
 * Responsibilities:
 * - Track failed tests from test execution
 * - Attempt healing/recovery on failed tests
 * - Update workflow-status.json with healing state transitions
 * - Record healing events and results
 *
 * State Transitions:
 * PENDING → RUNNING → (SUCCESS | FAILED)
 *
 * If any test fails:
 *   Healing RUNNING → attempts recovery
 *   If recovered: Healing SUCCESS
 *   If not recovered: Healing FAILED
 *
 * Healing Strategies:
 * 1. Retry failed tests with extended timeout
 * 2. Apply locator healing strategies
 * 3. Log healing attempts and results
 */


export interface FailedTest {
  testName: string;
  errorMessage: string;
  failureType: string;
  retryCount: number;
}

export interface HealingAttempt {
  testName: string;
  attemptNumber: number;
  strategy: string;
  success: boolean;
  timestamp: string;
  recoveryAction?: string;
}

export interface HealingResult {
  totalFailed: number;
  totalHealed: number;
  totalUnhealed: number;
  healingSuccess: boolean;
  attempts: HealingAttempt[];
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export class HealingAgent {
  private failedTests: Map<string, FailedTest> = new Map();
  private healingAttempts: HealingAttempt[] = [];
  private startTime: number = 0;

  /**
   * Record a failed test for later healing attempt
   */
  recordFailedTest(testName: string, errorMessage: string, failureType: string): void {
    if (!this.failedTests.has(testName)) {
      this.failedTests.set(testName, {
        testName,
        errorMessage,
        failureType,
        retryCount: 0,
      });
    }
  }

  /**
   * Get the count of failed tests
   */
  getFailedCount(): number {
    return this.failedTests.size;
  }

  /**
   * Check if there are any failed tests to heal
   */
  hasFailures(): boolean {
    return this.failedTests.size > 0;
  }

  /**
   * Simulate healing workflow
   * In real scenario, this would:
   * 1. Re-run failed tests
   * 2. Apply self-healing strategies
   * 3. Track recovery results
   *
   * For now, we simulate healing attempts with configurable success rate
   */
  async performHealing(successRate: number = 0.5): Promise<HealingResult> {
    this.startTime = Date.now();
    const startedAt = new Date().toISOString();

    const failedTestsArray = Array.from(this.failedTests.values());
    let healedCount = 0;

    // Simulate healing for each failed test
    for (const failedTest of failedTestsArray) {
      const attemptNumber = ++failedTest.retryCount;

      // Simulate healing attempt with recovery action based on failure type
      const recoveryAction = this.getRecoveryAction(failedTest.failureType);
      const healed = Math.random() < successRate;

      if (healed) {
        healedCount++;
      }

      this.healingAttempts.push({
        testName: failedTest.testName,
        attemptNumber,
        strategy: `Self-Healing Strategy (${failedTest.failureType})`,
        success: healed,
        timestamp: new Date().toISOString(),
        recoveryAction,
      });
    }

    const finishedAt = new Date().toISOString();
    const durationMs = Date.now() - this.startTime;

    // Healing succeeds if ALL failed tests were healed
    const healingSuccess = healedCount === failedTestsArray.length;

    return {
      totalFailed: failedTestsArray.length,
      totalHealed: healedCount,
      totalUnhealed: failedTestsArray.length - healedCount,
      healingSuccess,
      attempts: this.healingAttempts,
      startedAt,
      finishedAt,
      durationMs,
    };
  }

  /**
   * Get recovery action recommendation for failure type
   */
  private getRecoveryAction(failureType: string): string {
    const actionMap: Record<string, string> = {
      LocatorBreakage:    'Updated locator strategy with fallback selectors',
      ElementNotVisible:  'Added waitFor visibility check and cleared blocking overlays',
      Timeout:            'Increased timeout and added explicit navigation wait',
      MultipleMatches:    'Scoped locator with parent container selector',
      Unknown:            'Applied generic recovery strategy',
    };
    return actionMap[failureType] || 'Applied recovery strategy';
  }

  /**
   * Get healing summary
   */
  getHealingSummary(): HealingResult | null {
    if (this.healingAttempts.length === 0) {
      return null;
    }

    const startedAt = this.healingAttempts[0]?.timestamp || new Date().toISOString();
    const finishedAt = this.healingAttempts[this.healingAttempts.length - 1]?.timestamp || new Date().toISOString();

    const successCount = this.healingAttempts.filter(a => a.success).length;
    const totalFailed = this.failedTests.size;
    const healingSuccess = successCount === totalFailed;

    return {
      totalFailed,
      totalHealed: successCount,
      totalUnhealed: totalFailed - successCount,
      healingSuccess,
      attempts: this.healingAttempts,
      startedAt,
      finishedAt,
      durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
    };
  }

  /**
   * Reset healing agent state
   */
  reset(): void {
    this.failedTests.clear();
    this.healingAttempts = [];
    this.startTime = 0;
  }
}

/**
 * Singleton instance
 */
let healingAgent: HealingAgent | null = null;

export function getHealingAgent(): HealingAgent {
  if (!healingAgent) {
    healingAgent = new HealingAgent();
  }
  return healingAgent;
}

export function resetHealingAgent(): void {
  if (healingAgent) {
    healingAgent.reset();
  }
}
