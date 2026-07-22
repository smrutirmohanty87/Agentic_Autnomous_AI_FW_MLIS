import { test, expect, Page, Locator } from '@playwright/test';
import { jwtLogin, sfQueryOne } from '../src/auth/sfJwt';
import { waitForSpinners, closeAllWorkspaceTabs, openRecordTab } from '../src/utils/sf';
import { AccountsPage } from '../src/pages/AccountsPage';
import { SubmissionWizardPage } from '../src/pages/SubmissionWizardPage';
import { SubmissionPage } from '../src/pages/SubmissionPage';
import { QuotePage } from '../src/pages/QuotePage';
import { OmniScriptFormPage } from '../src/pages/OmniScriptFormPage';
import { PremiumPage } from '../src/pages/PremiumPage';
import { BindersPage } from '../src/pages/BindersPage';
import { RbsApprovalPage } from '../src/pages/RbsApprovalPage';
import { ClausesFeesPage } from '../src/pages/ClausesFeesPage';
import { QuoteStatusPage } from '../src/pages/QuoteStatusPage';
import {
  CC2_ACCOUNT, CC2_CLIENT_INFO, CC2_RISK_INFO, CC2_INSURED_ADDRESS,
  CC2_PRODUCT_CARD, CC2_PRODUCT_FORM, CC2_COVERAGES, CC2_PD_COVERAGE,
  CC2_SECOND_LOCATION, CC2_PREMIUMS, CC2_MINIMUM_DEPOSIT,
  CC2_BINDERS, CC2_BINDER_DEFAULT, CC2_FEE, CC2_DNA_FEE, CC2_UAL, CC2_USERS,
} from '../src/data/cc2Data';

/**
 * THROWAWAY live exploration of the EXPANDED Contractors Combined (CC2) NB
 * scenario on newprodqa2 — validates cc2_catalog.md §2 and resolves
 * ambiguities 1–10, up to and including "Quote Issued" (doc end; NO bind,
 * NO policy).
 *
 * Run:  EXPLORE=cc2 npx playwright test tests/explore-cc2.spec.ts
 * Resume flags:
 *   CC2_QUOTE_ID=0Q0…      resume on an existing quote
 *   CC2_SUBMISSION_ID=006… resume on an existing submission
 *   CC2_CLIENT=existing    use the proven "PG Test Insured" instead of
 *                          create-new-client "Mr Jones Testing"
 *   CC2_FILL_FORM=1        fill the product questionnaire (doc skips it)
 *   CC2_COV_START=n        start coverage adds mid-list
 *   CC2_SKIP_COVERAGES / CC2_SKIP_PD / CC2_SKIP_LOC2 / CC2_SKIP_PREMIUMS /
 *   CC2_SKIP_BINDERS / CC2_SKIP_RBS / CC2_SKIP_CLAUSES / CC2_SKIP_FEE /
 *   CC2_SKIP_ERN / CC2_SKIP_ISSUE  =1  skip that stage
 */
test.skip(process.env.EXPLORE !== 'cc2', 'CC2 exploration only (set EXPLORE=cc2)');

// ------------------------------------------------------------------ helpers

