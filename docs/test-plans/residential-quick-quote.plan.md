# MLIS Portal - Residential Quick Quote Test Plan

## Application Overview

The Residential Quick Quote flow on the MLIS Portal (My Legal Indemnity Shop) allows house buyers/sellers to obtain legal indemnity insurance quick quotes without logging in. The flow is a 3-step wizard: Step 1 collects user details and property postcode, Step 2 allows product selection (up to 4 from ~54 products), and Step 3 displays comparison quotes from multiple insurers. The flow supports three jurisdictions: England & Wales, Scotland, and Northern Ireland. After clicking 'Email quotes to my conveyancer and myself' on Step 3, a confirmation dialog appears with the heading 'Your quick quote has been emailed to you and your conveyancer.', next steps instructions, and a 'Close this window' button. Clicking 'Close this window' dismisses the dialog and the user remains on Step 3.

## Test Scenarios

### 1. Residential Quick Quote - England & Wales E2E

**Seed:** `tests/seed.spec.ts`

#### 1.1. should complete full residential quick quote flow for England and Wales with single product

**File:** `tests/residential-quick-quote/e2e/should-complete-quick-quote-ew-single-product.spec.ts`

**Steps:**
  1. Navigate to the MLIS portal home page at /mlisportal/
    - expect: The home page loads with 'Home of legal indemnity insurance' heading visible
    - expect: Three residential quick quote links are displayed: England and Wales, Scotland, Northern Ireland
    - expect: Cookie consent dialog is displayed
  2. Accept cookies by clicking 'ACCEPT ALL' button
    - expect: The cookie consent dialog is dismissed
  3. Click on the 'I am buying or selling a house - England and Wales' link
    - expect: Page navigates to /mlisportal/quick-quote-residential
    - expect: Step 1 of 3 form is displayed
    - expect: All required fields are visible: Your name, Your email address, Conveyancing firm, Conveyancer's email address, Reference, Postcode
    -from dropdown. 
    - expect: The confirmation checkbox reads 'I confirm the property of interest is based in England or Wales'
  4. Fill in Step 1 form: Your name = 'John Smith', Email = 'john.smith@test.com', Conveyancing firm = 'Smith & Partners', Conveyancer's email = 'conveyancer@smithpartners.com', Reference = 'QQ-EW-001', Postcode = 'EC3A2BJ'after entering postal code click on search and select (Nexus, 52-54 Leadenhall Street, London, EC3A 2BJ ) 
    - expect: All text fields are filled with the provided values
  5. Check the confirmation checkbox 'I confirm the property of interest is based in England or Wales'
    - expect: The checkbox becomes checked
  6. Click 'Proceed to step 2'
    - expect: Step 2 of 3 is displayed with heading 'Legal indemnity quick quotes for house buyers or sellers'
    - expect: Property value field is visible with default value of 1,000,000
    - expect: Product list is displayed with 'X results displayed' heading
    - expect: Filter products search box is visible
    - expect: Back and 'Proceed to step 3' buttons are visible
  7. Click 'Select' on the first product (e.g. 'Absence of easement - Access')
    - expect: The 'Select' button changes to 'Remove' for the selected product
  8. Click 'Proceed to step 3'
    - expect: Step 3 of 3 is displayed
    - expect: Multiple insurer quotes are displayed, each showing: insurer logo, insurer name, financial rating, unlimited fees legal (Yes/No), premium amount with tax breakdown
    - expect: A product table shows Products, Excess, and Limitation columns
    - expect: T&C agreement checkbox is visible
    - expect: 'Email quotes to my conveyancer and myself' button is visible
    - expect: 'Back' and 'New quick quote' buttons are visible
  9. Check the Terms and Conditions agreement checkbox
    - expect: The T&C checkbox becomes checked
  10. Click 'Email quotes to my conveyancer and myself' button
    - expect: A confirmation dialog appears with heading 'Your quick quote has been emailed to you and your conveyancer.'
    - expect: The dialog shows 'Next steps:' with two items: 'Contact your conveyancer and inform them that you would like them to obtain full quotations.' and 'The conveyancer simply follows the instructions in their email.'
    - expect: A 'Close this window' button is visible in the dialog
  11. Click 'Close this window' button in the confirmation dialog
    - expect: The confirmation dialog is dismissed
    - expect: The user remains on Step 3 with the quote results still visible
    - expect: The 'Back', 'Email quotes to my conveyancer and myself', and 'New quick quote' buttons are still available

