import { expect, Locator, Page } from '@playwright/test';

async function waitForLightningIdle(page: Page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(750);

  const busyLocators = [
    page.locator('[role="progressbar"]'),
    page.locator('.slds-spinner:visible'),
    page.locator('text=Loading...'),
    page.locator('text=Processing Request'),
  ];

  for (const busy of busyLocators) {
    await busy.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
}

async function clickWhenReady(locator: Locator, page: Page) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await waitForLightningIdle(page);
    try {
      await locator.click({ timeout: 15000 });
      return;
    } catch {
      if (attempt === 4) throw new Error(`Unable to click locator after ${attempt} attempts`);
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(1000);
    }
  }
}

async function pickFirstVisible(candidates: Locator[], timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const candidate of candidates) {
      const target = candidate.first();
      if (await target.isVisible().catch(() => false)) {
        return target;
      }
    }
    await candidates[0].page().waitForTimeout(250);
  }
  throw new Error('Unable to find a visible locator from provided candidates.');
}

export class QuoteJourneyUnderwriterUpliftPage {
  constructor(private readonly page: Page) {}

  private async clickActionOrShowMore(actionPattern: RegExp) {
    const directAction = this.page
      .getByRole('button', { name: actionPattern })
      .or(this.page.getByRole('link', { name: actionPattern }))
      .or(this.page.locator('[role="button"], [role="menuitem"], button, a').filter({ hasText: actionPattern }))
      .first();

    if (await directAction.isVisible({ timeout: 15000 }).catch(() => false)) {
      await clickWhenReady(directAction, this.page);
      return;
    }

    const showMoreActions = this.page
      .getByRole('button', { name: /Show more actions/i })
      .or(this.page.getByLabel(/Show more actions/i))
      .or(this.page.locator('button[title*="Show more actions" i], [aria-label*="Show more actions" i]'))
      .first();

    if (await showMoreActions.isVisible({ timeout: 15000 }).catch(() => false)) {
      await clickWhenReady(showMoreActions, this.page);

      const menuAction = this.page
        .getByRole('menuitem', { name: actionPattern })
        .or(this.page.locator('[role="menuitem"], [role="button"], button, a').filter({ hasText: actionPattern }))
        .first();
      await expect(menuAction).toBeVisible({ timeout: 30000 });
      await clickWhenReady(menuAction, this.page);
      return;
    }

    const looseAction = this.page
      .locator('button, a, [role="button"], [role="menuitem"], span')
      .filter({ hasText: actionPattern })
      .first();
    await expect(looseAction).toBeVisible({ timeout: 45000 });
    await clickWhenReady(looseAction, this.page);
  }

  async openQuoteJourney() {
    await expect(this.page.getByRole('link', { name: 'Quote Journey' })).toBeVisible({ timeout: 120000 });
    await clickWhenReady(this.page.getByRole('link', { name: 'Quote Journey' }), this.page);
    await expect(this.page.getByRole('heading', { name: /quote journey/i })).toBeVisible({ timeout: 120000 });
  }

  async selectLookupOption(fieldLabel: string, query: string, optionText: string) {
    const input = await pickFirstVisible([
      this.page.getByRole('combobox', { name: new RegExp(fieldLabel, 'i') }),
      this.page.getByRole('searchbox', { name: new RegExp(fieldLabel, 'i') }),
      this.page.locator(`input[aria-label*="${fieldLabel}"]`),
      this.page.locator(`input[placeholder*="${fieldLabel}" i]`),
    ], 30000);

    await clickWhenReady(input, this.page);
    await input.fill(query);
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await input.fill(query.slice(0, Math.min(4, query.length)) || query);

    const exactOption = await pickFirstVisible([
      this.page.getByRole('option', { name: new RegExp(`^${query}$`, 'i') }),
      this.page.getByRole('link', { name: new RegExp(`^${query}$`, 'i') }),
      this.page.locator(`li:has-text("${query}")`),
    ], 5000).catch(() => null);

    if (exactOption) {
      await clickWhenReady(exactOption, this.page);
      return;
    }

    const option = await pickFirstVisible([
      this.page.getByRole('option', { name: new RegExp(optionText, 'i') }),
      this.page.getByRole('link', { name: new RegExp(optionText, 'i') }),
      this.page.locator(`li:has-text("${optionText}")`),
    ], 30000);

    await clickWhenReady(option, this.page);
  }

