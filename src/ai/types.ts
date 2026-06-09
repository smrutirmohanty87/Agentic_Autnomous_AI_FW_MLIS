import type { Page } from '@playwright/test';

export type LocatorSelector = string;

export interface LocatorRecord {
  /** Preferred locator to try first */
  primary: LocatorSelector;
  /** Alternate locators to try if primary fails */
  fallbacks: LocatorSelector[];
  /** Total number of successful uses across runs */
  successCount: number;
  /** Total number of failed full-resolution attempts across runs */
  failureCount: number;
  /** ISO timestamp when a locator last succeeded */
  lastUsed: string;
}

export type LocatorMemoryDb = Record<string, LocatorRecord>;

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';

export interface LoggerLike {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  success(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface SmartActionOptions {
  /** Max time to resolve a working locator for this element. Default: 15000 */
  timeoutMs?: number;
  /** Max time for the underlying action once locator is resolved. Default: 10000 */
  actionTimeoutMs?: number;
  /** When true, only use the first match (stable for non-unique selectors). Default: true */
  firstMatchOnly?: boolean;
  /** Optionally target the nth match (0-based). Useful when selector matches multiple elements. */
  nth?: number;
  /** Number of attempts per locator to handle transient overlays/stale element. Default: 2 */
  attemptsPerLocator?: number;
  /** Optional stable context to include in logs */
  context?: string;
}

export interface HealingOptions {
  /** Limit number of heuristic candidates tried before DOM-scoring. Default: 15 */
  maxHeuristicCandidates?: number;
  /** Controls how long we wait when validating a candidate locator. Default: 5000 */
  validationTimeoutMs?: number;
}

export interface HealedCandidate {
  /** A Playwright selector string (css/xpath/text/role engine, etc.) */
  selector: LocatorSelector;
  /** Higher is better */
  score: number;
  /** Human-readable explanation for logs */
  reason: string;
}

export interface HealingEngine {
  findBestLocator(page: Page, elementName: string, options?: HealingOptions): Promise<HealedCandidate | null>;
}
