import { expect, Locator, Page } from '@playwright/test';
import { CNR, MTA, CANCELLATION } from '../data/testdata';
import { ukDateDash, waitForSpinners } from '../utils/sf';

/**
 * InsurancePolicy record header actions and the OmniScript wizard forms they
 * open (all open shadow DOM — plain page-scoped locators pierce it; the
 * wizards render in full-page console subtabs).
 *
 * Header layout (verified in the doc screenshots):
 *   Follow | Post-Bind Questions | Generate Document | Create MTA | ▾
 * The ▾ overflow contains: Cancel Policy, Create Claim, Renewal Quote,
 * Submit for Approval, New Note, Change Owner, Cancel and Reissue.
 */
export class PolicyActionsPage {
  constructor(private page: Page) {}

  // ----------------------------------------------------------------- actions

  /**
   * CNR — header ▾ → "Cancel and Reissue" → "Cancel and Reissue Details"
   * (set Reason for C&R + Description; dates and Reason are prefilled) →
   * Submit. Lands on the new CRN quote record.
   */
  async startCancelAndReissue(): Promise<void> {
    await this.openHeaderMenu();
    await this.clickMenuItem('Cancel and Reissue');
    await this.expectWizard('Cancel and Reissue Details');

    await this.pickOption('Reason for C&R', CNR.reasonForCandR);
    await this.fillText('Description', CNR.description);
    await this.submitWizard();
    await this.expectQuoteRecord();
  }

  /**
   * MTA — header "Create MTA" button → "Enter MTA Information"
   * (set Reason + Description; dates/time prefilled) → Submit. Lands on the
   * MTA quote record.
   */
  async createMta(): Promise<void> {
    const createMtaBtn = this.page
      .getByRole('button', { name: 'Create MTA', exact: true })
      .filter({ visible: true })
      .first();
    await expect(createMtaBtn).toBeVisible({ timeout: 60_000 });
    await createMtaBtn.click();
    await this.expectWizard('Enter MTA Information');

    // Verified LIVE: MTA Effective Date + Submission Date are EMPTY and
    // required (the doc's prefilled screenshots are stale). They must be filled
    // in DD-MM-YYYY and committed with Tab (Escape reverts them).
    await this.fillOmniDate('MTA Effective Date', ukDateDash(MTA.effectiveOffsetDays));
    await this.fillOmniDate('MTA Submission Date', ukDateDash(MTA.submissionOffsetDays));
    await this.pickOption('MTA Reason', MTA.reason);
    await this.fillText('MTA Description', MTA.description);
    await this.submitWizard();
    await this.expectQuoteRecord();
  }

