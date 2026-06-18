import { expect, Page } from '@playwright/test';

export const updatedIntermediaryLegalEntity = 'Portal MLIS | Partner a/c (automated) | Bde-Comm';

export class TCRegNiCommercialIntermediaryPage {
  constructor(private readonly page: Page) {}

  async setLookupField(fieldLabel: string, searchText: string, skipEdit = false) {
    if (!skipEdit) {
      const editButton = this.page
        .getByRole('button', { name: new RegExp(`Edit ${fieldLabel}\\s*$`, 'i') })
        .first();
      await expect(editButton).toBeVisible({ timeout: 60_000 });
      await editButton.click();
      await this.page.waitForTimeout(600);
    }

    await this.page.locator('.forceModalSpinner .modal-glass.visible').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
    const escapedLabel = fieldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const xButton = this.page
      .getByRole('button', { name: new RegExp(`Remove ${escapedLabel}\\s*$`, 'i') })
      .or(this.page.getByRole('button', { name: new RegExp(`Clear ${escapedLabel} Selection\\s*$`, 'i') }))
      .or(this.page.locator('button.slds-pill__remove').first())
      .first();
    if (await xButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await xButton.click();
      await this.page.waitForTimeout(400);
    }

    const fieldInput = this.page
      .getByRole('combobox', { name: new RegExp(`^${escapedLabel}$`, 'i') })
      .or(this.page.locator(`input[aria-label="${fieldLabel}" i]`))
      .first();
    await expect(fieldInput).toBeVisible({ timeout: 15_000 });
    await fieldInput.click();
    await fieldInput.pressSequentially(searchText, { delay: 80 });
    await this.page.waitForTimeout(1_000);

    const searchResultsList = this.page
      .locator('[role="listbox"]')
      .filter({ hasText: /search results/i })
      .first();

    const dropdownOption = searchResultsList
      .locator('[role="option"]:visible')
      .filter({ hasNotText: /advanced search|show more results|show all results|search for/i })
      .first();
    await expect(dropdownOption).toBeVisible({ timeout: 25_000 });
    await dropdownOption.click();
    await this.page.waitForTimeout(600);
  }

  async updateSubmissionSourceIntermediaryFields(entityValue = updatedIntermediaryLegalEntity) {
    await this.page.mouse.wheel(0, 1200);
    await this.page.waitForTimeout(800);

    await this.setLookupField('Intermediary Legal Entity', entityValue);

    await this.page.mouse.wheel(0, 600);
    await this.page.waitForTimeout(500);

    await this.setLookupField('Intermediary Contact', 'T-013', true);

    const saveButton = this.page.getByRole('button', { name: /^Save$/i }).first();
    await expect(saveButton).toBeVisible({ timeout: 30000 });
    await saveButton.click();
    await this.page.waitForTimeout(10000);
  }
}