#### 1.2. should complete residential quick quote flow for England and Wales with multiple products

**File:** `tests/residential-quick-quote/e2e/should-complete-quick-quote-ew-multiple-products.spec.ts`

**Steps:**
  1. Navigate to /mlisportal/ and accept cookies
    - expect: Home page loads and cookies are accepted
  2. Click 'I am buying or selling a house - England and Wales'
    - expect: Step 1 of 3 form is displayed
  3. Fill all required fields with valid data and check the England or Wales confirmation checkbox
    - expect: All fields are filled and checkbox is checked
  4. Click 'Proceed to step 2'
    - expect: Step 2 product selection page loads
  5. Select 4 different products from the list
    - expect: All 4 products show 'Remove' buttons indicating they are selected
  6. Click 'Proceed to step 3'
    - expect: Step 3 displays quotes from multiple insurers
    - expect: Each insurer quote includes all 4 selected products in their product table
    - expect: Premium amounts reflect multi-product pricing
  7. Check the T&C checkbox and click 'Email quotes to my conveyancer and myself'
    - expect: A confirmation dialog appears with heading 'Your quick quote has been emailed to you and your conveyancer.'
    - expect: The dialog shows next steps and a 'Close this window' button
  8. Click 'Close this window' button
    - expect: The confirmation dialog is dismissed
    - expect: The user remains on Step 3 with quote results still visible

### 2. Residential Quick Quote - Scotland E2E

**Seed:** `tests/seed.spec.ts`

#### 2.1. should complete full residential quick quote flow for Scotland

**File:** `tests/residential-quick-quote/e2e/should-complete-quick-quote-scotland.spec.ts`

**Steps:**
  1. Navigate to /mlisportal/ and accept cookies
    - expect: Home page loads
  2. Click 'I am buying or selling a house - Scotland'
    - expect: Step 1 form is displayed
    - expect: Confirmation checkbox reads 'I confirm the property of interest is based in Scotland'
  3. Fill all required fields with valid data including a Scottish postcode (e.g. 'EH1 1RE') and check the Scotland confirmation checkbox
    - expect: All fields are filled and checkbox is checked
  4. Click 'Proceed to step 2'
    - expect: Step 2 product selection is displayed
    - expect: Product list may differ from England & Wales (Scotland-specific products)
  5. Select one product and click 'Proceed to step 3'
    - expect: Step 3 displays quotes from multiple insurers for Scotland
  6. Check T&C checkbox and click 'Email quotes to my conveyancer and myself'
    - expect: A confirmation dialog appears with heading 'Your quick quote has been emailed to you and your conveyancer.'
    - expect: The dialog shows next steps and a 'Close this window' button
  7. Click 'Close this window' button
    - expect: The confirmation dialog is dismissed
    - expect: The user remains on Step 3 with quote results still visible

### 3. Residential Quick Quote - Northern Ireland E2E

**Seed:** `tests/seed.spec.ts`

#### 3.1. should complete full residential quick quote flow for Northern Ireland

**File:** `tests/residential-quick-quote/e2e/should-complete-quick-quote-ni.spec.ts`

