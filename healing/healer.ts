import * as fs from 'fs';
import * as path from 'path';
import { Page, Locator } from '@playwright/test';
import {
  LocatorStrategy,
  registerLocator,
  resolveLocator,
} from './locatorRegistry';
import {
  lookupHealPattern,
  publishHealMemorySession,
  recordHealMemorySearch,
  recordHealPatternLearning,
} from '../src/ai/selfHealingMemory';

// ---------------------------------------------------------------------------
// Live heal-log targets — written on every heal event so the dashboard can
// display real-time healing activity during test execution.
// ---------------------------------------------------------------------------
const ROOT = path.resolve(__dirname, '..');
const HEAL_TARGETS = [
  path.join(ROOT, 'runtime', 'heal-log.json'),
  path.join(ROOT, 'dashboard-ui', 'public', 'heal-log.json'),
];

function flushHealLog(log: HealEvent[]): void {
  const json = JSON.stringify(log, null, 2);
  for (const target of HEAL_TARGETS) {
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, json, 'utf8');
    } catch { /* non-fatal */ }
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HealEvent {
  key: string;
  /** Index of the strategy that originally failed (0-based) */
  failedStrategyIndex: number;
  failedStrategy: LocatorStrategy;
  /** Index of the strategy that succeeded */
  healedStrategyIndex: number;
  healedStrategy: LocatorStrategy;
  timestamp: string;
  pageUrl: string;
}

export interface HealerOptions {
  /**
   * When true, the healed strategy is promoted to the front of the registry
   * so it is tried first on subsequent lookups.
   * @default true
   */
  promoteOnHeal?: boolean;
  /**
   * Timeout (ms) to wait for each strategy to resolve before trying the next.
   * @default 3000
   */
  strategyTimeout?: number;
  /**
   * Called every time a locator is healed (primary strategy failed and a
   * fallback succeeded). Use for logging / reporting.
   */
  onHeal?: (event: HealEvent) => void;
}

// ---------------------------------------------------------------------------
// Healer state
// ---------------------------------------------------------------------------

const healLog: HealEvent[] = [];

// ---------------------------------------------------------------------------
// Core heal function
// ---------------------------------------------------------------------------

/**
 * Attempt to locate `key` on `page`.
 *
 * - If the primary (index-0) strategy succeeds the locator is returned as-is.
 * - If it fails, every remaining strategy is tried in order (self-healing).
 * - When a fallback succeeds a `HealEvent` is recorded, `onHeal` is called,
 *   and (by default) the registry is updated so the winning strategy is tried
 *   first next time.
 *
 * Throws when **all** strategies fail.
 */