/** innerText of a locator, whitespace-collapsed. */
async function rowTextOf(loc: Locator): Promise<string> {
  return ((await loc.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
}

/** Dump all visible labels inside the open dialog (or page). */
async function dumpModalState(page: Page, tag: string): Promise<void> {
  try {
    const dialog = page.getByRole('dialog').filter({ visible: true }).first();
    const scope = (await dialog.isVisible().catch(() => false)) ? dialog : page;
    const labels = await scope.locator('label').filter({ visible: true }).allInnerTexts();
    console.log(`[dump:${tag}] ${labels.length} visible labels:`);
    for (const l of labels) {
      const t = l.replace(/\s+/g, ' ').trim();
      if (t) console.log(`  label: ${t}`);
    }
  } catch (e) {
    console.log(`[dump:${tag}] failed: ${(e as Error).message}`);
  }
}

/** Dump any visible validation/error text + toasts. */
async function dumpErrors(page: Page, tag: string): Promise<string> {
  const texts = await page
    .locator('.slds-has-error, [role="alert"], .vlocity-error, .omniscript-error, .slds-notify, .toastMessage')
    .filter({ visible: true })
    .allInnerTexts()
    .catch(() => [] as string[]);
  const clean = (texts || []).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (clean.length) console.log(`[errors:${tag}] ${JSON.stringify(clean)}`);
  return clean.join(' | ');
}

/** Visible dropdown option texts right now. */
async function visibleOptions(page: Page): Promise<string[]> {
  const texts = await page
    .locator('[role="option"]:not(.slds-path__link), lightning-base-combobox-item')
    .filter({ visible: true })
    .allInnerTexts()
    .catch(() => [] as string[]);
  return texts.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** Wizard lookup/picklist pick WITH option capture (from explore-cara). */
async function pickOptionCapture(page: Page, label: string, preferred: string, fallback?: string): Promise<string> {
  const input = page.getByLabel(label, { exact: false }).first();
  await input.click();
  await page.waitForTimeout(1500);
  let opts = await visibleOptions(page);
  console.log(`[explore] "${label}" options: ${JSON.stringify(opts.slice(0, 25))}`);
  if (!opts.includes(preferred)) {
    await input.fill(preferred).catch(() => {});
    await page.waitForTimeout(2000);
    opts = await visibleOptions(page);
    console.log(`[explore] "${label}" options after typing "${preferred}": ${JSON.stringify(opts.slice(0, 25))}`);
  }
  const target = opts.includes(preferred) ? preferred : fallback;
  if (!target || !opts.includes(target)) {
    throw new Error(`[explore] "${label}": neither "${preferred}" nor fallback "${fallback}" offered — options: ${JSON.stringify(opts)}`);
  }
  if (target !== preferred) console.log(`[explore] DEVIATION: "${label}" = "${target}" (doc wanted "${preferred}")`);
  await page
    .locator('[role="option"]:not(.slds-path__link), lightning-base-combobox-item')
    .filter({ visible: true })
    .filter({ hasText: new RegExp(`^\\s*${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) })
    .first()
    .click();
  await waitForSpinners(page);
  return target;
}

/** Fill a labelled text field (restricted to input/textarea). */
async function fillWizardText(page: Page, label: string | RegExp, value: string): Promise<void> {
  const input = page.getByLabel(label).and(page.locator('input, textarea')).filter({ visible: true }).first();
  await input.click();
  await input.fill(value);
}

/**
 * Click a labelled control; if a dropdown opens, capture its options and pick
 * the first `preferred` entry present (else the first real option). If NO
 * options appear, treat it as a text field and fill `preferred[0]`.
 */
async function pickAnyOptionCapture(page: Page, label: string | RegExp, preferred: string[]): Promise<string> {
  const input = page.getByLabel(label).and(page.locator('input')).filter({ visible: true }).first();
  await input.click();
  await page.waitForTimeout(1500);
  const opts = await visibleOptions(page);
  console.log(`[explore] "${label}" options: ${JSON.stringify(opts.slice(0, 25))}`);
  if (!opts.length) {
    await input.fill(preferred[0]);
    console.log(`[explore] "${label}" behaved as TEXT — filled "${preferred[0]}"`);
    return preferred[0];
  }
  const target = preferred.find((p) => opts.includes(p)) ?? opts.find((o) => !/^--/.test(o)) ?? opts[0];
  if (!preferred.includes(target)) {
    console.log(`[explore] DEVIATION: "${label}" = "${target}" (wanted one of ${JSON.stringify(preferred)})`);
  }
  await page
    .locator('[role="option"]:not(.slds-path__link), lightning-base-combobox-item')
    .filter({ visible: true })
    .filter({ hasText: new RegExp(`^\\s*${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) })
    .first()
    .click();
  await waitForSpinners(page);
  return target;
}

// ---------------------------------------------------------------------- test

test('explore CC2 NB flow (submission → Quote Issued)', async ({ page }) => {
  test.setTimeout(55 * 60 * 1000);

  const accounts = new AccountsPage(page);
  const wizard = new SubmissionWizardPage(page);
  const submission = new SubmissionPage(page);
  const quote = new QuotePage(page);
  const forms = new OmniScriptFormPage(page);
  const premiums = new PremiumPage(page);
  const status = new QuoteStatusPage(page, CC2_UAL);

  const user = CC2_USERS.uw5; // doc runs the whole flow as UW5
  // Client mode: default = EXISTING-client typeahead with "Mr Jones Testing"
  // (the account NOW EXISTS on newprodqa2 — created 22/07/2026 via the
  // Create-New-Client=Yes path in run 5, Account 001Pu00000sBCP9IAO; a second
  // create attempt silently no-ops, run 6). CC2_CLIENT=new re-exercises the
  // create-new branch (only valid for a not-yet-existing name);
  // CC2_CLIENT=pg falls back to the proven CONC insured.
  const clientMode = process.env.CC2_CLIENT ?? 'existing';
  const useExisting = clientMode !== 'new';
  let insuredName = clientMode === 'pg' ? CC2_CLIENT_INFO.fallbackInsuredName : CC2_CLIENT_INFO.insuredName;

  await test.step('1. JWT login as UW5', async () => {
    await jwtLogin(page, user);
  });

  let quoteId = process.env.CC2_QUOTE_ID ?? '';

  if (quoteId) {
    await test.step(`Resume on existing quote ${quoteId}`, async () => {
      await page.goto(`/lightning/r/Quote/${quoteId}/view`);
      await waitForSpinners(page);
      await closeAllWorkspaceTabs(page);
      await page.goto(`/lightning/r/Quote/${quoteId}/view`);
      await waitForSpinners(page);
      await expect(page.getByRole('tab', { name: 'Coverages', exact: true }).first()).toBeVisible({ timeout: 90_000 });
      const rec = await sfQueryOne(user, `SELECT Name FROM Quote WHERE Id = '${quoteId}'`);
      if (rec?.Name) insuredName = String(rec.Name);
      console.log(`[explore] resumed; quote Name (insured) = "${insuredName}"`);
    });
  } else if (process.env.CC2_SUBMISSION_ID) {
    await test.step(`Resume on submission ${process.env.CC2_SUBMISSION_ID}`, async () => {
      await page.goto(`/lightning/r/Opportunity/${process.env.CC2_SUBMISSION_ID}/view`);
      await waitForSpinners(page);
      await closeAllWorkspaceTabs(page);
      await page.goto(`/lightning/r/Opportunity/${process.env.CC2_SUBMISSION_ID}/view`);
      await waitForSpinners(page);
      await expect(page.getByRole('button', { name: 'Create New Quote' }).first()).toBeVisible({ timeout: 90_000 });
    });
    quoteId = await createQuote();
  } else {
    await test.step('2a. Open HOWDEN account and start submission', async () => {
      const acc = await sfQueryOne(user, `SELECT Id FROM Account WHERE Name = '${CC2_ACCOUNT.name}' LIMIT 1`);
      if (!acc?.Id) throw new Error(`Account not found: ${CC2_ACCOUNT.name}`);
      await page.goto(`/lightning/r/Account/${acc.Id}/view`);
      await waitForSpinners(page);
      await accounts.startNewOlivaSubmission();
    });

    await test.step('2b. Submission Source (contact capture)', async () => {
      // AMBIGUITY: doc (SIT) wants "James Allen"; REST shows only "James
      // Chambers" on newprodqa2's HOWDEN. Capture the typeahead options live.
      const input = page.getByLabel('Intermediary Contact', { exact: false }).first();
      await input.click();
      await input.fill('James');
      await page.waitForTimeout(2500);
      const opts = await visibleOptions(page);
      console.log(`[explore] Intermediary Contact options for "James": ${JSON.stringify(opts.slice(0, 10))}`);
      await input.fill(CC2_ACCOUNT.intermediaryContact);
      await page.waitForTimeout(2000);
      await page
        .getByRole('option', { name: CC2_ACCOUNT.intermediaryContact, exact: true })
        .or(page.getByText(CC2_ACCOUNT.intermediaryContact, { exact: true }))
        .filter({ visible: true })
        .first()
        .click();
      await waitForSpinners(page);
      await page.getByRole('button', { name: 'Next', exact: true }).first().click();
      await waitForSpinners(page);
    });

    await test.step(`2c. Client Information (${useExisting ? `existing "${insuredName}"` : `CREATE NEW "${insuredName}"`})`, async () => {
      const d = CC2_CLIENT_INFO;
      await dumpModalState(page, 'client-info-initial');

      if (!useExisting) {
        // Flip "Create New Client" to Yes and capture what changes.
        const grp = page
          .locator('lightning-radio-group, fieldset, .slds-form-element')
          .filter({ hasText: 'Create New Client' })
          .filter({ visible: true })
          .last();
        const yes = grp.getByRole('radio', { name: 'Yes', exact: true }).first();
        if (await yes.count().catch(() => 0)) {
          await yes.check({ force: true }).catch(async () => {
            await grp.locator('label:has-text("Yes")').first().click();
          });
        } else {
          await grp.locator('label:has-text("Yes")').first().click();
        }
        await waitForSpinners(page);
        await page.waitForTimeout(1500);
        await dumpModalState(page, 'client-info-after-create-new-yes');

        // LIVE FINDING (run 1): "Create New Client = Yes" HIDES the Insured
        // Name typeahead and reveals a NEW-CLIENT sub-form with required
        // fields: *Client Name, *Company Registration Number, *Company Type,
        // *Client Status, Registered Address (*Line/*City/*County/*Country/
        // *Postcode) and an "Is this client vulnerable?" radio.
        await fillWizardText(page, /^\*?\s*Client Name\s*$/, insuredName);
        await fillWizardText(page, /^\*?\s*Company Registration Number\s*$/, '12345678');
        await pickAnyOptionCapture(page, /^\*?\s*Company Type\s*$/, ['Limited Company', 'Private Limited Company', 'Ltd']);
        await pickAnyOptionCapture(page, /^\*?\s*Client Status\s*$/, ['Active']);
        const regAddr: Array<[RegExp, string]> = [
          [/^\*?\s*Registered Address Line\s*$/, CC2_INSURED_ADDRESS.addressLine],
          [/^\*?\s*Registered City\s*$/, CC2_INSURED_ADDRESS.city],
          [/^\*?\s*Registered County\/State\s*$/, CC2_INSURED_ADDRESS.countyState],
          [/^\*?\s*Registered Postcode\s*$/, CC2_INSURED_ADDRESS.postcode],
        ];
        for (const [rx, val] of regAddr) {
          await fillWizardText(page, rx, val);
          console.log(`[explore] new-client field ${rx} = "${val}"`);
        }
        // Country may be a picklist ("United Kingdom") or plain text.
        await pickAnyOptionCapture(page, /^\*?\s*Registered Country\s*$/, [CC2_INSURED_ADDRESS.country]);
        // Screenshot facts (runs 3-4): "Use same address for Trading Address"
        // radio DEFAULTS to Yes (leave it); "Is this client vulnerable?" is a
        // PICKLIST (unstarred but run 4's "All fields in the above section are
        // mandatory" error suggests it must be answered); the sub-form MUST be
        // committed via the blue "Create Client" button.
        await pickAnyOptionCapture(page, /Is this client vulnerable/i, ['No']).catch((e) =>
          console.log(`[explore] vulnerable picklist failed: ${(e as Error).message.slice(0, 140)}`)
        );
        await dumpModalState(page, 'client-info-new-client-filled');
        const createClient = page
          .getByRole('button', { name: 'Create Client', exact: true })
          .filter({ visible: true })
          .first();
        await expect(createClient).toBeVisible({ timeout: 15_000 });
        await createClient.click();
        await waitForSpinners(page);
        await page.waitForTimeout(3000);
        let errText = await dumpErrors(page, 'after-create-client');
        if (/mandatory|incomplete/i.test(errText)) {
          // Nudge every text field with a blur (click each, then click the
          // heading) so the LWC binds any value it may have missed, retry once.
          console.log('[explore] mandatory-fields error — re-blurring inputs and retrying Create Client');
          for (const rx of [/^\*?\s*Client Name\s*$/, /^\*?\s*Company Registration Number\s*$/,
            /^\*?\s*Registered Address Line\s*$/, /^\*?\s*Registered City\s*$/,
            /^\*?\s*Registered County\/State\s*$/, /^\*?\s*Registered Country\s*$/,
            /^\*?\s*Registered Postcode\s*$/]) {
            const f = page.getByLabel(rx).and(page.locator('input, textarea')).filter({ visible: true }).first();
            if (await f.isVisible({ timeout: 1000 }).catch(() => false)) {
              await f.click().catch(() => {});
              await page.keyboard.press('Tab').catch(() => {});
            }
          }
          await createClient.click();
          await waitForSpinners(page);
          await page.waitForTimeout(3000);
          errText = await dumpErrors(page, 'after-create-client-retry');
        }
        await dumpModalState(page, 'after-create-client');
      } else {
        // Proven CONC path: existing client typeahead.
        const nameInput = page.getByLabel('Insured Name', { exact: false }).first();
        await nameInput.click();
        await nameInput.fill(insuredName);
        await page.waitForTimeout(2500);
        await page
          .getByRole('option', { name: insuredName, exact: true })
          .or(page.getByText(insuredName, { exact: true }))
          .filter({ visible: true })
          .first()
          .click();
        await waitForSpinners(page);
      }

      // The product-information block (Industry Sector…) renders only after
      // "Create Client" commits (create-new path) / is already there
      // (existing-client path).
      const indVisible = await page
        .getByLabel('Industry Sector', { exact: false })
        .filter({ visible: true })
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 })
        .then(() => true)
        .catch(() => false);
      if (!indVisible) {
        console.log('[explore] Industry Sector STILL not visible — dumping before failing');
        await dumpModalState(page, 'client-info-no-industry-sector');
        await dumpErrors(page, 'client-info-no-industry-sector');
      }
      await pickOptionCapture(page, 'Industry Sector', d.industrySector);
      await pickOptionCapture(page, 'Activity Code', d.activityCode);
      await pickOptionCapture(page, 'Product', d.product);
      await fillWizardText(page, 'Business Description', d.businessDescription);
      await pickOptionCapture(page, 'Year Business Established', d.yearBusinessEstablished);
      await fillWizardText(page, 'Employee Size', d.employeeSize);
      await fillWizardText(page, 'Client Turnover', d.clientTurnover);
      // Classification: prefilled for existing clients; pick for new ones.
      const classInput = page.getByLabel('Client Classification Type', { exact: false }).and(page.locator('input')).first();
      const classVal = (await classInput.inputValue().catch(() => '')).trim();
      console.log(`[explore] Client Classification Type prefill: "${classVal}"`);
      if (!classVal) {
        await pickOptionCapture(page, 'Client Classification Type', d.clientClassificationType, 'Consumer');
      } else {
        await page.keyboard.press('Escape').catch(() => {});
      }

      await page.getByRole('button', { name: 'Next', exact: true }).first().click();
      await waitForSpinners(page);
      // The step transition shows a LONG spinner (run 5: >20s) — wait with
      // waitFor (isVisible ignores its timeout — run 7 lesson).
      const step3 = page.getByText('Risk Type', { exact: false }).filter({ visible: true }).first();
      const advanced = await step3
        .waitFor({ state: 'visible', timeout: 120_000 })
        .then(() => true)
        .catch(() => false);
      if (!advanced) {
        await dumpErrors(page, 'client-info-next-blocked');
        await dumpModalState(page, 'client-info-next-blocked');
        throw new Error('Client Information step did not advance — see dumps (create-new-client path blocked?)');
      }
    });

    await test.step('2d. Risk Information + Claims → Submit', async () => {
      await wizard.fillRiskInformation({ ...CC2_RISK_INFO, quoteRequiredOffsetDays: 0 } as never);
      await wizard.submitClaimsHistory();
      const oppMatch = page.url().match(/\/Opportunity\/(006[A-Za-z0-9]+)\//);
      if (oppMatch?.[1]) {
        const rec = await sfQueryOne(
          user,
          `SELECT RiskId__c, AccountId, Account.Name, Client_Classification_Type__c FROM Opportunity WHERE Id = '${oppMatch[1]}'`
        );
        console.log(
          `[explore] SUBMISSION ${oppMatch[1]} RiskId__c=${rec?.RiskId__c} Account=` +
            `${JSON.stringify((rec as never as { Account?: { Name?: string } })?.Account?.Name)} ` +
            `Classification=${rec?.Client_Classification_Type__c}`
        );
        console.log(`[explore] CC2_SUBMISSION_ID=${oppMatch[1]}  (use for resume)`);
        expect(String(rec?.RiskId__c)).toMatch(/DOU\/\d+\/CONC\/\d+/);
      } else {
        console.log(`[explore] SUBMISSION Risk ID (page text): ${await submission.riskId().catch(() => '?')}`);
      }
    });

    quoteId = await createQuote();
  }

  /** Create New Quote with the 3-step wizard — CUSTOM step 3 (Insurable
   *  Detail): capture + fill insurable name and risk address (the doc fills
   *  them; a NEW client has no account address to prefill from). */
  async function createQuote(): Promise<string> {
    let id = '';
    await test.step('3. Create quote (custom Insurable Detail step)', async () => {
      await submission.createNewQuote();

      // Step 1 — Select Product.
      await expect(page.getByText('Select Product', { exact: true }).first()).toBeVisible({ timeout: 90_000 });
      await page.getByRole('button', { name: 'Next', exact: true }).first().click();
      await waitForSpinners(page);
      // Step 2 — Quote Overview.
      await expect(page.getByText('Quote Overview', { exact: true }).first()).toBeVisible({ timeout: 90_000 });
      await page.getByRole('button', { name: 'Next', exact: true }).first().click();
      await waitForSpinners(page);
      // Step 3 — Insurable Detail.
      await expect(page.getByText('Insurable Detail', { exact: true }).first()).toBeVisible({ timeout: 90_000 });
      await dumpModalState(page, 'insurable-detail');

      const nameInput = page.getByLabel('Insurable Name', { exact: false }).and(page.locator('input')).filter({ visible: true }).first();
      const nameVal = (await nameInput.inputValue().catch(() => '')).trim();
      console.log(`[explore] Insurable Name prefill: "${nameVal}"`);
      if (!nameVal) {
        await nameInput.click();
        await nameInput.fill(insuredName);
      }

      // Address fields (labels per doc: Risk Address Line / Risk City / …).
      const addr: Array<[RegExp, string]> = [
        [/Address Line/i, CC2_INSURED_ADDRESS.addressLine],
        [/^\*?\s*(Risk )?City\s*$/i, CC2_INSURED_ADDRESS.city],
        [/County\/State/i, CC2_INSURED_ADDRESS.countyState],
        [/Postcode/i, CC2_INSURED_ADDRESS.postcode],
        [/^\*?\s*(Risk )?Country\s*$/i, CC2_INSURED_ADDRESS.country],
      ];
      for (const [rx, val] of addr) {
        const f = page.getByLabel(rx).and(page.locator('input, textarea')).filter({ visible: true }).first();
        if (!(await f.isVisible({ timeout: 2000 }).catch(() => false))) {
          console.log(`[explore] insurable-detail: no field matching ${rx}`);
          continue;
        }
        const cur = (await f.inputValue().catch(() => '')).trim();
        if (!cur) {
          await f.click({ clickCount: 3 });
          await f.fill(val);
          console.log(`[explore] insurable-detail ${rx} = "${val}"`);
        } else {
          console.log(`[explore] insurable-detail ${rx} prefilled "${cur}" — left as-is`);
        }
      }

      await page.getByRole('button', { name: 'Submit', exact: true }).first().click();
      await expect(page.getByRole('tab', { name: 'Coverages' }).first()).toBeVisible({ timeout: 150_000 });
      await expect(page.getByRole('button', { name: 'Enter Premiums' }).first()).toBeVisible({ timeout: 150_000 });

      const m = page.url().match(/\/Quote\/(0Q0[A-Za-z0-9]+)\//);
      if (!m?.[1]) throw new Error(`Could not parse quote id from URL: ${page.url()}`);
      id = m[1];
      console.log(`[explore] CC2_QUOTE_ID=${id}  (use for resume)`);
      const rec = await sfQueryOne(user, `SELECT Name, Status FROM Quote WHERE Id = '${id}'`).catch(() => undefined);
      console.log(`[explore] quote Name="${rec?.Name}" Status="${rec?.Status}"`);
    });
    return id;
  }

  // AMBIGUITY #4-adjacent: the doc NEVER fills the product questionnaire.
  // Default: skip it (doc-exact) and see how far the flow gets.
  if (process.env.CC2_FILL_FORM === '1') {
    await test.step('4. (optional) Fill product questionnaire', async () => {
      await quote.editRenovationProductQuestions('Contractors Combined');
      await forms.fill(CC2_PRODUCT_FORM);
    });
  } else {
    console.log('[explore] questionnaire SKIPPED (doc-exact) — watching for blocks downstream');
  }

  // 5. Product-card coverages: EL, PPL, CAR.
  if (process.env.CC2_SKIP_COVERAGES !== '1') {
    const start = parseInt(process.env.CC2_COV_START ?? '0', 10);
    for (let i = start; i < CC2_COVERAGES.length; i++) {
      const cov = CC2_COVERAGES[i];
      await test.step(`5.${i + 1} Add coverage: ${cov.addRowName}`, async () => {
        await quote.addRenoCoverage(CC2_PRODUCT_CARD, cov.addRowName);
        await dumpModalState(page, `open:${cov.addRowName}`);

        // EL: fill the Trade Details row FIRST with bespoke locators (run 8:
        // the generic engine mis-targets the row's dropdown). Labels are
        // literal: "*Trade Description", "*(Name of trade description)
        // wageroll", "(Name of trade description) headcount".
        if (cov.addRowName === 'Employers Liability') {
          const tradeCombo = page
            .getByLabel(/^\*?\s*Trade Description\s*$/)
            .filter({ visible: true })
            .first();
          await expect(tradeCombo).toBeVisible({ timeout: 20_000 });
          await tradeCombo.click();
          await page.waitForTimeout(1500);
          const opts = await visibleOptions(page);
          console.log(`[explore] EL Trade Description options (first 15): ${JSON.stringify(opts.slice(0, 15))}`);
          const optLoc = page
            .locator('[role="option"]:not(.slds-path__link), lightning-base-combobox-item, [role="listbox"] li')
            .filter({ visible: true })
            .filter({ hasText: /^\s*Aerial & Satellite Erection\s*$/ })
            .first();
          if (await optLoc.isVisible({ timeout: 5000 }).catch(() => false)) {
            await optLoc.click();
          } else {
            // Maybe a native select or type-to-filter combobox.
            console.log('[explore] EL trade option not visible — trying type + Enter');
            await tradeCombo.fill('Aerial & Satellite Erection').catch(() => {});
            await page.waitForTimeout(1500);
            const opts2 = await visibleOptions(page);
            console.log(`[explore] EL trade options after typing: ${JSON.stringify(opts2.slice(0, 10))}`);
            if (await optLoc.isVisible({ timeout: 3000 }).catch(() => false)) await optLoc.click();
            else await page.keyboard.press('Enter').catch(() => {});
          }
          await waitForSpinners(page);
          const tradeWage = page
            .getByLabel(/\(Name of trade description\) wageroll/i)
            .and(page.locator('input'))
            .filter({ visible: true })
            .first();
          await expect(tradeWage).toBeVisible({ timeout: 15_000 });
          await tradeWage.click({ clickCount: 3 });
          await tradeWage.fill('123');
          console.log('[explore] EL trade row: description + wageroll 123 set (headcount left blank)');
        }

        try {
          await forms.fill(cov.form);
        } catch (e) {
          await dumpModalState(page, `failure:${cov.addRowName}`);
          await dumpErrors(page, `failure:${cov.addRowName}`);
          throw e;
        }
      });
    }
  }

  // 6a. Property Damage on the risk-location card.
  if (process.env.CC2_SKIP_PD !== '1') {
    await test.step('6a. Add Property Damage on the risk-location card', async () => {
      const cardText = `${insuredName} - United Kingdom`;
      await quote.addRenoCoverage(cardText, CC2_PD_COVERAGE.addRowName);
      await dumpModalState(page, 'open:Property Damage');
      // Capture the auto-populated Option 1 amounts + Limit after picking.
      try {
        await forms.fill(CC2_PD_COVERAGE.form);
      } catch (e) {
        await dumpModalState(page, 'failure:Property Damage');
        await dumpErrors(page, 'failure:Property Damage');
        throw e;
      }
    });
  }

  // 6b. Second, coverage-less insurable "Test" (custom modal — the shared
  // QuotePage.addRiskLocation expects Care's 2-step form).
  if (process.env.CC2_SKIP_LOC2 !== '1') {
    await test.step('6b. + Add Risk Locations: second insurable "Test"', async () => {
      const d = CC2_SECOND_LOCATION;
      const addLink = page
        .getByRole('link', { name: 'Add Risk Locations' })
        .or(page.getByRole('button', { name: 'Add Risk Locations' }))
        .or(page.getByText('Add Risk Locations', { exact: true }))
        .first();
      await expect(addLink).toBeVisible({ timeout: 30_000 });
      await addLink.click();
      const modalHeading = page.getByRole('heading', { name: 'Risk Location/Insurable' }).first();
      await expect(modalHeading).toBeVisible({ timeout: 30_000 });
      await dumpModalState(page, 'risk-location-modal');

      await page.getByLabel('Insurable Name').filter({ visible: true }).first().fill(d.insurableName);
      const fillField = async (rx: RegExp, value: string, optional = false): Promise<void> => {
        const input = page.getByLabel(rx).filter({ visible: true }).first();
        if (!(await input.isVisible({ timeout: optional ? 1500 : 15_000 }).catch(() => false))) {
          console.log(`[explore] risk-location modal: no field ${rx}`);
          return;
        }
        await input.click({ clickCount: 3 });
        await input.fill(value);
      };
      await fillField(/^\*?\s*Address Line\s*$/, d.addressLine);
      await fillField(/^\*?\s*City\s*$/, d.city);
      await fillField(/^\*?\s*County\/State\s*$/, d.countyState);
      await fillField(/^\*?\s*Postcode\s*$/, d.postcode);
      await fillField(/^\*?\s*Country\s*$/, d.country);
      await fillField(/^\*?\s*Latitude\s*$/, d.latitude, true);
      await fillField(/^\*?\s*Longitude\s*$/, d.longitude, true);

      // Doc shows single-step Cancel/Save; Care org had a Next → step 2. Handle both.
      const saveBtn = page.getByRole('button', { name: 'Save', exact: true }).filter({ visible: true }).last();
      const nextBtn = page.getByRole('button', { name: 'Next', exact: true }).filter({ visible: true }).last();
      if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('[explore] risk-location modal: single-step (Save)');
        await saveBtn.click();
      } else if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('[explore] risk-location modal: multi-step (Next → …)');
        await nextBtn.click();
        await waitForSpinners(page);
        await dumpModalState(page, 'risk-location-step2');
        await page.getByRole('button', { name: 'Save', exact: true }).filter({ visible: true }).last().click();
      }
      await expect(modalHeading).toBeHidden({ timeout: 30_000 });
      await waitForSpinners(page);
      const card = page.getByText(`${d.insurableName} - `).first();
      console.log(`[explore] second insurable card visible: ${await card.isVisible({ timeout: 10_000 }).catch(() => false)}`);
    });
  }

  // 7. Enter Premiums.
  if (process.env.CC2_SKIP_PREMIUMS !== '1') {
    await test.step('7. Enter premiums (M&D Yes; EL 0 / others 20; CAR annualized 10)', async () => {
      await quote.clickEnterPremiums();
      await premiums.answerMinimumDeposit(CC2_MINIMUM_DEPOSIT);
      // PD's Insurable column carries the (run-specific) insured name.
      const entries = CC2_PREMIUMS.map((p) =>
        p.coverage === 'Property Damage' ? { ...p, insurable: insuredName.split(' ').slice(0, 2).join(' ') } : p
      );
      try {
        await premiums.fillAndSubmit(entries);
      } catch (e) {
        // Grid may render PD's insurable EMPTY (CONC PPL did) — retry blank.
        console.log(`[explore] premium fill failed (${(e as Error).message.slice(0, 160)}) — retrying with blank insurables`);
        await premiums.fillAndSubmit(entries.map((p) => ({ ...p, insurable: '' })));
      }
      console.log(`[explore] DUAL Share GWP after premiums: ${await quote.dualShareGwp().catch(() => 'n/a')}`);
    });
  }

  // 8. Binders: capture ALL offerings per row, then strict per-coverage select.
  if (process.env.CC2_SKIP_BINDERS !== '1') {
    await test.step('8a. Capture binder offerings per risk row', async () => {
      await openRecordTab(page, 'Select Binders');
      const buttons = () => page.getByRole('button', { name: 'Select Binders', exact: true }).filter({ visible: true });
      await expect(buttons().first()).toBeVisible({ timeout: 60_000 });
      const total = await buttons().count();
      const gridRows = page
        .locator('tr, [role="row"]')
        .filter({ has: page.getByRole('button', { name: 'Select Binders', exact: true }) })
        .filter({ visible: true });
      for (let i = 0; i < (await gridRows.count()); i++) {
        console.log(`[explore] risk row ${i}: ${await rowTextOf(gridRows.nth(i))}`);
      }
      for (let i = 0; i < total; i++) {
        await buttons().nth(i).scrollIntoViewIfNeeded().catch(() => {});
        await buttons().nth(i).click();
        await waitForSpinners(page);
        await expect(page.getByText('Available Binders').first()).toBeVisible({ timeout: 60_000 });
        await page
          .getByRole('button', { name: /^(Add|Remove)$/ })
          .filter({ visible: true })
          .first()
          .waitFor({ state: 'visible', timeout: 20_000 })
          .catch(() => {});
        const availRows = page
          .locator('tr, [role="row"]')
          .filter({ has: page.getByRole('button', { name: 'Add', exact: true }) })
          .filter({ visible: true });
        const seen = new Set<string>();
        for (let j = 0; j < (await availRows.count()); j++) {
          const t = await rowTextOf(availRows.nth(j));
          if (t && !seen.has(t)) {
            seen.add(t);
            console.log(`[explore] row ${i} available binder: ${t}`);
          }
        }
        const selRows = page
          .locator('tr, [role="row"]')
          .filter({ has: page.getByRole('button', { name: 'Remove', exact: true }) })
          .filter({ visible: true });
        for (let j = 0; j < (await selRows.count()); j++) {
          console.log(`[explore] row ${i} ALREADY selected: ${await rowTextOf(selRows.nth(j))}`);
        }
        await page.getByRole('button', { name: 'Back', exact: true }).first().click();
        await waitForSpinners(page);
      }
    });

    await test.step('8b. Select binders (BindersPage STRICT per-coverage mode)', async () => {
      const binders = new BindersPage(page, CC2_BINDER_DEFAULT, CC2_BINDERS);
      await binders.selectAllBinders();
      // REST truth-check of the created RBS rows.
      try {
        let lastName = '';
        for (let k = 0; k < 10; k++) {
          const rec = await sfQueryOne(
            user,
            `SELECT Name, Binder_Name__c, Binder_Section__r.Name, N_R_to_Binder__c, Binder_Allocation_Percentage__c ` +
              `FROM Risk_Binder_Section__c WHERE Quote__c = '${quoteId}' AND Name > '${lastName}' ORDER BY Name LIMIT 1`
          );
          if (!rec) break;
          lastName = String(rec.Name);
          console.log(
            `[explore] RBS: ${rec.Name} | ${rec.Binder_Name__c} | ` +
              `${(rec as never as { Binder_Section__r: { Name: string } }).Binder_Section__r?.Name} | ` +
              `N/R=${rec.N_R_to_Binder__c} | alloc=${rec.Binder_Allocation_Percentage__c}`
          );
        }
      } catch (e) {
        console.log(`[explore] RBS REST dump failed: ${(e as Error).message}`);
      }
    });
  }

  // 9. RBS: doc-style approval of ONE section (no carrier step in the doc).
  if (process.env.CC2_SKIP_RBS !== '1') {
    await test.step('9. RBS list capture + doc-style single approval (no carrier)', async () => {
      await openRecordTab(page, 'Selected Binders');
      await expect(page.getByText('Risk Binder Sections').first()).toBeVisible({ timeout: 60_000 });
      await waitForSpinners(page);
      const rbsRows = page
        .locator('tr, [role="row"]')
        .filter({ has: page.getByRole('link', { name: /^RBS-/ }) })
        .filter({ visible: true });
      const n = await rbsRows.count();
      let pdRbsName = '';
      const seen = new Set<string>();
      for (let i = 0; i < n; i++) {
        const t = await rowTextOf(rbsRows.nth(i));
        if (t && !seen.has(t)) {
          seen.add(t);
          console.log(`[explore] RBS row: ${t}`);
          if (t.includes('Property Damage') && !pdRbsName) {
            pdRbsName = (t.match(/RBS-\d+/) || [''])[0];
          }
        }
      }
      // Doc approves the Property Damage RBS — mirror that (fallback: first).
      const link = pdRbsName
        ? page.getByRole('link', { name: pdRbsName, exact: true }).filter({ visible: true }).first()
        : page.getByRole('link', { name: /^RBS-/ }).filter({ visible: true }).first();
      console.log(`[explore] approving RBS "${pdRbsName || '(first)'}" doc-style (Confirm No Manual Reasons + Approved, NO carrier tick)`);
      await link.click();
      await waitForSpinners(page);
      await expect(page.getByText('Risk Binder Section', { exact: false }).first()).toBeVisible({ timeout: 60_000 });

      // (a) Referral Reasons: capture the candidate manual reasons + confirm-box.
      const refTab = page.getByRole('tab', { name: 'Referral Reasons', exact: true }).filter({ visible: true });
      await refTab.last().click();
      await waitForSpinners(page);
      const reasonRows = await page.getByText(/RBS-\d+ - /).filter({ visible: true }).allInnerTexts().catch(() => []);
      console.log(`[explore] manual referral reason candidates (${reasonRows.length}): ${JSON.stringify(reasonRows.slice(0, 20))}`);
      const confirmBox = page.getByRole('checkbox', { name: /Confirm No Manual Reasons/i }).first();
      await expect(confirmBox).toBeVisible({ timeout: 30_000 });
      if (!(await confirmBox.isChecked().catch(() => false))) {
        await confirmBox.check({ force: true }).catch(async () => {
          await page.getByText('Confirm No Manual Reasons', { exact: false }).first().click();
        });
        const gridSave = page.getByRole('button', { name: 'Save', exact: true }).filter({ visible: true }).first();
        if (await gridSave.isVisible().catch(() => false)) {
          await gridSave.scrollIntoViewIfNeeded();
          await gridSave.click();
          await waitForSpinners(page);
        }
      }

      // (b) Capture the Carrier Selection card (NOT ticked — doc has no such step).
      const carrierCard = page.locator('article, .slds-card').filter({ hasText: 'Carrier Selection Detail' }).last();
      if (await carrierCard.isVisible({ timeout: 10_000 }).catch(() => false)) {
        console.log(`[explore] Carrier card (left untouched): ${(await rowTextOf(carrierCard)).slice(0, 250)}`);
      } else {
        console.log('[explore] no Carrier Selection Details card visible on this RBS layout');
      }

      // (c) Details tab → Approval Status = Approved.
      const detTab = page.getByRole('tab', { name: 'Details', exact: true }).filter({ visible: true });
      await detTab.last().click();
      await waitForSpinners(page);
      const referralSection = page
        .getByRole('heading', { name: 'Referral Information' })
        .or(page.getByText('Referral Information', { exact: true }))
        .first();
      await referralSection.scrollIntoViewIfNeeded().catch(() => {});
      await page.mouse.wheel(0, 600);
      const statusItem = page
        .locator('records-record-layout-item, force-record-layout-item, .slds-form-element')
        .filter({ hasText: 'Approval Status' })
        .filter({ visible: true })
        .first();
      await expect(statusItem).toBeVisible({ timeout: 30_000 });
      await statusItem.hover().catch(() => {});
      await page
        .getByRole('button', { name: /Edit Approval Status/i })
        .or(statusItem.locator('button[title*="Edit"]'))
        .filter({ visible: true })
        .first()
        .click();
      const picklist = page.getByRole('combobox', { name: /Approval Status/i }).filter({ visible: true }).first();
      await picklist.click();
      console.log(`[explore] Approval Status options: ${JSON.stringify(await visibleOptions(page))}`);
      await page.getByRole('option', { name: 'Approved', exact: true }).first().click();
      await page
        .locator('button[name="SaveEdit"]')
        .or(page.getByRole('button', { name: 'Save', exact: true }))
        .filter({ visible: true })
        .last()
        .click();
      await waitForSpinners(page);
      await expect(
        page
          .locator('records-record-layout-item, force-record-layout-item, .slds-form-element')
          .filter({ hasText: 'Approval Status' })
          .filter({ visible: true })
          .first()
      ).toContainText('Approved', { timeout: 60_000 });

      // Close subtabs, back to quote.
      for (let i = 0; i < 6; i++) {
        const closeButton = page.getByRole('button', { name: /^Close (RBS-|Edit Premiums)/ }).filter({ visible: true }).first();
        if (!(await closeButton.isVisible().catch(() => false))) break;
        await closeButton.click();
        const saveDialog = page.getByRole('dialog', { name: /Save changes/i }).filter({ visible: true }).first();
        if (await saveDialog.isVisible().catch(() => false)) {
          await saveDialog.getByRole('button', { name: /^Save/ }).first().click();
        }
        await waitForSpinners(page);
      }
      const quoteTabs = page.getByRole('tab', { name: 'Coverages', exact: true }).filter({ visible: true }).last();
      if (!(await quoteTabs.isVisible({ timeout: 20_000 }).catch(() => false))) {
        await page.goto(`/lightning/r/Quote/${quoteId}/view`);
        await waitForSpinners(page);
      }
    });
  }

  // 10. Clauses.
  if (process.env.CC2_SKIP_CLAUSES !== '1') {
    await test.step('10. Clauses: capture rows, save predefined, capture follow-up dialog', async () => {
      await openRecordTab(page, 'Clauses');
      await expect(page.getByText('Predefined Binder Clauses').first()).toBeVisible({ timeout: 60_000 });
      await waitForSpinners(page);
      // LIVE FINDING (run 10): the org offers 174 predefined clause rows
      // (names "CONC Acc - …" bound to Accelerant Oliva Construction 2024).
      // The shared savePredefinedClauses ticks ALL rows and the ticks don't
      // bind (error "Please Select the Checkbox before Save"). The doc ticks
      // ONE box → Save. Do exactly that here (idempotent-safe; clauses are
      // NOT a gate for Quote Issued, so this step never hard-fails the run).
      const rowChecks = page
        .locator('td input[type="checkbox"], tbody tr input[type="checkbox"]')
        .filter({ visible: true });
      const cn = await rowChecks.count();
      console.log(`[explore] predefined clause row checkboxes: ${cn}`);
      const nameCells = page.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') }).filter({ visible: true });
      for (let i = 0; i < Math.min(12, await nameCells.count()); i++) {
        const t = (await rowTextOf(nameCells.nth(i))).replace(/Font Salesforce.*$/, '').trim();
        console.log(`[explore] clause name ${i}: ${t.slice(0, 90)}`);
      }
      try {
        if (cn > 0) {
          const first = rowChecks.first();
          await first.scrollIntoViewIfNeeded().catch(() => {});
          await first.check({ force: true }).catch(async () => {
            await first.locator('xpath=..').click();
          });
          await page.waitForTimeout(500);
          const save = page.getByRole('button', { name: 'Save Predefined Binder Clauses' }).first();
          await save.scrollIntoViewIfNeeded();
          await save.click();
          await waitForSpinners(page);
          await page.waitForTimeout(2500);
          // Doc says "select binder and click on save" after — capture any dialog.
          const dialog = page.getByRole('dialog').filter({ visible: true }).last();
          if (await dialog.isVisible({ timeout: 4000 }).catch(() => false)) {
            console.log(`[explore] post-save clause dialog: ${(await rowTextOf(dialog)).slice(0, 400)}`);
            const dlgSave = dialog.getByRole('button', { name: /^(Save|OK|Confirm)$/i }).filter({ visible: true }).first();
            if (await dlgSave.isVisible().catch(() => false)) {
              await dlgSave.click();
              await waitForSpinners(page);
            }
          } else {
            console.log('[explore] NO follow-up "select binder" dialog after Save Predefined Binder Clauses');
          }
        }
      } catch (e) {
        console.log(`[explore] clause save non-fatal error: ${(e as Error).message.slice(0, 160)}`);
      }
      await dumpErrors(page, 'clauses');
      // REST: what clause records exist now?
      try {
        const cl = await sfQueryOne(
          user,
          `SELECT COUNT(Id) total FROM Quote_Endorsement_Clause__c WHERE Quote__c = '${quoteId}'`
        );
        console.log(`[explore] Quote_Endorsement_Clause__c count: ${JSON.stringify(cl)}`);
      } catch (e) {
        console.log(`[explore] clause REST count failed (object name?): ${(e as Error).message.slice(0, 160)}`);
      }
    });
  }

  // 11. ONE fee (capture picklists first, then addFee with REST verify).
  if (process.env.CC2_SKIP_FEE !== '1') {
    await test.step('11. Fee: capture Type/Sub Type picklists + add via engine', async () => {
      const feeProbe = await page.context().newPage();
      try {
        await feeProbe.goto(
          `/lightning/cmp/vlocity_ins__vlocityLWCOmniWrapper?c__target=c%3AduAddFeeEnglish&c__ContextId=${quoteId}&c__layout=lightning`
        );
        await waitForSpinners(feeProbe);
        await feeProbe.waitForTimeout(4000);
        const typeCombo = feeProbe.getByRole('combobox', { name: 'Type' }).or(feeProbe.getByLabel('Type', { exact: true })).filter({ visible: true }).first();
        await expect(typeCombo).toBeVisible({ timeout: 60_000 });
        await typeCombo.click();
        console.log(`[explore] Fee "Type" options (UI): ${JSON.stringify(await visibleOptions(feeProbe))}`);
        await feeProbe
          .locator('[role="option"], lightning-base-combobox-item')
          .filter({ hasText: CC2_FEE.type })
          .filter({ visible: true })
          .first()
          .click()
          .catch(() => {});
        await feeProbe.waitForTimeout(2500);
        const subCombo = feeProbe.getByRole('combobox', { name: 'Sub Type' }).or(feeProbe.getByLabel('Sub Type', { exact: true })).filter({ visible: true }).first();
        if (await subCombo.isVisible({ timeout: 5000 }).catch(() => false)) {
          await subCombo.click();
          console.log(`[explore] Fee "Sub Type" options for "${CC2_FEE.type}" (UI): ${JSON.stringify(await visibleOptions(feeProbe))}`);
          await feeProbe.keyboard.press('Escape').catch(() => {});
        }
      } catch (e) {
        console.log(`[explore] fee picklist probe failed: ${(e as Error).message.slice(0, 200)}`);
      } finally {
        await feeProbe.close();
      }

      // Doc's ONE fee (Survey) + the org-mandated DUAL DNA+ fee (required
      // because CAR set DNA+ = Yes — run 11 "A corresponding DNA+ fee must be
      // added"). Both idempotent/REST-verified.
      for (const feeData of [CC2_FEE, CC2_DNA_FEE]) {
        console.log(`[explore] adding fee: ${feeData.type} / ${feeData.subType}`);
        const clausesFees = new ClausesFeesPage(page, feeData);
        await clausesFees.addFee(quoteId, user);
        const fee = await sfQueryOne(
          user,
          `SELECT Id, Type__c, Sub_Type__c, Fee_Payable_by__c, Fee_Administered_by__c, Fee_Amount__c, ` +
            `Fee_Charged_Included_in_GWP__c, DNA_Payment_Amount__c FROM Fee__c ` +
            `WHERE Quote__c = '${quoteId}' AND Sub_Type__c = '${feeData.subType}' LIMIT 1`
        );
        console.log(`[explore] fee persisted: ${JSON.stringify(fee)}`);
        expect(fee?.Id).toBeTruthy();
      }
    });
  }

  // 12a. ERN exempt.
  if (process.env.CC2_SKIP_ERN !== '1') {
    await test.step('12a. ERN Exempt = Yes', async () => {
      await status.setErnExempt();
    });
  }

  // 12b. Quote Issued — with empirical RBS-escalation (ambiguity #4).
  if (process.env.CC2_SKIP_ISSUE !== '1') {
    await test.step('12b. Path "Quote Issued" → Mark Status as Complete (+ empirical unblock)', async () => {
      await page.goto(`/lightning/r/Quote/${quoteId}/view`);
      await waitForSpinners(page);

      // The REAL completion gate is Quote.Status == 'Issued' (REST). The path
      // chevron / markStage 'ok' can register the click while the Status only
      // advanced to "Ready" — the org advances Ready→Issued ONLY once every
      // RBS is confirmed (single-RBS approval reaches "Ready"; the bulk
      // "Confirm No Manual RBS Referral Reasons" over all 4 unblocks "Issued").
      const issuedStatus = async (): Promise<string> => {
        const rec = await sfQueryOne(user, `SELECT Status FROM Quote WHERE Id = '${quoteId}'`).catch(() => undefined);
        return String(rec?.Status ?? '?');
      };
      const tryIssue = async (tag: string): Promise<void> => {
        try {
          const r = await status.markStage('Quote Issued');
          console.log(`[explore] markStage(Quote Issued) [${tag}] → ${r}; Status now "${await issuedStatus()}"`);
        } catch (e) {
          console.log(`[explore] markStage(Quote Issued) [${tag}] threw: ${(e as Error).message.slice(0, 300)}`);
          await dumpErrors(page, `issue-${tag}`);
        }
      };

      await tryIssue('attempt1-after-single-RBS-approval');
      if ((await issuedStatus()) !== 'Issued') {
        // Escalation A: bulk "Confirm No Manual RBS Referral Reasons" (all 4).
        console.log('[explore] ESCALATION A: bulk Confirm No Manual RBS Referral Reasons');
        await status.confirmNoManualRbsReferralReasons().catch((e) =>
          console.log(`[explore] bulk confirm failed: ${(e as Error).message.slice(0, 200)}`)
        );
        await page.goto(`/lightning/r/Quote/${quoteId}/view`);
        await waitForSpinners(page);
        await tryIssue('attempt2-after-bulk-confirm');
      }
      if ((await issuedStatus()) !== 'Issued') {
        // Escalation B: FULL approval of every RBS incl. carrier tick.
        console.log('[explore] ESCALATION B: full approveAllRbs (reasons + carrier + Approved)');
        const rbs = new RbsApprovalPage(page);
        await rbs.approveAllRbs(quoteId).catch((e) =>
          console.log(`[explore] approveAllRbs failed: ${(e as Error).message.slice(0, 200)}`)
        );
        await tryIssue('attempt3-after-full-approval');
      }
      const finalStatus = await issuedStatus();
      console.log(`[explore] FINAL quote Status = "${finalStatus}"  (CC2_QUOTE_ID=${quoteId})`);
      expect(finalStatus).toBe('Issued');
      console.log(`[explore] FINAL DUAL Share GWP: ${await quote.dualShareGwp().catch(() => 'n/a')}`);
      // STOP — doc ends at Quote Issued. No sanction, no Bound, no policy.
    });
  }
});
