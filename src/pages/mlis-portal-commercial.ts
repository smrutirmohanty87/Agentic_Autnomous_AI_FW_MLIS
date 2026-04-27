import { expect, Page } from '@playwright/test';
import { getMlisPortalUrl } from '../config/env';

export class CommercialLoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto(getMlisPortalUrl());
  }

  async login(email: string, password: string) {
    await this.page.getByRole('textbox', { name: 'Email address' }).fill(email);
    await this.page.getByRole('textbox', { name: 'Password' }).fill(password);
    await this.page.getByRole('link', { name: 'Login' }).click();
  }
}

export class CommercialQuoteManagerPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await this.acceptCookiesIfVisible();
    await expect(this.page.getByRole('heading', { name: 'Quote manager' })).toBeVisible({ timeout: 20000 });
  }

  async acceptCookiesIfVisible() {
    const acceptCookies = this.page.getByRole('button', { name: 'ACCEPT ALL' });
    if (await acceptCookies.isVisible()) {
      await acceptCookies.click();
    }
  }

  async startCommercialEnglandWalesQuote() {
    await this.page.getByRole('link', { name: 'England & Wales Start quote' }).nth(1).click();
    await expect(this.page).toHaveURL(/quoteType=Commercial&jurisdiction=EnglandAndWales/, { timeout: 20000 });
  }
}

export class CommercialProductSelectionPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByRole('textbox', { name: 'My case reference/ file number' })).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByRole('heading', { name: 'Product selection' })).toBeVisible({ timeout: 20000 });
  }

  async fillCaseReferenceAndLimit(caseRef: string, limit: string) {
    const caseRefInput = this.page.getByRole('textbox', { name: 'My case reference/ file number' });
    await caseRefInput.fill(caseRef);
    await caseRefInput.press('Tab');

    const limitInput = this.page.getByRole('spinbutton', { name: 'Limit of indemnity' });
    await limitInput.fill(limit);
    await limitInput.press('Tab');
    await expect(limitInput).toHaveValue(/500,000\.00|500000/);
  }

  async selectProductsByIndex(indexes: number[]) {
    const selectButtons = this.page.getByRole('button', { name: 'Select' });
    const proceedButton = this.page.getByRole('button', { name: 'Proceed' }).first();

    await expect(selectButtons.first()).toBeEnabled({ timeout: 10000 });

    for (let i = 0; i < indexes.length; i += 1) {
      await selectButtons.nth(indexes[i]).click();
      if (i === 0) {
        await this.page.keyboard.press('End');
        await expect(proceedButton).toBeVisible({ timeout: 10000 });
      }
    }
  }

  async proceed() {
    await this.page.getByRole('button', { name: 'Proceed' }).first().click();
  }
}

export class CommercialStatementsOfFactPage {
  constructor(private readonly page: Page) {}

  private async waitForLoadingOverlayToClear() {
    const overlay = this.page.locator('.loading-overlay:visible').first();
    if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(overlay).toBeHidden({ timeout: 20000 });
    }
  }

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { name: /statements of fact to agree/i })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Confirm', exact: true }).first()).toBeVisible({ timeout: 20000 });
  }

  async confirmAllStatements() {
    const confirmButtons = this.page.getByRole('button', { name: 'Confirm', exact: true });
    await expect(confirmButtons.first()).toBeVisible({ timeout: 20000 });
    let remaining = await confirmButtons.count();
    let safety = 0;

    while (remaining > 0 && safety < 50) {
      await confirmButtons.first().scrollIntoViewIfNeeded();
      await confirmButtons.first().click();
      await expect(confirmButtons).toHaveCount(remaining - 1, { timeout: 10000 });
      remaining = await confirmButtons.count();
      safety += 1;
    }

    await expect(confirmButtons).toHaveCount(0, { timeout: 10000 });
  }

  async proceed() {
    await this.page.getByRole('button', { name: 'Proceed' }).click();
  }

  async proceedWithReferral() {
    const cannotConfirmButtons = this.page
      .getByRole('button', { name: /Cannot\s*confirm/i })
      .filter({ hasNotText: /Proceed with referral/i });

    await expect(cannotConfirmButtons.first()).toBeVisible({ timeout: 30000 });
    const totalStatements = await cannotConfirmButtons.count();
    for (let i = 0; i < totalStatements; i += 1) {
      const currentButton = cannotConfirmButtons.nth(i);
      await currentButton.scrollIntoViewIfNeeded();

      for (let clickAttempt = 1; clickAttempt <= 4; clickAttempt += 1) {
        await this.waitForLoadingOverlayToClear();
        try {
          await currentButton.click({ timeout: 10000 });
          break;
        } catch (error) {
          if (clickAttempt === 4) {
            throw error;
          }
          await this.page.waitForTimeout(750);
        }
      }
    }

    const proceedWithReferralButton = this.page
      .getByRole('button', { name: /Proceed\s+with\s+ref+err?al/i })
      .first();

    await proceedWithReferralButton.scrollIntoViewIfNeeded();
    await expect(proceedWithReferralButton).toBeVisible({ timeout: 30000 });
    await expect(proceedWithReferralButton).toBeEnabled({ timeout: 30000 });
    await proceedWithReferralButton.click();
  }
}