  /**
   * Renewal — header ▾ → "Renewal Quote" → "Warning" (Yes) →
   * "Risk Details" (dates prefilled) → Submit. Lands on the renewal quote.
   */
  async startRenewal(): Promise<void> {
    await this.openHeaderMenu();
    await this.clickMenuItem('Renewal Quote');

    await this.expectWizard('Warning');
    await this.page
      .getByRole('button', { name: 'Yes', exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await waitForSpinners(this.page);

    await this.expectWizard('Risk Details');
    await this.submitWizard();
    await this.expectQuoteRecord();
  }

  /**
   * Cancellation — header ▾ → "Cancel Policy" → fill form → Next →
   * "Enter Premiums" (Return FULL Premium = Yes) → Submit. The policy record
   * then shows the "Cancelled" path stage (asserted by the caller via
   * PolicyPage.assertState).
   */
  async cancelPolicy(): Promise<void> {
    await this.openHeaderMenu();
    await this.clickMenuItem('Cancel Policy');
    await this.expectWizard('Cancel Policy');

    await this.pickOption('Cancellation Category', CANCELLATION.category);
    await this.pickOption('Cancellation Instigated By', CANCELLATION.instigatedBy);
    await this.pickOption('Cancellation Reason', CANCELLATION.reason);
    await this.fillText('Cancellation Notes/Narrative', CANCELLATION.notes);

    await this.page
      .getByRole('button', { name: 'Next', exact: true })
      .filter({ visible: true })
      .last()
      .click();
    await waitForSpinners(this.page);

    // Step 2 — "Enter Premiums": the only editable control is the
    // "Return FULL Premium" picklist; coverage rows are read-only.
    await this.expectWizard('Enter Premiums');
    await this.pickOption('Return FULL Premium', CANCELLATION.returnFullPremium);
    await this.submitWizard();

    // Back on the InsurancePolicy record (path advances to "Cancelled").
    await this.page.waitForURL(/\/InsurancePolicy\//, { timeout: 120_000 });
    await waitForSpinners(this.page);
  }

  // ----------------------------------------------------------------- helpers

  /**
   * Open the policy header actions overflow ▾. The record header sits at the
   * top of the page; earlier steps may leave it scrolled, so scroll up first.
   */
  private async openHeaderMenu(): Promise<void> {
    await this.page.mouse.wheel(0, -3000);
    await this.page.waitForTimeout(300);
    const overflow = this.page
      .getByRole('button', { name: /^Show more actions$|more actions/i })
      .filter({ visible: true })
      .first();
    await expect(overflow).toBeVisible({ timeout: 30_000 });
    await overflow.click();
    await expect(this.page.getByRole('menuitem').first()).toBeVisible({ timeout: 10_000 });
  }

  /** Click an overflow menu item by exact name. */
  private async clickMenuItem(name: string): Promise<void> {
    await this.page
      .getByRole('menuitem', { name, exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await waitForSpinners(this.page);
  }

  /** Wait for an OmniScript wizard step heading (subtab) to render. */
  private async expectWizard(title: string): Promise<void> {
    const heading = this.page
      .getByRole('heading', { name: title })
      .or(this.page.getByText(title, { exact: true }))
      .filter({ visible: true })
      .first();
    await expect(heading).toBeVisible({ timeout: 120_000 });
    await waitForSpinners(this.page);
  }

  /** Submit the current wizard step (subtab Submit button). */
  private async submitWizard(): Promise<void> {
    await this.page
      .getByRole('button', { name: 'Submit', exact: true })
      .filter({ visible: true })
      .last()
      .click();
    await waitForSpinners(this.page);
  }

  /** Wait for a Quote record page (opened after CNR/MTA/Renewal submit). */
  private async expectQuoteRecord(): Promise<void> {
    await this.page.waitForURL(/\/Quote\//, { timeout: 150_000 }).catch(() => {});
    await expect(
      this.page.getByRole('tab', { name: 'Selected Binders', exact: true }).first()
    ).toBeVisible({ timeout: 150_000 });
    await waitForSpinners(this.page);
  }

  /**
   * Pick an option in an OmniScript picklist/combobox: click the labelled
   * control, then click the option by exact text (role=option or plain row).
   */
  private async pickOption(label: string, option: string): Promise<void> {
    const input = this.page
      .getByLabel(label, { exact: false })
      .filter({ visible: true })
      .first();
    await input.click();
    const opt: Locator = this.page
      .getByRole('option', { name: option, exact: true })
      .or(this.page.getByText(option, { exact: true }))
      .filter({ visible: true })
      .first();
    await expect(opt).toBeVisible({ timeout: 30_000 });
    await opt.click();
    await waitForSpinners(this.page);
  }

  /**
   * Fill a labelled text field / textarea. Some Oliva fields carry an
   * info-tooltip <button> whose aria-label starts with the field name, so the
   * match is restricted to input/textarea and the visible (non-template) copy.
   */
  private async fillText(label: string, value: string): Promise<void> {
    const input = this.page
      .getByLabel(label, { exact: false })
      .and(this.page.locator('input, textarea'))
      .filter({ visible: true })
      .first();
    await input.click();
    await input.fill(value);
  }

  /**
   * Fill a Vlocity OmniScript date input (DD-MM-YYYY) and commit with Tab.
   * Verified live: typing the slash form is rejected, and pressing Escape
   * reverts the value — so the value is typed, then blurred with Tab, then
   * re-read to confirm it stuck (retry once).
   */
  private async fillOmniDate(label: string, value: string): Promise<void> {
    const input = this.page
      .getByLabel(label, { exact: false })
      .and(this.page.locator('input'))
      .filter({ visible: true })
      .first();
    for (let attempt = 0; attempt < 2; attempt++) {
      await input.click();
      await input.fill('');
      await input.type(value, { delay: 20 });
      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(300);
      const current = (await input.inputValue().catch(() => '')).replace(/\//g, '-');
      if (current === value) return;
    }
    // Leave it filled; a required-field validation on Submit will surface if not.
  }
}
