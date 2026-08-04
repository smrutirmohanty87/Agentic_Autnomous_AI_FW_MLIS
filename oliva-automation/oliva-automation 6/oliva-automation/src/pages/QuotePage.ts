import { expect, Locator, Page } from '@playwright/test';
import { RiskLocationData } from '../data/testdata';
import { openRecordTab, waitForSpinners } from '../utils/sf';

/**
 * Quote record page (standard Lightning record home — no iframes; plain page
 * locators pierce the LWC shadow DOM).
 *
 * Covers: record tab navigation, the Coverages tab (Risk Locations insurable
 * cards + Product Questions card), the "Add Risk Locations" modal, the
 * "Enter Premiums" header button and the "DUAL Share GWP" header read-back.
 */
export class QuotePage {
  constructor(private page: Page) {}

  /**
   * Innermost card-like container holding `text`. Card order on the
   * Coverages tab is NOT stable, so cards are always located by contained
   * text (insurable name / "Product Questions"), never by index.
   */
  private card(text: string): Locator {
    // VISIBLE filter is essential: closed OmniScript modals leave hidden
    // remnants (e.g. step-chart <li class="slds-progress__item"> items) whose
    // text matches product/insurable names, and `.last()` would grab those.
    return this.page
      .locator('article, li, .slds-card, .slds-box')
      .filter({ hasText: text })
      .filter({ visible: true })
      .last();
  }

  /** The green "+ Add" control on a coverage row (button, link or titled icon). */
  private addControl(scope: Locator | Page): Locator {
    return scope
      .getByRole('button', { name: 'Add', exact: true })
      .or(scope.getByRole('link', { name: 'Add', exact: true }))
      .or(scope.locator('[title="Add"]'));
  }

  /** Click the card's "Show Coverages" toggle link if it is still collapsed. */
  private async expandCoverages(card: Locator): Promise<void> {
    await expect(card).toBeVisible({ timeout: 30_000 });
    // Already expanded (Add controls visible)? Nothing to do — clicking the
    // toggle again would COLLAPSE it.
    if (await this.addControl(card).first().isVisible().catch(() => false)) {
      console.log('[QuotePage] expandCoverages: already expanded (card Add visible)');
      return;
    }
    let show = card.getByText('Show Coverages', { exact: true }).first();
    // Card-scope can miss (Contractors Combined: the innermost matching tile is
    // the Product Questions card, which owns no toggle). Fall back to expanding
    // EVERY visible page-wide toggle — only collapsed regions render a
    // "Show Coverages" link, so this can never collapse an expanded one.
    if (!(await show.isVisible().catch(() => false))) {
      const all = this.page
        .getByText('Show Coverages', { exact: true })
        .filter({ visible: true });
      const n = await all.count();
      console.log(`[QuotePage] card-scoped toggle missing — expanding ${n} region(s) page-wide`);
      for (let i = 0; i < n; i++) {
        // Always click the FIRST remaining toggle: each click removes one.
        await all.first().click().catch(() => {});
        await waitForSpinners(this.page);
      }
      return;
    }
    if (await show.isVisible().catch(() => false)) {
      console.log('[QuotePage] expandCoverages: clicking card-scoped Show Coverages');
      // A transient empty Vlocity loading <div> can sit OVER the toggle and
      // intercept pointer events for a long time (observed 45s+). Try normal
      // clicks first; force-click as a last resort (dispatches to the toggle
      // itself, bypassing the overlay hit-target check).
      try {
        await show.click({ timeout: 15_000 });
      } catch {
        await waitForSpinners(this.page);
        await this.page.waitForTimeout(2000);
        try {
          await show.click({ timeout: 10_000 });
        } catch {
          console.log('[QuotePage] "Show Coverages" overlay-blocked — force-clicking');
          await show.click({ force: true });
        }
      }
      await waitForSpinners(this.page);
    }
  }

