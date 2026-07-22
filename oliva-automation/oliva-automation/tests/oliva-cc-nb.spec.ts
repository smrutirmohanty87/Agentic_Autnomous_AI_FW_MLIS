import { test, expect } from '@playwright/test';
import { jwtLogin, sfQueryOne } from '../src/auth/sfJwt';
import { waitForSpinners, closeAllWorkspaceTabs } from '../src/utils/sf';
import { AccountsPage } from '../src/pages/AccountsPage';
import { SubmissionWizardPage } from '../src/pages/SubmissionWizardPage';
import { SubmissionPage } from '../src/pages/SubmissionPage';
import { QuoteWizardPage } from '../src/pages/QuoteWizardPage';
import { QuotePage } from '../src/pages/QuotePage';
import { OmniScriptFormPage } from '../src/pages/OmniScriptFormPage';
import { PremiumPage } from '../src/pages/PremiumPage';
import { BindersPage } from '../src/pages/BindersPage';
import { RbsApprovalPage } from '../src/pages/RbsApprovalPage';
import { ClausesFeesPage } from '../src/pages/ClausesFeesPage';
import { QuoteStatusPage } from '../src/pages/QuoteStatusPage';
import { PolicyPage } from '../src/pages/PolicyPage';
import { renoIssueAndBond } from '../src/flows/renoIssueAndBond';
import {
  CC_ACCOUNT, CC_CLIENT_INFO, CC_RISK_INFO, CC_INSURABLE,
  CC_PRODUCT_FORM, CC_COVERAGES, CC_PREMIUMS, CC_MINIMUM_DEPOSIT,
  CC_BINDER, CC_FEES, CC_UAL, CC_USERS, CC_POLICY_EXPECTATIONS,
} from '../src/data/ccData';

/**
 * End-to-end: Oliva "Contractors Combined" (CONC) New Business policy on the
 * newprodqa2 sandbox. JWT auth (no password/MFA). Reuses the Renovation/CARP
 * framework: generic OmniScript engine for the 5-step questionnaire + the ONE
 * coverage (Public & Products Liability, 2 steps), name-aware binder selection
 * (four binders offered — must pick "Accelerant Construction & Commercial
 * 2026"), FULL per-RBS approval + bulk confirm, three fees, Path-driven
 * issue/bond, Create Policy.
 */
