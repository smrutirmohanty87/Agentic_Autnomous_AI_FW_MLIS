import { expect, Page } from '@playwright/test';
import { PremiumEntry } from '../data/testdata';

/**
 * "Edit Premiums" OmniScript (full-page console subtab opened by the quote
 * header "Enter Premiums" button — QuotePage.clickEnterPremiums waits for its
 * heading before this class is used).
 *
 * Verified structure: sections headed "Coverage", "Coverage 2", "Coverage 3"…
 * Each section carries readOnly inputs labelled "Coverage" and "Insurable
 * Name" plus editable "Technical Premium", "Gross Written Premium",
 * "100% Annualized Gross Premium" and "Agreed Intermediary Commission Rate"
 * (all defaulting to "0"). Labels repeat once per section in DOM order, so
 * `.nth(i)` scoping per label is reliable.
 */
export class PremiumPage {
  constructor(private page: Page) {}

  /**
   * Construction "Enter Premiums" starts with a picklist "Is any part of policy
   * Minimum & Deposit?" — answer it before filling the coverage blocks.
   */
  async answerMinimumDeposit(value: string): Promise<void> {
    const combo = this.page
      .getByLabel(/Minimum\s*&?\s*Deposit/i)
      .filter({ visible: true })
      .first();
    await expect(combo).toBeVisible({ timeout: 60_000 });
    await combo.click();
    const option = this.page
      .getByRole('option', { name: value, exact: true })
      .or(
        this.page
          .locator('[role="listbox"] [role="option"], lightning-base-combobox-item')
          .filter({ hasText: value })
      )
      .filter({ visible: true })
      .first();
    await expect(option).toBeVisible({ timeout: 20_000 });
    await option.click();
  }

  /**
   * Fill every premium section from `premiums` (matched by exact coverage
   * name and insurable-name prefix; '' insurable = product-level coverage),
   * then Submit. Submitting triggers a FULL PAGE RELOAD (Salesforce splash):
   * waits for the load state and for the quote page landmark ("Enter
   * Premiums" button or "Coverages" tab) to reappear (up to 120s).
   *
   * @param premiums premium map — panel order varies between runs, so entries
   *                 are looked up per section, never applied by index.
   * @throws if a section's coverage/insurable pair has no matching entry.
   */
  async fillAndSubmit(premiums: PremiumEntry[]): Promise<void> {
    // Filter to visible controls — OmniScript keeps hidden template copies that
    // would otherwise double the section count and skew nth() indexing.
    const coverageInputs = this.page
      .getByLabel('Coverage', { exact: true })
      .filter({ visible: true });
    const insurableInputs = this.page
      .getByLabel('Insurable Name', { exact: true })
      .filter({ visible: true });
    await expect(coverageInputs.first()).toBeVisible({ timeout: 60_000 });

    const sections = await coverageInputs.count();
    if (sections === 0) {
      throw new Error('Enter Premiums: no "Coverage" sections found on the form');
    }

    for (let i = 0; i < sections; i++) {
      const coverage = (await coverageInputs.nth(i).inputValue()).trim();
      const insurable = (await insurableInputs.nth(i).inputValue()).trim();
      const entry = premiums.find(
        (p) =>
          p.coverage === coverage &&
          (p.insurable === '' ? insurable === '' : insurable.startsWith(p.insurable))
      );
      if (!entry) {
        throw new Error(
          `Enter Premiums: no PremiumEntry matches section ${i + 1} ` +
            `(coverage="${coverage}", insurable="${insurable}")`
        );
      }
      await this.fillNth('Technical Premium', i, entry.technical);
      await this.fillNth('Gross Written Premium', i, entry.grossWritten);
      await this.fillNth('100% Annualized Gross Premium', i, entry.annualized);
      await this.fillNth('Agreed Intermediary Commission Rate', i, entry.commissionRate);
    }

    await this.page.getByRole('button', { name: 'Submit', exact: true }).last().click();

    // Full page reload back to the quote record page.
    await this.page.waitForLoadState('domcontentloaded', { timeout: 120_000 });
    const landmark = this.page
      .getByRole('button', { name: 'Enter Premiums' })
      .or(this.page.getByRole('tab', { name: 'Coverages' }));
    await expect(landmark.first()).toBeVisible({ timeout: 120_000 });
  }

  /**
   * Renewal "Enter Premiums": fill the SAME four premium values into every
   * coverage section (the renewal doc uses uniform values across coverages),
   * then Submit. Same full-page-reload landing as {@link fillAndSubmit}.
   */
  async fillUniformAndSubmit(vals: {
    technical: string;
    grossWritten: string;
    annualized: string;
    commissionRate: string;
  }): Promise<void> {
    const coverageInputs = this.page
      .getByLabel('Coverage', { exact: true })
      .filter({ visible: true });
    await expect(coverageInputs.first()).toBeVisible({ timeout: 60_000 });
    const sections = await coverageInputs.count();
    if (sections === 0) {
      throw new Error('Enter Premiums: no "Coverage" sections found on the form');
    }
    for (let i = 0; i < sections; i++) {
      await this.fillNth('Technical Premium', i, vals.technical);
      await this.fillNth('Gross Written Premium', i, vals.grossWritten);
      await this.fillNth('100% Annualized Gross Premium', i, vals.annualized);
      await this.fillNth('Agreed Intermediary Commission Rate', i, vals.commissionRate);
    }
    await this.submitAndWaitForReload();
  }

  /**
   * MTA "Enter Premiums": the only editable control per coverage is
   * "100% MTA Charge Premium" (Technical/Gross Written etc. are carried over
   * read-only). Fill every such input with `chargePremium`, then Submit.
   */
  async fillMtaChargeAndSubmit(chargePremium: string): Promise<void> {
    const escaped = '100% MTA Charge Premium'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const charges = this.page
      .getByLabel(new RegExp(`^\\*?\\s*${escaped}\\s*$`))
      .filter({ visible: true });
    await expect(charges.first()).toBeVisible({ timeout: 60_000 });
    const count = await charges.count();
    if (count === 0) {
      throw new Error('MTA Enter Premiums: no "100% MTA Charge Premium" inputs found');
    }
    for (let i = 0; i < count; i++) {
      const input = charges.nth(i);
      await input.scrollIntoViewIfNeeded();
      await input.click({ clickCount: 3 });
      await input.fill(chargePremium);
    }
    await this.submitAndWaitForReload();
  }

  /** Submit the OmniScript and wait for the full-page reload back to the quote. */
  private async submitAndWaitForReload(): Promise<void> {
    await this.page.getByRole('button', { name: 'Submit', exact: true }).last().click();
    await this.page.waitForLoadState('domcontentloaded', { timeout: 120_000 });
    const landmark = this.page
      .getByRole('button', { name: 'Enter Premiums' })
      .or(this.page.getByRole('tab', { name: 'Coverages' }));
    await expect(landmark.first()).toBeVisible({ timeout: 120_000 });
  }

  /** Fill the i-th input for `label` (select-all via triple click first). */
  private async fillNth(label: string, index: number, value: string): Promise<void> {
    // Required fields carry a leading "*" in their accessible name; match either
    // form, anchored so e.g. "Gross Written Premium" ≠ "Annualized Gross Premium".
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const input = this.page
      .getByLabel(new RegExp(`^\\*?\\s*${escaped}\\s*$`))
      .filter({ visible: true })
      .nth(index);
    await input.scrollIntoViewIfNeeded();
    await input.click({ clickCount: 3 });
    await input.fill(value);
  }
}
