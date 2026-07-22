import { test, expect } from '@playwright/test';
import { jwtLogin, sfQueryOne } from '../src/auth/sfJwt';
import { waitForSpinners, closeAllWorkspaceTabs } from '../src/utils/sf';
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
  fillCc2ClientInformation, completeCc2QuoteWizard, fillElTradeRow,
  addCc2SecondInsurable, saveCc2PredefinedClauses, markCc2QuoteIssued,
} from '../src/flows/cc2Nb';
import {
  CC2_ACCOUNT, CC2_CLIENT_INFO, CC2_RISK_INFO, CC2_PRODUCT_CARD,
  CC2_COVERAGES, CC2_PD_COVERAGE, CC2_PREMIUMS, CC2_MINIMUM_DEPOSIT,
  CC2_BINDERS, CC2_BINDER_DEFAULT, CC2_FEE, CC2_DNA_FEE, CC2_UAL, CC2_USERS,
  CC2_EXPECTATIONS,
} from '../src/data/cc2Data';

/**
 * End-to-end: Oliva EXPANDED "Contractors Combined" (CC2) New Business quote
 * on the newprodqa2 sandbox — from the SIT-captured requirements doc, ending
 * at Quote Status = "Issued" (doc scope: NO sanction check, NO Bound, NO
 * Create Policy). JWT auth (no password/MFA). Live-validated end-to-end via
 * tests/explore-cc2.spec.ts (quote 0Q0Pu000006iu33KAA, Status "Issued").
 *
 * CC2 deltas vs the base CONC suite (oliva-cc-nb.spec.ts):
 *  - insured "Mr Jones Testing" (existing-client typeahead by default — the
 *    exploration created Account 001Pu00000sBCP9IAO; CC2_CLIENT=new
 *    re-exercises the Create-New-Client sub-form for a fresh name,
 *    CC2_CLIENT=pg falls back to "PG Test Insured");
 *  - the product QUESTIONNAIRE IS SKIPPED — live-proven NOT a gate anywhere
 *    up to and including "Issued";
 *  - FOUR coverages: EL (with the bespoke Trade Details grid fill) + PPL +
 *    CAR under the product card, Property Damage on the risk-location card;
 *  - a SECOND coverage-less insurable "Test" (single-step modal);
 *  - per-coverage binders (BindersPage strict mode);
 *  - one full RBS approval + bulk "Confirm No Manual RBS Referral Reasons";
 *  - clauses (doc-style single tick — non-fatal, not a gate);
 *  - TWO fees: the doc's Survey fee + the org-mandated DUAL DNA+ fee (CAR
 *    sets DNA+ = Yes → issuing is hard-blocked without it);
 *  - ERN exempt, then In Progress → Ready → Issued (double mark) with REST
 *    verification of Quote.Status — the path chevron alone is NOT reliable.
 *
 * Resume/skip flags: CC2_QUOTE_ID resumes at binders;
 * CC2_SKIP_BINDERS/RBS/CLAUSES/FEE/ERN=1 skip those stages.
 */