**Steps:**
  1. Navigate to /mlisportal/ and accept cookies
    - expect: Home page loads
  2. Click 'I am buying or selling a house - Northern Ireland'
    - expect: Step 1 form is displayed
    - expect: Confirmation checkbox reads 'I confirm the property of interest is based in Northern Ireland'
  3. Fill all required fields with valid data including an NI postcode (e.g. 'BT1 5GS') and check the Northern Ireland confirmation checkbox
    - expect: All fields are filled and checkbox is checked
  4. Click 'Proceed to step 2'
    - expect: Step 2 product selection is displayed
    - expect: Product list may differ from other jurisdictions (NI-specific products)
  5. Select one product and click 'Proceed to step 3'
    - expect: Step 3 displays quotes from multiple insurers for Northern Ireland
  6. Check T&C checkbox and click 'Email quotes to my conveyancer and myself'
    - expect: A confirmation dialog appears with heading 'Your quick quote has been emailed to you and your conveyancer.'
    - expect: The dialog shows next steps and a 'Close this window' button
  7. Click 'Close this window' button
    - expect: The confirmation dialog is dismissed
    - expect: The user remains on Step 3 with quote results still visible

### 4. Step 1 - Form Validation

**Seed:** `tests/seed.spec.ts`

#### 4.1. should not proceed when all required fields are empty

**File:** `tests/residential-quick-quote/validation/should-validate-empty-form.spec.ts`

**Steps:**
  1. Navigate to /mlisportal/ and click 'England and Wales' quick quote
    - expect: Step 1 form is displayed
  2. Click 'Proceed to step 2' without filling any fields
    - expect: The form does not advance to Step 2
    - expect: Validation errors or required field indicators are displayed for all mandatory fields

#### 4.2. should validate email address format

**File:** `tests/residential-quick-quote/validation/should-validate-email-format.spec.ts`

**Steps:**
  1. Navigate to Step 1 of England and Wales quick quote
    - expect: Step 1 form is displayed
  2. Fill all fields with valid data but enter an invalid email address (e.g. 'notanemail') in the 'Your email address' field
    - expect: Field is filled
  3. Check the confirmation checkbox and click 'Proceed to step 2'
    - expect: The form does not advance to Step 2
    - expect: A validation error is shown for the email field

#### 4.3. should validate conveyancer email address format

**File:** `tests/residential-quick-quote/validation/should-validate-conveyancer-email-format.spec.ts`

**Steps:**
  1. Navigate to Step 1 of England and Wales quick quote
    - expect: Step 1 form is displayed
  2. Fill all fields with valid data but enter an invalid email address (e.g. 'invalid@') in the conveyancer's email field
    - expect: Field is filled
  3. Check the confirmation checkbox and click 'Proceed to step 2'
    - expect: The form does not advance to Step 2
    - expect: A validation error is shown for the conveyancer email field

#### 4.4. should not proceed without checking jurisdiction confirmation checkbox

**File:** `tests/residential-quick-quote/validation/should-require-jurisdiction-checkbox.spec.ts`

**Steps:**
  1. Navigate to Step 1 of England and Wales quick quote
    - expect: Step 1 form is displayed
  2. Fill all required text fields with valid data but leave the confirmation checkbox unchecked
    - expect: All text fields are filled, checkbox is unchecked
  3. Click 'Proceed to step 2'
    - expect: The form does not advance to Step 2
    - expect: A validation error or prompt is shown indicating the checkbox must be checked

### 5. Step 2 - Product Selection

**Seed:** `tests/seed.spec.ts`

#### 5.1. should not proceed without selecting any product

**File:** `tests/residential-quick-quote/product-selection/should-require-product-selection.spec.ts`

**Steps:**
  1. Navigate through Step 1 with valid data to reach Step 2
    - expect: Step 2 product selection page is displayed
  2. Click 'Proceed to step 3' without selecting any product
    - expect: The page does not advance to Step 3
    - expect: A validation message is shown indicating at least one product must be selected

#### 5.2. should filter products by search text

**File:** `tests/residential-quick-quote/product-selection/should-filter-products-by-search.spec.ts`

