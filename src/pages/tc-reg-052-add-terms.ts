import { expect, Page } from '@playwright/test';
import { SalesforcePortalPage } from './salesforce-cancellation';

export class TCReg052AddTermsPage {
  constructor(private readonly page: Page) {}

  async clickSaveAndExit() {
    const saveAndExit = this.page
      .getByRole('button', { name: /Save\s*(?:&|and)\s*Exit/i })
      .or(this.page.getByRole('link', { name: /Save\s*(?:&|and)\s*Exit/i }))
      .first();

    await expect(saveAndExit).toBeVisible({ timeout: 60000 });
    await saveAndExit.click();
  }

  async searchQuoteManagerByReference(reference: string) {
    const searchAllFields = this.page.getByRole('textbox', { name: /Search all fields/i }).first();
    await expect(searchAllFields).toBeVisible({ timeout: 60000 });
    await searchAllFields.fill(reference);

    const searchButton = this.page
      .getByRole('link', { name: /^Search$/i })
      .or(this.page.getByRole('button', { name: /^Search$/i }))
      .first();
    await expect(searchButton).toBeVisible({ timeout: 15000 });
    await searchButton.click();

    const matchingRow = this.page.locator('table tbody tr').filter({ hasText: reference }).first();
    await expect(matchingRow).toBeVisible({ timeout: 60000 });
  }

  async getGridReference(caseReference: string) {
    const matchingRow = this.page.locator('table tbody tr').filter({ hasText: caseReference }).first();
    await expect(matchingRow).toBeVisible({ timeout: 60000 });

    const rowText = (await matchingRow.innerText()).replace(/\s+/g, ' ');
    const daMatch = rowText.match(/DA-MLI-\d{9}/i);
    const fallbackMatch = rowText.match(/(?:DA|CP)-MLI-\d{9}/i);
    const referenceMatch = daMatch ?? fallbackMatch;

    if (!referenceMatch) {
      throw new Error(`Unable to extract quote/policy reference from Quote Manager row for case ref: ${caseReference}`);
    }

    return referenceMatch[0];
  }

