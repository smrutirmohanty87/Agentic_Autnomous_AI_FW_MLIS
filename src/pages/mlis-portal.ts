import { expect, Page } from '@playwright/test';
import { getMlisPortalUrl } from '../config/env';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto(getMlisPortalUrl());
  }

  async login(email: string, password: string) {
    await this.page.getByRole('textbox', { name: 'Email address' }).fill(email);
    await this.page.getByRole('textbox', { name: 'Password' }).fill(password);

    const loginLink = this.page.getByRole('link', { name: /^Login$/i }).first();
    const loginButton = this.page.getByRole('button', { name: /^Login$/i }).first();

    if (await loginLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loginLink.click();
    } else {
      await loginButton.click();
    }

    // Keep login lightweight; QuoteManagerPage.expectLoaded() performs robust post-login checks.
    await this.page.waitForLoadState('domcontentloaded');
  }
}

export class QuoteManagerPage {
  constructor(private readonly page: Page) {}

  private async dismissBlockingDialogIfVisible() {
    const modal = this.page.locator('[role="dialog"]:visible, .slds-modal.slds-fade-in-open:visible').first();
    if (!(await modal.isVisible({ timeout: 2000 }).catch(() => false))) {
      return;
    }

    const closeButton = modal
      .locator('button:has-text("Close"), button[title*="Close"], button.slds-button_icon, button[aria-label*="Close"]')
      .first();

    if (await closeButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await closeButton.click().catch(() => undefined);
    } else {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }

    await expect(modal).toBeHidden({ timeout: 10000 }).catch(() => undefined);
  }

  async expectLoaded() {
    await this.acceptCookiesIfVisible();
    await this.dismissBlockingDialogIfVisible();

    const quoteManagerHeading = this.page.getByRole('heading', { name: /Quote manager/i }).first();
    const startQuoteLink = this.page.getByRole('link', { name: /Start quote/i }).first();
    const startNewQuoteHeading = this.page.getByRole('heading', { name: /Start new quote/i }).first();
    const searchAllFields = this.page.getByRole('textbox', { name: /Search all fields/i }).first();
    const quoteManagerNav = this.page.getByRole('link', { name: /^Quote manager$/i }).first();

    const headingVisible = await quoteManagerHeading.isVisible({ timeout: 60000 }).catch(() => false);
    if (!headingVisible) {
      await expect(
        startQuoteLink
          .or(startNewQuoteHeading)
          .or(searchAllFields)
          .or(quoteManagerNav)
          .first(),
      ).toBeVisible({ timeout: 120000 });
    }
  }

  async acceptCookiesIfVisible() {
    const acceptCookies = this.page.getByRole('button', { name: 'ACCEPT ALL' });
    if (await acceptCookies.isVisible({ timeout: 5000 }).catch(() => false)) {
      await acceptCookies.click();
    }
  }

  async startResidentialEnglandWalesQuote() {
    const startQuote = this.page.getByRole('link', { name: 'England & Wales Start quote' }).first();
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await this.acceptCookiesIfVisible();
      await this.dismissBlockingDialogIfVisible();
      try {
        await startQuote.click({ timeout: 12000 });
        break;
      } catch (error) {
        if (attempt === 4) {
          throw error;
        }
        await this.page.waitForTimeout(1000);
      }
    }
    await expect(this.page).toHaveURL(/quoteType=Residential&jurisdiction=EnglandAndWales/, { timeout: 20000 });
  }
}

export class ProductSelectionPage {
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

    const digitsOnly = limit.replace(/[^0-9]/g, '');
    const withCommas = digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    await expect(limitInput).toHaveValue(new RegExp(`(${withCommas}|${digitsOnly})(\\.00)?`));
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

export class StatementsOfFactPage {
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
      const currentButton = confirmButtons.first();
      await currentButton.scrollIntoViewIfNeeded();

      for (let clickAttempt = 1; clickAttempt <= 4; clickAttempt += 1) {
        await this.waitForLoadingOverlayToClear();
        try {
          await currentButton.click({ timeout: 7000 });
          break;
        } catch (error) {
          if (clickAttempt === 4) {
            throw error;
          }
          await this.page.waitForTimeout(750);
        }
      }

      await expect(confirmButtons).toHaveCount(remaining - 1, { timeout: 10000 });
      remaining = await confirmButtons.count();
      safety += 1;
    }