export class CommercialReferralDetailsPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { name: /Referral details/i })).toBeVisible({ timeout: 30000 });
    await expect(this.page.getByRole('button', { name: /Proceed\s+with\s+ref+err?al/i }).first()).toBeVisible({ timeout: 30000 });
  }

  async fillRequiredDetails() {
    const insuredName = this.page
      .locator('xpath=//*[contains(normalize-space(.), "Insured name(s) or name of mortgage lender if Lender Only cover")]/following::input[1]')
      .first();
    const insuredPostcode = this.page
      .locator('xpath=//*[contains(normalize-space(.), "Insured property postcode")]/following::input[1]')
      .first();
    const addressLine1 = this.page
      .locator('xpath=//*[contains(normalize-space(.), "Address line 1")]/following::input[1]')
      .first();
    const townCity = this.page
      .locator('xpath=//*[contains(normalize-space(.), "Town / city")]/following::input[1]')
      .first();
    const referralNotes = this.page
      .locator('xpath=//*[contains(normalize-space(.), "Let us know why you could not confirm statement")]/following::*[(self::textarea or self::input)][1]')
      .first();

    await expect(insuredName).toBeVisible({ timeout: 30000 });

    await insuredName.scrollIntoViewIfNeeded();
    await insuredName.fill('E2E Referral Client');

    await expect(insuredPostcode).toBeVisible({ timeout: 30000 });
    await insuredPostcode.scrollIntoViewIfNeeded();
    await insuredPostcode.fill('EC3A 2BJ');
    await insuredPostcode.press('Tab');

    await expect(addressLine1).toBeVisible({ timeout: 30000 });
    await addressLine1.scrollIntoViewIfNeeded();
    await addressLine1.fill('52-54 Leadenhall Street');

    await expect(townCity).toBeVisible({ timeout: 30000 });
    await townCity.scrollIntoViewIfNeeded();
    await townCity.fill('London');

    await expect(referralNotes).toBeVisible({ timeout: 30000 });
    await referralNotes.scrollIntoViewIfNeeded();
    await referralNotes.fill('Unable to confirm statements of fact - referral requested by automation test.');

    await expect(this.page.getByText(/Please enter a valid postcode/i)).toBeHidden({ timeout: 15000 });
  }

  async submitReferral() {
    const proceedWithReferralButton = this.page
      .getByRole('button', { name: /Proceed\s+with\s+ref+err?al/i })
      .first();

    await proceedWithReferralButton.scrollIntoViewIfNeeded();
    await expect(proceedWithReferralButton).toBeEnabled({ timeout: 30000 });
    await proceedWithReferralButton.click();
  }

  async expectReferralCompleted() {
    const quoteManagerHeading = this.page.getByRole('heading', { name: /Quote manager/i }).first();
    const submitHeading = this.page.getByRole('heading', { name: /Submit/i }).first();
    const confirmationText = this.page.getByText(/referred|underwriter|submitted/i).first();

    await expect(quoteManagerHeading.or(submitHeading).or(confirmationText).first()).toBeVisible({ timeout: 60000 });
  }
}

export class CommercialReferralSubmitPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    const referralSummaryHeading = this.page.getByRole('heading', { name: /Referral summary/i }).first();
    const submitStepButton = this.page.getByRole('button', { name: /^4\s*Submit$/i }).first();
    await expect(referralSummaryHeading.or(submitStepButton).first()).toBeVisible({ timeout: 30000 });
    await expect(this.page.getByRole('button', { name: /Submit\s+to\s+underwrit/i }).first()).toBeVisible({ timeout: 30000 });
  }

  async submitToUnderwriter() {
    const submitToUnderwriterButton = this.page.getByRole('button', { name: /Submit\s+to\s+underwrit/i }).first();
    await submitToUnderwriterButton.scrollIntoViewIfNeeded();
    await expect(submitToUnderwriterButton).toBeEnabled({ timeout: 30000 });
    await submitToUnderwriterButton.click();
  }
}

export class CommercialReferralSubmittedPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { name: /Referral submitted/i }).first()).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: /Back to quote manager/i }).first()).toBeVisible({ timeout: 60000 });
  }

  async backToQuoteManager() {
    const backToQuoteManagerButton = this.page.getByRole('button', { name: /Back to quote manager/i }).first();
    await backToQuoteManagerButton.scrollIntoViewIfNeeded();
    await backToQuoteManagerButton.click();
  }
}

export class CommercialQuotesPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Loading...').first()).toBeHidden({ timeout: 20000 });
    await expect(this.page.getByRole('button', { name: 'Quote summary' }).first()).toBeEnabled({ timeout: 20000 });
    const firstSelectQuote = this.page.getByRole('button', { name: 'Select quote' }).first();
    await expect(firstSelectQuote).toBeVisible({ timeout: 20000 });
    await expect(firstSelectQuote).toBeEnabled({ timeout: 20000 });
  }

  async selectFirstQuote() {
    await this.page.getByRole('button', { name: 'Select quote' }).first().click();
  }
}

export class CommercialFinalPolicyDetailsPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Loading...').first()).toBeHidden({ timeout: 20000 });
    await expect(this.page.getByRole('heading', { name: 'Final policy details' })).toBeVisible({ timeout: 20000 });
  }

  async fillRequiredDetails() {
    let requiredInputs = this.page.locator('input[required]');

    await requiredInputs.nth(0).fill('E2E Test Client');

    const postcodeInput = requiredInputs.nth(1);
    await postcodeInput.fill('EC3A 2BJ');
    await postcodeInput.press('Tab').catch(() => {});

    const enterManually = this.page
      .getByRole('button', { name: /enter manually/i })
      .or(this.page.getByRole('link', { name: /enter manually/i }))
      .first();

    if (await enterManually.isVisible({ timeout: 2000 }).catch(() => false)) {
      await enterManually.click();
    }

    requiredInputs = this.page.locator('input[required]');
    await expect(requiredInputs.nth(2)).toBeVisible({ timeout: 20000 });
    await requiredInputs.nth(2).fill('52-54 Leadenhall Street');
    await requiredInputs.nth(3).fill('London');
  }

  async proceed() {
    await this.page.getByRole('button', { name: 'Proceed' }).click();
  }
}

export class CommercialSummaryPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Loading...').first()).toBeHidden({ timeout: 20000 });
    await expect(this.page.getByRole('heading', { name: 'Summary' })).toBeVisible({ timeout: 20000 });
  }

  async expectSummaryData(caseRef: string) {
    await expect(this.page.getByText(caseRef)).toBeVisible();
    await expect(this.page.getByText('£500,000.00')).toBeVisible();
    await expect(this.page.getByText('E2E Test Client')).toBeVisible();
    await expect(this.page.getByText('52-54 Leadenhall Street')).toBeVisible();
    await expect(this.page.getByText('Premium: £')).toBeVisible();
  }

  async proceedToOrder() {
    await this.page.getByRole('button', { name: 'Proceed to order' }).click();
  }
}

export class CommercialOrderDialog {
  constructor(private readonly page: Page) {}

  async selectTodayAndOrder() {
    await this.page.getByRole('textbox', { name: 'Confirm policy commencement' }).click();
    await this.page.getByRole('button', { name: 'Today' }).click();
    await expect(this.page.getByRole('button', { name: 'Order now' })).toBeEnabled();
    await this.page.getByRole('button', { name: 'Order now' }).click();
  }
}

export class CommercialPolicyIssuedPage {
  constructor(private readonly page: Page) {}

  async expectPolicyIssued() {
    const processingDialog = this.page.getByRole('heading', { name: 'Processing Request' }).first();
    if (await processingDialog.isVisible()) {
      await expect(processingDialog).toBeHidden({ timeout: 60000 });
    }

    await expect(this.page.getByRole('heading', { name: 'Policy issued' })).toBeVisible({ timeout: 60000 });
    const policyLabel = this.page.locator('strong', { hasText: 'Policy number' });
    await expect(policyLabel).toBeVisible({ timeout: 20000 });
    const policyText = await policyLabel.locator('xpath=following::p[1]').first().textContent();
    expect(policyText ?? '').toMatch(/[A-Z]{2,}-[A-Z]{2,}-\d{6,}/);
  }

  async backToQuoteManager() {
    await this.page.getByRole('button', { name: 'Back to quote manager' }).click();
  }
}