**Steps:**
  1. Navigate through Step 1 with valid data to reach Step 2
    - expect: Step 2 with full product list is displayed
  2. Type 'chancel' into the 'Search by product name' filter textbox
    - expect: The product list is filtered to show only products containing 'chancel' in their name
    - expect: The results count heading updates to reflect the filtered count
  3. Clear the search filter
    - expect: The full product list is restored
    - expect: The results count returns to the original number

#### 5.3. should allow selecting and removing products

**File:** `tests/residential-quick-quote/product-selection/should-select-and-remove-products.spec.ts`

**Steps:**
  1. Navigate through Step 1 with valid data to reach Step 2
    - expect: Step 2 product selection is displayed
  2. Click 'Select' on the first product
    - expect: The button changes from 'Select' to 'Remove'
  3. Click 'Remove' on the same product
    - expect: The button changes back from 'Remove' to 'Select'
    - expect: The product is deselected

#### 5.4. should enforce maximum of 4 product selections

**File:** `tests/residential-quick-quote/product-selection/should-enforce-max-four-products.spec.ts`

**Steps:**
  1. Navigate through Step 1 with valid data to reach Step 2
    - expect: Step 2 product selection is displayed
  2. Select 4 different products
    - expect: All 4 products show 'Remove' buttons
  3. Attempt to select a 5th product
    - expect: The 5th product cannot be selected OR a warning/error message is shown indicating maximum 4 products
    - expect: The remaining 'Select' buttons may be disabled

#### 5.5. should update property value and reflect in quotes

**File:** `tests/residential-quick-quote/product-selection/should-update-property-value.spec.ts`

**Steps:**
  1. Navigate through Step 1 with valid data to reach Step 2
    - expect: Step 2 shows the property value field with default value of 1,000,000
  2. Clear the property value field and enter '500000'
    - expect: The property value field displays the new value
  3. Select a product and proceed to Step 3
    - expect: Step 3 displays quotes that reflect the updated property value
    - expect: Premium amounts should differ from the default £1,000,000 property value quotes

#### 5.6. should view product information via info button

**File:** `tests/residential-quick-quote/product-selection/should-view-product-info.spec.ts`

**Steps:**
  1. Navigate through Step 1 with valid data to reach Step 2
    - expect: Step 2 product selection is displayed
  2. Click the 'i' (info) button next to the first product
    - expect: A tooltip, popover, or modal appears showing detailed information about the product

#### 5.7. should navigate back to Step 1 from Step 2

**File:** `tests/residential-quick-quote/product-selection/should-navigate-back-to-step-1.spec.ts`

**Steps:**
  1. Navigate through Step 1 with valid data to reach Step 2
    - expect: Step 2 is displayed
  2. Click 'Back' button
    - expect: Step 1 form is displayed again
    - expect: Previously entered form data may be preserved

### 6. Step 3 - Quote Results

**Seed:** `tests/seed.spec.ts`

#### 6.1. should display quote details from multiple insurers

**File:** `tests/residential-quick-quote/quote-results/should-display-multi-insurer-quotes.spec.ts`

**Steps:**
  1. Complete Steps 1 and 2 to reach Step 3 with a single product selected
    - expect: Step 3 displays at least one insurer quote
  2. Verify the first insurer quote contains all expected details
    - expect: Insurer logo is visible
    - expect: Insurer name is displayed (e.g. 'Intact Insurance UK Limited')
    - expect: Financial rating is shown (e.g. 'A (AM Best)')
    - expect: Unlimited fees legal status is shown (Yes/No)
    - expect: Premium amount with tax breakdown is displayed
    - expect: Product table with Products, Excess, and Limitation columns is visible
  3. Verify multiple insurer quotes are displayed
    - expect: At least 2 different insurer quotes are visible on the page
    - expect: Each insurer has a unique premium amount

#### 6.2. should require T&C checkbox before emailing quotes

**File:** `tests/residential-quick-quote/quote-results/should-require-tc-checkbox.spec.ts`

