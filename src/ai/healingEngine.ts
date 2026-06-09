import type { Page } from '@playwright/test';
import { defaultLogger } from './logger';
import type { HealedCandidate, HealingEngine, HealingOptions } from './types';

function escapeRegexLiteral(input: string): string {
  // Escapes characters with special meaning in Playwright's regex-like selector fragments.
  // We also escape '/' because we embed patterns like /.../i in selector strings.
  return input.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

function escapeQuotedValue(input: string): string {
  // For selectors like text="..." or [attr="..."]
  return input.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function toTokens(elementName: string): string[] {
  return elementName
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((t) => t.trim())
    .filter(Boolean);
}

function kebabCase(tokens: string[]): string {
  return tokens
    .join(' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .join('-');
}

function guessRoleEngineSelectors(elementName: string, tokens: string[]): string[] {
  // Try common role-based engines first; these are resilient on enterprise UIs.
  const compactName = elementName.replace(/\s*(button|btn|link|tab|checkbox|radio|dropdown|select|field|input)$/i, '').trim();
  const nameRegex = tokens.length ? `/${escapeRegexLiteral(compactName || elementName)}/i` : `/${escapeRegexLiteral(elementName)}/i`;

  return [
    `role=button[name=${nameRegex}]`,
    `role=link[name=${nameRegex}]`,
    `role=tab[name=${nameRegex}]`,
    `role=checkbox[name=${nameRegex}]`,
    `role=radio[name=${nameRegex}]`,
    `role=combobox[name=${nameRegex}]`,
    `role=textbox[name=${nameRegex}]`,
  ];
}

function heuristicSelectors(elementName: string): string[] {
  const tokens = toTokens(elementName);
  const k = kebabCase(tokens);
  const joined = tokens.join(' ');

  const exactText = elementName.replace(/\s+/g, ' ').trim();
  const exactTextEscaped = escapeQuotedValue(exactText);
  const joinedEscaped = escapeQuotedValue(joined);
  const partialTextRegex = tokens.length ? `/${tokens.map(escapeRegexLiteral).join('.*')}/i` : `/${escapeRegexLiteral(elementName)}/i`;

  const candidates = [
    // Text engine (good for buttons/links)
    `text="${exactTextEscaped}"`,
    `text=${partialTextRegex}`,

    // Stable test ids
    k ? `[data-testid="${k}"]` : '',
    k ? `[data-test="${k}"]` : '',

    // Common attributes
    joined ? `[aria-label*="${joinedEscaped}" i]` : '',
    joined ? `[placeholder*="${joinedEscaped}" i]` : '',
    joined ? `[name*="${joinedEscaped}" i]` : '',

    // Also try role-engine selectors
    ...guessRoleEngineSelectors(elementName, tokens),
  ].filter(Boolean);

  // Deduplicate while preserving order.
  return Array.from(new Set(candidates));
}

async function validateCandidate(page: Page, selector: string, timeoutMs: number): Promise<{ ok: boolean; scoreDelta: number; reason?: string }> {
  try {
    const loc = page.locator(selector).first();
    // We treat visibility as the key validation signal for actionability.
    const visible = await loc.isVisible({ timeout: timeoutMs }).catch(() => false);
    if (!visible) {
      const count = await page.locator(selector).count().catch(() => 0);
      return { ok: false, scoreDelta: count > 0 ? 1 : 0, reason: count > 0 ? 'matched but not visible' : 'no matches' };
    }

    const count = await page.locator(selector).count().catch(() => 0);
    // Prefer unique matches.
    const uniqueBonus = count === 1 ? 10 : count > 1 ? 2 : 0;
    return { ok: true, scoreDelta: 20 + uniqueBonus, reason: count === 1 ? 'visible unique match' : 'visible non-unique match' };
  } catch (error) {
    return { ok: false, scoreDelta: 0, reason: String((error as Error)?.message ?? error) };
  }
}

async function domSearchCandidate(page: Page, elementName: string): Promise<HealedCandidate | null> {
  // Intelligent DOM scan: pick a best element based on text/aria/placeholder and return a stable selector.
  const result = await page
    .evaluate((name: string) => {
      const tokens = name
        .replace(/[_\-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .split(' ')
        .filter(Boolean);

      const wantButton = /(button|submit|save|continue|proceed|next|login)/i.test(name);
      const wantField = /(field|input|email|password|username|search)/i.test(name);
      const wantSelect = /(select|dropdown|combobox)/i.test(name);

      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          'button, a, input, textarea, select, [role="button"], [role="link"], [role="textbox"], [role="combobox"], [contenteditable="true"]',
        ),
      );

      const getText = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      const getAttr = (el: HTMLElement, attr: string) => (el.getAttribute(attr) ?? '').trim();

      const findAssociatedLabelText = (el: HTMLElement) => {
        const id = getAttr(el, 'id');
        if (id) {
          const label = document.querySelector(`label[for="${id.replace(/"/g, '\\"')}"]`) as HTMLElement | null;
          if (label) {
            return getText(label);
          }
        }
        const wrapper = el.closest('label') as HTMLElement | null;
        return wrapper ? getText(wrapper) : '';
      };

      const scoreElement = (el: HTMLElement) => {
        const text = getText(el).toLowerCase();
        const aria = getAttr(el, 'aria-label').toLowerCase();
        const placeholder = getAttr(el, 'placeholder').toLowerCase();
        const nameAttr = getAttr(el, 'name').toLowerCase();
        const id = getAttr(el, 'id');
        const testId = getAttr(el, 'data-testid') || getAttr(el, 'data-test');
        const labelText = findAssociatedLabelText(el);
        const label = labelText.toLowerCase();

        let score = 0;
        const haystacks = [text, aria, placeholder, nameAttr, label].filter(Boolean);
        if (haystacks.some((h) => h === name.toLowerCase())) score += 40;
        for (const t of tokens) {
          if (!t) continue;
          if (haystacks.some((h) => h.includes(t))) score += 6;
        }

        // Prefer visible-ish elements.
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) score += 10;

        // Prefer stable identifiers.
        if (testId) score += 20;
        if (id) score += 15;
        if (nameAttr) score += 5;
        if (label) score += 8;

        // Prefer element type matching the intended control.
        const tag = el.tagName.toLowerCase();
        const role = getAttr(el, 'role').toLowerCase();
        if (wantButton && (tag === 'button' || role === 'button' || (tag === 'input' && ['submit', 'button'].includes((el as HTMLInputElement).type)))) score += 10;
        if (wantField && (tag === 'input' || tag === 'textarea' || role === 'textbox' || el.getAttribute('contenteditable') === 'true')) score += 10;
        if (wantSelect && (tag === 'select' || role === 'combobox')) score += 10;

        return { el, score, text, aria, placeholder, nameAttr, id, testId, labelText, tag, role };
      };

      const scored = candidates
        .map(scoreElement)
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score);

      const top = scored[0];
      if (!top) return null;

      const cssEscape = (window as any).CSS?.escape
        ? (window as any).CSS.escape
        : (value: string) => value.replace(/[^a-zA-Z0-9_\-]/g, (m: string) => `\\${m}`);

      let selector = '';
      let reason = '';
      if (top.testId) {
        selector = `[data-testid="${top.testId.replace(/"/g, '\\"')}"]`;
        reason = 'DOM-scan chose data-testid';
      } else if (top.id) {
        selector = `#${cssEscape(top.id)}`;
        reason = 'DOM-scan chose id';
      } else if ((wantField || wantSelect) && top.labelText) {
        // Label-based selectors are common and stable in enterprise forms.
        const labelValue = top.labelText.replace(/\s+/g, ' ').trim();
        selector = `label:has-text(\"${labelValue.replace(/"/g, '\\"')}\") ${top.tag}`;
        reason = 'DOM-scan chose label-based selector';
      } else if (top.nameAttr) {
        selector = `${top.tag}[name="${top.nameAttr.replace(/"/g, '\\"')}"]`;
        reason = 'DOM-scan chose name attribute';
      } else if (top.aria) {
        selector = `${top.tag}[aria-label="${top.aria.replace(/"/g, '\\"')}"]`;
        reason = 'DOM-scan chose aria-label';
      } else if (top.text) {
        selector = `text="${top.text.replace(/"/g, '\\"')}"`;
        reason = 'DOM-scan chose visible text';
      } else {
        selector = top.tag;
        reason = 'DOM-scan fallback to tag';
      }

      return { selector, score: top.score, reason };
    }, elementName)
    .catch(() => null);

  if (!result || !result.selector) {
    return null;
  }

  return {
    selector: result.selector,
    score: typeof result.score === 'number' ? result.score : 0,
    reason: String(result.reason ?? 'DOM-scan'),
  };
}

export class DefaultHealingEngine implements HealingEngine {
  async findBestLocator(page: Page, elementName: string, options?: HealingOptions): Promise<HealedCandidate | null> {
    const maxCandidates = options?.maxHeuristicCandidates ?? 15;
    const validationTimeoutMs = options?.validationTimeoutMs ?? 5000;

    const heuristics = heuristicSelectors(elementName).slice(0, maxCandidates);

    let best: HealedCandidate | null = null;

    defaultLogger.info('Healing engine: searching DOM intelligently...', { elementName });

    for (const selector of heuristics) {
      const validation = await validateCandidate(page, selector, validationTimeoutMs);
      defaultLogger.debug('Healing candidate validated.', { selector, ok: validation.ok, reason: validation.reason });

      if (!validation.ok) {
        continue;
      }

      const candidate: HealedCandidate = {
        selector,
        score: 50 + validation.scoreDelta,
        reason: `Heuristic match: ${validation.reason ?? 'validated'}`,
      };

      if (!best || candidate.score > best.score) {
        best = candidate;
      }
    }

    if (best) {
      defaultLogger.success('Healing engine found a working locator via heuristics.', { elementName, selector: best.selector });
      return best;
    }

    const domCandidate = await domSearchCandidate(page, elementName);
    if (!domCandidate) {
      defaultLogger.warn('Healing engine did not find a DOM candidate.', { elementName });
      return null;
    }

    // Validate DOM candidate.
    const validation = await validateCandidate(page, domCandidate.selector, validationTimeoutMs);
    if (!validation.ok) {
      defaultLogger.warn('Healing engine DOM candidate did not validate.', {
        elementName,
        selector: domCandidate.selector,
        reason: validation.reason,
      });
      return null;
    }

    const healed: HealedCandidate = {
      selector: domCandidate.selector,
      score: 60 + domCandidate.score + validation.scoreDelta,
      reason: domCandidate.reason,
    };

    defaultLogger.success('Healing engine found a working locator via DOM scan.', { elementName, selector: healed.selector });
    return healed;
  }
}

export const defaultHealingEngine = new DefaultHealingEngine();