export async function healLocator(
  page: Page,
  key: string,
  strategies: LocatorStrategy[],
  options: HealerOptions = {}
): Promise<Locator> {
  const { promoteOnHeal = true, strategyTimeout = 3000, onHeal } = options;

  if (strategies.length === 0) {
    throw new Error(`[healer] No strategies provided for key: "${key}"`);
  }

  let firstFailedIndex = -1;
  let firstFailedStrategy: LocatorStrategy | undefined;
  let lastError: unknown;
  let memorySearched = false;
  const searchStartedAt = Date.now();

  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i];
    const locator = buildLocator(page, strategy);

    try {
      await locator.waitFor({ state: 'visible', timeout: strategyTimeout });

      if (i > 0 && firstFailedStrategy) {
        // A fallback healed the locator — record and optionally promote
        const failedLocator = strategyLocatorValue(firstFailedStrategy) || key;
        const recoveredLocator = strategyLocatorValue(strategy) || key;
        const recoveryStrategy = strategyLabel(strategy);

        const event: HealEvent = {
          key,
          failedStrategyIndex: firstFailedIndex,
          failedStrategy: firstFailedStrategy,
          healedStrategyIndex: i,
          healedStrategy: strategy,
          timestamp: new Date().toISOString(),
          pageUrl: page.url(),
        };

        healLog.push(event);
        flushHealLog([...healLog]);
        onHeal?.(event);

        await recordHealPatternLearning({
          failedLocator,
          recoveredLocator,
          recoveryStrategy,
        }).catch(() => undefined);

        await publishHealMemorySession({
          failedLocator,
          searchingMemory: 'Recovery pattern learned',
          memoryHitStatus: memorySearched ? 'MISS' : 'SEARCHING',
          strategySelected: recoveryStrategy,
          recoveryApplied: recoveredLocator,
          retestStatus: 'PASS',
          updatedAt: new Date().toISOString(),
        }).catch(() => undefined);

        await publishHealMemorySession(null).catch(() => undefined);

        console.warn(
          `[healer] HEALED "${key}": strategy[${firstFailedIndex}] (${firstFailedStrategy.type}) ` +
          `failed → strategy[${i}] (${strategy.type}) succeeded on ${event.pageUrl}`
        );

        if (promoteOnHeal) {
          // Move healed strategy to the front and re-register
          const promoted = [
            strategy,
            ...strategies.slice(0, i),
            ...strategies.slice(i + 1),
          ];
          registerLocator(key, promoted);
        }
      }

      return locator;
    } catch (err) {
      if (firstFailedIndex === -1) {
        firstFailedIndex = i;
        firstFailedStrategy = strategy;

        const failedLocator = strategyLocatorValue(strategy) || key;

        await publishHealMemorySession({
          failedLocator,
          searchingMemory: 'Searching known recovery patterns',
          memoryHitStatus: 'SEARCHING',
          strategySelected: 'Pending',
          recoveryApplied: 'Pending',
          retestStatus: 'Pending',
          updatedAt: new Date().toISOString(),
        }).catch(() => undefined);

        const knownPattern = await lookupHealPattern(failedLocator).catch(() => null);
        memorySearched = true;

        if (knownPattern) {
          const memoryIndex = strategies.findIndex(s => strategyLocatorValue(s) === knownPattern.recoveredLocator);
          const memoryStrategy = memoryIndex >= 0 ? strategies[memoryIndex] : null;

          if (memoryStrategy) {
            await publishHealMemorySession({
              failedLocator,
              searchingMemory: 'Pattern located in self-healing memory',
              memoryHitStatus: 'HIT',
              strategySelected: knownPattern.recoveryStrategy,
              recoveryApplied: knownPattern.recoveredLocator,
              retestStatus: 'Running retest',
              updatedAt: new Date().toISOString(),
            }).catch(() => undefined);

            const memoryLocator = buildLocator(page, memoryStrategy);
            try {
              await memoryLocator.waitFor({ state: 'visible', timeout: strategyTimeout });

              const event: HealEvent = {
                key,
                failedStrategyIndex: firstFailedIndex,
                failedStrategy: firstFailedStrategy,
                healedStrategyIndex: memoryIndex,
                healedStrategy: memoryStrategy,
                timestamp: new Date().toISOString(),
                pageUrl: page.url(),
              };

              healLog.push(event);
              flushHealLog([...healLog]);
              onHeal?.(event);

              const recoveryTimeMs = Date.now() - searchStartedAt;
              await recordHealMemorySearch({
                failedLocator,
                hit: true,
                patternUsed: knownPattern.recoveryStrategy,
                recoveredLocator: knownPattern.recoveredLocator,
                recoveryTimeMs,
              }).catch(() => undefined);

              await recordHealPatternLearning({
                failedLocator,
                recoveredLocator: knownPattern.recoveredLocator,
                recoveryStrategy: knownPattern.recoveryStrategy,
              }).catch(() => undefined);

              await publishHealMemorySession({
                failedLocator,
                searchingMemory: 'Pattern reused successfully',
                memoryHitStatus: 'HIT',
                strategySelected: knownPattern.recoveryStrategy,
                recoveryApplied: knownPattern.recoveredLocator,
                retestStatus: 'PASS',
                updatedAt: new Date().toISOString(),
              }).catch(() => undefined);

              if (promoteOnHeal && memoryIndex > 0) {
                const promoted = [
                  memoryStrategy,
                  ...strategies.slice(0, memoryIndex),
                  ...strategies.slice(memoryIndex + 1),
                ];
                registerLocator(key, promoted);
              }

              await publishHealMemorySession(null).catch(() => undefined);
              return memoryLocator;
            } catch {
              await recordHealMemorySearch({
                failedLocator,
                hit: false,
              }).catch(() => undefined);

              await publishHealMemorySession({
                failedLocator,
                searchingMemory: 'Pattern lookup completed',
                memoryHitStatus: 'HIT',
                strategySelected: knownPattern.recoveryStrategy,
                recoveryApplied: knownPattern.recoveredLocator,
                retestStatus: 'FAILED - continuing fallback strategies',
                updatedAt: new Date().toISOString(),
              }).catch(() => undefined);
            }
          } else {
            await recordHealMemorySearch({
              failedLocator,
              hit: false,
            }).catch(() => undefined);

            await publishHealMemorySession({
              failedLocator,
              searchingMemory: 'Pattern found but not compatible with current strategies',
              memoryHitStatus: 'MISS',
              strategySelected: 'Fallback strategy search',
              recoveryApplied: 'Not applied',
              retestStatus: 'Running fallback',
              updatedAt: new Date().toISOString(),
            }).catch(() => undefined);
          }
        } else {
          await recordHealMemorySearch({
            failedLocator,
            hit: false,
          }).catch(() => undefined);

          await publishHealMemorySession({
            failedLocator,
            searchingMemory: 'No known pattern found',
            memoryHitStatus: 'MISS',
            strategySelected: 'Trying fallback locator strategies',
            recoveryApplied: 'Pending',
            retestStatus: 'Running fallback',
            updatedAt: new Date().toISOString(),
          }).catch(() => undefined);
        }
      }
      lastError = err;
    }
  }

  if (memorySearched && firstFailedStrategy) {
    await publishHealMemorySession({
      failedLocator: strategyLocatorValue(firstFailedStrategy) || key,
      searchingMemory: 'Recovery attempt finished',
      memoryHitStatus: 'MISS',
      strategySelected: 'No successful strategy',
      recoveryApplied: 'Not applied',
      retestStatus: 'FAILED',
      updatedAt: new Date().toISOString(),
    }).catch(() => undefined);

    await publishHealMemorySession(null).catch(() => undefined);
  }

  throw new Error(
    `[healer] All ${strategies.length} strategies failed for key "${key}". ` +
    `Last error: ${String(lastError)}`
  );
}