  /**
   * Within `card`, click "Add" on the row containing `coverageName`, then
   * wait for the coverage modal (heading with the coverage title) to open.
   */
  private async addCoverageRow(card: Locator, coverageName: string): Promise<void> {
    await expect(card).toBeVisible({ timeout: 30_000 });
    const row = card
      .locator('tr, li, div')
      .filter({ hasText: coverageName })
      .filter({ has: this.addControl(this.page) })
      .last();
    // A just-closed coverage modal can leave a stale INVISIBLE
    // `.slds-modal__container` in the DOM that still intercepts pointer events
    // (observed live). Normal click first; force-click through the dead overlay
    // as fallback (the Add button itself is visible and enabled).
    const add = this.addControl(row).first();
    try {
      await add.click({ timeout: 15_000 });
    } catch {
      await waitForSpinners(this.page);
      console.log(`[QuotePage] Add "${coverageName}" overlay-blocked — force-clicking`);
      await add.click({ force: true });
    }
    // The coverage form opens in a role="dialog" (title varies: "Asset
    // Protection" vs "Coverage Questions"), so wait on the dialog + its
    // Territorial Limits field / Save|Next button rather than a per-coverage title.
    const dialog = this.page.getByRole('dialog').filter({ hasText: 'Territorial Limits' }).first();
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await waitForSpinners(this.page);
  }

  /**
   * Open a record-home tab (Coverages, Details, Clauses, Select Binders...)
   * by role=tab, falling back to the "More" overflow menu.
   */
  async openTab(tabName: string): Promise<void> {
    await openRecordTab(this.page, tabName);
  }

  /**
   * On the Coverages tab, expand the Risk Locations card whose title contains
   * `insurableName` by clicking its "Show Coverages" link (no-op if already
   * expanded — the link toggles).
   */
  async showInsurableCoverages(insurableName: string): Promise<void> {
    await this.expandCoverages(this.card(insurableName));
  }

  /**
   * Within the insurable card containing `insurableName`, click "Add" on the
   * coverage row containing `coverageName` (e.g. "Asset Protection - Property
   * Damage (Optional)") and wait for the coverage modal heading.
   */
  async addInsurableCoverage(insurableName: string, coverageName: string): Promise<void> {
    await this.addCoverageRow(this.card(insurableName), coverageName);
  }

  /** Expand the Product Questions card via its "Show Coverages" link. */
  async showProductCoverages(): Promise<void> {
    await this.expandCoverages(this.card('Product Questions'));
  }

  /**
   * Within the Product Questions card, click "Add" on the row containing
   * `coverageName` (e.g. "Group Personal Accident (Optional)") and wait for
   * the coverage modal heading.
   */
  async addProductCoverage(coverageName: string): Promise<void> {
    await this.addCoverageRow(this.card('Product Questions'), coverageName);
  }

