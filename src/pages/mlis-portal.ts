import { expect, Page } from '@playwright/test';
import { getMlisPortalUrl } from '../config/env';
import { smartClick, smartFill } from '../ai/smartActions';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto(getMlisPortalUrl());
  }

  async login(email: string, password: string) {
    await smartFill(this.page, 'MLIS Email address', email, { context: 'Login' });
    await smartFill(this.page, 'MLIS Password', password, { context: 'Login' });
    await smartClick(this.page, 'MLIS Login', { context: 'Login' });

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
    await this.acceptCookiesIfVisible();
    await this.dismissBlockingDialogIfVisible();
    await smartClick(this.page, 'MLIS England & Wales Start quote', { context: 'QuoteManager', timeoutMs: 20000 });
    await expect(this.page).toHaveURL(/quoteType=Residential&jurisdiction=EnglandAndWales/, { timeout: 20000 });
  }
}

export class ProductSelectionPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { name: 'Product selection' })).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByRole('textbox', { name: 'My case reference/ file number' })).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByRole('button', { name: /^1\s*Product selection$/i }).first()).toBeVisible({ timeout: 20000 });
    const firstSelect = this.page.getByRole('button', { name: /^Select$/i }).first();
    await expect(firstSelect).toBeVisible({ timeout: 20000 });
    await expect(firstSelect).toBeEnabled({ timeout: 20000 });
  }

  async fillCaseReferenceAndLimit(caseRef: string, limit: string) {
    await smartFill(this.page, 'MLIS Commercial Case reference', caseRef, { context: 'ProductSelection' });
    await this.page.keyboard.press('Tab').catch(() => undefined);

    await smartFill(this.page, 'MLIS Commercial Limit of indemnity', limit, { context: 'ProductSelection' });
    await this.page.keyboard.press('Tab').catch(() => undefined);

    const limitInput = this.page
      .getByRole('spinbutton', { name: /Limit of indemnity/i })
      .or(this.page.getByRole('textbox', { name: /Limit of indemnity/i }))
      .first();

    const digitsOnly = limit.replace(/[^0-9]/g, '');
    const withCommas = digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    await expect(limitInput).toHaveValue(new RegExp(`(${withCommas}|${digitsOnly})(\\.00)?`));
  }

  async selectProductsByIndex(indexes: number[]) {
    await expect(this.page.getByRole('button', { name: 'Select' }).first()).toBeEnabled({ timeout: 10000 });

    for (let i = 0; i < indexes.length; i += 1) {
      await smartClick(this.page, 'MLIS Commercial Product Select', {
        context: 'ProductSelection',
        nth: indexes[i],
        firstMatchOnly: false,
      });
      if (i === 0) {
        await this.page.keyboard.press('End');
        await expect(this.page.getByRole('button', { name: 'Proceed' }).first()).toBeVisible({ timeout: 10000 });
      }
    }
  }

  async proceed() {
    await smartClick(this.page, 'MLIS Commercial Proceed', { context: 'ProductSelection' });
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
    await expect(this.page.getByRole('button', { name: /^2\s*Statements of fact$/i }).first()).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByRole('button', { name: /^Proceed$/i }).first()).toBeVisible({ timeout: 20000 });
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
          await smartClick(this.page, 'MLIS Commercial Statements Confirm', { context: 'Statements' });
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
    await smartClick(this.page, 'MLIS Commercial Proceed', { context: 'Statements' });
  }
}

export class QuotesPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Loading...').first()).toBeHidden({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: /^3\s*Your quotes$/i }).first()).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('heading', { name: /quotes found/i }).first()).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: 'Quote summary' }).first()).toBeVisible({ timeout: 60000 });
    const firstSelectQuote = this.page.getByRole('button', { name: 'Select quote' }).first();
    await expect(firstSelectQuote).toBeVisible({ timeout: 60000 });
    await expect(firstSelectQuote).toBeEnabled({ timeout: 60000 });
  }

  async selectFirstQuote() {
    await smartClick(this.page, 'MLIS Commercial Select quote', { context: 'Quotes' });
  }
}

