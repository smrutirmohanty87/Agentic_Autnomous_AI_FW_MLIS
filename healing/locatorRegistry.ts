import { Page, Locator } from '@playwright/test';

/**
 * Healing priority order (highest → lowest):
 * 1. name      – getByRole / input[name]
 * 2. placeholder – getByPlaceholder
 * 3. label     – getByLabel
 * 4. role      – getByRole (aria)
 * 5. text      – getByText / getByTitle
 */

export type LocatorStrategy =
  | { type: 'name';        value: string }
  | { type: 'placeholder'; value: string }
  | { type: 'label';       value: string }
  | { type: 'role';        role: Parameters<Page['getByRole']>[0]; options?: Parameters<Page['getByRole']>[1] }
  | { type: 'text';        value: string; exact?: boolean }
  | { type: 'css';         selector: string }
  | { type: 'testid';      value: string };

export interface LocatorEntry {
  /** Human-readable key identifying the UI element (e.g. 'loginUsernameInput') */
  key: string;
  /** Ordered list of strategies tried from index 0 downward */
  strategies: LocatorStrategy[];
}

/** Central registry: key → ordered strategies */
const registry = new Map<string, LocatorStrategy[]>();

/**
 * Register one or more locator strategies for an element key.
 * Strategies are tried in the order supplied (index 0 first).
 */
export function registerLocator(key: string, strategies: LocatorStrategy[]): void {
  registry.set(key, strategies);
}

/**
 * Register multiple entries at once.
 */
export function registerLocators(entries: LocatorEntry[]): void {
  for (const entry of entries) {
    registerLocator(entry.key, entry.strategies);
  }
}

/**
 * Resolve a strategy to a Playwright Locator.
 */
function strategyToLocator(page: Page, strategy: LocatorStrategy): Locator {
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

/**
 * Returns the first visible Locator from the registered strategies for the
 * given key. Falls back through each strategy automatically (self-healing).
 *
 * Throws if no strategy resolves to a visible element.
 */
export async function resolveLocator(page: Page, key: string): Promise<Locator> {
  const strategies = registry.get(key);
  if (!strategies || strategies.length === 0) {
    throw new Error(`[locatorRegistry] No strategies registered for key: "${key}"`);
  }

  let lastError: unknown;
  for (const strategy of strategies) {
    try {
      const locator = strategyToLocator(page, strategy);
      await locator.waitFor({ state: 'visible', timeout: 3000 });
      return locator;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `[locatorRegistry] All strategies failed for key "${key}". Last error: ${String(lastError)}`
  );
}

/**
 * Returns all registered keys (useful for debugging / health checks).
 */
export function listRegisteredKeys(): string[] {
  return Array.from(registry.keys());
}

/**
 * Remove all registered locators (useful between test suites).
 */
export function clearRegistry(): void {
  registry.clear();
}