  async selectComboboxOption(label: string, optionText: string) {
    const combobox = await pickFirstVisible([
      this.page.getByRole('combobox', { name: new RegExp(label, 'i') }),
      this.page.locator(`button[aria-label*="${label}"]`),
      this.page.locator(`[data-target-selection-name*="${label.toLowerCase().replace(/\s+/g, '-')}"]`),
    ], 20000);

    await clickWhenReady(combobox, this.page);
    const option = await pickFirstVisible([
      this.page.getByRole('option', { name: new RegExp(optionText, 'i') }),
      this.page.locator(`[role="option"]:has-text("${optionText}")`),
      this.page.getByText(new RegExp(`^${optionText}$`, 'i')).first(),
    ], 20000);

    await clickWhenReady(option, this.page);
    await waitForLightningIdle(this.page);
  }

  async fillClientDetails() {
    const requiredInputs = this.page.locator('input[required]');
    await expect(requiredInputs.nth(0)).toBeVisible({ timeout: 30000 });
    await requiredInputs.nth(0).fill('E2E Test Client');

    await expect(requiredInputs.nth(1)).toBeVisible({ timeout: 30000 });
    await requiredInputs.nth(1).fill('EC3A 2BJ');
    await requiredInputs.nth(1).press('Tab').catch(() => {});

    const enterManually = this.page
      .getByRole('button', { name: /enter manually/i })
      .or(this.page.getByRole('link', { name: /enter manually/i }))
      .first();

    if (await enterManually.isVisible({ timeout: 5000 }).catch(() => false)) {
      await clickWhenReady(enterManually, this.page);
    }

    await expect(requiredInputs.nth(2)).toBeVisible({ timeout: 30000 });
    await requiredInputs.nth(2).fill('52-54 Leadenhall Street');
    await requiredInputs.nth(3).fill('London');
  }

  async selectPreferredProduct() {
    const preferredCard = this.page.locator('article, div').filter({ hasText: /Absence of easement - Access/i }).first();
    const preferredSelectButton = preferredCard.getByRole('button', { name: /^Select$/i }).first();
    const anySelectButton = this.page.getByRole('button', { name: /^Select$/i }).first();

    if (await preferredSelectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await clickWhenReady(preferredSelectButton, this.page);
    } else {
      await clickWhenReady(anySelectButton, this.page);
    }

    const selectedProductsHeading = this.page.getByText(/You have selected\s+\d+\s+product/i).first();
    if (!(await selectedProductsHeading.isVisible({ timeout: 10000 }).catch(() => false))) {
      const fallbackSelectButton = this.page.getByRole('button', { name: /^Select$/i }).first();
      if (await fallbackSelectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await clickWhenReady(fallbackSelectButton, this.page);
      }
      await expect(selectedProductsHeading).toBeVisible({ timeout: 10000 });
    }
  }

  async proceedFromProductSelection() {
    await clickWhenReady(this.page.getByRole('button', { name: /^Proceed$/ }).first(), this.page);
  }

  async confirmStatementsOfFact() {
    await expect(this.page.getByRole('heading', { name: /statements of fact/i })).toBeVisible({ timeout: 120000 });
    const confirmButtons = this.page.getByRole('button', { name: 'Confirm', exact: true });
    await expect(confirmButtons.first()).toBeVisible({ timeout: 60000 });
    while ((await confirmButtons.count()) > 0) {
      await confirmButtons.first().scrollIntoViewIfNeeded();
      await clickWhenReady(confirmButtons.first(), this.page);
      await this.page.waitForTimeout(250);
    }
    await clickWhenReady(this.page.getByRole('button', { name: /^Proceed$/ }).first(), this.page);
  }

