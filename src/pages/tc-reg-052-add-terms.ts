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

  private async clickActionOrShowMore(actionPattern: RegExp) {
    const directAction = this.page
      .getByRole('button', { name: actionPattern })
      .or(this.page.getByRole('link', { name: actionPattern }))
      .or(this.page.locator('[role="button"], [role="menuitem"], button, a').filter({ hasText: actionPattern }))
      .first();

    if (await directAction.isVisible({ timeout: 15000 }).catch(() => false)) {
      await directAction.click();
      return;
    }

    const showMoreActions = this.page
      .getByRole('button', { name: /Show more actions/i })
      .or(this.page.getByLabel(/Show more actions/i))
      .or(this.page.locator('button[title*="Show more actions" i], [aria-label*="Show more actions" i]'))
      .first();

    if (await showMoreActions.isVisible({ timeout: 15000 }).catch(() => false)) {
      await showMoreActions.click();

      const menuAction = this.page
        .getByRole('menuitem', { name: actionPattern })
        .or(this.page.locator('[role="menuitem"], [role="button"], button, a').filter({ hasText: actionPattern }))
        .first();
      await expect(menuAction).toBeVisible({ timeout: 30000 });
      await menuAction.click();
      return;
    }

    const looseAction = this.page
      .locator('button, a, [role="button"], [role="menuitem"], span')
      .filter({ hasText: actionPattern })
      .first();
    await expect(looseAction).toBeVisible({ timeout: 45000 });
    await looseAction.click({ timeout: 15000 }).catch(async () => {
      await looseAction.click({ force: true });
    });
  }

  async changeLimitAndSaveAndRate(limitValue: string) {
    await this.clickActionOrShowMore(/Ch(?:a|n)nge\s*(?:of\s*)?Limit\s*of\s*Indeminity|Ch(?:a|n)nge\s*(?:of\s*)?Limit\s*of\s*Indemnity/i);

    const limitDialog = this.page
      .getByRole('dialog')
      .filter({ hasText: /Limit\s*of\s*Indemnity|Limit\s*of\s*Indemenity/i })
      .first();
    await expect(limitDialog).toBeVisible({ timeout: 60000 });

    const limitInput = limitDialog
      .getByRole('spinbutton', { name: /Limit of indemnity|Limit of Indemnity/i })
      .or(limitDialog.getByRole('textbox', { name: /Limit of indemnity|Limit of Indemnity/i }))
      .or(limitDialog.locator('input[aria-label*="Limit of indemnity" i], input[aria-label*="Limit of Indemnity" i]'))
      .or(limitDialog.locator('input:visible'))
      .first();

    await expect(limitInput).toBeVisible({ timeout: 60000 });
    await limitInput.click();
    await limitInput.fill(limitValue);
    await limitInput.press('Tab').catch(() => undefined);

    const saveAndRateButton = limitDialog
      .getByRole('button', { name: /Save\s*(?:&|and)\s*Rate/i })
      .or(limitDialog.getByRole('link', { name: /Save\s*(?:&|and)\s*Rate/i }))
      .or(limitDialog.locator('button:has-text("Save and rate"), button:has-text("Save & Rate")'))
      .or(limitDialog.locator('[role="button"]:has-text("Save and rate"), [role="button"]:has-text("Save & Rate")'))
      .first();

    await expect(saveAndRateButton).toBeVisible({ timeout: 60000 });
    await expect(saveAndRateButton).toBeEnabled({ timeout: 60000 }).catch(() => undefined);
    await saveAndRateButton.click({ timeout: 30000 }).catch(async () => {
      await saveAndRateButton.click({ force: true });
    });
  }

  async manageProductsAddAndSaveRate(productName: string) {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);

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
    await search.click();
    await search.fill(productName);
    await search.press('Enter').catch(() => undefined);

    const product = manageProductsDialog
      .getByRole('option', { name: new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
      .or(manageProductsDialog.locator('tr, li, [role="option"]').filter({ hasText: new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first())
      .first();
    await expect(product).toBeVisible({ timeout: 60000 });
    await product.click();

    const addButton = manageProductsDialog
      .getByRole('button', { name: /^\+?\s*Add$/i })
      .or(manageProductsDialog.locator('button:has-text("+Add"), button:has-text("Add")'))
      .first();
    await expect(addButton).toBeVisible({ timeout: 60000 });
    await addButton.click();
    await this.page.waitForTimeout(3000);

    const saveAndRateButton = manageProductsDialog
      .getByRole('button', { name: /Save\s*(?:&|and)\s*Rate/i })
      .or(manageProductsDialog.getByRole('link', { name: /Save\s*(?:&|and)\s*Rate/i }))
      .or(manageProductsDialog.locator('button:has-text("Save and rate"), button:has-text("Save & Rate")'))
      .or(manageProductsDialog.locator('[role="button"]:has-text("Save and rate"), [role="button"]:has-text("Save & Rate")'))
      .first();
    await expect(saveAndRateButton).toBeVisible({ timeout: 60000 });
    await expect(saveAndRateButton).toBeEnabled({ timeout: 60000 }).catch(() => undefined);
    await saveAndRateButton.click({ timeout: 30000 }).catch(async () => {
      await saveAndRateButton.click({ force: true });
    });
  }

  async changeStageAndSave(stage: string) {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);

    await this.clickActionOrShowMore(/Change\s*Stage/i);

    const stageDialog = this.page.getByRole('dialog').first();
    await expect(stageDialog).toBeVisible({ timeout: 60000 });

    const stageCombobox = stageDialog
      .getByRole('combobox', { name: /Stage/i })
      .or(stageDialog.locator('select[aria-label*="Stage" i], select[name*="Stage" i]'))
      .or(stageDialog.locator('input[aria-label*="Stage" i]'))
      .first();
    await expect(stageCombobox).toBeVisible({ timeout: 60000 });
    await stageCombobox.click().catch(() => undefined);
    await stageCombobox.fill(stage).catch(() => undefined);

    const stageOption = stageDialog
      .getByRole('option', { name: new RegExp(stage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
      .or(stageDialog.locator('[role="option"], option, li').filter({ hasText: new RegExp(stage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }))
      .first();
    if (await stageOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await stageOption.click();
    } else {
      await stageCombobox.press('ArrowDown').catch(() => undefined);
      await stageCombobox.press('Enter').catch(() => undefined);
    }

    const saveButton = stageDialog
      .getByRole('button', { name: /^Save$/i })
      .or(stageDialog.locator('button:has-text("Save")'))
      .first();
    await expect(saveButton).toBeVisible({ timeout: 60000 });
    await saveButton.click({ timeout: 30000 }).catch(async () => {
      await saveButton.click({ force: true });
    });
  }

  async editSubmissionStatementOfFactsAndSave(extraText: string) {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);

    const submissionSofHeading = this.page
      .getByRole('heading', { name: /Submission\s*Statement\s*Of\s*Facts?/i })
      .or(this.page.locator('h1:visible, h2:visible, h3:visible, h4:visible').filter({ hasText: /Submission\s*Statement\s*Of\s*Facts?/i }).first())
      .first();
    await submissionSofHeading.scrollIntoViewIfNeeded().catch(() => undefined);
    await this.page.waitForTimeout(700);

    const sofCard = submissionSofHeading
      .locator('xpath=ancestor::article[1]')
      .or(this.page.locator('article:visible').filter({ hasText: /Submission\s*Statement\s*Of\s*Facts?/i }))
      .first();
    await expect(sofCard).toBeVisible({ timeout: 120000 });

    const rowActionButton = sofCard
      .locator('button, a')
      .filter({ hasText: /Edit|More|Actions|Show/i })
      .first();

    const rowActionIconButton = sofCard.locator(
      'button[aria-haspopup="true"], button[aria-label*="Action" i], button[title*="Action" i], button[aria-label*="More" i], button[title*="More" i], button[aria-label*="Show" i], button[title*="Show" i], a[aria-haspopup="true"], a[aria-label*="Action" i], a[title*="Action" i]'
    ).first();

    const actionButton = (await rowActionButton.isVisible({ timeout: 3000 }).catch(() => false))
      ? rowActionButton
      : rowActionIconButton;

    await expect(actionButton).toBeVisible({ timeout: 60000 });
    await actionButton.click({ timeout: 20000 }).catch(async () => {
      await actionButton.click({ force: true });
    });

    const editMenuItem = this.page
      .getByRole('menuitem', { name: /^Edit$/i })
      .or(this.page.locator('[role="menuitem"]').filter({ hasText: /^Edit$/i }))
      .or(this.page.locator('a, button').filter({ hasText: /^Edit$/i }))
      .first();
    await expect(editMenuItem).toBeVisible({ timeout: 60000 });
    await editMenuItem.click({ timeout: 20000 }).catch(async () => {
      await editMenuItem.click({ force: true });
    });

    const coveragesHeading = this.page
      .getByRole('heading', { name: /Coverages/i })
      .or(this.page.locator('h1:visible, h2:visible, h3:visible, h4:visible').filter({ hasText: /Coverages/i }).first())
      .first();
    if (await coveragesHeading.isVisible({ timeout: 10000 }).catch(() => false)) {
      await coveragesHeading.scrollIntoViewIfNeeded().catch(() => undefined);
      await this.page.mouse.wheel(0, 700);
    }

    const rightSofHeading = this.page
      .getByRole('heading', { name: /Submission\s*Statement\s*Of\s*Facts?/i })
      .or(this.page.locator('h1:visible, h2:visible, h3:visible, h4:visible').filter({ hasText: /Submission\s*Statement\s*Of\s*Facts?/i }).first())
      .first();
    await rightSofHeading.scrollIntoViewIfNeeded().catch(() => undefined);

    const statementDialog = this.page.getByRole('dialog').first();
    await expect(statementDialog).toBeVisible({ timeout: 60000 });

    const statementEditor = statementDialog
      .locator('textarea:visible, [contenteditable="true"]:visible, div.ql-editor:visible, input:visible')
      .first();
    await expect(statementEditor).toBeVisible({ timeout: 60000 });

    const tagName = await statementEditor.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
    if (tagName === 'textarea' || tagName === 'input') {
      const currentValue = await statementEditor.inputValue().catch(() => '');
      await statementEditor.fill(`${currentValue}${extraText}`);
    } else {
      await statementEditor.click();
      await this.page.keyboard.press('End').catch(() => undefined);
      await this.page.keyboard.type(extraText);
    }

    const confirmationStatus = statementDialog
      .getByRole('combobox', { name: /Confirmation Status/i })
      .or(statementDialog.locator('select[aria-label*="Confirmation Status" i], select[name*="confirmation" i]'))
      .or(statementDialog.locator('input[aria-label*="Confirmation Status" i], input[name*="confirmation" i]'))
      .first();
    if (await confirmationStatus.isVisible({ timeout: 8000 }).catch(() => false)) {
      await confirmationStatus.click().catch(() => undefined);
      await confirmationStatus.fill('Confirmed').catch(() => undefined);
      const confirmedOption = statementDialog
        .getByRole('option', { name: /Confirmed/i })
        .or(statementDialog.locator('option:has-text("Confirmed"), li:has-text("Confirmed"), [role="option"]:has-text("Confirmed")'))
        .first();
      if (await confirmedOption.isVisible({ timeout: 8000 }).catch(() => false)) {
        await confirmedOption.click();
      }
    }

    const saveButton = statementDialog
      .getByRole('button', { name: /^Save$/i })
      .or(statementDialog.locator('button:has-text("Save")'))
      .first();
    await expect(saveButton).toBeVisible({ timeout: 60000 });
    await saveButton.click({ timeout: 30000 }).catch(async () => {
      await saveButton.click({ force: true });
    });
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

        await expect(this.page.getByRole('heading', { name: /Submission Statement Of Facts/i }).first()).toBeVisible({ timeout: 60000 });
        const gridOrTable = this.page.locator('[role="grid"]:visible, table:visible').first();
        await expect(gridOrTable).toBeVisible({ timeout: 60000 });
        return;
      }

      await this.page.mouse.wheel(0, 1200);
      await this.page.waitForTimeout(500);
    }

    throw new Error('Submission Statement Of Facts section was not found on Related tab to click View All.');
  }

  async getSubmissionStatementOfFactsTextColumnValues() {
    await expect(this.page.getByRole('heading', { name: /Submission Statement Of Facts/i }).first()).toBeVisible({ timeout: 60000 });

    const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
    const rows = this.page.getByRole('row');
    const rowCount = await rows.count();
    const textValues: string[] = [];

    for (let i = 0; i < rowCount; i += 1) {
      const rowText = normalize(await rows.nth(i).innerText().catch(() => ''));
      if (!rowText.includes('Preview') || !rowText.includes('Confirmed')) {
        continue;
      }

      const match = rowText.match(/Preview\s+(.+?)\s+Confirmed\b/i);
      if (match?.[1]) {
        textValues.push(normalize(match[1]));
      }
    }

    expect(textValues.length, 'Expected Submission Statement Of Facts table to contain values under the Text column.').toBeGreaterThan(0);
    return textValues;
  }
}