  /**
   * Add a risk location via the "Add Risk Locations" link:
   * fills Insurable Name, drives the Google Places "Risk Address Search"
   * autocomplete (type, settle ~3s, click suggestion — auto-fills Address
   * Line/Postcode/Country/lat/long), overrides City and County/State,
   * Next -> "Care Specific Questions" (all optional) -> Save, then waits for
   * the modal to close and the new "<name> - <Country>" card to appear.
   */
  async addRiskLocation(d: RiskLocationData): Promise<void> {
    // "Add Risk Locations" renders as a clickable generic (div), not a
    // link/button — target it by text.
    const addLink = this.page
      .getByRole('link', { name: 'Add Risk Locations' })
      .or(this.page.getByRole('button', { name: 'Add Risk Locations' }))
      .or(this.page.getByText('Add Risk Locations', { exact: true }))
      .first();
    await expect(addLink).toBeVisible({ timeout: 30_000 });
    await addLink.click();
    const modalHeading = this.page
      .getByRole('heading', { name: 'Risk Location/Insurable' })
      .first();
    await expect(modalHeading).toBeVisible({ timeout: 30_000 });

    // Match the visible modal input (avoid the hidden OmniScript template copy).
    await this.page
      .getByLabel('Insurable Name')
      .filter({ visible: true })
      .first()
      .fill(d.insurableName);

    // Fill the address fields directly. The "Risk Address Search" is a Google
    // Places autocomplete whose predictions are unreliable to select under
    // automation (Google fetches on real keystrokes and renders in a portal),
    // so we populate the underlying fields with values captured from the app.
    const fillField = async (nameRx: RegExp, value: string): Promise<void> => {
      const input = this.page.getByLabel(nameRx).filter({ visible: true }).first();
      await expect(input).toBeVisible({ timeout: 15_000 });
      await input.click({ clickCount: 3 });
      await input.fill(value);
    };
    await fillField(/^\*?\s*Address Line\s*$/, d.addressLine);
    await fillField(/^\*?\s*City\s*$/, d.city);
    await fillField(/^\*?\s*County\/State\s*$/, d.countyState);
    await fillField(/^\*?\s*Postcode\s*$/, d.postcode);
    await fillField(/^\*?\s*Country\s*$/, d.country);
    await fillField(/^\*?\s*Latitude\s*$/, d.latitude).catch(() => {});
    await fillField(/^\*?\s*Longitude\s*$/, d.longitude).catch(() => {});

    await this.page.getByRole('button', { name: 'Next', exact: true }).last().click();
    // Step 2 "Care Specific Questions" (all optional): wait for its heading,
    // then Save replaces Next.
    await expect(
      this.page.getByRole('heading', { name: 'Care Specific Questions' }).first()
    ).toBeVisible({ timeout: 30_000 });
    const save = this.page.getByRole('button', { name: 'Save', exact: true }).last();
    await expect(save).toBeVisible({ timeout: 15_000 });
    await save.click();

    await expect(modalHeading).toBeHidden({ timeout: 20_000 });
    await expect(this.page.getByText(`${d.insurableName} - `).first()).toBeVisible({
      timeout: 15_000,
    });
    await waitForSpinners(this.page);
  }

  /**
   * Click the "Enter Premiums" header button and wait for the Edit Premiums
   * OmniScript subtab (heading "Enter Premiums") to render (up to 90s).
   */
  async clickEnterPremiums(): Promise<void> {
    await this.page.getByRole('button', { name: 'Enter Premiums' }).first().click();
    await expect(
      this.page.getByRole('heading', { name: 'Enter Premiums' }).first()
    ).toBeVisible({ timeout: 90_000 });
    await waitForSpinners(this.page);
  }

  /**
   * Construction Renovation: on the Coverages tab, open the product-level
   * "Renovation" questionnaire via the Product Questions card's "Edit" control.
   * Waits for the OmniScript's first step ("Oliva Standard Questions"). The
   * caller then drives it with OmniScriptFormPage.fill(RENO_PRODUCT_FORM).
   */
  async editRenovationProductQuestions(productText = 'Renovation'): Promise<void> {
    const card = this.page
      .locator('article, li, .slds-card, .slds-box')
      .filter({ hasText: productText })
      .filter({ has: this.page.getByText('Edit', { exact: true }) })
      .last();
    const edit = card
      .getByRole('button', { name: 'Edit' })
      .or(card.getByText('Edit', { exact: true }))
      .filter({ visible: true })
      .first();
    await expect(edit).toBeVisible({ timeout: 30_000 });
    await edit.click();
    await expect(
      this.page
        .getByText('Oliva Standard Questions', { exact: false })
        .filter({ visible: true })
        .first()
    ).toBeVisible({ timeout: 90_000 });
    await waitForSpinners(this.page);
  }

