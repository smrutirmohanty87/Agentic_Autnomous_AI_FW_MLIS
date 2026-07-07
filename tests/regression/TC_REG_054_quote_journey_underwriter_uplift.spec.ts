import { expect, Locator, Page, test } from '@playwright/test';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { getSalesforceCredentials } from '../../src/config/env';

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

async function selectLookupOption(page: Page, fieldLabel: string, query: string, optionText: string) {
  const input = await pickFirstVisible([
    page.getByRole('combobox', { name: new RegExp(fieldLabel, 'i') }),
    page.getByRole('searchbox', { name: new RegExp(fieldLabel, 'i') }),
    page.locator(`input[aria-label*="${fieldLabel}"]`),
    page.locator(`input[placeholder*="${fieldLabel}" i]`),
  ], 30000);

  await clickWhenReady(input, page);
  await input.fill(query);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await input.fill(query.slice(0, Math.min(4, query.length)) || query);

  const exactOption = await pickFirstVisible([
    page.getByRole('option', { name: new RegExp(`^${query}$`, 'i') }),
    page.getByRole('link', { name: new RegExp(`^${query}$`, 'i') }),
    page.locator(`li:has-text("${query}")`),
  ], 5000).catch(() => null);

  if (exactOption) {
    await clickWhenReady(exactOption, page);
    return;
  }

  const option = await pickFirstVisible([
    page.getByRole('option', { name: new RegExp(optionText, 'i') }),
    page.getByRole('link', { name: new RegExp(optionText, 'i') }),
    page.locator(`li:has-text("${optionText}")`),
  ], 30000);

  await clickWhenReady(option, page);
}

async function selectComboboxOption(page: Page, label: string, optionText: string) {
  const combobox = await pickFirstVisible([
    page.getByRole('combobox', { name: new RegExp(label, 'i') }),
    page.locator(`button[aria-label*="${label}"]`),
    page.locator(`[data-target-selection-name*="${label.toLowerCase().replace(/\s+/g, '-')}"]`),
  ], 20000);

  await clickWhenReady(combobox, page);
  const option = await pickFirstVisible([
    page.getByRole('option', { name: new RegExp(optionText, 'i') }),
    page.locator(`[role="option"]:has-text("${optionText}")`),
    page.getByText(new RegExp(`^${optionText}$`, 'i')).first(),
  ], 20000);

  await clickWhenReady(option, page);
  await waitForLightningIdle(page);
}

async function fillQuoteJourneyClientDetails(page: Page) {
  const requiredInputs = page.locator('input[required]');
  await expect(requiredInputs.nth(0)).toBeVisible({ timeout: 30000 });
  await requiredInputs.nth(0).fill('E2E Test Client');

  await expect(requiredInputs.nth(1)).toBeVisible({ timeout: 30000 });
  await requiredInputs.nth(1).fill('EC3A 2BJ');
  await requiredInputs.nth(1).press('Tab').catch(() => {});

  const enterManually = page
    .getByRole('button', { name: /enter manually/i })
    .or(page.getByRole('link', { name: /enter manually/i }))
    .first();

  if (await enterManually.isVisible({ timeout: 5000 }).catch(() => false)) {
    await clickWhenReady(enterManually, page);
  }

  await expect(requiredInputs.nth(2)).toBeVisible({ timeout: 30000 });
  await requiredInputs.nth(2).fill('52-54 Leadenhall Street');
  await requiredInputs.nth(3).fill('London');
}

async function selectPreferredProduct(page: Page) {
  const preferredCard = page.locator('article, div').filter({ hasText: /Absence of easement - Access/i }).first();
  const preferredSelectButton = preferredCard.getByRole('button', { name: /^Select$/i }).first();
  const anySelectButton = page.getByRole('button', { name: /^Select$/i }).first();

  if (await preferredSelectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await clickWhenReady(preferredSelectButton, page);
  } else {
    await clickWhenReady(anySelectButton, page);
  }

  const selectedProductsHeading = page.getByText(/You have selected\s+\d+\s+product/i).first();
  if (!(await selectedProductsHeading.isVisible({ timeout: 10000 }).catch(() => false))) {
    // Try one more select button if the first attempt did not register selection.
    const fallbackSelectButton = page.getByRole('button', { name: /^Select$/i }).first();
    if (await fallbackSelectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await clickWhenReady(fallbackSelectButton, page);
    }
    await expect(selectedProductsHeading).toBeVisible({ timeout: 10000 });
  }
}

async function setCommencementDate(page: Page, dateText: string) {
  const commencementDateInput = await pickFirstVisible([
    page.getByRole('textbox', { name: /commencement date/i }),
    page.locator('input[placeholder="DD/MM/YYYY"]'),
  ], 30000);

  await commencementDateInput.fill(dateText);
  await page.getByRole('heading', { name: /Final policy details/i }).first().click().catch(() => undefined);
}