    await expect(confirmButtons).toHaveCount(0, { timeout: 10000 });
  }

  async proceed() {
    await this.page.getByRole('button', { name: 'Proceed' }).click();
  }
}

export class QuotesPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Loading...').first()).toBeHidden({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: 'Quote summary' }).first()).toBeVisible({ timeout: 60000 });
    const firstSelectQuote = this.page.getByRole('button', { name: 'Select quote' }).first();
    await expect(firstSelectQuote).toBeVisible({ timeout: 60000 });
    await expect(firstSelectQuote).toBeEnabled({ timeout: 60000 });
  }

  async selectFirstQuote() {
    await this.page.getByRole('button', { name: 'Select quote' }).first().click();
  }
}

export class FinalPolicyDetailsPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Loading...').first()).toBeHidden({ timeout: 20000 });
    await expect(this.page.getByRole('heading', { name: 'Final policy details' })).toBeVisible({ timeout: 20000 });
  }

  async fillRequiredDetails(data?: {
    insuredName?: string;
    postcode?: string;
    addressLine1?: string;
    town?: string;
    landRegisterNumber?: string;
  }) {
    let requiredInputs = this.page.locator('input[required]');

    await requiredInputs.nth(0).fill(data?.insuredName ?? 'E2E Test Client');

    const postcodeInput = requiredInputs.nth(1);
    await postcodeInput.fill(data?.postcode ?? 'EC3A 2BJ');
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
    await requiredInputs.nth(2).fill(data?.addressLine1 ?? '52-54 Leadenhall Street');
    await requiredInputs.nth(3).fill(data?.town ?? 'London');

    if (data?.landRegisterNumber) {
      const landRegisterInput = this.page
        .getByRole('textbox', { name: /(Land\s*register|Land\s*registry|Title\s*(number|no\.?))/i })
        .first();

      if (await landRegisterInput.isVisible({ timeout: 1500 }).catch(() => false)) {
        await landRegisterInput.fill(data.landRegisterNumber);
      }
    }
  }

  async proceed() {
    await this.page.getByRole('button', { name: 'Proceed' }).click();
  }
}

export class SummaryPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Loading...').first()).toBeHidden({ timeout: 20000 });
    await expect(this.page.getByRole('heading', { name: 'Summary' })).toBeVisible({ timeout: 20000 });
  }

  async expectSummaryData(
    caseRef: string,
    expected?: {
      limitOfIndemnity?: string;
      insuredName?: string;
      addressLine1?: string;
    },
  ) {
    await expect(this.page.getByText(caseRef)).toBeVisible();

    const limitDigits = (expected?.limitOfIndemnity ?? '500000').replace(/[^0-9]/g, '');
    const limitNumber = Number(limitDigits || '0');
    const formattedLimit = limitNumber.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    await expect(this.page.getByText(`£${formattedLimit}`)).toBeVisible();

    await expect(this.page.getByText(expected?.insuredName ?? 'E2E Test Client')).toBeVisible();
    await expect(this.page.getByText(expected?.addressLine1 ?? '52-54 Leadenhall Street')).toBeVisible();
    await expect(this.page.getByText('Premium: £')).toBeVisible();
  }

  async proceedToOrder() {
    await this.page.getByRole('button', { name: 'Proceed to order' }).click();
  }
}

export class OrderDialog {
  constructor(private readonly page: Page) {}

  async selectTodayAndOrder() {
    await this.page.getByRole('textbox', { name: 'Confirm policy commencement' }).click();
    await this.page.getByRole('button', { name: 'Today' }).click();
    await expect(this.page.getByRole('button', { name: 'Order now' })).toBeEnabled();
    await this.page.getByRole('button', { name: 'Order now' }).click();
  }
}

export class PolicyIssuedPage {
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

  async getIssuedPolicyNumber() {
    const policyLabel = this.page.locator('strong', { hasText: 'Policy number' });
    await expect(policyLabel).toBeVisible({ timeout: 20000 });
    const policyText = (await policyLabel.locator('xpath=following::p[1]').first().textContent())?.trim();
    expect(policyText ?? '').toMatch(/[A-Z]{2,}-[A-Z]{2,}-\d{6,}/);
    return policyText as string;
  }

  async backToQuoteManager() {
    await this.page.getByRole('button', { name: 'Back to quote manager' }).click();
  }
}