export class FinalPolicyDetailsPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Loading...').first()).toBeHidden({ timeout: 20000 });
    await expect(this.page.getByRole('heading', { name: 'Final policy details' })).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByRole('button', { name: /^4\s*Final policy details$/i }).first()).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByRole('button', { name: /^Proceed$/i }).first()).toBeVisible({ timeout: 20000 });
  }

  async fillRequiredDetails(data?: {
    insuredName?: string;
    postcode?: string;
    addressLine1?: string;
    town?: string;
    landRegisterNumber?: string;
  }) {
    let requiredInputs = this.page.locator('input[required]');

    await smartFill(this.page, 'MLIS Commercial Final details required input', data?.insuredName ?? 'E2E Test Client', {
      context: 'FinalDetails',
      nth: 0,
      firstMatchOnly: false,
    });

    await smartFill(this.page, 'MLIS Commercial Final details required input', data?.postcode ?? 'EC3A 2BJ', {
      context: 'FinalDetails',
      nth: 1,
      firstMatchOnly: false,
    });
    await this.page.keyboard.press('Tab').catch(() => undefined);

    const enterManually = this.page
      .getByRole('button', { name: /enter manually/i })
      .or(this.page.getByRole('link', { name: /enter manually/i }))
      .first();

    if (await enterManually.isVisible({ timeout: 2000 }).catch(() => false)) {
      await smartClick(this.page, 'MLIS Commercial Enter manually', { context: 'FinalDetails' });
    }

    requiredInputs = this.page.locator('input[required]');
    await expect(requiredInputs.nth(2)).toBeVisible({ timeout: 20000 });
    await smartFill(this.page, 'MLIS Commercial Final details required input', data?.addressLine1 ?? '52-54 Leadenhall Street', {
      context: 'FinalDetails',
      nth: 2,
      firstMatchOnly: false,
    });
    await smartFill(this.page, 'MLIS Commercial Final details required input', data?.town ?? 'London', {
      context: 'FinalDetails',
      nth: 3,
      firstMatchOnly: false,
    });

    if (data?.landRegisterNumber) {
      const landRegisterInput = this.page
        .getByRole('textbox', { name: /(Land\s*register|Land\s*registry|Title\s*(number|no\.?))/i })
        .first();

      if (await landRegisterInput.isVisible({ timeout: 1500 }).catch(() => false)) {
        await smartFill(this.page, 'MLIS Land register number', data.landRegisterNumber, { context: 'FinalDetails' });
      }
    }
  }

  async proceed() {
    await smartClick(this.page, 'MLIS Commercial Proceed', { context: 'FinalDetails' });
  }
}

export class SummaryPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Loading...').first()).toBeHidden({ timeout: 20000 });
    await expect(this.page.getByRole('heading', { name: 'Summary' })).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByRole('button', { name: /^5\s*Summary$/i }).first()).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByRole('button', { name: /^Proceed to order$/i }).first()).toBeVisible({ timeout: 20000 });
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
    await smartClick(this.page, 'MLIS Commercial Proceed to order', { context: 'Summary' });
  }
}

export class OrderDialog {
  constructor(private readonly page: Page) {}

  async selectTodayAndOrder() {
    await smartClick(this.page, 'MLIS Commercial Confirm policy commencement', { context: 'OrderDialog' });
    await smartClick(this.page, 'MLIS Commercial Today', { context: 'OrderDialog' });
    await expect(this.page.getByRole('button', { name: 'Order now' })).toBeEnabled();
    await smartClick(this.page, 'MLIS Commercial Order now', { context: 'OrderDialog' });
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
    await smartClick(this.page, 'MLIS Commercial Back to quote manager', { context: 'PolicyIssued' });
  }
}
