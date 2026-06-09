# Test Plan: OrangeHRM PIM – Add New Employee

**Date:** 2026-06-03  
**Application:** OrangeHRM Open Source Demo (v5.8)  
**Base URL:** https://opensource-demo.orangehrmlive.com  
**Prepared By:** Playwright Test Planner Agent  

---

## 1. Test Suite Name

**Suite:** `PIM Module – Employee Management`  
**Sub-Suite:** `Add Employee – Core Workflow`

---

## 2. Test Cases

### TC-PIM-001 — Add New Employee with Mandatory Fields and Verify Profile Creation

---

## 3. Pre-conditions

| # | Pre-condition |
|---|---------------|
| 1 | OrangeHRM demo site is accessible at `https://opensource-demo.orangehrmlive.com` |
| 2 | Valid admin credentials are available: **Username:** `Admin` / **Password:** `admin123` |
| 3 | No existing employee named "John Agentic" exists in the system (fresh state) |
| 4 | Browser is in a clean session (no cached session cookies from a previous test) |
| 5 | Network connectivity is stable |

---

## 4. Step-by-Step Test Steps with Expected Results

### Phase 1: Login

| Step | Action | Expected Result | Locator Strategy |
|------|--------|----------------|-----------------|
| 1 | Navigate to `https://opensource-demo.orangehrmlive.com/web/index.php/auth/login` | Login page loads with Username and Password fields visible | Direct URL navigation |
| 2 | Verify the Login page heading is "Login" | Heading `Login` (h5) is visible | `page.locator('h5:has-text("Login")')` |
| 3 | Enter `Admin` into the **Username** field | Username field shows "Admin" | `page.getByRole('textbox', { name: 'Username' })` or `input[name="username"]` |
| 4 | Enter `admin123` into the **Password** field | Password field is populated (masked) | `page.getByRole('textbox', { name: 'Password' })` or `input[name="password"]` |
| 5 | Click the **Login** button | Page redirects to the Dashboard | `page.getByRole('button', { name: 'Login' })` or `button[type="submit"]` |
| 6 | Verify Dashboard is loaded | URL contains `/dashboard/index` and page heading indicates Dashboard | `page.url()` assertion + `page.getByRole('heading', { name: 'Dashboard' })` |

---

### Phase 2: Navigate to PIM → Add Employee

| Step | Action | Expected Result | Locator Strategy |
|------|--------|----------------|-----------------|
| 7 | Click **PIM** in the left navigation sidebar | PIM module opens; URL changes to `/pim/viewPimModule` | `page.getByRole('link', { name: 'PIM' })` |
| 8 | Verify the PIM top navigation bar is visible with options: Configuration, Employee List, Add Employee, Reports | All four nav items are visible | `page.getByRole('navigation', { name: 'Topbar Menu' })` |
| 9 | Click **Add Employee** in the PIM top navigation | Add Employee form loads; URL changes to `/pim/addEmployee` | `page.getByRole('link', { name: 'Add Employee' })` |
| 10 | Verify the form heading "Add Employee" is displayed | `h6` heading "Add Employee" is visible | `page.getByRole('heading', { name: 'Add Employee' })` |

---

### Phase 3: Fill Add Employee Form

| Step | Action | Expected Result | Locator Strategy |
|------|--------|----------------|-----------------|
| 11 | Verify the Employee Full Name section is present with First Name, Middle Name, and Last Name fields | Three text inputs are visible under "Employee Full Name*" | `page.getByRole('textbox', { name: 'First Name' })` |
| 12 | Click and enter `John` into the **First Name** field | "John" appears in the First Name input | `page.getByRole('textbox', { name: 'First Name' })` |
| 13 | Leave the **Middle Name** field blank | Middle Name field remains empty | `page.getByRole('textbox', { name: 'Middle Name' })` |
| 14 | Click and enter `Agentic` into the **Last Name** field | "Agentic" appears in the Last Name input | `page.getByRole('textbox', { name: 'Last Name' })` |
| 15 | Note the auto-generated **Employee ID** (e.g., `0507`) | Employee ID field is pre-populated with a unique value | `page.locator('form').getByRole('textbox').filter(...)` or `input` adjacent to label "Employee Id" |
| 16 | Verify **Create Login Details** toggle/checkbox is NOT checked (default state) | Checkbox is unchecked; no login detail fields are expanded | `page.locator('[type="checkbox"]')` — assert `not.toBeChecked()` |

