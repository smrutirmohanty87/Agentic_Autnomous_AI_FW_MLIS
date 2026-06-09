import { expect, Page } from '@playwright/test';
import { getMlisPortalUrl } from '../config/env';
import { smartClick, smartFill } from '../ai/smartActions';

export class ScotlandCommercialLoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto(getMlisPortalUrl());
  }

  async login(email: string, password: string) {
    await smartFill(this.page, 'MLIS Email address', email, { context: 'ScotlandCommercialLogin' });
    await smartFill(this.page, 'MLIS Password', password, { context: 'ScotlandCommercialLogin' });
    await smartClick(this.page, 'MLIS Login', { context: 'ScotlandCommercialLogin' });
  }
}

export class ScotlandCommercialQuoteManagerPage {
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

  async startCommercialScotlandQuote() {
    await this.acceptCookiesIfVisible();
    try {
      await smartClick(this.page, 'MLIS Commercial Scotland Start quote', {
        context: 'ScotlandCommercialQuoteManager',
        nth: 1,
        firstMatchOnly: false,
        timeoutMs: 20000,
      });
    } catch {
      const modalCloseButton = this.page.locator('button[title="Close"], .slds-modal__close').first();
      if (await modalCloseButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await modalCloseButton.click().catch(() => undefined);
      }
      await this.page.keyboard.press('Escape').catch(() => undefined);

      // Retry via smartClick so memory can still be updated.
      await smartClick(this.page, 'MLIS Commercial Scotland Start quote', {
        context: 'ScotlandCommercialQuoteManager',
        nth: 1,
        firstMatchOnly: false,
        timeoutMs: 30000,
      });
    }
    await expect(this.page).toHaveURL(/quoteType=Commercial&jurisdiction=Scotland/, { timeout: 20000 });
  }
}

export class ScotlandCommercialProductSelectionPage {
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
    await smartFill(this.page, 'MLIS Commercial Case reference', caseRef, { context: 'ScotlandCommercialProductSelection' });
    await this.page.keyboard.press('Tab').catch(() => undefined);

    await smartFill(this.page, 'MLIS Commercial Limit of indemnity', limit, { context: 'ScotlandCommercialProductSelection' });
    await this.page.keyboard.press('Tab').catch(() => undefined);
    await expect(this.page.getByRole('spinbutton', { name: 'Limit of indemnity' })).toHaveValue(/500,000\.00|500000/);
  }

  async selectProductsByIndex(indexes: number[]) {
    await expect(this.page.getByRole('button', { name: 'Select' }).first()).toBeEnabled({ timeout: 10000 });

    for (let i = 0; i < indexes.length; i += 1) {
      await smartClick(this.page, 'MLIS Commercial Product Select', {
        context: 'ScotlandCommercialProductSelection',
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
    await smartClick(this.page, 'MLIS Commercial Proceed', { context: 'ScotlandCommercialProductSelection' });
  }
}

export class ScotlandCommercialStatementsOfFactPage {
  constructor(private readonly page: Page) {}

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
      await confirmButtons.first().scrollIntoViewIfNeeded();
      await smartClick(this.page, 'MLIS Commercial Statements Confirm', { context: 'ScotlandCommercialStatements' });
      await expect(confirmButtons).toHaveCount(remaining - 1, { timeout: 10000 });
      remaining = await confirmButtons.count();
      safety += 1;
    }

    await expect(confirmButtons).toHaveCount(0, { timeout: 10000 });
  }

  async proceed() {
    await smartClick(this.page, 'MLIS Commercial Proceed', { context: 'ScotlandCommercialStatements' });
  }
}

export class ScotlandCommercialQuotesPage {
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
    await smartClick(this.page, 'MLIS Commercial Select quote', { context: 'ScotlandCommercialQuotes' });
  }
}

export class ScotlandCommercialFinalPolicyDetailsPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Loading...').first()).toBeHidden({ timeout: 20000 });
    await expect(this.page.getByRole('heading', { name: 'Final policy details' })).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByRole('button', { name: /^4\s*Final policy details$/i }).first()).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByRole('button', { name: /^Proceed$/i }).first()).toBeVisible({ timeout: 20000 });
  }

  async fillRequiredDetails() {
    let requiredInputs = this.page.locator('input[required]');

    await smartFill(this.page, 'MLIS Commercial Final details required input', 'E2E Test Client', {
      context: 'ScotlandCommercialFinalDetails',
      nth: 0,
      firstMatchOnly: false,
    });

    await smartFill(this.page, 'MLIS Commercial Final details required input', 'EC3A 2BJ', {
      context: 'ScotlandCommercialFinalDetails',
      nth: 1,
      firstMatchOnly: false,
    });
    await this.page.keyboard.press('Tab').catch(() => undefined);

    const enterManually = this.page
      .getByRole('button', { name: /enter manually/i })
      .or(this.page.getByRole('link', { name: /enter manually/i }))
      .first();

    if (await enterManually.isVisible({ timeout: 2000 }).catch(() => false)) {
      await smartClick(this.page, 'MLIS Commercial Enter manually', { context: 'ScotlandCommercialFinalDetails' });
    }

    requiredInputs = this.page.locator('input[required]');
    await expect(requiredInputs.nth(2)).toBeVisible({ timeout: 20000 });
    await smartFill(this.page, 'MLIS Commercial Final details required input', '52-54 Leadenhall Street', {
      context: 'ScotlandCommercialFinalDetails',
      nth: 2,
      firstMatchOnly: false,
    });
    await smartFill(this.page, 'MLIS Commercial Final details required input', 'London', {
      context: 'ScotlandCommercialFinalDetails',
      nth: 3,
      firstMatchOnly: false,
    });
  }

  async proceed() {
    await smartClick(this.page, 'MLIS Commercial Proceed', { context: 'ScotlandCommercialFinalDetails' });
  }
}

export class ScotlandCommercialSummaryPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Loading...').first()).toBeHidden({ timeout: 20000 });
    await expect(this.page.getByRole('heading', { name: 'Summary' })).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByRole('button', { name: /^5\s*Summary$/i }).first()).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByRole('button', { name: /^Proceed to order$/i }).first()).toBeVisible({ timeout: 20000 });
  }

  async expectSummaryData(caseRef: string) {
    await expect(this.page.getByText(caseRef)).toBeVisible();
    await expect(this.page.getByText('£500,000.00')).toBeVisible();
    await expect(this.page.getByText('E2E Test Client')).toBeVisible();
    await expect(this.page.getByText('52-54 Leadenhall Street')).toBeVisible();
    await expect(this.page.getByText('Premium: £')).toBeVisible();
  }

  async proceedToOrder() {
    await smartClick(this.page, 'MLIS Commercial Proceed to order', { context: 'ScotlandCommercialSummary' });
  }
}

export class ScotlandCommercialOrderDialog {
  constructor(private readonly page: Page) {}

  async selectTodayAndOrder() {
    await smartClick(this.page, 'MLIS Commercial Confirm policy commencement', { context: 'ScotlandCommercialOrderDialog' });
    await smartClick(this.page, 'MLIS Commercial Today', { context: 'ScotlandCommercialOrderDialog' });
    await expect(this.page.getByRole('button', { name: 'Order now' })).toBeEnabled();
    await smartClick(this.page, 'MLIS Commercial Order now', { context: 'ScotlandCommercialOrderDialog' });
  }
}

export class ScotlandCommercialPolicyIssuedPage {
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
    await smartClick(this.page, 'MLIS Commercial Back to quote manager', { context: 'ScotlandCommercialPolicyIssued' });
  }
}
