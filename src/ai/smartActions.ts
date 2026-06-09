import type { Locator, Page } from '@playwright/test';
import { defaultHealingEngine, DefaultHealingEngine } from './healingEngine';
import { defaultLogger, Logger } from './logger';
import { defaultLocatorMemory, LocatorMemory } from './locatorMemory';
import type { HealedCandidate, HealingEngine, SmartActionOptions } from './types';

function escapeRegexLiteral(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildLocator(page: Page, selector: string, firstMatchOnly: boolean, nth?: number): Locator {
  const loc = page.locator(selector);
  if (typeof nth === 'number' && Number.isFinite(nth)) {
    return loc.nth(nth);
  }
  return firstMatchOnly ? loc.first() : loc;
}

async function tryActionWithRetries(
  actionName: 'click' | 'fill' | 'select',
  locator: Locator,
  params: { value?: string },
  options: { actionTimeoutMs: number; attempts: number },
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      if (actionName === 'click') {
        await locator.click({ timeout: options.actionTimeoutMs });
      } else if (actionName === 'fill') {
        await locator.fill(params.value ?? '', { timeout: options.actionTimeoutMs });
      } else {
        const value = params.value ?? '';
        try {
          // 1) Native <select>
          await locator.selectOption(value, { timeout: options.actionTimeoutMs });
        } catch (error) {
          // 2) Enterprise/custom combobox patterns (Salesforce, etc.)
          // Open the dropdown/listbox, then select by visible option text.
          await locator.click({ timeout: options.actionTimeoutMs });

          const page = locator.page();
          const optionName = new RegExp(escapeRegexLiteral(value), 'i');

          const roleCandidates = [
            page.getByRole('option', { name: optionName }).first(),
            page.getByRole('menuitem', { name: optionName }).first(),
            page.getByRole('listitem', { name: optionName }).first(),
          ];

          let clicked = false;
          for (const cand of roleCandidates) {
            if (await cand.isVisible({ timeout: 750 }).catch(() => false)) {
              await cand.click({ timeout: options.actionTimeoutMs });
              clicked = true;
              break;
            }
          }

          if (!clicked) {
            // Fallback text-based selection when roles aren't present.
            const textCandidate = page.locator('[role="option"], [role="menuitem"], [role="treeitem"], li, div').filter({ hasText: optionName }).first();
            if (await textCandidate.isVisible({ timeout: 750 }).catch(() => false)) {
              await textCandidate.click({ timeout: options.actionTimeoutMs });
              clicked = true;
            }
          }

          if (!clicked) {
            throw error;
          }
        }
      }
      return;
    } catch (error) {
      lastError = error;
      // Small backoff for transient overlays.
      await locator.page().waitForTimeout(250).catch(() => undefined);
    }
  }

  throw lastError;
}

function normalizeOptions(options?: SmartActionOptions) {
  return {
    timeoutMs: options?.timeoutMs ?? 15000,
    actionTimeoutMs: options?.actionTimeoutMs ?? 10000,
    firstMatchOnly: options?.firstMatchOnly ?? true,
    nth: options?.nth,
    attemptsPerLocator: options?.attemptsPerLocator ?? 2,
    context: options?.context,
  };
}