---

### Phase 4: Save Employee

| Step | Action | Expected Result | Locator Strategy |
|------|--------|----------------|-----------------|
| 17 | Click the **Save** button | Page navigates to the newly created employee's profile page; URL changes to `/pim/viewPersonalDetails/empNumber/{id}` | `page.getByRole('button', { name: 'Save' })` |
| 18 | Verify no error toast or validation message appears | No red alert/error banner is displayed | `page.locator('.oxd-alert-content-text')` — assert not visible |

---

### Phase 5: Verify Employee Profile Created Successfully

| Step | Action | Expected Result | Locator Strategy |
|------|--------|----------------|-----------------|
| 19 | Verify the page URL has changed to the employee detail/personal details page | URL matches pattern `/pim/viewPersonalDetails/empNumber/\d+` | `expect(page).toHaveURL(/viewPersonalDetails/)` |
| 20 | Verify the page heading or breadcrumb shows the employee's name or "Personal Details" | Heading "Personal Details" or the employee name tab is active | `page.getByRole('heading', { name: 'Personal Details' })` |
| 21 | Verify the **First Name** field on the profile shows `John` | Input field value is "John" | `page.getByRole('textbox', { name: 'First Name' })` → `toHaveValue('John')` |
| 22 | Verify the **Last Name** field on the profile shows `Agentic` | Input field value is "Agentic" | `page.getByRole('textbox', { name: 'Last Name' })` → `toHaveValue('Agentic')` |
| 23 | Verify the **Employee ID** on the profile is a non-empty numeric value | Employee ID field contains a numeric string | `expect(employeeId).toMatch(/^\d+$/)` |
| 24 | Verify a success toast message appears (e.g., "Successfully Saved") | Green toast notification is briefly visible after save | `page.locator('.oxd-toast--success')` or `.oxd-text--toast-message` |

---

### Phase 6: Cross-Verify via Employee List Search

| Step | Action | Expected Result | Locator Strategy |
|------|--------|----------------|-----------------|
| 25 | Navigate to **PIM → Employee List** | Employee List search page loads | `page.getByRole('link', { name: 'Employee List' })` |
| 26 | Enter `John Agentic` (or just `Agentic`) in the **Employee Name** search field | Autocomplete suggestions appear or search field is populated | `page.getByPlaceholder('Type for hints...')` or the name search input |
| 27 | Click **Search** | Search results table is rendered | `page.getByRole('button', { name: 'Search' })` |
| 28 | Verify the employee "John Agentic" appears in the results table | At least one row with "John Agentic" is visible | `page.getByRole('row').filter({ hasText: 'Agentic' })` |

---

## 5. Locator Strategy Summary

| UI Element | Recommended Locator | Notes |
|-----------|-------------------|-------|
| Username input | `page.getByRole('textbox', { name: 'Username' })` | Stable ARIA role + label |
| Password input | `page.getByRole('textbox', { name: 'Password' })` | Stable ARIA role + label |
| Login button | `page.getByRole('button', { name: 'Login' })` | Unique button text |
| PIM sidebar link | `page.getByRole('link', { name: 'PIM' })` | Sidebar navigation |
| Add Employee nav link | `page.getByRole('link', { name: 'Add Employee' })` | PIM top nav — scoped to `nav[aria-label="Topbar Menu"]` if needed |
| First Name field | `page.getByRole('textbox', { name: 'First Name' })` | Verified from live snapshot |
| Middle Name field | `page.getByRole('textbox', { name: 'Middle Name' })` | Optional field |
| Last Name field | `page.getByRole('textbox', { name: 'Last Name' })` | Verified from live snapshot |
| Employee ID field | `page.locator('input.oxd-input').nth(3)` or label-adjacent input | Auto-generated; read-only or editable |
| Create Login Details checkbox | `page.locator('[type="checkbox"]')` or `page.getByRole('checkbox')` | Toggle to expand login creation form |
| Save button | `page.getByRole('button', { name: 'Save' })` | Verified from live snapshot |
| Cancel button | `page.getByRole('button', { name: 'Cancel' })` | For negative test |
| Success toast | `page.locator('.oxd-toast--success')` | Dynamic; may disappear quickly — use `waitFor` |
| Employee List search | `page.getByPlaceholder('Type for hints...')` | Autocomplete input for employee name search |