async function clickProceedIfVisible(page: Page) {
  const proceedButton = page.getByRole('button', { name: /Proceed|Next/i }).first();
  if (await proceedButton.isVisible({ timeout: 10000 }).catch(() => false)) {
    await clickWhenReady(proceedButton, page);
  }
}

async function clickOrderNowIfVisible(page: Page) {
  const orderNow = page.getByRole('button', { name: /Order now/i }).first();
  if (await orderNow.isVisible({ timeout: 10000 }).catch(() => false)) {
    await clickWhenReady(orderNow, page);
  }
}

async function extractQuotePremiums(page: Page) {
  const card = page
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

test.describe('@regression | E2E | Quote Journey | Underwriter Uplift', () => {
  test('TC_REG_050 | Complete quote journey and verify quote uplift values on Quotes tab', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `REG-QJ-UPLIFT-${Date.now()}`;
    const sfCreds = getSalesforceCredentials();
    const upliftDate = new Date();
    upliftDate.setDate(upliftDate.getDate() + 5);
    const orderDate = upliftDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const salesforce = new SalesforcePortalPage(page);
    await salesforce.goto();
    await page.getByRole('textbox', { name: /username/i }).fill(sfCreds.username);
    await clickWhenReady(page.getByRole('button', { name: /log in to sandbox|log in/i }).first(), page);
    await page.getByRole('textbox', { name: /password/i }).fill(sfCreds.password);
    await clickWhenReady(page.getByRole('button', { name: /log in to sandbox|log in/i }).first(), page);

    await expect(page.getByRole('link', { name: 'Quote Journey' })).toBeVisible({ timeout: 120000 });
    await clickWhenReady(page.getByRole('link', { name: 'Quote Journey' }), page);
    await expect(page.getByRole('heading', { name: /quote journey/i })).toBeVisible({ timeout: 120000 });

    await selectLookupOption(page, 'Broker Account', 'MLIS intermediary', 'MLIS Test Intermediary');
    await selectLookupOption(page, 'Broker User', 'test', 'test');
    await selectComboboxOption(page, 'Brand', 'My Legal Indemnity Shop');
    await selectComboboxOption(page, 'Quote Type', 'Commercial');
    await selectComboboxOption(page, 'Jurisdiction', 'England and Wales');

    const caseRefInput = await pickFirstVisible([
      page.getByRole('textbox', { name: /my case reference|case reference|file number/i }),
      page.locator('input[placeholder*="case reference" i]'),
    ], 30000);
    await caseRefInput.fill(caseRef);

    const limitInput = await pickFirstVisible([
      page.getByRole('spinbutton', { name: /limit of indemnity/i }),
      page.locator('input[type="number"][name*="limit" i]'),
      page.locator('input[aria-label*="Limit of indemnity"]'),
    ], 30000);
    await limitInput.fill('500000');

    await selectPreferredProduct(page);
    await clickWhenReady(page.getByRole('button', { name: /^Proceed$/ }).first(), page);

    await expect(page.getByRole('heading', { name: /statements of fact/i })).toBeVisible({ timeout: 120000 });

    const confirmButtons = page.getByRole('button', { name: 'Confirm', exact: true });
    await expect(confirmButtons.first()).toBeVisible({ timeout: 60000 });
    while ((await confirmButtons.count()) > 0) {
      await confirmButtons.first().scrollIntoViewIfNeeded();
      await clickWhenReady(confirmButtons.first(), page);
      await page.waitForTimeout(250);
    }

    await clickWhenReady(page.getByRole('button', { name: /^Proceed$/ }).first(), page);
    await expect(page.getByRole('heading', { name: /quotes/i })).toBeVisible({ timeout: 120000 });
    await clickWhenReady(page.getByRole('button', { name: /Select quote/i }).first(), page);

    await expect(page.getByRole('heading', { name: /final policy details/i })).toBeVisible({ timeout: 120000 });
    await fillQuoteJourneyClientDetails(page);
    await clickWhenReady(page.getByRole('button', { name: /Proceed|Next/i }).first(), page);

    await expect(page.getByRole('heading', { name: /^Summary$/i })).toBeVisible({ timeout: 120000 });
    await clickWhenReady(page.getByRole('button', { name: /Proceed to order/i }).first(), page);
    await setCommencementDate(page, orderDate);
    await clickOrderNowIfVisible(page);

    await expect(page.getByRole('heading', { name: /Policy issued/i })).toBeVisible({ timeout: 180000 });
    await clickWhenReady(page.getByRole('button', { name: /Return to submission/i }).first(), page);

    await expect(page.getByRole('heading', { name: /Quote Journey|Submissions?/i })).toBeVisible({ timeout: 120000 });
    // await salesforce.openRelatedTab();
    // await salesforce.openInsurancePolicyFromRelatedStable(caseRef);

    await salesforce.openQuotesTab();
    const { original, overridden, cardText } = await extractQuotePremiums(page);

    expect(cardText).toContain('Has Underwriter Uplift');
    expect(overridden).toBeCloseTo(Number((original * 1.2).toFixed(2)), 2);
  });
});