test('create Contractors Combined NB policy end-to-end', async ({ page, browser }) => {
  test.setTimeout(45 * 60 * 1000);

  const accounts = new AccountsPage(page);
  const wizard = new SubmissionWizardPage(page);
  const submission = new SubmissionPage(page);
  const quoteWizard = new QuoteWizardPage(page);
  const quote = new QuotePage(page);
  const forms = new OmniScriptFormPage(page);
  const premiums = new PremiumPage(page);
  const binders = new BindersPage(page, CC_BINDER);
  const rbs = new RbsApprovalPage(page);
  const status = new QuoteStatusPage(page, CC_UAL);
  const policy = new PolicyPage(page);

  // The source doc runs the whole flow as UW5; default stays UW3 (exercises
  // the conditional UAL referral branch). CC_LOGIN_USER=uw5 → doc-exact run.
  const loginUser = process.env.CC_LOGIN_USER === 'uw5' ? CC_USERS.uw5 : CC_USERS.uw3;

  await test.step(`Login as Construction ${process.env.CC_LOGIN_USER === 'uw5' ? 'UW5' : 'UW3'} (JWT — no MFA)`, async () => {
    await jwtLogin(page, loginUser);
  });

  // Fast-iteration escape hatch: CC_QUOTE_ID resumes at binders on an existing
  // quote (which must already have the coverage + premiums entered).
  const resumeQuoteId = process.env.CC_QUOTE_ID;
  let ccQuoteId = resumeQuoteId ?? '';
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
      `SELECT Id FROM Account WHERE Name = '${CC_ACCOUNT.name}' LIMIT 1`
    );
    if (!acc?.Id) throw new Error(`Account not found: ${CC_ACCOUNT.name}`);
    await page.goto(`/lightning/r/Account/${acc.Id}/view`);
    await waitForSpinners(page);
    await accounts.startNewOlivaSubmission();
  });

  await test.step('Complete submission wizard', async () => {
    await wizard.fillSubmissionSource(CC_ACCOUNT.intermediaryContact);
    await wizard.fillClientInformation(CC_CLIENT_INFO as never);
    // Doc image 4: Quote Required by Date = Date Submission Received (same day).
    await wizard.fillRiskInformation({ ...CC_RISK_INFO, quoteRequiredOffsetDays: 0 } as never);
    await wizard.submitClaimsHistory();
    expect(await submission.riskId()).toMatch(/DOU\/\d+\/CONC\/\d+/);
  });

  await test.step('Create quote', async () => {
    await submission.createNewQuote();
    await quoteWizard.completeWizard();
    const m = page.url().match(/\/Quote\/(0Q0[A-Za-z0-9]+)\//);
    if (!m?.[1]) {
      throw new Error(`Could not parse quote id from URL: ${page.url()}`);
    }
    ccQuoteId = m[1];
    console.log(`[cc] clean quote id for resume: ${ccQuoteId}`);
  });

  await test.step('Fill Contractors Combined questionnaire (5 steps)', async () => {
    await quote.editRenovationProductQuestions('Contractors Combined');
    await forms.fill(CC_PRODUCT_FORM);
  });

  await test.step('Add Public & Products Liability coverage', async () => {
    for (const cov of CC_COVERAGES) {
      await quote.addRenoCoverage(CC_INSURABLE.insurableName, cov.addRowName);
      await forms.fill(cov.form);
    }
  });

  await test.step('Enter premiums (Minimum & Deposit = Yes)', async () => {
    await quote.clickEnterPremiums();
    await premiums.answerMinimumDeposit(CC_MINIMUM_DEPOSIT);
    await premiums.fillAndSubmit(CC_PREMIUMS);
  });

  } // end non-resume (submission → premiums)

  if (process.env.CC_SKIP_BINDERS !== '1') {
    await test.step('Select binder (Accelerant Construction & Commercial 2026)', async () => {
      await binders.selectAllBinders();
    });
  }

  if (process.env.CC_SKIP_RBS !== '1') {
    await test.step('RBS full approval (reasons, carrier, Approved)', async () => {
      await rbs.approveFirstRbs(ccQuoteId);
    });

    await test.step('RBS — Confirm No Manual RBS Referral Reasons', async () => {
      await status.confirmNoManualRbsReferralReasons();
    });
  }

  if (process.env.CC_SKIP_FEE !== '1') {
    await test.step('Add 3 fees', async () => {
      for (const fee of CC_FEES) {
        console.log(`[cc] adding fee: ${fee.type} / ${fee.subType}`);
        const clausesFees = new ClausesFeesPage(page, fee);
        await clausesFees.addFee(ccQuoteId, loginUser);
      }
    });
  }

  if (process.env.CC_SKIP_ERN !== '1') {
    await test.step('Set ERN exempt', async () => {
      await status.setErnExempt();
    });
  }

  await test.step('Issue and bond (with conditional UW5/UAL branch)', async () => {
    await renoIssueAndBond(page, browser, status);
  });

  let policyNumber = '';
  await test.step('Create policy', async () => {
    policyNumber = await status.createPolicy();
    expect(policyNumber).not.toEqual('');
    await status.goToPolicy();
  });

  await test.step('Assert policy record', async () => {
    await policy.assertState(CC_POLICY_EXPECTATIONS.status, CC_POLICY_EXPECTATIONS.newMtaRenewal, {
      product: CC_POLICY_EXPECTATIONS.product,
      riskIdPattern: CC_POLICY_EXPECTATIONS.riskIdPattern,
    });
    console.log(`Contractors Combined policy created: ${policyNumber}`);
  });
});
