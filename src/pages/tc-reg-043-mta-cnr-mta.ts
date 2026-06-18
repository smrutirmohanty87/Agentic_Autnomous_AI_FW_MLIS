import { expect, Page } from '@playwright/test';
import { SalesforcePortalPage } from './salesforce-cancellation';

export class TCReg043MtaCnrMtaPage {
  constructor(private readonly page: Page) {}

  logStep(step: string, details: string) {
    // Consistent test logs to identify where a flow issue occurs.
    console.log(`[TC_REG_043][${step}] ${details}`);
  }

  async setStatusReasonInternalReferral() {
    this.logStep('STATUS-REASON', 'Open Status Reason edit and select Internal referral');

    const editStatusReasonButton = this.page
      .getByRole('button', { name: /Edit Status Reason/i })
      .or(this.page.getByRole('button', { name: /Edit.*Status Reason/i }))
      .first();

    await expect(editStatusReasonButton).toBeVisible({ timeout: 60000 });
    await editStatusReasonButton.click();

    const statusReasonCombobox = this.page.getByRole('combobox', { name: /Status Reason/i }).first();
    await expect(statusReasonCombobox).toBeVisible({ timeout: 30000 });
    await statusReasonCombobox.click();

    const internalReferralOption = this.page.getByRole('option', { name: /Internal referral/i }).first();
    await expect(internalReferralOption).toBeVisible({ timeout: 15000 });
    await internalReferralOption.click();

    const saveButton = this.page.getByRole('button', { name: /^Save$/i }).first();
    await expect(saveButton).toBeVisible({ timeout: 15000 });
    await saveButton.click();
    await this.page.waitForTimeout(1500);

    this.logStep('STATUS-REASON', 'Status Reason updated to Internal referral');
  }

  async verifyNoDocumentsInNotesAndAttachments(salesforce: SalesforcePortalPage, context: string) {
    this.logStep('NOTES-CHECK', `${context}: open Notes & Attachments and verify no documents`);

    await salesforce.openRelatedTab();
    await salesforce.openNotesAndAttachmentsFromRelatedTab();

    const rows = this.page.locator('table tbody tr');
    const noRecordsMessage = this.page.getByText(/No records to display|No records found|No data available/i).first();

    await expect
      .poll(
        async () => {
          if (await noRecordsMessage.isVisible({ timeout: 500 }).catch(() => false)) return 0;
          return rows.count();
        },
        { timeout: 60000 },
      )
      .toBe(0);

    this.logStep('NOTES-CHECK', `${context}: verified Notes & Attachments contains no documents`);
  }
}