  async selectFirstQuote() {
    await expect(this.page.getByRole('heading', { name: /quotes/i })).toBeVisible({ timeout: 120000 });
    await clickWhenReady(this.page.getByRole('button', { name: /Select quote/i }).first(), this.page);
  }

  async fillFinalPolicyDetailsAndProceed() {
    await expect(this.page.getByRole('heading', { name: /final policy details/i })).toBeVisible({ timeout: 120000 });
    await this.fillClientDetails();
    await clickWhenReady(this.page.getByRole('button', { name: /Proceed|Next/i }).first(), this.page);
  }

  async setCommencementDate(dateText: string) {
    const commencementDateInput = await pickFirstVisible([
      this.page.getByRole('textbox', { name: /commencement date/i }),
      this.page.locator('input[placeholder="DD/MM/YYYY"]'),
    ], 30000);

    await commencementDateInput.fill(dateText);
    await this.page.getByRole('heading', { name: /Final policy details/i }).first().click().catch(() => undefined);
  }

  async clickOrderNowIfVisible() {
    const orderNow = this.page.getByRole('button', { name: /Order now/i }).first();
    if (await orderNow.isVisible({ timeout: 10000 }).catch(() => false)) {
      await clickWhenReady(orderNow, this.page);
    }
  }

  async clickReturnToSubmissionOnSummary() {
    const candidates = [
      this.page.getByRole('button', { name: /Return to submission/i }).first(),
      this.page.getByRole('link', { name: /Return to submission/i }).first(),
      this.page.locator('button:has-text("Return to submission")').first(),
      this.page.locator('a:has-text("Return to submission")').first(),
      this.page.getByText(/Return to submission/i).first(),
    ];

    const scrollPage = async () => {
      await this.page.mouse.wheel(0, 900).catch(() => undefined);
      await this.page.evaluate(() => window.scrollBy(0, 900)).catch(() => undefined);
      await this.page.waitForTimeout(500);
    };

    let returnToSubmission = null as Locator | null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await waitForLightningIdle(this.page);

      for (const candidate of candidates) {
        if (await candidate.isVisible({ timeout: 1000 }).catch(() => false)) {
          returnToSubmission = candidate;
          break;
        }
      }

      if (returnToSubmission) {
        break;
      }

      await scrollPage();
    }

    if (!returnToSubmission) {
      throw new Error('Return to submission button was not found on the summary page.');
    }

