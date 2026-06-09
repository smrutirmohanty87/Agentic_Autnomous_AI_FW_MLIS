import { test, expect, Page } from '@playwright/test';
import { registerLocators } from '../healing/locatorRegistry';
import { healLocator, HealerOptions, printHealSummary, clearHealLog } from '../healing/healer';

// ---------------------------------------------------------------------------
// Strategy definitions – single source of truth used by both the registry
// and the helper functions (eliminates duplication / drift).
// ---------------------------------------------------------------------------

const STRATEGIES: Record<string, Parameters<typeof healLocator>[2]> = {
  loginUsername: [
    { type: 'name',        value: 'username' },
    { type: 'placeholder', value: 'Username' },
    { type: 'label',       value: 'Username' },
    { type: 'role',        role: 'textbox', options: { name: 'Username' } },
    { type: 'css',         selector: 'input.oxd-input[name="username"]' },
  ],
  loginPassword: [
    { type: 'name',        value: 'password' },
    { type: 'placeholder', value: 'Password' },
    { type: 'label',       value: 'Password' },
    { type: 'role',        role: 'textbox', options: { name: 'Password' } },
    { type: 'css',         selector: 'input.oxd-input[name="password"]' },
  ],
  loginButton: [
    { type: 'role', role: 'button', options: { name: 'Login' } },
    { type: 'css',  selector: 'button[type="submit"]' },
    { type: 'text', value: 'Login', exact: true },
  ],
  loginHeading: [
    { type: 'role', role: 'heading', options: { name: 'Login' } },
    { type: 'text', value: 'Login',  exact: true },
    { type: 'css',  selector: 'h5.orangehrm-login-title' },
  ],
  dashboardHeading: [
    { type: 'role', role: 'heading', options: { name: 'Dashboard' } },
    { type: 'text', value: 'Dashboard', exact: true },
    { type: 'css',  selector: 'h6.oxd-text--h6' },
  ],
};

// Register strategies in the locator registry (idempotent – safe to call
// multiple times because registerLocators overwrites existing keys).
registerLocators(
  Object.entries(STRATEGIES).map(([key, strategies]) => ({ key, strategies }))
);

// ---------------------------------------------------------------------------
// Shared healer options – generous timeout for the slow public demo site
// ---------------------------------------------------------------------------

const HEAL_OPTS: HealerOptions = { strategyTimeout: 10000, promoteOnHeal: true };

// ---------------------------------------------------------------------------
// Helpers – all accept HealerOptions so the timeout flows through
// ---------------------------------------------------------------------------

function strategiesFor(key: string): Parameters<typeof healLocator>[2] {
  const s = STRATEGIES[key];
  if (!s) throw new Error(`[healing-demo] Unknown strategy key: "${key}"`);
  return s;
}

async function fillWithHeal(page: Page, key: string, value: string): Promise<void> {
  const locator = await healLocator(page, key, strategiesFor(key), HEAL_OPTS);
  await locator.fill(value);
}

async function clickWithHeal(page: Page, key: string): Promise<void> {
  const locator = await healLocator(page, key, strategiesFor(key), HEAL_OPTS);
  await locator.click();
}

async function expectVisibleWithHeal(page: Page, key: string): Promise<void> {
  const locator = await healLocator(page, key, strategiesFor(key), HEAL_OPTS);
  await expect(locator).toBeVisible();
}

/** Navigate to the login page and wait for the SPA to render the form. */
async function gotoLogin(page: Page): Promise<void> {
  await page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/auth/login');
  // Wait for domcontentloaded (faster than networkidle on SPAs) then
  // gate on the username field being visible — guarantees the form is ready.
  await page.waitForLoadState('domcontentloaded');
  await page.locator('input[name="username"]').waitFor({ state: 'visible', timeout: 30000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('OrangeHRM Login – Self-Healing Demo', () => {
  // Raise timeouts globally for the slow public demo site.
  test.use({ navigationTimeout: 60000, actionTimeout: 20000 });

  // Reset heal log before each test so events are isolated per test.
  test.beforeEach(() => {
    clearHealLog();
  });

  // Print and clear heal log after each test (runs even on failure).
  test.afterEach(() => {
    printHealSummary();
    clearHealLog();
  });

  // Each test receives its own `page` from the Playwright fixture — fully
  // independent browser context, no shared navigation state.

  test('TC_001 – Login page loads with self-healing locators', async ({ page }) => {
    await gotoLogin(page);

    await expectVisibleWithHeal(page, 'loginHeading');
    await expectVisibleWithHeal(page, 'loginUsername');
    await expectVisibleWithHeal(page, 'loginPassword');
    await expectVisibleWithHeal(page, 'loginButton');
  });

  test('TC_002 – Successful login with self-healing locators', async ({ page }) => {
    await gotoLogin(page);

    await fillWithHeal(page, 'loginUsername', 'Admin');
    await fillWithHeal(page, 'loginPassword', 'admin123');
    await clickWithHeal(page, 'loginButton');

    // Wait for the SPA to complete its post-login navigation before asserting.
    await page.waitForURL(/\/dashboard/i, { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');
    await expectVisibleWithHeal(page, 'dashboardHeading');
  });

  test('TC_003 – Healing fallback: CSS used when primary name strategy is broken', async ({ page }) => {
    await gotoLogin(page);

    // Intentionally broken primary strategy → healer falls back to CSS.
    // Use a short strategyTimeout so the broken strategy fails fast and the
    // CSS fallback is reached well within the test timeout.
    const healedInput = await healLocator(
      page,
      'loginUsername-fallback-demo',
      [
        { type: 'name', value: '__broken_name_that_does_not_exist__' },
        { type: 'css',  selector: 'input[name="username"]' },
      ],
      { ...HEAL_OPTS, strategyTimeout: 500 }
    );

    await expect(healedInput).toBeVisible();
    await healedInput.fill('Admin');
  });
});
