# Test Plan: OrangeHRM Login and Logout

## 1. Test Suite & Test Case ID

| Field            | Value                                      |
|------------------|--------------------------------------------|
| **Test Suite**   | OrangeHRM Authentication                  |
| **Test Case ID** | TC_LOGIN_001                               |
| **Title**        | OrangeHRM Login with Valid Credentials and Logout |
| **Seed File**    | `tests/tc_login_001_orangehrm_login_logout.spec.ts` |
| **Priority**     | P1 – Critical                              |
| **Type**         | Functional / End-to-End                   |

---

## 2. Prerequisites

- OrangeHRM demo instance is accessible at `https://opensource-demo.orangehrmlive.com/`
- Valid admin credentials exist: `username = Admin`, `password = admin123`
- Browser is in a clean state (no existing authenticated session / cookies)
- Playwright test runner and dependencies are installed (`npm install`)
- `playwright.config.ts` is configured with `baseURL` or tests use the full URL directly

---

## 3. Test Steps, Actions & Expected Results

### Step 1 – Navigate to OrangeHRM Login Page

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Open browser and navigate to `https://opensource-demo.orangehrmlive.com/web/index.php/auth/login` | Page loads successfully, URL contains `/auth/login` |
| 2 | Assert the **Login** heading is visible | `<h5>Login</h5>` (or equivalent heading) is displayed on screen |
| 3 | Assert the username input field is visible | Input with `name="username"` is present and interactable |
| 4 | Assert the password input field is visible | Input with `name="password"` is present and interactable |
| 5 | Assert the **Login** submit button is visible | `<button type="submit">` is present |

---

### Step 2 – Enter Valid Credentials

| # | Action | Expected Result |
|---|--------|-----------------|
| 6 | Type `Admin` into the username field | Username field contains the value `Admin` |
| 7 | Type `admin123` into the password field | Password field is filled (masked) |

---

### Step 3 – Submit Login Form

| # | Action | Expected Result |
|---|--------|-----------------|
| 8 | Click the **Login** button (`button[type="submit"]`) | Form is submitted; browser navigates away from `/auth/login` |

---

### Step 4 – Verify Dashboard Page

| # | Action | Expected Result |
|---|--------|-----------------|
| 9  | Assert current URL matches `/dashboard` pattern | URL contains `/dashboard` (case-insensitive regex `/\/dashboard\b/i`) |
| 10 | Assert the **Dashboard** heading is visible | `<h6>Dashboard</h6>` (or role=heading name="Dashboard") is displayed |

---

### Step 5 – Logout

| # | Action | Expected Result |
|---|--------|-----------------|
| 11 | Locate and click the **User Menu** (top-right avatar/username toggle) | Dropdown menu opens, revealing navigation options including **Logout** |
| 12 | Click the **Logout** link/button | Browser navigates to the login page (`/auth/login`) |
| 13 | Assert the URL contains `/auth/login` | User is fully logged out and redirected to the login page |
| 14 | Assert the **Login** heading is visible again | Login form is displayed, confirming session has ended |

---

## 4. Locator Strategy

| Element                  | Locator Strategy                                                                 | Locator Expression |
|--------------------------|---------------------------------------------------------------------------------|-------------------|
| Login page heading       | Role-based (`getByRole`)                                                        | `page.getByRole('heading', { name: 'Login' })` |
| Username input           | Attribute selector on `name`                                                    | `page.locator('input[name="username"]')` |
| Password input           | Attribute selector on `name`                                                    | `page.locator('input[name="password"]')` |
| Login submit button      | Attribute selector on `type`                                                    | `page.locator('button[type="submit"]')` |
| Dashboard page heading   | Role-based (`getByRole`)                                                        | `page.getByRole('heading', { name: 'Dashboard' })` |
| User menu (avatar)       | CSS class / aria label                                                          | `page.locator('.oxd-userdropdown-tab')` |
| Logout link              | Text-based role link                                                            | `page.getByRole('menuitem', { name: 'Logout' })` |

> **Locator Priority**: Prefer role-based locators (`getByRole`, `getByText`) for resilience. Fall back to stable `name` attributes. Avoid XPath or positional selectors.

---

## 5. Assertions Summary

| Step | Assertion Type | Expression |
|------|----------------|------------|
| Login page loaded       | `toBeVisible`  | `expect(page.getByRole('heading', { name: 'Login' })).toBeVisible()` |
| Username field visible  | `toBeVisible`  | `expect(page.locator('input[name="username"]')).toBeVisible()` |
| Password field visible  | `toBeVisible`  | `expect(page.locator('input[name="password"]')).toBeVisible()` |
| Submit button visible   | `toBeVisible`  | `expect(page.locator('button[type="submit"]')).toBeVisible()` |
| Navigated to Dashboard  | `toHaveURL`    | `expect(page).toHaveURL(/\/dashboard\b/i)` |
| Dashboard heading shown | `toBeVisible`  | `expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()` |
| Logged out – URL        | `toHaveURL`    | `expect(page).toHaveURL(/\/auth\/login/)` |
| Login form re-visible   | `toBeVisible`  | `expect(page.getByRole('heading', { name: 'Login' })).toBeVisible()` |

---

## 6. Pass / Fail Criteria

| Criteria | Pass Condition |
|----------|----------------|
| Login succeeds          | Dashboard URL and heading are visible after form submission |
| Dashboard is visible    | `getByRole('heading', { name: 'Dashboard' })` resolves within timeout |
| Logout succeeds         | URL returns to `/auth/login` and Login heading is visible |
| No unexpected errors    | No console errors, no unhandled exceptions during the test run |

---

## 7. Seed File Reference

**File path**: `tests/tc_login_001_orangehrm_login_logout.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('TC_LOGIN_001 – OrangeHRM Login and Logout', () => {
  test('TC_LOGIN_001 - Login with valid credentials and logout successfully', async ({ page }) => {
    // Step 1: Navigate to login page
    await page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/auth/login');

    // Step 2: Verify login page is displayed
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Step 3: Enter valid credentials
    await page.locator('input[name="username"]').fill('Admin');
    await page.locator('input[name="password"]').fill('admin123');

    // Step 4: Submit login form
    await page.locator('button[type="submit"]').click();

    // Step 5: Verify Dashboard page is displayed
    await expect(page).toHaveURL(/\/dashboard\b/i);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Step 6: Open user menu and logout
    await page.locator('.oxd-userdropdown-tab').click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();

    // Step 7: Verify logout – redirected back to login page
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  });
});
```