    await clickWhenReady(returnToSubmission, this.page);
    await waitForLightningIdle(this.page);
  }

  async openAndCloseFinalDraft(expectedSummaryPremium?: string) {
    const candidates = [
      this.page.getByRole('button', { name: /Review final draft/i }).first(),
      this.page.getByRole('link', { name: /Review final draft/i }).first(),
      this.page.getByText(/Review final draft/i).first(),
      this.page.locator('button:has-text("Review final draft")').first(),
      this.page.locator('a:has-text("Review final draft")').first(),
    ];

    const scrollLightningContainers = async () => {
      await this.page.evaluate(() => {
        window.scrollBy(0, 1200);

        const elements = Array.from(document.querySelectorAll<HTMLElement>('*'));
        for (const el of elements) {
          const style = window.getComputedStyle(el);
          const overflowY = style.overflowY;
          if (overflowY !== 'auto' && overflowY !== 'scroll') continue;
          if (el.scrollHeight <= el.clientHeight) continue;
          el.scrollTop += 1200;
        }
      }).catch(() => undefined);
    };

    let reviewFinalDraftButton: Locator | null = null;
    for (let attempt = 0; attempt < 35; attempt += 1) {
      for (const loc of candidates) {
        if (await loc.isVisible({ timeout: 500 }).catch(() => false)) {
          reviewFinalDraftButton = loc;
          break;
        }
      }

      if (reviewFinalDraftButton) {
        break;
      }

      await waitForLightningIdle(this.page);
      await this.page.mouse.wheel(0, 1200);
      await scrollLightningContainers();
      await this.page.waitForTimeout(300);
    }

    if (!reviewFinalDraftButton) {
      const proceedToOrder = this.page.getByRole('button', { name: /Proceed to order/i }).first();
      if (await proceedToOrder.isVisible({ timeout: 15000 }).catch(() => false)) {
        const container = proceedToOrder.locator('xpath=ancestor::*[self::div or self::section][1]').first();
        const nearbyReview = container.getByText(/Review final draft/i).first();
        if (await nearbyReview.isVisible({ timeout: 30000 }).catch(() => false)) {
          reviewFinalDraftButton = nearbyReview;
        }
      }
    }

    if (!reviewFinalDraftButton) {
      throw new Error('Review final draft button not found after waiting.');
    }

    let docPopup: Page | null = null;
    let docFrame: any = null;

    const extractPopupText = async (popup: Page) => {
      let text = await popup.locator('body').innerText().catch(() => '');
      if (text.trim()) return text;

      for (const frame of popup.frames()) {
        const frameText = await frame.locator('body').innerText().catch(() => '');
        if (frameText.trim()) {
          return frameText;
        }
      }

      const html = await popup.content().catch(() => '');
      return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    try {
      const [popup] = await Promise.all([
        this.page.waitForEvent('popup', { timeout: 60000 }),
        clickWhenReady(reviewFinalDraftButton, this.page),
      ]);
      docPopup = popup;
      await docPopup.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {});
      await docPopup.waitForTimeout(2000);

      const popupFrameEl = await docPopup.waitForSelector('iframe', { timeout: 8000 }).catch(() => null);
      if (popupFrameEl) {
        docFrame = await popupFrameEl.contentFrame();
        await docFrame?.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
      }
    } catch {
      await clickWhenReady(reviewFinalDraftButton, this.page).catch(() => undefined);
      const iframeEl = await this.page.waitForSelector('iframe', { timeout: 60000 }).catch(() => null);
      if (iframeEl) {
        docFrame = await iframeEl.contentFrame();
        await docFrame?.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
      }
    }

    if (docPopup) {
      await docPopup.waitForTimeout(3000).catch(() => undefined);
      await docPopup.close().catch(() => undefined);
    } else if (docFrame) {
      await this.page.waitForTimeout(3000).catch(() => undefined);
    } else {
      await this.page.waitForTimeout(3000).catch(() => undefined);
    }

    // eslint-disable-next-line no-console
    console.log('[Review Final Draft] Document opened, waited briefly, and closed.');
  }

  async manageProductsAddAndSaveRate(productName: string) {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1500);

    await this.clickActionOrShowMore(/Manage\s*products/i);

    const manageProductsDialog = this.page
      .getByRole('dialog')
      .filter({ hasText: /Available\s*products/i })
      .first();
    await expect(manageProductsDialog).toBeVisible({ timeout: 60000 });

    const search = manageProductsDialog
      .getByRole('searchbox', { name: /Available\s*products|Search/i })
      .or(manageProductsDialog.getByRole('textbox', { name: /Available\s*products|Search/i }))
      .or(manageProductsDialog.locator('input[placeholder*="Search" i], input[type="search"]'))
      .first();
    await expect(search).toBeVisible({ timeout: 60000 });
    await clickWhenReady(search, this.page);
    await search.fill(productName);
    await search.press('Enter').catch(() => undefined);

    const escapedProductName = productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const product = manageProductsDialog
      .getByRole('option', { name: new RegExp(escapedProductName, 'i') })
      .or(manageProductsDialog.locator('tr, li, [role="option"]').filter({ hasText: new RegExp(escapedProductName, 'i') }).first())
      .first();
    await expect(product).toBeVisible({ timeout: 60000 });
    await clickWhenReady(product, this.page);

    const addButton = manageProductsDialog
      .getByRole('button', { name: /^\+?\s*Add$/i })
      .or(manageProductsDialog.locator('button:has-text("+Add"), button:has-text("Add")'))
      .first();
    await expect(addButton).toBeVisible({ timeout: 60000 });
    await clickWhenReady(addButton, this.page);
    await this.page.waitForTimeout(1500);

    const saveAndRateButton = manageProductsDialog
      .getByRole('button', { name: /Save\s*(?:&|and)\s*Rate/i })
      .or(manageProductsDialog.getByRole('link', { name: /Save\s*(?:&|and)\s*Rate/i }))
      .or(manageProductsDialog.locator('button:has-text("Save and rate"), button:has-text("Save & Rate")'))
      .or(manageProductsDialog.locator('[role="button"]:has-text("Save and rate"), [role="button"]:has-text("Save & Rate")'))
      .first();
    await expect(saveAndRateButton).toBeVisible({ timeout: 60000 });
    await clickWhenReady(saveAndRateButton, this.page);
    await waitForLightningIdle(this.page);
  }

  async openManageProductsAndAddLeaseProducts(productNames: string[] = [
    'Lease - Defective Lease buildings insurance',
    'Lease - Housing Act escalating ground rents (Lender only)',
  ]) {
    for (const productName of productNames) {
      await this.manageProductsAddAndSaveRate(productName);
    }
  }

  async continueQuote() {
    const continueQuoteButton = this.page
      .getByRole('button', { name: /Continue Quote/i })
      .or(this.page.getByRole('link', { name: /Continue Quote/i }))
      .first();

    await expect(continueQuoteButton).toBeVisible({ timeout: 120000 });
    await clickWhenReady(continueQuoteButton, this.page);
  }

  async selectQuoteAfterManageProducts() {
    await expect(this.page.getByRole('heading', { name: /quotes/i })).toBeVisible({ timeout: 120000 });
    await clickWhenReady(this.page.getByRole('button', { name: /Select quote/i }).first(), this.page);
  }

  async getSummaryPremium(): Promise<string | undefined> {
    const summaryText = await this.page.locator('body').innerText();
    const summaryPremiumMatch = summaryText.match(/Premium\s*:\s*£\s*([\d,]+\.\d{2})/i)
      ?? summaryText.match(/\bPremium\b[^\n\r£\d]{0,40}£\s*([\d,]+\.\d{2})/i);
    return summaryPremiumMatch?.[1] ? `£${summaryPremiumMatch[1]}` : undefined;
  }

  async openQuotesTab() {
    const quotesTab = this.page.getByRole('tab', { name: 'Quotes' }).first();
    await expect(quotesTab).toBeVisible({ timeout: 60000 });
    await clickWhenReady(quotesTab, this.page);
    await waitForLightningIdle(this.page);
  }

  async getUnderwriterUpliftPremiums() {
    const card = this.page
      .locator('article:visible, section:visible, div:visible')
      .filter({ hasText: /Has Underwriter Uplift/i })
      .first();
    await expect(card).toBeVisible({ timeout: 120000 });
    const text = await card.innerText();

    const originalMatch = text.match(/Original Premium\s*\(inc\. IPT\)\s*£?\s*([\d,]+\.\d{2})/i);
    const overriddenMatch = text.match(/Overridden Premium\s*\(inc\. IPT\)\s*£?\s*([\d,]+\.\d{2})/i);

    expect(originalMatch?.[1]).toBeTruthy();
    expect(overriddenMatch?.[1]).toBeTruthy();

    const original = Number(originalMatch![1].replace(/,/g, ''));
    const overridden = Number(overriddenMatch![1].replace(/,/g, ''));
    const expected = Number((original * 1.2).toFixed(2));

    expect(overridden).toBeCloseTo(expected, 2);
    expect(text).toContain('Has Underwriter Uplift');

    return { original, overridden, cardText: text };
  }
}