  /**
   * Construction Renovation: expand the insurable card and click "Add" on the
   * coverage row `coverageName`, opening its "Coverage Questions" OmniScript.
   * Waits for the form's read-only "Territorial Limits" (present on every Reno
   * coverage form) so the caller can drive it with OmniScriptFormPage.fill().
   */
  async addRenoCoverage(insurableName: string, coverageName: string): Promise<void> {
    await this.showInsurableCoverages(insurableName);
    const card = this.card(insurableName);
    const cardRow = card
      .locator('tr, li, div')
      .filter({ hasText: coverageName })
      .filter({ has: this.addControl(this.page) })
      .last();
    // Card-scoped row first. If the card scope misses (Contractors Combined:
    // the innermost tile matching the card text holds NO coverage rows, and a
    // DOM page-wide row match clicked the WRONG Add — the Risk Locations one),
    // fall back to VISUAL ROW ALIGNMENT: click the Add control that sits on
    // the same on-screen row as the coverage's own text (shadow-piercing JS —
    // the same technique as the Terrorism sum-insured table).
    if (await this.addControl(cardRow).first().isVisible({ timeout: 8000 }).catch(() => false)) {
      // A just-closed coverage modal can leave a stale INVISIBLE
      // `.slds-modal__container` in the DOM that still intercepts pointer
      // events (observed live). Normal click first; force-click as fallback.
      const add = this.addControl(cardRow).first();
      try {
        await add.click({ timeout: 15_000 });
      } catch {
        await waitForSpinners(this.page);
        console.log(`[QuotePage] Add "${coverageName}" overlay-blocked — force-clicking`);
        await add.click({ force: true });
      }
    } else {
      // Deterministic Contractors-Combined path (live-diagnosed DOM facts):
      // the "Show Coverages" toggle is a real BUTTON whose LABEL never changes
      // — only aria-expanded tells the truth; the coverage rows exist in the
      // DOM even when collapsed (0×0), so wait on row-text VISIBILITY; each
      // row is an innermost div.slds-grid.slds-wrap wrapping label + its own
      // aria-label="Add" button.
      console.log(`[QuotePage] "${coverageName}" not in card scope — toggle-state path`);
      const rowText = coverageName;
      const covText = this.page
        .getByText(rowText, { exact: false })
        .filter({ visible: true })
        .first();
      const toggle = this.page
        .getByRole('button', { name: 'Show Coverages' })
        .first();
      for (let attempt = 0; attempt < 3; attempt++) {
        if (await covText.isVisible().catch(() => false)) break;
        if ((await toggle.getAttribute('aria-expanded').catch(() => null)) !== 'true') {
          await toggle.click().catch(() => {});
        }
        await covText.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
        await waitForSpinners(this.page);
      }
      await expect(covText).toBeVisible({ timeout: 15_000 });
      const row = this.page
        .locator('div.slds-grid.slds-wrap')
        .filter({ hasText: rowText })
        .filter({ visible: true })
        .last();
      await row.getByRole('button', { name: 'Add', exact: true }).first().click();
      await waitForSpinners(this.page);
    }
    await expect(
      this.page
        .getByText('Territorial Limits', { exact: false })
        .filter({ visible: true })
        .first()
    ).toBeVisible({ timeout: 90_000 });
    await waitForSpinners(this.page);
  }

  /**
   * Read the "DUAL Share GWP" value from the quote record highlights header.
   * @returns the displayed value text (e.g. "£28,135.61").
   */
  async dualShareGwp(): Promise<string> {
    const item = this.page
      .locator(
        'records-highlights-details-item, force-highlights-details-item, ' +
          '.slds-page-header__detail-block, .slds-page-header__detail-row li'
      )
      .filter({ hasText: 'DUAL Share GWP' })
      .last();
    await expect(item).toBeVisible({ timeout: 30_000 });
    const lines = (await item.innerText())
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((l) => !/dual share gwp/i.test(l));
    const value = lines.pop() ?? '';
    if (!value) {
      throw new Error('DUAL Share GWP header item found but no value text present');
    }
    return value;
  }
}