async function resolveAndAct(
  page: Page,
  elementName: string,
  actionName: 'click' | 'fill' | 'select',
  value?: string,
  deps?: { memory?: LocatorMemory; logger?: Logger; healingEngine?: HealingEngine },
  options?: SmartActionOptions,
): Promise<void> {
  const memory = deps?.memory ?? defaultLocatorMemory;
  const logger = deps?.logger ?? (defaultLogger as Logger);
  const healingEngine = deps?.healingEngine ?? (defaultHealingEngine as DefaultHealingEngine);
  const opt = normalizeOptions(options);

  const entry = await memory.get(elementName);
  const tried: Array<{ selector: string; stage: 'primary' | 'fallback' | 'healing'; error?: string }> = [];

  const locatorsToTry: Array<{ selector: string; stage: 'primary' | 'fallback' }> = [];
  if (entry?.primary) {
    locatorsToTry.push({ selector: entry.primary, stage: 'primary' });
  }
  for (const fb of entry?.fallbacks ?? []) {
    if (fb && fb !== entry.primary) {
      locatorsToTry.push({ selector: fb, stage: 'fallback' });
    }
  }

  const prefix = opt.context ? `${opt.context}: ` : '';

  const attemptLocator = async (selector: string, stage: 'primary' | 'fallback' | 'healing') => {
    try {
      const loc = buildLocator(page, selector, opt.firstMatchOnly, opt.nth);

      logger.info(`${prefix}Trying ${stage} locator...`, { elementName, selector });

      // Use Playwright auto-wait to give dynamic UIs time to render.
      // locator.isVisible() can return false immediately and is not a reliable wait primitive.
      await loc.waitFor({ state: 'visible', timeout: opt.timeoutMs });

      await tryActionWithRetries(
        actionName,
        loc,
        { value },
        { actionTimeoutMs: opt.actionTimeoutMs, attempts: opt.attemptsPerLocator },
      );

      logger.success(`${prefix}Action succeeded.`, { elementName, selector, action: actionName });
      return true;
    } catch (error) {
      const msg = String((error as Error)?.message ?? error);
      if (stage === 'primary') {
        logger.warn(`${prefix}Primary locator failed.`, { elementName, selector, error: msg });
      } else {
        logger.warn(`${prefix}${stage === 'fallback' ? 'Fallback' : 'Healed'} locator failed.`, {
          elementName,
          selector,
          error: msg,
        });
      }
      tried.push({ selector, stage, error: msg });
      return false;
    }
  };

  // 1) Try memory locators.
  for (const item of locatorsToTry) {
    const ok = await attemptLocator(item.selector, item.stage);
    if (ok) {
      await memory.recordSuccess(elementName, item.selector, {
        promoted: item.stage === 'fallback',
        previousPrimary: entry?.primary,
      });
      return;
    }
  }

  // 2) Healing engine.
  logger.warn(`${prefix}All known locators failed. Running healing engine...`, { elementName });

  const healed: HealedCandidate | null = await healingEngine.findBestLocator(page, elementName, {
    validationTimeoutMs: Math.min(5000, opt.timeoutMs),
  });

  if (healed?.selector) {
    const ok = await attemptLocator(healed.selector, 'healing');
    if (ok) {
      await memory.recordSuccess(elementName, healed.selector, {
        promoted: true,
        previousPrimary: entry?.primary,
      });
      return;
    }
  }

  await memory.recordFailure(elementName);

  const attempted = tried
    .map((t, i) => `  ${i + 1}. [${t.stage.toUpperCase()}] ${t.selector} -> ${t.error ?? 'unknown error'}`)
    .join('\n');

  const suggestion = healed?.selector ? `\nHealing engine suggested: ${healed.selector} (${healed.reason})` : '';

  throw new Error(
    `Smart action failed for element: "${elementName}" (action=${actionName}).\n` +
      `Attempted locators:\n${attempted}${suggestion}`,
  );
}

/**
 * Production-grade smart click.
 *
 * Usage:
 *   await smartClick(page, 'Submit Button');
 */
export async function smartClick(page: Page, elementName: string, options?: SmartActionOptions): Promise<void> {
  await resolveAndAct(page, elementName, 'click', undefined, undefined, options);
}

/**
 * Production-grade smart fill.
 *
 * Usage:
 *   await smartFill(page, 'Username', 'user@example.com');
 */
export async function smartFill(page: Page, elementName: string, value: string, options?: SmartActionOptions): Promise<void> {
  await resolveAndAct(page, elementName, 'fill', value, undefined, options);
}

/**
 * Production-grade smart select.
 *
 * Supports:
 * - Native HTML <select> (selectOption)
 * - Enterprise combobox/listbox patterns (opens dropdown then selects by option text)
 *
 * Usage:
 *   await smartSelect(page, 'Country', 'GB');
 */
export async function smartSelect(page: Page, elementName: string, value: string, options?: SmartActionOptions): Promise<void> {
  await resolveAndAct(page, elementName, 'select', value, undefined, options);
}