  async searchSalesforceAndOpenExactPolicyFromGrid(
    salesforce: SalesforcePortalPage,
    policyReference: string,
  ) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyReference);
        return;
      } catch {
        if (attempt === 3) {
          break;
        }
      }
      await this.page.waitForTimeout(8000);
    }

    throw new Error(
      `[salesforce] Unable to open policy from global search grid for reference: ${policyReference}`,
    );
  }

  async clickAddTermsAndWait() {
    const addTermsButton = this.page
      .getByRole('button', { name: /Add\s*terms/i })
      .or(this.page.getByRole('link', { name: /Add\s*terms/i }))
      .first();

    await expect(addTermsButton).toBeVisible({ timeout: 120000 });
    await addTermsButton.click();

    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);

    const addItemDialog = this.page.getByRole('dialog', { name: /Add\s*new\s*item|Add\s*terms/i }).first();
    await expect(addItemDialog).toBeVisible({ timeout: 60000 });
  }

  async completeAddTermsAndSave(termType: string, narrative: string) {
    const dialog = this.page.getByRole('dialog', { name: /Add\s*new\s*item|Add\s*terms/i }).first();
    await expect(dialog).toBeVisible({ timeout: 60000 });

    const typeAliases: Record<string, RegExp[]> = {
      statement: [/^statement\s*of\s*facts?$/i, /statement/i],
      terms: [/^terms?\s*(and|&)\s*conditions?$/i, /^terms?\s*conditions?$/i, /terms/i],
      uninsured: [/^unins+ured\s*matters?$/i, /^uninsured\s*matters?$/i, /unins+ured/i],
    };

    const normalizedRequested = termType.toLowerCase();
    const expectedPatterns = normalizedRequested.includes('statement')
      ? typeAliases.statement
      : normalizedRequested.includes('term')
        ? typeAliases.terms
        : normalizedRequested.includes('unins')
          ? typeAliases.uninsured
          : [new RegExp(termType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')];

    const matchesRequestedType = (text: string) => expectedPatterns.some((p) => p.test(text.trim()));

    const pickTypeFromOpenList = async () => {
      const options = this.page.getByRole('option');
      const count = await options.count();
      for (let i = 0; i < count; i += 1) {
        const option = options.nth(i);
        const optionText = (await option.innerText().catch(() => '')).trim();
        if (!optionText) continue;
        if (matchesRequestedType(optionText)) {
          await option.click();
          return true;
        }
      }
      return false;
    };

    const dialogSelect = dialog.locator('select:visible').first();
    if (await dialogSelect.isVisible({ timeout: 4000 }).catch(() => false)) {
      const options = dialogSelect.locator('option');
      const optionCount = await options.count();
      let selected = false;
      for (let i = 0; i < optionCount; i += 1) {
        const option = options.nth(i);
        const text = ((await option.innerText().catch(() => '')) || '').trim();
        if (!text || !matchesRequestedType(text)) continue;

        const value = (await option.getAttribute('value')) ?? '';
        if (value) {
          await dialogSelect.selectOption(value);
        } else {
          await option.click();
        }
        selected = true;
        break;
      }

      if (!selected) {
        throw new Error(`Type '${termType}' was not found in Add new item dropdown.`);
      }
    } else {
      const firstDropdown = dialog
        .locator('[role="combobox"]:visible, button[aria-haspopup="listbox"]:visible')
        .first();
      await expect(firstDropdown).toBeVisible({ timeout: 45000 });
      await firstDropdown.click();

      const picked = await pickTypeFromOpenList();
      if (!picked) {
        throw new Error(`Type '${termType}' was not found in Add new item type options.`);
      }
    }

    const selectedTypeText = (await dialog
      .locator('[role="combobox"]:visible, select:visible')
      .first()
      .innerText()
      .catch(() => ''))
      .toLowerCase();

    if (!matchesRequestedType(selectedTypeText)) {
      throw new Error(`Type verification failed. Requested '${termType}', but selected '${selectedTypeText || 'unknown'}'.`);
    }

    await this.page.waitForTimeout(1200);

    const typeHereHint = dialog.getByText(/type here\.\.\.|type here/i).first();
    if (await typeHereHint.isVisible({ timeout: 3000 }).catch(() => false)) {
      await typeHereHint.click();
    }

    const richTextInput = dialog
      .locator('[contenteditable="true"]:visible, div.ql-editor:visible, p:has-text("type here..."):visible')
      .first();
    await expect(richTextInput).toBeVisible({ timeout: 30000 });
    await richTextInput.click();
    await this.page.keyboard.press('Control+a').catch(() => undefined);
    await this.page.keyboard.type(`${narrative} sometext`);

    const availableCoverage = dialog
      .getByRole('option')
      .filter({ hasText: /\S/ })
      .first();

    await expect(availableCoverage).toBeVisible({ timeout: 30000 });
    await availableCoverage.click();

    const moveRightButton = dialog
      .getByRole('button', { name: /Move selection to Applied/i })
      .or(dialog.getByRole('button', { name: /^>$/ }))
      .first();

    await expect(moveRightButton).toBeVisible({ timeout: 15000 });
    await moveRightButton.click();

    const saveButton = dialog
      .getByRole('button', { name: /^SAVE$/i })
      .or(dialog.getByRole('button', { name: /Save/i }))
      .first();

    await expect(saveButton).toBeVisible({ timeout: 30000 });
    await saveButton.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(3000);
  }

  async openSubmissionStatementOfFactsViewAll() {
    const sectionPattern = /^Submission\s*Statement\s*Of\s*Facts?\s*(?:\(\d+\))?$/i;

    for (let i = 0; i < 14; i += 1) {
      const sectionHeading = this.page
        .getByRole('heading', { name: sectionPattern })
        .or(this.page.locator('h1:visible, h2:visible, h3:visible, h4:visible').filter({ hasText: sectionPattern }).first())
        .first();

      if (await sectionHeading.isVisible({ timeout: 1200 }).catch(() => false)) {
        await sectionHeading.scrollIntoViewIfNeeded();
        await sectionHeading.click({ timeout: 10000 }).catch(() => undefined);

        // As requested: refresh after clicking Submission Statement Of Facts, then wait.
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(5000);

        const relatedTab = this.page.getByRole('tab', { name: /Related/i }).first();
        if (await relatedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
          await relatedTab.click().catch(() => undefined);
          await this.page.waitForTimeout(1000);
        }

        const refreshedHeading = this.page
          .getByRole('heading', { name: sectionPattern })
          .or(this.page.locator('h1:visible, h2:visible, h3:visible, h4:visible').filter({ hasText: sectionPattern }).first())
          .first();

        await expect(refreshedHeading).toBeVisible({ timeout: 30000 });
        await refreshedHeading.scrollIntoViewIfNeeded();

        const sectionCard = refreshedHeading
          .locator('xpath=ancestor::*[self::article or self::section or contains(@class,"slds-card")][1]')
          .first();

        const viewAll = sectionCard
          .getByRole('link', { name: /View All/i })
          .or(sectionCard.getByRole('button', { name: /View All/i }))
          .first();

        await expect(viewAll).toBeVisible({ timeout: 30000 });
        await viewAll.click();
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(8000);

        const bespokeValue = this.page
          .getByRole('gridcell', { name: /Bespoke/i })
          .or(this.page.locator('td:has-text("Bespoke"), [role="gridcell"]:has-text("Bespoke")').first())
          .first();
        await expect(bespokeValue).toBeVisible({ timeout: 60000 });
        console.log('[TC_REG_052] Assertion passed: SOF value "Bespoke" is visible.');
        return;
      }

      await this.page.mouse.wheel(0, 1200);
      await this.page.waitForTimeout(500);
    }

    throw new Error('Submission Statement Of Facts section was not found on Related tab to click View All.');
  }
}