/**
 * Convenience wrapper: reads strategies from the registry (via resolveLocator)
 * but provides the healer's promote-on-heal behaviour.
 *
 * Use this when your test already called `registerLocator` / `registerLocators`
 * and just wants self-healing resolution with promotion.
 */
export async function heal(
  page: Page,
  key: string,
  options?: HealerOptions
): Promise<Locator> {
  // Delegate to resolveLocator for the actual resolution + fallback; if it
  // succeeds without healing no event is emitted. To get full heal events
  // supply strategies explicitly via healLocator().
  return resolveLocator(page, key);
}

// ---------------------------------------------------------------------------
// Heal log accessors
// ---------------------------------------------------------------------------

/** Return a snapshot of all heal events recorded in this session. */
export function getHealLog(): ReadonlyArray<HealEvent> {
  return [...healLog];
}

/** Print a formatted summary of all heal events to the console. */
export function printHealSummary(): void {
  if (healLog.length === 0) {
    console.log('[healer] No healing events recorded.');
    return;
  }
  console.log(`\n[healer] Heal summary (${healLog.length} event(s)):`);
  for (const e of healLog) {
    console.log(
      `  • ${e.timestamp} | key="${e.key}" | ` +
      `failed: strategy[${e.failedStrategyIndex}] (${e.failedStrategy.type}) → ` +
      `healed: strategy[${e.healedStrategyIndex}] (${e.healedStrategy.type}) | ` +
      `url: ${e.pageUrl}`
    );
  }
}

/** Clear the in-memory heal log. */
export function clearHealLog(): void {
  healLog.length = 0;
  flushHealLog([]);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildLocator(page: Page, strategy: LocatorStrategy): Locator {
  switch (strategy.type) {
    case 'name':
      return page.locator(`[name="${strategy.value}"]`);
    case 'placeholder':
      return page.getByPlaceholder(strategy.value);
    case 'label':
      return page.getByLabel(strategy.value);
    case 'role':
      return page.getByRole(strategy.role, strategy.options);
    case 'text':
      return page.getByText(strategy.value, { exact: strategy.exact });
    case 'css':
      return page.locator(strategy.selector);
    case 'testid':
      return page.getByTestId(strategy.value);
  }
}

function strategyLocatorValue(strategy: LocatorStrategy): string {
  switch (strategy.type) {
    case 'css':
      return strategy.selector;
    case 'role':
      return strategy.role;
    default:
      return strategy.value;
  }
}

function strategyLabel(strategy: LocatorStrategy): string {
  const value = strategyLocatorValue(strategy);
  return `${strategy.type}:${value}`;
}