**Steps:**
  1. Complete Steps 1 and 2 to reach Step 3
    - expect: Step 3 is displayed with T&C checkbox unchecked
  2. Click 'Email quotes to my conveyancer and myself' without checking the T&C checkbox
    - expect: The email action does not proceed
    - expect: A validation message prompts the user to accept T&C

#### 6.3. should show email confirmation dialog with next steps after emailing quotes

**File:** `tests/residential-quick-quote/quote-results/should-show-email-confirmation-dialog.spec.ts`

**Steps:**
  1. Complete Steps 1 and 2 to reach Step 3
    - expect: Step 3 is displayed with quote results
  2. Check the T&C agreement checkbox
    - expect: The T&C checkbox becomes checked
  3. Click 'Email quotes to my conveyancer and myself'
    - expect: A confirmation dialog appears
    - expect: Dialog heading reads 'Your quick quote has been emailed to you and your conveyancer.'
    - expect: Dialog shows 'Next steps:' section
    - expect: First next step: 'Contact your conveyancer and inform them that you would like them to obtain full quotations.'
    - expect: Second next step: 'The conveyancer simply follows the instructions in their email.'
    - expect: A 'Close this window' button is visible in the dialog
  4. Click 'Close this window' button
    - expect: The confirmation dialog is dismissed
    - expect: The user remains on Step 3 with quote results still visible
    - expect: All buttons (Back, Email quotes, New quick quote) are still available

#### 6.4. should navigate back to Step 2 from Step 3

**File:** `tests/residential-quick-quote/quote-results/should-navigate-back-to-step-2.spec.ts`

**Steps:**
  1. Complete Steps 1 and 2 to reach Step 3
    - expect: Step 3 is displayed
  2. Click 'Back' button on Step 3
    - expect: Step 2 product selection is displayed
    - expect: Previously selected products may still be selected

#### 6.5. should start a new quick quote from Step 3

**File:** `tests/residential-quick-quote/quote-results/should-start-new-quick-quote.spec.ts`

**Steps:**
  1. Complete Steps 1 and 2 to reach Step 3
    - expect: Step 3 is displayed with 'New quick quote' button visible
  2. Click 'New quick quote' button
    - expect: The page navigates back to Step 1 or the home page
    - expect: The form is reset with empty fields ready for a new quote

### 7. Home Page Navigation and UI

**Seed:** `tests/seed.spec.ts`

#### 7.1. should display all residential quick quote jurisdiction options on home page

**File:** `tests/residential-quick-quote/home/should-display-all-jurisdiction-options.spec.ts`

**Steps:**
  1. Navigate to /mlisportal/
    - expect: The heading 'Home of legal indemnity insurance' is visible
    - expect: 'Residential quick quote' section heading is visible
    - expect: Three links are displayed: 'I am buying or selling a house - England and Wales', 'I am buying or selling a house - Scotland', 'I am buying or selling a house - Northern Ireland'
    - expect: All three links are clickable

#### 7.2. should handle cookie consent dialog

**File:** `tests/residential-quick-quote/home/should-handle-cookie-consent.spec.ts`

**Steps:**
  1. Navigate to /mlisportal/ with a fresh session (no cookies)
    - expect: A cookie consent dialog 'DUAL uses cookies' is displayed
    - expect: Three buttons are present: 'MANAGE COOKIE PREFERENCES', 'REJECT ALL', 'ACCEPT ALL'
  2. Click 'REJECT ALL'
    - expect: The cookie dialog is dismissed
    - expect: A 'Your consent preferences' button appears for later adjustment

#### 7.3. should display navigation links on the home page

**File:** `tests/residential-quick-quote/home/should-display-navigation-links.spec.ts`

**Steps:**
  1. Navigate to /mlisportal/
    - expect: Navigation bar shows links: Home, How it works, Products, About us, FAQs, Claims
    - expect: Contact phone number '0203 435 6282' is visible
    - expect: Email link 'online@dualgroup.com' is visible
