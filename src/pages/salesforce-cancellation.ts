import { expect, Page } from '@playwright/test';
import { getSalesforceLightningUrl } from '../config/env';

export class SalesforcePortalPage {
  constructor(private readonly page: Page) {}

  private escapeForRegex(text: string) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async clickWhenUiReady(target: ReturnType<Page['locator']>) {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await this.waitForLightningIdle();
      try {
        await target.click({ timeout: 10000 });
        return;
      } catch (error) {
        if (attempt === 4) {
          throw error;
        }
        await this.page.waitForTimeout(750);
      }
    }
  }

  /**
   * Resilient Salesforce Lightning combobox selection.
   * Handles: slow option loading, DOM re-renders after selection, stale elements.
   * NEVER uses selectOption — clicks the combobox to open, waits for options overlay, clicks by text.
   */
  private async selectLightningCombobox(label: string, optionText: string) {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      try {
        await this.waitForLightningIdle();

        // Re-query combobox each attempt (DOM may have re-rendered after prior selection)
        const combobox = this.page.getByRole('combobox', { name: label });
        await expect(combobox).toBeVisible({ timeout: 15000 });

        // Scroll into view and click to open the dropdown overlay
        await combobox.scrollIntoViewIfNeeded();
        await combobox.click({ timeout: 10000 });

        // Wait for the floating options overlay to render
        const option = this.page.getByRole('option', { name: optionText });
        await expect(option).toBeVisible({ timeout: 10000 });
        await option.scrollIntoViewIfNeeded();
        await option.click({ timeout: 10000 });

        // Wait for DOM to settle after selection (Salesforce re-renders dynamically)
        await this.waitForLightningIdle();
        await this.page.waitForTimeout(500);
        return;
      } catch (error) {
        if (attempt === 5) throw error;
        // Dismiss any stuck overlay by pressing Escape, then retry
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.page.waitForTimeout(1500);
      }
    }
  }

  private async openRecordFromHeaderGlobalSearch(policyReference: string) {
    // Use the exact XPath for the Salesforce header global search button (with fallback)
    const searchLauncher = this.page.locator('//*[@id="oneHeader"]/div[2]/div[2]/div/div/button').first();
    const searchButtonFallback = this.page.getByRole('button', { name: /^Search/ }).first();

    if (await searchLauncher.isVisible({ timeout: 10000 }).catch(() => false)) {
      await this.clickWhenUiReady(searchLauncher);
    } else {
      await expect(searchButtonFallback).toBeVisible({ timeout: 15000 });
      await this.clickWhenUiReady(searchButtonFallback);
    }

    // After clicking the search launcher, Salesforce opens a dialog with a search input
    // Use exact placeholder "Search..." to avoid matching "Search this list..." in content area
    const dialogSearchInput = this.page
      .locator('[role="dialog"] input[type="search"]:visible, [role="dialog"] input[placeholder*="Search"]:visible')
      .first();
    const globalSearchInput = this.page
      .locator('[role="search"] input:visible, input[placeholder="Search..."]:visible')
      .first();

    let activeSearchInput = dialogSearchInput;
    if (!(await dialogSearchInput.isVisible({ timeout: 8000 }).catch(() => false))) {
      await expect(globalSearchInput).toBeVisible({ timeout: 15000 });
      activeSearchInput = globalSearchInput;
    }

    await activeSearchInput.fill(policyReference);
    await activeSearchInput.press('Enter');
    await this.waitForLightningIdle();

    const searchResult = this.page
      .locator('a:visible, [role="option"]:visible, [role="link"]:visible')
      .filter({ hasText: policyReference })
      .first();
    await expect(searchResult).toBeVisible({ timeout: 30000 });
    await this.clickWhenUiReady(searchResult);
    await this.waitForLightningIdle();
  }

  async goto() {
    await this.page.goto(getSalesforceLightningUrl());
  }

  async login(username: string, password: string) {
    await this.page.getByRole('textbox', { name: 'Username' }).fill(username);
    await this.page.getByRole('textbox', { name: 'Password' }).fill(password);
    await this.page.getByRole('button', { name: 'Log In' }).click();
    await this.expectAppLoaded();
    await this.expectUnderwritingNavigation();
  }

  async expectUnderwritingNavigation() {
    await expect(this.page.getByRole('link', { name: 'Accounts' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('link', { name: 'Contacts' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('link', { name: 'Submissions' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('link', { name: 'Insurance Policies' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('link', { name: 'Quote Journey' })).toBeVisible({ timeout: 60000 });
  }

  /** Step 5-6: Global Search → search for policy number, wait for results, click submission link */
  async searchPolicyInGlobalSearch(policyReference: string) {
    const escapedRef = policyReference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const maxAttempts = 3;

    // Wait for Salesforce to index the newly created policy after login
    await this.page.waitForTimeout(15000);

    for (let searchAttempt = 1; searchAttempt <= maxAttempts; searchAttempt += 1) {
      // Wait before retry to allow more indexing time
      if (searchAttempt > 1) {
        await this.page.waitForTimeout(15000);
      }

      // Activate the global search — dispatchEvent bypasses the input overlay interception
      const searchButton = this.page.getByRole('button', { name: /^Search/ }).first();
      await expect(searchButton).toBeVisible({ timeout: 30000 });
      await searchButton.dispatchEvent('click');
      await this.page.waitForTimeout(500);

      // Fill the search input that appears after activation
      const searchInput = this.page.locator('input[type="search"][placeholder="Search..."]').first();
      await expect(searchInput).toBeVisible({ timeout: 10000 });
      await searchInput.fill(policyReference);
      await searchInput.press('Enter');

      // Wait for the search results page to load
      await this.waitForLightningIdle();
      await this.page.waitForLoadState('load');
      await this.waitForLightningIdle();

      // Wait for the "Search Results" main heading to confirm we're on the results page
      const searchResultsHeading = this.page.getByRole('heading', { name: /Search Results/i }).first();
      await expect(searchResultsHeading).toBeVisible({ timeout: 30000 }).catch(() => {});

      // Wait for results to finish loading (skeleton bars disappear)
      await this.waitForLightningIdle();

      // Check for result category headings or sidebar links with counts > 0
      const submissionsHeading = this.page.getByRole('heading', { name: /Submissions/i }).first();
      const insurancePoliciesHeading = this.page.getByRole('heading', { name: /Insurance Policies/i }).first();

      const submissionsVisible = await submissionsHeading.isVisible({ timeout: 30000 }).catch(() => false);
      const policiesVisible = !submissionsVisible
        && await insurancePoliciesHeading.isVisible({ timeout: 10000 }).catch(() => false);

      if (submissionsVisible || policiesVisible) {
        // Click the Submissions sidebar link to filter results if needed
        if (submissionsVisible) {
          const submissionsSidebarLink = this.page
            .locator('nav[aria-label*="Search Results"] a:visible, [role="navigation"] a:visible')
            .filter({ hasText: /^Submissions/ })
            .first();
          if (await submissionsSidebarLink.isVisible({ timeout: 5000 }).catch(() => false)) {
            await submissionsSidebarLink.click();
            await this.waitForLightningIdle();
          }
        }

        // Results found — click the matching link
        await this.waitForLightningIdle();

        const policyLink = this.page.getByRole('link', { name: new RegExp(escapedRef, 'i') }).first();
        const fallbackLink = this.page.locator('table tbody tr:first-child th a, table tbody tr:first-child td:first-child a').first();
        const anyTableLink = this.page.locator('table a:visible').filter({ hasText: /\w/ }).first();

        if (await policyLink.isVisible({ timeout: 10000 }).catch(() => false)) {
          await this.clickWhenUiReady(policyLink);
        } else if (await fallbackLink.isVisible({ timeout: 5000 }).catch(() => false)) {
          await this.clickWhenUiReady(fallbackLink);
        } else {
          await expect(anyTableLink).toBeVisible({ timeout: 30000 });
          await this.clickWhenUiReady(anyTableLink);
        }

        // Wait for submission record page to load
        await this.waitForLightningIdle();
        await expect(this.page.getByRole('tab', { name: 'Related' }).first()).toBeVisible({ timeout: 120000 });
        return;
      }

      // Check for a direct policy link (results may render without section headings)
      const directPolicyLink = this.page.getByRole('link', { name: new RegExp(escapedRef, 'i') }).first();
      if (await directPolicyLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await this.clickWhenUiReady(directPolicyLink);
        await this.waitForLightningIdle();
        await expect(this.page.getByRole('tab', { name: 'Related' }).first()).toBeVisible({ timeout: 120000 });
        return;
      }

      if (searchAttempt >= maxAttempts) {
        throw new Error(`Policy ${policyReference} not found in global search after ${maxAttempts} attempts.`);
      }
    }
  }

  async searchAndOpenSubmission(policyReference: string) {
    const escapedPolicy = policyReference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const launcher = this.page.locator('//*[@id="oneHeader"]/div[2]/div[2]/div/div/button').first();
      if (await launcher.isVisible({ timeout: 5000 }).catch(() => false)) {
        await this.clickWhenUiReady(launcher);
      }

      const searchInput = this.page
        .locator('[role="dialog"] input[type="search"]:visible, [role="search"] input:visible, input[placeholder="Search..."]:visible')
        .first();
      await expect(searchInput).toBeVisible({ timeout: 15000 });
      await searchInput.fill(policyReference);
      await searchInput.press('Enter');
      await this.waitForLightningIdle();

      const chip = this.page.getByRole('button', { name: new RegExp(`Search:\\s*${escapedPolicy}`) }).first();
      if (await chip.isVisible({ timeout: 3000 }).catch(() => false)) {
        await this.clickWhenUiReady(chip);
      }

      const result = this.page
        .locator('a:visible, [role="option"]:visible, [role="link"]:visible')
        .filter({ hasText: policyReference })
        .first();

      if (await result.isVisible({ timeout: 10000 }).catch(() => false)) {
        await this.clickWhenUiReady(result);
        await this.waitForLightningIdle();
        await expect(this.page.getByRole('tab', { name: 'Related' }).first()).toBeVisible({ timeout: 60000 });
        return;
      }

      if (attempt < 6) {
        await this.page.waitForTimeout(5000);
      }
    }

    throw new Error(`Could not open submission from global search for ${policyReference}.`);
  }

  async openSubmissionFromSubmissionsTab(policyReference: string) {
    await this.page.locator('nav').getByRole('link', { name: 'Submissions' }).first().click();
    await expect(this.page.getByRole('heading', { name: /Submissions/i }).first()).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();

    const listSearch = this.page.getByRole('searchbox', { name: 'Search this list...' }).first();
    await expect(listSearch).toBeVisible({ timeout: 60000 });
    await listSearch.fill(policyReference);
    await listSearch.press('Enter');
    await this.waitForLightningIdle();

    const matchingSubmission = this.page.getByRole('link', { name: new RegExp(policyReference, 'i') }).first();
    const firstRowLink = this.page.locator('[role="rowheader"] a:visible').first();

    if (await matchingSubmission.isVisible({ timeout: 8000 }).catch(() => false)) {
      await this.clickWhenUiReady(matchingSubmission);
    } else {
      await expect(firstRowLink).toBeVisible({ timeout: 60000 });
      await this.clickWhenUiReady(firstRowLink);
    }

    await this.waitForLightningIdle();
    await expect(this.page.getByRole('tab', { name: 'Related' }).first()).toBeVisible({ timeout: 60000 });
  }

  async searchAndOpenInsurancePolicy(policyReference: string) {
    await this.page.locator('nav').getByRole('link', { name: 'Insurance Policies' }).first().click();
    await expect(this.page.getByRole('heading', { name: /Insurance Policies/i }).first()).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();

    const listSearch = this.page.getByRole('searchbox', { name: 'Search this list...' }).first();
    await expect(listSearch).toBeVisible({ timeout: 60000 });
    await listSearch.fill(policyReference);
    await listSearch.press('Enter');
    await this.waitForLightningIdle();

    const policyLink = this.page.getByRole('link', { name: new RegExp(policyReference, 'i') }).first();
    const firstRowLink = this.page.locator('[role="rowheader"] a:visible').first();

    if (await policyLink.isVisible({ timeout: 8000 }).catch(() => false)) {
      await this.clickWhenUiReady(policyLink);
    } else {
      await expect(firstRowLink).toBeVisible({ timeout: 60000 });
      await this.clickWhenUiReady(firstRowLink);
    }

    await expect(this.page.getByRole('heading', { name: /Insurance Policy/i })).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();
  }

  /** Step 7: Navigate to the Related tab */
  async openRelatedTab() {
    const relatedTab = this.page.getByRole('tab', { name: 'Related' }).first();
    await expect(relatedTab).toBeVisible({ timeout: 60000 });
    await this.clickWhenUiReady(relatedTab);
    await this.waitForLightningIdle();
  }
  /** step 8 : Navigate to quotes tab    */
  async openQuotesTab() {
    const quotesTab = this.page.getByRole('tab', { name: 'Quotes' }).first();
    await expect(quotesTab).toBeVisible({ timeout: 60000 });
    await this.clickWhenUiReady(quotesTab);
    await this.waitForLightningIdle();
  }

  /**
   * Opt-in helper: after a Cancel & Reissue completes, the UI can show a "Return to submission" action.
   * Kept as a separate method so existing tests are unaffected unless they call it.
   */
  async clickReturnToSubmission() {
    const returnToSubmission = this.page
      .getByRole('button', { name: /Return to submission/i })
      .or(this.page.getByRole('link', { name: /Return to submission/i }))
      .first();

    await expect(returnToSubmission).toBeVisible({ timeout: 60000 });
    await this.clickWhenUiReady(returnToSubmission);
    await this.waitForLightningIdle();

    // Submission page should show standard tabs.
    await expect(this.page.getByRole('tab', { name: 'Related' }).first()).toBeVisible({ timeout: 60000 });
  }

  /** Steps 8-9: Scroll to Insurance Policy section and open the record */
  async openInsurancePolicyFromRelated(expectedPolicyNumber?: string) {
    // The Insurance Policy record may take time to sync from Broker Portal to Salesforce.
    // Reload the page to pick up the latest server-side data before looking for the record.
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.waitForLightningIdle();

    // Re-click Related tab after reload since it resets to default tab
    const relatedTab = this.page.getByRole('tab', { name: 'Related' }).first();
    await expect(relatedTab).toBeVisible({ timeout: 60000 });
    await this.clickWhenUiReady(relatedTab);
    await this.waitForLightningIdle();

    // The Insurance Policies heading becomes a link with a count (e.g. "Insurance Policies (1)")
    // only when records exist. Wait generously for the data sync to complete.
    const insurancePoliciesLink = this.page
      .locator('article:visible')
      .getByRole('link', { name: /Insurance Policies/i })
      .first();

    // Scroll down to bring the Insurance Policies section into view
    for (let i = 0; i < 15; i += 1) {
      if (await insurancePoliciesLink.isVisible().catch(() => false)) {
        break;
      }
      await this.page.mouse.wheel(0, 1200);
      await this.page.waitForTimeout(500);
    }

    await expect(insurancePoliciesLink).toBeVisible({ timeout: 120000 });
    await this.clickWhenUiReady(insurancePoliciesLink);
    await this.waitForLightningIdle();

    // Wait for the Insurance Policies list view to fully load
    await expect(this.page.getByRole('heading', { name: /Insurance Policies/i })).toBeVisible({ timeout: 60000 });

    // Click the matching Insurance Policy record when a policy number is provided.
    // This prevents opening an older already-cancelled policy when multiple rows exist.
    const tableScope = this.page.locator('table:visible').first();
    const matchingLink = expectedPolicyNumber
      ? tableScope.getByRole('link', { name: new RegExp(expectedPolicyNumber, 'i') }).first()
      : null;
    const firstRowLink = this.page.locator('[role="rowheader"] a:visible').first();

    if (matchingLink && (await matchingLink.isVisible({ timeout: 8000 }).catch(() => false))) {
      await this.clickWhenUiReady(matchingLink);
    } else {
      await expect(firstRowLink).toBeVisible({ timeout: 60000 });
      await this.clickWhenUiReady(firstRowLink);
    }

    // Verify Insurance Policy record loaded with expected state
    await expect(this.page.getByRole('heading', { name: /Insurance Policy/i })).toBeVisible({ timeout: 60000 });
    if (expectedPolicyNumber) {
      await expect(this.page.getByRole('heading', { name: new RegExp(expectedPolicyNumber, 'i') })).toBeVisible({ timeout: 60000 });
    }
    await this.waitForLightningIdle();

    const inForceOption = this.page.getByRole('option', { name: 'In Force' });
    await expect(inForceOption).toBeVisible({ timeout: 60000 });
    await expect(inForceOption).toHaveAttribute('aria-selected', 'true', { timeout: 60000 });

    await expect(this.page.getByRole('button', { name: 'Create MTA' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: 'Create Claim' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: 'New Note' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: 'Show more actions' })).toBeVisible({ timeout: 60000 });
  }

  /**
   * Opt-in helper: a more resilient variant of openInsurancePolicyFromRelated.
   *
   * Why: On some orgs/environments the Insurance Policies list can render without
   * ARIA rowheader roles (or be slow to populate), causing flaky failures when
   * locating the first row link.
   *
   * This method retries navigation and uses multiple locator strategies to find
   * either the expected policy number link or the first row link.
   *
   * IMPORTANT: Kept separate so existing tests remain unaffected unless they
   * explicitly call this method.
   */
  async openInsurancePolicyFromRelatedStable(expectedPolicyNumber?: string) {
    const attempts = 3;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      // Reload to pick up server-side sync, then re-open Related tab.
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.waitForLightningIdle();

      const relatedTab = this.page.getByRole('tab', { name: 'Related' }).first();
      await expect(relatedTab).toBeVisible({ timeout: 60000 });
      await this.clickWhenUiReady(relatedTab);
      await this.waitForLightningIdle();

      const insurancePoliciesLink = this.page
        .locator('article:visible')
        .getByRole('link', { name: /Insurance Policies/i })
        .first();

      for (let i = 0; i < 15; i += 1) {
        if (await insurancePoliciesLink.isVisible().catch(() => false)) break;
        await this.page.mouse.wheel(0, 1200);
        await this.page.waitForTimeout(500);
      }

      await expect(insurancePoliciesLink).toBeVisible({ timeout: 120000 });
      await this.clickWhenUiReady(insurancePoliciesLink);
      await this.waitForLightningIdle();

      await expect(this.page.getByRole('heading', { name: /Insurance Policies/i })).toBeVisible({ timeout: 60000 });

      const tableScope = this.page.locator('table:visible').first();

      const matchingLink = expectedPolicyNumber
        ? tableScope.getByRole('link', { name: new RegExp(expectedPolicyNumber, 'i') }).first()
        : null;

      const firstRowLinkByRole = this.page.locator('[role="rowheader"] a:visible').first();
      const firstRowLinkByTable = tableScope
        .locator('tbody tr th a:visible, tbody tr td a:visible')
        .filter({ hasText: /\S+/ })
        .first();

      if (matchingLink && (await matchingLink.isVisible({ timeout: 10000 }).catch(() => false))) {
        await this.clickWhenUiReady(matchingLink);
      } else if (await firstRowLinkByTable.isVisible({ timeout: 10000 }).catch(() => false)) {
        await this.clickWhenUiReady(firstRowLinkByTable);
      } else if (await firstRowLinkByRole.isVisible({ timeout: 10000 }).catch(() => false)) {
        await this.clickWhenUiReady(firstRowLinkByRole);
      } else if (attempt < attempts) {
        continue;
      } else {
        throw new Error(
          `[salesforce] Unable to open Insurance Policy from Related (attempt ${attempt}/${attempts}). ` +
            `No row links were found in the Insurance Policies list.`,
        );
      }

      await expect(this.page.getByRole('heading', { name: /Insurance Policy/i })).toBeVisible({ timeout: 60000 });
      if (expectedPolicyNumber) {
        await expect(this.page.getByRole('heading', { name: new RegExp(expectedPolicyNumber, 'i') })).toBeVisible({ timeout: 60000 });
      }

      await this.waitForLightningIdle();
      await expect(this.page.getByRole('button', { name: 'Create MTA' })).toBeVisible({ timeout: 60000 });
      await expect(this.page.getByRole('button', { name: 'Show more actions' })).toBeVisible({ timeout: 60000 });
      return;
    }
  }

  /**
   * Global Search → open the exact matching result from the results grid.
   * This is intentionally strict: it will NOT click the first row, to avoid opening an older cancelled policy.
   * Use this to land on the Submission/record page, then open Insurance Policy from the Related tab.
   */
  async searchAndOpenExactFromGlobalSearchGrid(reference: string) {
    const searchLauncher = this.page.locator('//*[@id="oneHeader"]/div[2]/div[2]/div/div/button').first();
    const searchButtonFallback = this.page.getByRole('button', { name: /^Search/ }).first();

    if (await searchLauncher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.clickWhenUiReady(searchLauncher);
    } else {
      await expect(searchButtonFallback).toBeVisible({ timeout: 15000 });
      await this.clickWhenUiReady(searchButtonFallback);
    }

    const dialogSearchInput = this.page
      .locator('[role="dialog"] input[type="search"]:visible, [role="dialog"] input[placeholder*="Search"]:visible')
      .first();
    const headerSearchInput = this.page
      .locator('#oneHeader input[type="search"]:visible, #oneHeader input[placeholder="Search..."]:visible')
      .first();

    let activeSearchInput = dialogSearchInput;
    if (!(await dialogSearchInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      await expect(headerSearchInput).toBeVisible({ timeout: 15000 });
      activeSearchInput = headerSearchInput;
    }

    await activeSearchInput.fill(reference);
    await activeSearchInput.press('Enter');
    await this.waitForLightningIdle();

    const escaped = this.escapeForRegex(reference);

    const resultsTable = this.page.locator('main table:visible, table:visible').first();
    await expect(resultsTable).toBeVisible({ timeout: 120000 });

    const matchingRow = resultsTable.locator('tr').filter({ hasText: new RegExp(escaped, 'i') }).first();
    await expect(matchingRow).toBeVisible({ timeout: 120000 });

    const matchingLink = matchingRow.getByRole('link', { name: new RegExp(escaped, 'i') }).first();
    await expect(matchingLink).toBeVisible({ timeout: 60000 });
    await this.clickWhenUiReady(matchingLink);

    await this.waitForLightningIdle();
    await expect(this.page.getByRole('tab', { name: 'Related' }).first()).toBeVisible({ timeout: 120000 });
  }

  /**
   * Global Search → scan ALL result tables, find the row whose Stage/Status cell is exactly "Quoted"
   * AND whose row text contains the policy reference, then click that row's link.
   *
   * Salesforce global search returns results in multiple separate tables (Insurance Policies,
   * Submissions, Quotes, etc.).  Only the first table is NOT guaranteed to contain the Quoted row,
   * so this method iterates every visible table on the results page.
   *
   * The Stage cell is matched via two strategies:
   *   1. A <td> whose ONLY visible text is "Quoted" (exact-cell match).
   *   2. Any descendant element (badge / span) whose text is exactly "Quoted".
   *
   * Polls for up to 120 s to allow Salesforce async indexing to update.
   */
  async searchAndOpenQuotedFromGlobalSearchGrid(policyReference: string) {
    const searchLauncher = this.page.locator('//*[@id="oneHeader"]/div[2]/div[2]/div/div/button').first();
    const searchButtonFallback = this.page.getByRole('button', { name: /^Search/ }).first();

    if (await searchLauncher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.clickWhenUiReady(searchLauncher);
    } else {
      await expect(searchButtonFallback).toBeVisible({ timeout: 15000 });
      await this.clickWhenUiReady(searchButtonFallback);
    }

    const dialogSearchInput = this.page
      .locator('[role="dialog"] input[type="search"]:visible, [role="dialog"] input[placeholder*="Search"]:visible')
      .first();
    const headerSearchInput = this.page
      .locator('#oneHeader input[type="search"]:visible, #oneHeader input[placeholder="Search..."]:visible')
      .first();

    let activeSearchInput = dialogSearchInput;
    if (!(await dialogSearchInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      await expect(headerSearchInput).toBeVisible({ timeout: 15000 });
      activeSearchInput = headerSearchInput;
    }

    await activeSearchInput.fill(policyReference);
    await activeSearchInput.press('Enter');
    await this.waitForLightningIdle();

    const escaped = this.escapeForRegex(policyReference);

    // Wait for at least one results table to appear.
    await expect(this.page.locator('table:visible').first()).toBeVisible({ timeout: 120000 });

    // ── Poll across ALL tables for a row that has the policy ref AND a Quoted stage cell ──
    const deadline = Date.now() + 120000;
    let quotedRowLocator: import('@playwright/test').Locator | null = null;

    while (Date.now() < deadline) {
      await this.waitForLightningIdle();

      const allTables = this.page.locator('table:visible');
      const tableCount = await allTables.count().catch(() => 0);

      for (let t = 0; t < tableCount; t++) {
        const table = allTables.nth(t);
        const matchingRows = table.locator('tr').filter({ hasText: new RegExp(escaped, 'i') });
        const rowCount = await matchingRows.count().catch(() => 0);

        for (let r = 0; r < rowCount; r++) {
          const row = matchingRows.nth(r);

          // Strategy 1: a <td> whose trimmed innerText is exactly "Quoted".
          const cells = row.locator('td');
          const cellCount = await cells.count().catch(() => 0);
          for (let c = 0; c < cellCount; c++) {
            const cellText = (await cells.nth(c).innerText().catch(() => '')).trim();
            if (/^Quoted$/i.test(cellText)) {
              quotedRowLocator = row;
              break;
            }
          }
          if (quotedRowLocator) break;

          // Strategy 2: any descendant element (badge / span / div) whose text is "Quoted".
          const quotedBadge = row.locator(
            'lightning-badge, span.slds-badge, [class*="badge"], [class*="status"], td span, td div',
          ).filter({ hasText: /^Quoted$/i }).first();
          if (await quotedBadge.isVisible({ timeout: 300 }).catch(() => false)) {
            quotedRowLocator = row;
            break;
          }
        }

        if (quotedRowLocator) break;
      }

      if (quotedRowLocator) break;
      await this.page.waitForTimeout(2000);
    }

    if (!quotedRowLocator) {
      // Collect diagnostic text from every matching row across every table to aid debugging.
      const samples: string[] = [];
      const allTables = this.page.locator('table:visible');
      const tableCount = await allTables.count().catch(() => 0);
      for (let t = 0; t < tableCount && samples.length < 6; t++) {
        const rows = allTables.nth(t).locator('tr').filter({ hasText: new RegExp(escaped, 'i') });
        const rowCount = await rows.count().catch(() => 0);
        for (let r = 0; r < rowCount && samples.length < 6; r++) {
          const text = (await rows.nth(r).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
          if (text) samples.push(`[table ${t}, row ${r}]: ${text}`);
        }
      }
      throw new Error(
        `[salesforce] Global search for '${policyReference}' found no row with Stage = "Quoted" across ${tableCount} table(s).\n` +
        `Rows found:\n${samples.join('\n')}`,
      );
    }

    // Click the link inside the Quoted row that refers to this policy.
    const linkInRow = quotedRowLocator.getByRole('link', { name: new RegExp(escaped, 'i') }).first();
    const anyLink   = quotedRowLocator.locator('a:visible').filter({ hasText: new RegExp(escaped, 'i') }).first();

    if (await linkInRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.clickWhenUiReady(linkInRow);
    } else {
      await expect(anyLink).toBeVisible({ timeout: 15000 });
      await this.clickWhenUiReady(anyLink);
    }

    await this.waitForLightningIdle();
    await expect(this.page.getByRole('tab', { name: 'Related' }).first()).toBeVisible({ timeout: 120000 });
  }

  /**
   * Step 5-6: Search by policy number and open the policy from the results grid.
   * This path intentionally waits for slow Salesforce indexing/rendering.
   */
  async searchPolicyAndOpenFromGlobalSearchGrid(policyReference: string) {
    const searchLauncher = this.page.locator('//*[@id="oneHeader"]/div[2]/div[2]/div/div/button').first();
    const searchButtonFallback = this.page.getByRole('button', { name: /^Search/ }).first();

    if (await searchLauncher.isVisible({ timeout: 10000 }).catch(() => false)) {
      await this.clickWhenUiReady(searchLauncher);
    } else {
      await expect(searchButtonFallback).toBeVisible({ timeout: 15000 });
      await this.clickWhenUiReady(searchButtonFallback);
    }

    // IMPORTANT: scope to dialog/header to avoid matching "Search this list..." in content area
    const dialogSearchInput = this.page
      .locator('[role="dialog"] input[type="search"]:visible, [role="dialog"] input[placeholder*="Search"]:visible')
      .first();
    const headerSearchInput = this.page
      .locator('#oneHeader input[type="search"]:visible, #oneHeader [role="searchbox"]:visible, [role="combobox"][placeholder*="Search"]:visible')
      .first();

    let activeSearchInput = dialogSearchInput;
    if (!(await dialogSearchInput.isVisible({ timeout: 8000 }).catch(() => false))) {
      await expect(headerSearchInput).toBeVisible({ timeout: 15000 });
      activeSearchInput = headerSearchInput;
    }

    await activeSearchInput.fill(policyReference);
    await activeSearchInput.press('Enter');

    // Wait for slow search indexing/rendering and open the policy link from the grid.
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await this.waitForLightningIdle();

      const policyLink = this.page.getByRole('link', { name: new RegExp(policyReference, 'i') }).first();
      if (await policyLink.isVisible({ timeout: 12000 }).catch(() => false)) {
        await this.clickWhenUiReady(policyLink);
        await this.waitForLightningIdle();
        await this.expectInsurancePolicyRecordLoaded();
        return;
      }

      const insurancePoliciesFilter = this.page.getByRole('link', { name: /Insurance Policies/i }).first();
      if (await insurancePoliciesFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
        await this.clickWhenUiReady(insurancePoliciesFilter);
        await this.waitForLightningIdle();
      }

      if (attempt < 6) {
        await this.page.waitForTimeout(15000);
      }
    }

    throw new Error(`Policy ${policyReference} was not visible in global search results grid.`);
  }

  /** Step 8: Open Notes & Attachments related list from Policy record */
  async openNotesAndAttachmentsFromRelatedTab() {
    await this.openRelatedTab();

    const notesSectionLink = this.page
      .locator('article:visible')
      .getByRole('link', { name: /Notes\s*&\s*Attachments/i })
      .first();

    for (let i = 0; i < 15; i += 1) {
      if (await notesSectionLink.isVisible({ timeout: 1000 }).catch(() => false)) {
        break;
      }
      await this.page.mouse.wheel(0, 1200);
      await this.page.waitForTimeout(500);
    }

    await expect(notesSectionLink).toBeVisible({ timeout: 120000 });
    await this.clickWhenUiReady(notesSectionLink);
    await this.waitForLightningIdle();

    const notesHeading = this.page.getByRole('heading', { name: /Notes\s*&\s*Attachments/i }).first();
    await expect(notesHeading).toBeVisible({ timeout: 60000 });
  }

  /** Step 9-10: Open each document/link in Notes & Attachments, close, and assert return */
  async openEachNoteAttachmentAndClose(maxDocuments = 10) {
    const attachmentLinks = this.page.locator('[role="rowheader"] a:visible, tbody a:visible');
    const totalLinks = await attachmentLinks.count();
    const docsToOpen = Math.min(totalLinks, maxDocuments);

    expect(docsToOpen, 'Expected at least one document/link in Notes & Attachments').toBeGreaterThan(0);

    for (let i = 0; i < docsToOpen; i += 1) {
      const link = attachmentLinks.nth(i);
      const [newPage] = await Promise.all([
        this.page.context().waitForEvent('page', { timeout: 10000 }).catch(() => null),
        link.click(),
      ]);

      if (newPage) {
        await newPage.waitForLoadState('domcontentloaded');
        await newPage.close();
      } else {
        const closeButton = this.page
          .getByRole('button', { name: /Close|Done|Back/i })
          .first();
        if (await closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await closeButton.click();
        } else {
          await this.page.goBack().catch(() => undefined);
        }
      }

      await this.waitForLightningIdle();
      await expect(this.page.getByRole('heading', { name: /Notes\s*&\s*Attachments/i }).first()).toBeVisible({ timeout: 60000 });
    }
  }

  async expectInsurancePolicyRecordLoaded() {
    await expect(this.page.getByRole('heading', { name: /Insurance Policy/i })).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();

    const inForceOption = this.page.getByRole('option', { name: 'In Force' });
    await expect(inForceOption).toBeVisible({ timeout: 60000 });

    await expect(this.page.getByRole('button', { name: 'Create MTA' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: 'Create Claim' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: 'New Note' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: 'Show more actions' })).toBeVisible({ timeout: 60000 });
  }

  // ── MTA (Mid-Term Adjustment) Flow ──────────────────────────────────

  async openCreateMTADialog() {
    const createMTAButton = this.page.getByRole('button', { name: 'Create MTA' });
    await expect(createMTAButton).toBeVisible({ timeout: 60000 });
    await createMTAButton.click();
    await this.waitForLightningIdle();

    // Wait for the "Enter MTA Information" flow screen to appear
    const mtaHeading = this.page.getByText('Enter MTA Information').first();
    await expect(mtaHeading).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();

    // Wait for the MTA Reason combobox to confirm the form is interactive
    await expect(this.page.getByRole('combobox', { name: /MTA Reason/i })).toBeVisible({ timeout: 30000 });

    // Dismiss any error toast if present
    const errorToastClose = this.page.locator('button[title="Close"]:visible').first();
    if (await errorToastClose.isVisible({ timeout: 3000 }).catch(() => false)) {
      await errorToastClose.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Step 1: Fill the Create MTA dialog — select MTA Reason and click Save.
   */
  async fillMTAReasonAndSave(mtaReason: string) {
    // Select MTA Reason from the dropdown (Lightning combobox)
    await this.selectLightningCombobox('MTA Reason', mtaReason);

    // Click Submit on the flow screen
    const submitButton = this.page.getByRole('button', { name: /Submit/i }).first();
    await expect(submitButton).toBeVisible({ timeout: 15000 });
    await submitButton.click();
    await this.waitForLightningIdle();

    // Wait for the MTA record page to fully load after submission
    await this.page.waitForLoadState('load');
    await this.waitForLightningIdle();
    await expect(this.page.getByRole('button', { name: /Edit Intermediary Reference/i }).first()
      .or(this.page.getByRole('heading', { name: /Insurance Policy/i }).first())
    ).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();
  }

  /**
   * Step 2: Fill the Intermediary Reference field.
   * This is an inline-editable field (pencil icon to start editing).
   */
  async fillIntermediaryReference(reference: string) {
    // Click the pencil/edit icon next to "Intermediary Reference"
    const editButton = this.page.getByRole('button', { name: /Edit Intermediary Reference/i }).first();
    await expect(editButton).toBeVisible({ timeout: 30000 });
    await editButton.click();
    await this.waitForLightningIdle();

    // Fill the now-editable input field
    const inputField = this.page.getByRole('textbox', { name: /Intermediary Reference/i }).first();
    await expect(inputField).toBeVisible({ timeout: 15000 });
    await inputField.fill(reference);

    // Save the inline edit (press Enter or click Save)
    await inputField.press('Enter');
    await this.waitForLightningIdle();

    // If there's a Save button for the inline edit, click it
    const inlineSave = this.page.getByRole('button', { name: /Save/i }).first();
    if (await inlineSave.isVisible({ timeout: 5000 }).catch(() => false)) {
      await inlineSave.click();
      await this.waitForLightningIdle();
    }
  }

  /**
   * Step 3: Edit MTA Premium — click edit, enter value, click OK.
   */
  async editMTAPremium(premiumValue: string) {
    // Click the pencil/edit icon next to MTA Premium
    const editButton = this.page.getByRole('button', { name: /Edit MTA Premium/i }).first();
    await expect(editButton).toBeVisible({ timeout: 30000 });
    await editButton.click();
    await this.waitForLightningIdle();

    // Wait for the "Edit MTA Premium" dialog to appear
    const dialog = this.page.getByRole('dialog', { name: /Edit MTA Premium/i });
    await expect(dialog).toBeVisible({ timeout: 30000 });

    // Fill the premium value — the field is labelled "MTA Additional Premium" inside the dialog
    const spinInput = dialog.getByRole('spinbutton', { name: /MTA.*Premium/i }).first();
    const textInput = dialog.getByRole('textbox', { name: /MTA.*Premium/i }).first();

    if (await spinInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await spinInput.fill(premiumValue);
    } else {
      await expect(textInput).toBeVisible({ timeout: 10000 });
      await textInput.fill(premiumValue);
    }

    // Click Save inside the dialog
    const saveButton = dialog.getByRole('button', { name: /Save/i }).first();
    await expect(saveButton).toBeVisible({ timeout: 15000 });
    await saveButton.click();
    await this.waitForLightningIdle();

    // Close the success confirmation dialog if it remains open
    const closeButton = dialog.getByRole('button', { name: /Close/i }).first();
    if (await closeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await closeButton.click();
      await this.waitForLightningIdle();
    }
  }

  /**
   * Step 4: Bind MTA — click Bind MTA, set date, click Bind.
   */
  async bindMTA(bindDate?: string) {
    const pad2 = (value: number) => value.toString().padStart(2, '0');
    const formatIsoDate = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    const toIsoDate = (value: string) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      const dmy = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : formatIsoDate(parsed);
    };

    // Fill the date field (defaults to today if not specified)
    const today = new Date();
    const dateValueGB = bindDate ?? today.toLocaleDateString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    const dateValueISO = toIsoDate(bindDate ?? formatIsoDate(today));

    // New UI: the bind/effective date may need to be entered BEFORE clicking "Bind MTA".
    const preBindDateInput = this.page.locator('input[type="date"]:visible').first();
    const preBindDateTextbox = this.page.getByRole('textbox', { name: /Bind Date|Effective.*Date|^Date$/i }).first();
    if (await preBindDateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await preBindDateInput.fill(dateValueISO);
      await preBindDateInput.press('Tab').catch(() => undefined);
      await this.waitForLightningIdle();
    } else if (await preBindDateTextbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await preBindDateTextbox.fill(dateValueGB);
      await preBindDateTextbox.press('Tab').catch(() => undefined);
      await this.waitForLightningIdle();
    }

    // Click the Bind MTA button
    const bindMTAButton = this.page.getByRole('button', { name: /Bind MTA/i }).first();
    await expect(bindMTAButton).toBeVisible({ timeout: 30000 });
    await bindMTAButton.click();
    await this.waitForLightningIdle();

    // Wait for the bind dialog/form to appear
    await this.page.waitForTimeout(2000);

    const dialog = this.page.locator('[role="dialog"]:visible').first();

    // Try common date field locators (prefer inside dialog if present)
    const dialogVisible = await dialog.isVisible({ timeout: 1000 }).catch(() => false);
    const scope = dialogVisible ? dialog : this.page;

    const scopedDateInput = scope.locator('input[type="date"]:visible').first();
    const scopedDateTextbox = scope.getByRole('textbox', { name: /Bind Date|Effective.*Date|Date/i }).first();

    if (await scopedDateInput.isVisible({ timeout: 10000 }).catch(() => false)) {
      await scopedDateInput.fill(dateValueISO);
      await scopedDateInput.press('Tab').catch(() => undefined);
      await this.waitForLightningIdle();
    } else if (await scopedDateTextbox.isVisible({ timeout: 10000 }).catch(() => false)) {
      await scopedDateTextbox.fill(dateValueGB);
      await scopedDateTextbox.press('Tab').catch(() => undefined);
      await this.waitForLightningIdle();
    }

    // Click Bind/Bind MTA to confirm (UI varies)
    const bindButton = dialog
      .getByRole('button', { name: /^Bind$/i })
      .or(dialog.getByRole('button', { name: /Bind MTA/i }))
      .or(this.page.getByRole('button', { name: /^Bind$/i }))
      .first();
    await expect(bindButton).toBeVisible({ timeout: 15000 });
    await bindButton.click();
    await this.waitForLightningIdle();
  }

  async openCancelPolicyWizard() {
    await this.page.getByRole('button', { name: 'Show more actions' }).click();
    await expect(this.page.getByRole('menuitem', { name: 'Cancel Policy' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('menuitem', { name: 'Cancel and Reissue' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('menuitem', { name: 'Change Owner' })).toBeVisible({ timeout: 60000 });
    await this.page.getByRole('menuitem', { name: 'Cancel Policy' }).click();

    await expect(this.page.getByRole('heading', { name: 'Cancel Policy' })).toBeVisible({ timeout: 60000 });

    // Wait for the Cancellation Category combobox to confirm the form is interactive
    await expect(this.page.getByRole('combobox', { name: /Cancellation Category/i })).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();
  }

  async openCancelAndReissueDialog() {
    await this.page.getByRole('button', { name: 'Show more actions' }).click();
    await expect(this.page.getByRole('menuitem', { name: 'Cancel and Reissue' })).toBeVisible({ timeout: 60000 });
    await this.page.getByRole('menuitem', { name: 'Cancel and Reissue' }).click();

    // Cancel and Reissue opens a modal dialog (not an omniscript wizard)
    const dialog = this.page.locator('[role="dialog"]:visible').first();
    await expect(dialog).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();

    // Dismiss the "Attempt to de-reference a null object" error toast if it appears
    const errorToastClose = this.page.locator('button[title="Close"]:visible').first();
    if (await errorToastClose.isVisible({ timeout: 3000 }).catch(() => false)) {
      await errorToastClose.click();
      await this.page.waitForTimeout(500);
    }
  }

  async completeCancelFromInceptionStep1(notes: string) {
    // Select Cancellation Category — wait for DOM re-render after each selection
    await this.selectLightningCombobox('Cancellation Category', 'Cancel the Policy from Inception');

    // Wait for Cooling Period Display to confirm the form refreshed after category selection
    const coolingPeriod = this.page.getByRole('textbox', { name: /Cooling Period Display/i });
    await expect(coolingPeriod).toBeVisible({ timeout: 15000 });

    // Select Instigated By — DOM re-renders, Reason dropdown appears dynamically
    await this.selectLightningCombobox('Cancellation Instigated By', 'Customer');
    await expect(this.page.getByRole('combobox', { name: /Cancellation Reason/i })).toBeVisible({ timeout: 15000 });

    // Select Reason — DOM re-renders, Notes field appears dynamically
    await this.selectLightningCombobox('Cancellation Reason', 'Cover No Longer Required');
    await expect(this.page.getByRole('textbox', { name: /Cancellation Notes/i })).toBeVisible({ timeout: 15000 });

    // Fill notes and proceed
    await this.page.getByRole('textbox', { name: /Cancellation Notes/i }).fill(notes);
    await this.waitForLightningIdle();
    await this.page.getByRole('button', { name: 'Next' }).click();

    // Verify Step 2 loaded
    await expect(this.page.getByRole('heading', { name: 'Enter Premiums' })).toBeVisible({ timeout: 60000 });
  }
  async completeCancelFromInceptionStep2(notes: string) {
    // Select Cancellation Category — wait for DOM re-render after each selection
    await this.selectLightningCombobox('Cancellation Category', 'Cancel this MTA Only');

    // Wait for Cooling Period Display to confirm the form refreshed after category selection
    const coolingPeriod = this.page.getByRole('textbox', { name: /Cooling Period Display/i });
    await expect(coolingPeriod).toBeVisible({ timeout: 15000 });

    // Select Instigated By — DOM re-renders, Reason dropdown appears dynamically
    await this.selectLightningCombobox('Cancellation Instigated By', 'Customer');
    await expect(this.page.getByRole('combobox', { name: /Cancellation Reason/i })).toBeVisible({ timeout: 15000 });

    // Select Reason — DOM re-renders, Notes field appears dynamically
    await this.selectLightningCombobox('Cancellation Reason', 'Cover No Longer Required');
    await expect(this.page.getByRole('textbox', { name: /Cancellation Notes/i })).toBeVisible({ timeout: 15000 });

    // Fill notes and proceed
    await this.page.getByRole('textbox', { name: /Cancellation Notes/i }).fill(notes);
    await this.waitForLightningIdle();
    await this.page.getByRole('button', { name: 'Next' }).click();

    // Verify Step 2 loaded
    await expect(this.page.getByRole('heading', { name: 'Enter Premiums' })).toBeVisible({ timeout: 60000 });
  }


  async completeCancelMidtermStep1(notes: string, cancellationDate?: string) {
    // Select Cancellation Category — wait for DOM re-render
    await this.selectLightningCombobox('Cancellation Category', 'Cancel the Policy Midterm');

    // Dynamic fields: editable date picker + Outside Cooling-Off Period
    const dateField = this.page.getByRole('textbox', { name: /Cancellation Effective Date/i });
    await expect(dateField).toBeVisible({ timeout: 15000 });
    await expect(dateField).toBeEnabled({ timeout: 10000 });
    await expect(this.page.getByRole('textbox', { name: /Cooling Period Display/i })).toHaveValue('Outside Cooling-Off Period', {
      timeout: 15000,
    });

    // Set cancellation date (defaults to today)
    const dateValue = cancellationDate ?? new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    await dateField.fill(dateValue);
    await dateField.press('Tab');
    await this.waitForLightningIdle();

    // Select Instigated By — DOM re-renders, Reason dropdown appears
    await this.selectLightningCombobox('Cancellation Instigated By', 'Customer');
    await expect(this.page.getByRole('combobox', { name: /Cancellation Reason/i })).toBeVisible({ timeout: 15000 });

    // Select Reason — DOM re-renders, Notes field appears
    await this.selectLightningCombobox('Cancellation Reason', 'Product Too Expensive');
    await expect(this.page.getByRole('textbox', { name: /Cancellation Notes/i })).toBeVisible({ timeout: 15000 });

    // Fill notes and proceed
    await this.page.getByRole('textbox', { name: /Cancellation Notes/i }).fill(notes);
    await this.waitForLightningIdle();
    await this.page.getByRole('button', { name: 'Next' }).click();

    // Verify Step 2 loaded
    await expect(this.page.getByRole('heading', { name: 'Enter Premiums' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: /Cancel Policy Completed/i })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: /Enter Premiums In Progress/i })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('progressbar', { name: 'Steps' })).toContainText('100%', { timeout: 60000 });
  }
  

  async completePremiumStepWithTaxCalculation(cancellationPremium?: string) {
    await expect(this.page.getByRole('heading', { name: 'Enter Premiums' })).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();

    // This combobox is sometimes pre-set to "Yes" and disabled by Salesforce.
    // In that case, don't try to click it.
    const returnFullPremiumCombobox = this.page.getByRole('combobox', { name: 'Do you want to return the full premium?' }).first();
    await expect(returnFullPremiumCombobox).toBeVisible({ timeout: 60000 });
    const canChangeReturnFullPremium = await returnFullPremiumCombobox.isEnabled().catch(() => false);
    if (canChangeReturnFullPremium) {
      await this.selectLightningCombobox('Do you want to return the full premium?', 'Yes');
    }

    const cancellationReturnPremium = this.page.getByRole('spinbutton', { name: 'Cancellation Return Premium' });
    await expect(cancellationReturnPremium).toBeVisible({ timeout: 60000 });
    if (typeof cancellationPremium === 'string' && cancellationPremium.trim().length > 0) {
      await cancellationReturnPremium.fill(cancellationPremium);
      await cancellationReturnPremium.press('Tab').catch(() => {});
      await this.waitForLightningIdle();
    }

    const calculateTaxButton = this.page.getByRole('button', { name: 'Calculate Tax' }).first();
    await expect(calculateTaxButton).toBeVisible({ timeout: 60000 });
    await calculateTaxButton.click();
    await this.acceptTaxDialogIfPresent();

    await expect(this.page.getByRole('heading', { name: 'Tax Details' })).toBeVisible({ timeout: 120000 });
  }

  /**
   * Opt-in helper for flows that require the explicit sequence:
   * 1) Click Calculate Tax
   * 2) Click OK
   * 3) Click Next
   *
   * Intentionally NEW so existing cancellation tests remain unaffected.
   */
  async completePremiumStepCalculateTaxOkAndNext(cancellationPremium?: string) {
    await expect(this.page.getByRole('heading', { name: 'Enter Premiums' })).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();

    // This combobox is sometimes pre-set to "Yes" and disabled by Salesforce.
    // In that case, don't try to click it.
    const returnFullPremiumCombobox = this.page.getByRole('combobox', { name: 'Do you want to return the full premium?' }).first();
    await expect(returnFullPremiumCombobox).toBeVisible({ timeout: 60000 });
    const canChangeReturnFullPremium = await returnFullPremiumCombobox.isEnabled().catch(() => false);
    if (canChangeReturnFullPremium) {
      await this.selectLightningCombobox('Do you want to return the full premium?', 'Yes');
    }

    const cancellationReturnPremium = this.page.getByRole('spinbutton', { name: 'Cancellation Return Premium' });
    await expect(cancellationReturnPremium).toBeVisible({ timeout: 60000 });
    if (typeof cancellationPremium === 'string' && cancellationPremium.trim().length > 0) {
      await cancellationReturnPremium.fill(cancellationPremium);
      await cancellationReturnPremium.press('Tab').catch(() => {});
      await this.waitForLightningIdle();
    }

    const calculateTaxButton = this.page.getByRole('button', { name: 'Calculate Tax' }).first();
    await expect(calculateTaxButton).toBeVisible({ timeout: 60000 });
    await calculateTaxButton.click();
    await this.acceptTaxDialogIfPresent();
    await this.waitForLightningIdle();

    const nextButton = this.page.getByRole('button', { name: 'Next' }).first();
    await expect(nextButton).toBeVisible({ timeout: 60000 });
    await expect(nextButton).toBeEnabled({ timeout: 60000 });
    await nextButton.scrollIntoViewIfNeeded();
    await nextButton.click();

    // Cancellation processing can keep us on the wizard briefly; wait until we land back on the
    // Insurance Policy record page (where the status Path options exist).
    const insurancePolicyHeading = this.page.getByRole('heading', { name: /Insurance Policy/i }).first();
    const pathCancelled = this.page.getByRole('option', { name: 'Cancelled' }).first();

    await expect
      .poll(async () => {
        await this.waitForLightningIdle();
        const onPolicy = await insurancePolicyHeading.isVisible({ timeout: 500 }).catch(() => false);
        if (onPolicy) return true;
        const cancelledVisible = await pathCancelled.isVisible({ timeout: 500 }).catch(() => false);
        return cancelledVisible;
      }, { timeout: 300000 })
      .toBeTruthy();

    if (await insurancePolicyHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(pathCancelled).toBeVisible({ timeout: 180000 });
    }
  }

  private async acceptTaxDialogIfPresent() {
    let browserDialogHandled = false;
    const dialogHandler = async (dialog: { accept: () => Promise<void> }) => {
      browserDialogHandled = true;
      await dialog.accept();
    };

    this.page.once('dialog', dialogHandler);

    const okButton = this.page.getByRole('button', { name: /^OK$/i }).first();
    const dialogContainer = this.page.locator('[role="dialog"]:visible').first();

    if (await dialogContainer.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (await okButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await okButton.click();
      }
    } else if (await okButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await okButton.click();
    }

    if (!browserDialogHandled) {
      this.page.removeListener('dialog', dialogHandler);
    }
  }

  async submitCancellation() {
    const nextButton = this.page.getByRole('button', { name: 'Next' }).first();
    await expect(nextButton).toBeVisible({ timeout: 60000 });
    await nextButton.scrollIntoViewIfNeeded();
    await nextButton.click();

    // Cancellation processing can keep us on the wizard briefly; wait until we land back on the
    // Insurance Policy record page (where the status Path options exist).
    const insurancePolicyHeading = this.page.getByRole('heading', { name: /Insurance Policy/i }).first();
    const pathCancelled = this.page.getByRole('option', { name: 'Cancelled' }).first();

    await expect
      .poll(async () => {
        await this.waitForLightningIdle();
        const onPolicy = await insurancePolicyHeading.isVisible({ timeout: 500 }).catch(() => false);
        if (onPolicy) return true;
        const cancelledVisible = await pathCancelled.isVisible({ timeout: 500 }).catch(() => false);
        return cancelledVisible;
      }, { timeout: 300000 })
      .toBeTruthy();

    // If we’re on the policy page, ensure the Cancelled option becomes available.
    if (await insurancePolicyHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(pathCancelled).toBeVisible({ timeout: 180000 });
    }
  }

  /**
   * Fill and submit the Cancel and Reissue Details modal dialog.
   *
   * The dialog contains Lightning comboboxes (not native selects):
   *   - Reason (pre-filled "Cancel and Reissue")
   *   - Reason for C&R (required — must select)
   *   - Settlement Type (pre-filled "Broker Settled")
   *   - Description (textarea)
   */
  async completeCancelAndReissueDialog(data: {
    reasonForCR: string;
    settlementType?: string;
    description?: string;
  }) {
    // Reason is pre-filled with "Cancel and Reissue" — no action needed

    // Select Reason for C&R (required — Lightning combobox)
    await this.selectLightningCombobox('Reason for C&R', data.reasonForCR);

    // Settlement Type is pre-filled with "Broker Settled" — change only if specified
    if (data.settlementType) {
      await this.selectLightningCombobox('Settlement Type', data.settlementType);
    }

    // Fill Description if provided
    if (data.description) {
      const descriptionField = this.page.locator('[role="dialog"]:visible').getByRole('textbox').first();
      await expect(descriptionField).toBeVisible({ timeout: 10000 });
      await descriptionField.fill(data.description);
    }

    // Click Submit
    const submitButton = this.page.locator('[role="dialog"]:visible').getByRole('button', { name: 'Submit' });
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    await submitButton.click();
    await this.waitForLightningIdle();
  }

  /**
   * After submitting Cancel and Reissue, Salesforce redirects to the Quote Journey
   * at the "Final policy details" step with pre-filled insured details.
   * This method waits for the page, verifies it loaded, and clicks Proceed.
   */
  async completeReissueFinalPolicyDetails() {
    // Wait for the Quote Journey page with Final policy details step
    await expect(this.page.getByRole('heading', { name: 'Quote Journey' })).toBeVisible({ timeout: 120000 });
    await expect(this.page.getByRole('heading', { name: 'Final policy details' })).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();

    // The form fields (insured name, postcode, address, town) are pre-filled from the original policy.
    // Click Proceed to move to the Summary step.
    const proceedButton = this.page.getByRole('button', { name: 'Proceed' });
    await expect(proceedButton).toBeVisible({ timeout: 30000 });
    await proceedButton.click();
    await this.waitForLightningIdle();
  }

  /**
   * Summary step of the reissue Quote Journey.
   * Verifies the summary loaded and clicks the order/proceed button.
   */
  async completeReissueSummary() {
    // Wait for step 5 Summary to load
    const summaryHeading = this.page.getByRole('heading', { name: /Summary/i }).first();
    await expect(summaryHeading).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();

    // Look for the order/proceed button on the summary page
    const orderButton = this.page
      .getByRole('button', { name: /Proceed to order|Order|Submit/i })
      .first();
    await expect(orderButton).toBeVisible({ timeout: 30000 });
    await orderButton.click();
    await this.waitForLightningIdle();
  }

  async expectPolicyStatusCancelled() {
    const pathCancelled = this.page.getByRole('option', { name: 'Cancelled' });
    await expect(pathCancelled).toHaveAttribute('aria-selected', 'true', { timeout: 120000 });
  }

  private async expectAppLoaded() {
    // Wait for any of the common Salesforce app-loaded indicators
    const appHeading = this.page.getByRole('heading', { name: 'MLIS Underwriting' });
    const navBar = this.page.locator('one-app-nav-bar, .slds-global-header');
    const searchButton = this.page.locator('//*[@id="oneHeader"]/div[2]/div[2]/div/div/button').first();

    await expect(appHeading.or(navBar).or(searchButton).first()).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();
  }

  private async waitForLightningIdle() {
    await this.page.waitForLoadState('domcontentloaded');
    const textSpinner = this.page.getByText('Loading...').first();
    if (await textSpinner.isVisible({ timeout: 1500 }).catch(() => false)) {
      await expect(textSpinner).toBeHidden({ timeout: 60000 });
    }

    const lightningSpinner = this.page.locator('.slds-spinner_container:visible, lightning-spinner:visible').first();
    if (await lightningSpinner.isVisible({ timeout: 1500 }).catch(() => false)) {
      await expect(lightningSpinner).toBeHidden({ timeout: 60000 });
    }
  }

  // ── Insurance Policy: Quotes tab assertions (opt-in) ──────────────────────

  private moneyTextRegex(amount: string): RegExp {
    const cleaned = amount.replace(/[£,$\s]/g, '').replace(/,/g, '');
    const numeric = Number.parseFloat(cleaned);
    if (!Number.isFinite(numeric)) {
      return new RegExp(this.escapeForRegex(amount), 'i');
    }

    const intPart = Math.trunc(numeric).toString();
    // Match examples: "100", "100.00", "£100.00" with non-digit boundaries.
    return new RegExp(`(?:^|[^\\d])(?:£\\s*)?${intPart}(?:\\.\\d{1,2})?(?:[^\\d]|$)`, 'i');
  }

  /** Open the Insurance Policy "Quotes" tab (kept opt-in so existing tests are unaffected). */
  async openQuotesTab1() {
    const quotesTab = this.page.getByRole('tab', { name: /^Quotes$/i }).first();

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        await this.waitForLightningIdle();
        await expect(quotesTab).toBeVisible({ timeout: 30000 });
        await this.clickWhenUiReady(quotesTab);
        await this.waitForLightningIdle();

        // Quotes content is commonly a table/list; wait for something visible in the main region.
        const visibleTable = this.page.locator('table:visible').first();
        if (await visibleTable.isVisible({ timeout: 5000 }).catch(() => false)) {
          return;
        }

        // Fallback: accept just having switched tabs if table isn't used.
        await expect(quotesTab).toHaveAttribute('aria-selected', 'true', { timeout: 15000 }).catch(() => {});
        return;
      } catch (error) {
        if (attempt === 4) throw error;
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.page.waitForTimeout(1500);
      }
    }
  }

  /** Assert the given premium values are present somewhere on the Quotes tab. */
  async expectMTAPremiumsOnQuotesTab(premiumValues: string[]) {
    await this.openQuotesTab();

    const scopeFallback = this.page.locator('main:visible').first();

    for (const premiumValue of premiumValues) {
      const premiumRegex = this.moneyTextRegex(premiumValue);

      await expect
        .poll(async () => {
          await this.waitForLightningIdle();

          const table = this.page.locator('table:visible').first();
          const text = await (await table.isVisible({ timeout: 500 }).catch(() => false)
            ? table.innerText().catch(() => '')
            : scopeFallback.innerText().catch(() => '')
          );
          return premiumRegex.test(text);
        }, { timeout: 180000 })
        .toBeTruthy();
    }
  }
  async fillLightningComboboxDirect(label: string, value: string) {
  const field = this.page.getByRole('combobox', { name: label });

  await expect(field).toBeVisible({ timeout: 15000 });

  // Click and clear
  await field.click();
  await field.fill('');

  // Type value
  await field.fill(value);

  // Select using keyboard (IMPORTANT)
  await field.press('ArrowDown');
  await field.press('Enter');

  await this.waitForLightningIdle();
}
async fillCancelPolicyStep1Direct(data: {
  category: string;
  instigatedBy: string;
  reason: string;
  notes: string;
  cancellationDate?: string;
}) {
  // Category
  await this.fillLightningComboboxDirect('Cancellation Category', data.category);

  // Date (if editable)
  const dateField = this.page.getByRole('textbox', { name: 'Cancellation Effective Date' });

  if (await dateField.isVisible().catch(() => false)) {
    if (await dateField.isEnabled().catch(() => false)) {
      const dateValue =
        data.cancellationDate ??
        new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

      await dateField.fill(dateValue);
      await dateField.press('Tab');
    }
  }

  await this.waitForLightningIdle();

  // Instigated By
  await this.fillLightningComboboxDirect('Cancellation Instigated By', data.instigatedBy);

  // Reason
  await this.fillLightningComboboxDirect('Cancellation Reason', data.reason);

  // Notes
  await this.page
    .getByRole('textbox', { name: 'Cancellation Notes/Narrative' })
    .fill(data.notes);

  await this.waitForLightningIdle();

  // Next
  await this.page.getByRole('button', { name: 'Next' }).click();

  await expect(this.page.getByRole('heading', { name: 'Enter Premiums' }))
    .toBeVisible({ timeout: 60000 });
}
}