> **Note:** OrangeHRM v5.8 uses Vue.js with dynamic class names (e.g., `oxd-*`). Prefer ARIA-role-based locators (`getByRole`, `getByLabel`) over CSS class selectors to avoid brittleness.

---

## 6. Post-conditions / Cleanup Notes

| # | Action | Reason |
|---|--------|--------|
| 1 | Delete the newly created employee "John Agentic" via **PIM → Employee List → select → Delete** | Restore system to original state for test re-runnability |
| 2 | Alternatively, use a unique Last Name suffix per run (e.g., `Agentic_<timestamp>`) to avoid conflicts on repeated executions | Ensures idempotent test runs |
| 3 | Log out of the application after the test | Clears session state |
| 4 | If using Playwright `storageState`, invalidate or rotate state after the suite completes | Prevents cross-test session leakage |

---

## 7. Risk Areas

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Dynamic Employee ID** — The Employee ID is auto-generated by the server and unpredictable | Medium | Read the value after form load; do not hardcode. Assert it is non-empty and numeric. |
| **Timing / Race Conditions** — Vue.js SPA may not mount components instantly after navigation | High | Use `page.waitForURL()` after navigation and `page.waitForSelector()` before interacting with form fields |
| **Duplicate Employee** — Re-running without cleanup creates multiple "John Agentic" records | Medium | Add a `beforeEach`/`afterEach` cleanup hook or use unique dynamic names |
| **Toast Auto-Dismiss** — Success toast disappears within 2-3 seconds | Medium | Use `page.locator('.oxd-toast--success').waitFor({ state: 'visible' })` immediately after save |
| **Login Session Expiry** — Demo site may expire sessions; the site resets periodically | High | Do not cache `storageState` across test runs; always perform fresh login |
| **Network Latency** — Demo server is shared and may be slow | Medium | Increase `timeout` in `playwright.config.ts` to `30000`ms; use explicit waits |
| **Stale Element References** — After SPA route change, old DOM elements are replaced | Medium | Always re-query elements after navigation; avoid storing element handles across page transitions |
| **Flaky Autocomplete** — Employee name field in Employee List uses debounced autocomplete | Low | Add a short `page.waitForTimeout(500)` after typing or wait for the dropdown to appear before proceeding |
| **Missing Validation Feedback** — The form shows "Required" inline errors if fields are empty | Low | Covered by negative test cases; assert `.oxd-input-field-error-message` is not present on happy path |
| **Profile Page URL Pattern** — Employee number in URL is dynamic | Low | Assert URL via regex: `expect(page).toHaveURL(/\/pim\/viewPersonalDetails\/empNumber\/\d+/)` |

---

## Appendix: Example Playwright Test Skeleton

```typescript
import { test, expect } from '@playwright/test';

test.describe('PIM Module – Add Employee', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/web/index.php/auth/login');
    await page.getByRole('textbox', { name: 'Username' }).fill('Admin');
    await page.getByRole('textbox', { name: 'Password' }).fill('admin123');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL('**/dashboard/index');
  });

  test('TC-PIM-001: Add new employee John Agentic and verify profile', async ({ page }) => {
    // Navigate to PIM → Add Employee
    await page.getByRole('link', { name: 'PIM' }).click();
    await page.getByRole('link', { name: 'Add Employee' }).click();
    await page.waitForURL('**/pim/addEmployee');

    // Fill the form
    await page.getByRole('textbox', { name: 'First Name' }).fill('John');
    await page.getByRole('textbox', { name: 'Last Name' }).fill('Agentic');

    // Save
    await page.getByRole('button', { name: 'Save' }).click();

    // Verify redirect to personal details page
    await page.waitForURL(/\/pim\/viewPersonalDetails\/empNumber\/\d+/);

    // Verify success toast
    await expect(page.locator('.oxd-toast--success')).toBeVisible();

    // Verify employee name on profile
    await expect(page.getByRole('textbox', { name: 'First Name' })).toHaveValue('John');
    await expect(page.getByRole('textbox', { name: 'Last Name' })).toHaveValue('Agentic');
  });

  test.afterEach(async ({ page }) => {
    // TODO: Cleanup – delete the created employee to restore state
  });
});
```
