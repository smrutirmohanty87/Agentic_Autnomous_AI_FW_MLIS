import * as fs from 'fs';
import * as path from 'path';
import { Page, Locator } from '@playwright/test';
import {
  LocatorStrategy,
  registerLocator,
  resolveLocator,
} from './locatorRegistry';

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

  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i];
    const locator = buildLocator(page, strategy);

    try {
      await locator.waitFor({ state: 'visible', timeout: strategyTimeout });

      if (i > 0 && firstFailedStrategy) {
        // A fallback healed the locator — record and optionally promote
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
      }
      lastError = err;
    }
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