test('create Expanded Contractors Combined NB quote through Quote Issued', async ({ page }) => {
  test.setTimeout(45 * 60 * 1000);

  const accounts = new AccountsPage(page);
  const wizard = new SubmissionWizardPage(page);
  const submission = new SubmissionPage(page);
  const quote = new QuotePage(page);
  const forms = new OmniScriptFormPage(page);
  const premiums = new PremiumPage(page);
  const binders = new BindersPage(page, CC2_BINDER_DEFAULT, CC2_BINDERS);
  const rbs = new RbsApprovalPage(page);
  const status = new QuoteStatusPage(page, CC2_UAL);

  // The source doc runs the whole flow as UW5 (default, doc-exact).
  // CC2_LOGIN_USER=uw3 switches to UW3.
  const loginUser = process.env.CC2_LOGIN_USER === 'uw3' ? CC2_USERS.uw3 : CC2_USERS.uw5;

  // Client resolution: default = existing-client typeahead ("Mr Jones
  // Testing" exists on newprodqa2); CC2_CLIENT=new exercises the
  // Create-New-Client sub-form (only valid for a not-yet-existing name);
  // CC2_CLIENT=pg uses the proven CONC insured.
  const clientMode = process.env.CC2_CLIENT ?? 'existing';
  const insuredName =
    clientMode === 'pg' ? CC2_CLIENT_INFO.fallbackInsuredName : CC2_CLIENT_INFO.insuredName;

  await test.step(`Login as Construction ${process.env.CC2_LOGIN_USER === 'uw3' ? 'UW3' : 'UW5'} (JWT — no MFA)`, async () => {
    await jwtLogin(page, loginUser);
  });

  // Fast-iteration escape hatch: CC2_QUOTE_ID resumes at binders on an
  // existing quote (which must already have coverages + premiums entered).
  const resumeQuoteId = process.env.CC2_QUOTE_ID;
  let cc2QuoteId = resumeQuoteId ?? '';
  if (resumeQuoteId) {
    await test.step(`Resume from existing quote ${resumeQuoteId}`, async () => {
      await page.goto(`/lightning/r/Quote/${resumeQuoteId}/view`);
      await waitForSpinners(page);
      await closeAllWorkspaceTabs(page);
      await page.goto(`/lightning/r/Quote/${resumeQuoteId}/view`);
      await waitForSpinners(page);
      await expect(
        page.getByRole('tab', { name: 'Coverages', exact: true }).first()
      ).toBeVisible({ timeout: 90_000 });
    });
  } else {

  await test.step('Open intermediary account and start submission', async () => {
    const acc = await sfQueryOne(
      loginUser,
      `SELECT Id FROM Account WHERE Name = '${CC2_ACCOUNT.name}' LIMIT 1`
    );
    if (!acc?.Id) throw new Error(`Account not found: ${CC2_ACCOUNT.name}`);
    await page.goto(`/lightning/r/Account/${acc.Id}/view`);
    await waitForSpinners(page);
    await accounts.startNewOlivaSubmission();
  });

  await test.step('Complete submission wizard', async () => {
    await wizard.fillSubmissionSource(CC2_ACCOUNT.intermediaryContact);
    // Client Information needs the CC2 flow helper: existing-client typeahead
    // by default, guarded Create-New-Client sub-form, classification-prefill
    // handling and the long (>20s) step-advance spinner.
    await fillCc2ClientInformation(page, insuredName, clientMode === 'new');
    // Doc: Quote Required by Date = Date Submission Received (same day).
    await wizard.fillRiskInformation({ ...CC2_RISK_INFO, quoteRequiredOffsetDays: 0 } as never);
    await wizard.submitClaimsHistory();
    // Assert the Risk ID via REST (page-text riskId() can read the Potential
    // Matches rail — REST is authoritative, same mechanism as the exploration).
    const oppMatch = page.url().match(/\/Opportunity\/(006[A-Za-z0-9]+)\//);
    if (oppMatch?.[1]) {
      const rec = await sfQueryOne(
        loginUser,
        `SELECT RiskId__c FROM Opportunity WHERE Id = '${oppMatch[1]}'`
      );
      expect(String(rec?.RiskId__c)).toMatch(CC2_EXPECTATIONS.submissionRiskIdPattern);
    } else {
      expect(await submission.riskId()).toMatch(CC2_EXPECTATIONS.submissionRiskIdPattern);
    }
  });

  await test.step('Create quote (custom Insurable Detail step)', async () => {
    await submission.createNewQuote();
    cc2QuoteId = await completeCc2QuoteWizard(page, insuredName);
    console.log(`[cc2] clean quote id for resume: ${cc2QuoteId}`);
    const q = await sfQueryOne(
      loginUser,
      `SELECT Risk_ID__c FROM Quote WHERE Id = '${cc2QuoteId}'`
    );
    expect(String(q?.Risk_ID__c ?? '')).toMatch(CC2_EXPECTATIONS.quoteRiskIdPattern);
  });

  // NOTE: the product questionnaire is intentionally NOT filled — the doc
  // skips it and it is live-proven NOT to gate anything through "Issued".

  await test.step(`Add ${CC2_COVERAGES.length} product-card coverages (EL, PPL, CAR)`, async () => {
    for (const cov of CC2_COVERAGES) {
      await quote.addRenoCoverage(CC2_PRODUCT_CARD, cov.addRowName);
      if (cov.addRowName === 'Employers Liability') {
        // Trade Details grid row: bespoke fill BEFORE the generic engine
        // (the engine mis-targets the row's combobox — live-proven).
        await fillElTradeRow(page);
      }
      await forms.fill(cov.form);
    }
  });

  await test.step('Add Property Damage on the risk-location card', async () => {
    await quote.addRenoCoverage(`${insuredName} - United Kingdom`, CC2_PD_COVERAGE.addRowName);
    await forms.fill(CC2_PD_COVERAGE.form);
  });

  await test.step('Add second coverage-less insurable "Test" (single-step modal)', async () => {
    await addCc2SecondInsurable(page);
  });

  await test.step('Enter premiums (Minimum & Deposit = Yes; EL commission 0, others 20)', async () => {
    await quote.clickEnterPremiums();
    await premiums.answerMinimumDeposit(CC2_MINIMUM_DEPOSIT);
    // PD's Insurable column carries the (run-specific) insured name — but the
    // grid can render it EMPTY (live: blank matched on the clean run), so try
    // named first and retry blank on failure.
    const entries = CC2_PREMIUMS.map((p) =>
      p.coverage === 'Property Damage'
        ? { ...p, insurable: insuredName.split(' ').slice(0, 2).join(' ') }
        : p
    );
    try {
      await premiums.fillAndSubmit(entries);
    } catch (e) {
      console.log(
        `[cc2] premium fill failed (${(e as Error).message.slice(0, 160)}) — retrying with blank insurables`
      );
      await premiums.fillAndSubmit(entries.map((p) => ({ ...p, insurable: '' })));
    }
    expect(await quote.dualShareGwp()).toContain(CC2_EXPECTATIONS.dualShareGwp);
  });

  } // end non-resume (submission → premiums)

  if (process.env.CC2_SKIP_BINDERS !== '1') {
    await test.step('Select binders per coverage (Accelerant ×3 + Allianz for PD)', async () => {
      await binders.selectAllBinders();
    });
  }

  if (process.env.CC2_SKIP_RBS !== '1') {
    await test.step('RBS full approval (reasons, carrier, Approved)', async () => {
      await rbs.approveFirstRbs(cc2QuoteId);
    });

    await test.step('RBS — Confirm No Manual RBS Referral Reasons (all sections)', async () => {
      await status.confirmNoManualRbsReferralReasons();
    });
  }

  if (process.env.CC2_SKIP_CLAUSES !== '1') {
    await test.step('Save predefined binder clause (doc-style single tick — non-fatal)', async () => {
      await saveCc2PredefinedClauses(page);
    });
  }

  if (process.env.CC2_SKIP_FEE !== '1') {
    await test.step('Add 2 fees (Survey + org-mandated DUAL DNA+)', async () => {
      for (const fee of [CC2_FEE, CC2_DNA_FEE]) {
        console.log(`[cc2] adding fee: ${fee.type} / ${fee.subType}`);
        const clausesFees = new ClausesFeesPage(page, fee);
        await clausesFees.addFee(cc2QuoteId, loginUser);
        const rec = await sfQueryOne(
          loginUser,
          `SELECT Id FROM Fee__c WHERE Quote__c = '${cc2QuoteId}' AND Sub_Type__c = '${fee.subType}' LIMIT 1`
        );
        expect(rec?.Id, `fee ${fee.subType} did not persist`).toBeTruthy();
      }
    });
  }

  if (process.env.CC2_SKIP_ERN !== '1') {
    await test.step('Set ERN exempt', async () => {
      // Fresh navigation first: by this point the console holds several
      // workspace tabs and clickVisibleTab('Details') can hit a stale one,
      // leaving the ERN pencil unreachable (run-1 failure mode).
      await page.goto(`/lightning/r/Quote/${cc2QuoteId}/view`);
      await waitForSpinners(page);
      await closeAllWorkspaceTabs(page);
      await page.goto(`/lightning/r/Quote/${cc2QuoteId}/view`);
      await waitForSpinners(page);
      await status.setErnExempt();
    });
  }

  await test.step('Mark "Quote Issued" (In Progress → Ready → Issued, REST-verified)', async () => {
    await markCc2QuoteIssued(page, status, cc2QuoteId, loginUser);
    console.log(
      `[cc2] quote ${cc2QuoteId} reached Status "Issued"; DUAL Share GWP: ` +
        `${await quote.dualShareGwp().catch(() => 'n/a')}`
    );
    // Doc scope ends here — no sanction check, no Bound, no Create Policy.
  });
});
