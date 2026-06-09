import { expect, Page } from '@playwright/test';
import { getMlisPortalUrl } from '../config/env';
import { smartClick, smartFill } from '../ai/smartActions';

export class BrokerPortalPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto(getMlisPortalUrl());
  }

  async login(email: string, password: string) {
    await smartFill(this.page, 'MLIS Email address', email, { context: 'BrokerPortalLogin' });
    await smartFill(this.page, 'MLIS Password', password, { context: 'BrokerPortalLogin' });
    await smartClick(this.page, 'MLIS Login', { context: 'BrokerPortalLogin' });
    await this.expectQuoteManagerLoaded();
  }

  async expectQuoteManagerLoaded() {
    await this.acceptCookiesIfVisible();
    const heading = this.page.getByRole('heading', { name: /Quote manager/i }).first();
    const startQuote = this.page.getByRole('link', { name: /Start quote/i }).first();
    const headingVisible = await heading.isVisible({ timeout: 60000 }).catch(() => false);
    if (!headingVisible) {
      await expect(startQuote).toBeVisible({ timeout: 60000 });
    }
    await this.waitForQuoteTableToStabilize();
  }

  async acceptCookiesIfVisible() {
    const acceptCookies = this.page.getByRole('button', { name: 'ACCEPT ALL' });
    if (await acceptCookies.isVisible({ timeout: 5000 }).catch(() => false)) {
      await acceptCookies.click();
    }
  }

  async searchPolicy(policyReference: string) {
    await smartFill(this.page, 'Broker Portal Search all fields', policyReference, { context: 'BrokerPortal' });
    await smartClick(this.page, 'Broker Portal Search', { context: 'BrokerPortal' });
    await expect(this.getPolicyRow(policyReference)).toBeVisible({ timeout: 60000 });
  }

  async expectPolicyStatus(policyReference: string, expectedStatus: string) {
    const row = this.getPolicyRow(policyReference);
    await expect(row).toContainText(expectedStatus, { timeout: 60000 });
  }

  private async waitForQuoteTableToStabilize() {
    await expect(this.page.getByRole('table')).toBeVisible({ timeout: 60000 });
    const loading = this.page.getByText('Loading...').first();
    if (await loading.isVisible()) {
      await expect(loading).toBeHidden({ timeout: 60000 });
    }
  }

  private getPolicyRow(policyReference: string) {
    return this.page.getByRole('row', { name: new RegExp(policyReference) }).first();
  }
}
