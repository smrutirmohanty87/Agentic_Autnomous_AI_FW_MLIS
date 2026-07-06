# MLIS Portal - Policy Creation Test Plan

## Application Overview

Comprehensive test plan for the MLIS (My Legal Indemnity Shop) Portal policy creation workflow. The application is a broker-facing Salesforce Experience Cloud site at https://dualgroup--sitp.sandbox.my.site.com/mlisportal/broker-zone. Users log in as brokers and navigate a 5-step wizard (Product Selection → Statements of Fact → Your Quotes → Final Policy Details → Summary/Order) to create legal indemnity insurance policies. The portal supports both Residential and Commercial quote types across England & Wales, Scotland, and Northern Ireland jurisdictions.

## Test Scenarios

### 1. Login & Authentication

**Seed:** `tests/seed.spec.ts`

#### 1.1. should login successfully with valid credentials

**File:** `tests/login/should-login-successfully.spec.ts`

**Steps:**
  1. Navigate to https://dualgroup--sitp.sandbox.my.site.com/mlisportal/broker-zone
    - expect: Login page loads with 'Conveyancer and broker login' heading
    - expect: Email address and Password textboxes are visible
    - expect: Login link button is visible
  2. Fill 'Email address' textbox with valid email
    - expect: Email field accepts input
  3. Fill 'Password' textbox with valid password
    - expect: Password field accepts input
  4. Click the 'Login' link
    - expect: Page redirects to broker-zone with title 'BrokerZoneHome'
    - expect: 'Quote manager' heading is visible
    - expect: Header shows user name 'T-0131-SIT2-PORTAL-MLIS Auto-No-Comm-01'
    - expect: Navigation links 'My account', 'Quote manager', 'Logout' are visible

#### 1.2. should show error for invalid credentials

**File:** `tests/login/should-show-error-invalid-credentials.spec.ts`

**Steps:**
  1. Navigate to the portal login page
    - expect: Login form is visible
  2. Fill Email address with 'invalid@test.com' and Password with 'WrongPass123'
    - expect: Fields accept input
  3. Click the 'Login' link
    - expect: Error message is displayed
    - expect: User remains on the login page

#### 1.3. should show validation for empty login fields

**File:** `tests/login/should-validate-empty-fields.spec.ts`

**Steps:**
  1. Navigate to the portal login page
    - expect: Login form is visible with empty fields
  2. Click the 'Login' link without entering any credentials
    - expect: Validation error messages appear for required email and password fields

#### 1.4. should logout successfully

**File:** `tests/login/should-logout-successfully.spec.ts`

**Steps:**
  1. Login with valid credentials
    - expect: Quote Manager dashboard loads
  2. Click 'Logout' link in the header
    - expect: User is logged out
    - expect: Page redirects to public landing page with 'Home of legal indemnity insurance' heading

#### 1.5. should handle cookie consent dialog

**File:** `tests/login/should-handle-cookie-consent.spec.ts`

**Steps:**
  1. Navigate to the portal in a fresh session
    - expect: Cookie consent dialog 'DUAL uses cookies' appears
    - expect: Three buttons visible: 'MANAGE COOKIE PREFERENCES', 'REJECT ALL', 'ACCEPT ALL'
  2. Click 'ACCEPT ALL' button
    - expect: Cookie dialog dismisses
    - expect: Page continues functioning normally

### 2. Quote Manager Dashboard

**Seed:** `tests/seed.spec.ts`

#### 2.1. should display dashboard with quote options and table

**File:** `tests/dashboard/should-display-dashboard-layout.spec.ts`

**Steps:**
  1. Login with valid credentials
    - expect: 'Quote manager' heading is visible
    - expect: 'Start new quote' section visible with 'Residential' and 'Commercial' categories
    - expect: Each category shows England & Wales, Scotland, Northern Ireland options
    - expect: Data table visible with columns: Quote/policy reference, Limit of indemnity, Case reference, Status, Created date, Property address, Client name, Issued date, Actions

#### 2.2. should search quotes by keywords

**File:** `tests/dashboard/should-search-quotes.spec.ts`

**Steps:**
  1. Login to Quote Manager dashboard
    - expect: Dashboard loads with quote table
  2. Enter a known reference (e.g. 'DA-SC-057128093') in 'Search all fields' textbox and click 'Search'
    - expect: Table filters to show only rows matching the search term

#### 2.3. should show and apply filters

**File:** `tests/dashboard/should-filter-quotes.spec.ts`

**Steps:**
  1. Login to Quote Manager and click 'Show filters' button
    - expect: Filter panel expands showing 'Select user' combobox, 'From' date picker, 'To' date picker, 'Apply filter' button
  2. Select a From date and To date, then click 'Apply filter'
    - expect: Table filters to show only quotes within selected date range
  3. Click 'Hide filters' button
    - expect: Filter panel collapses

#### 2.4. should paginate quote table

**File:** `tests/dashboard/should-paginate-table.spec.ts`

**Steps:**
  1. Login to Quote Manager dashboard
    - expect: Pagination controls visible at bottom of table with page numbers, Next page, Last buttons
  2. Click page '2' button
    - expect: Table shows second page of results
    - expect: Page 2 button is active/disabled
  3. Click 'Next page' button
    - expect: Table advances to next page
  4. Click 'Last' button
    - expect: Table shows last page of results

#### 2.5. should open incomplete quote for editing

**File:** `tests/dashboard/should-open-incomplete-quote.spec.ts`

**Steps:**
  1. Login and find a row with 'Incomplete' status in the quote table
    - expect: Incomplete quote row is visible with 'Open Quote' action
  2. Click 'Open Quote' button
    - expect: Quote wizard opens allowing user to continue from where they left off

#### 2.6. should view quote summary for quoted item

**File:** `tests/dashboard/should-view-quote-summary.spec.ts`

**Steps:**
  1. Login and find a row with 'Quoted' status in the quote table
    - expect: Quoted row visible with 'View Quote Summary' and 'Specimen Policy Wording' actions
  2. Click 'View Quote Summary' button
    - expect: Quote summary document opens or downloads

### 3. Step 1 - Product Selection

**Seed:** `tests/seed.spec.ts`

#### 3.1. should load product selection page for Residential E&W

**File:** `tests/product-selection/should-load-product-selection.spec.ts`

**Steps:**
  1. Login and click 'England & Wales Start quote' under Residential
    - expect: URL contains 'quoteType=Residential&jurisdiction=EnglandAndWales'
    - expect: Page title is 'Quote Journey'
    - expect: Step 1 'Product selection' is active in stepper
    - expect: Steps 2-5 are disabled in stepper
    - expect: 'Product selection' heading visible
    - expect: Form shows 'My case reference/ file number' textbox with placeholder 'Your reference number'
    - expect: 'Limit of indemnity' spinbutton is visible
    - expect: '54 products found' heading visible
    - expect: Product filter textbox visible

#### 3.2. should enter case reference and limit of indemnity

**File:** `tests/product-selection/should-enter-case-ref-and-limit.spec.ts`

**Steps:**
  1. Navigate to Product Selection for Residential E&W
    - expect: Product selection form loads
  2. Enter 'TEST-REF-001' in 'My case reference/ file number' textbox
    - expect: Field accepts text input
  3. Enter 500000 in 'Limit of indemnity' spinbutton
    - expect: Value accepted and formats as £500,000.00

#### 3.3. should filter products by keyword

**File:** `tests/product-selection/should-filter-products.spec.ts`

**Steps:**
  1. Navigate to Product Selection
    - expect: 54 products displayed
  2. Type 'Building' in the product filter textbox
    - expect: Product list filters to show only products containing 'Building'
    - expect: Product count heading updates (fewer than 54)
  3. Clear filter text
    - expect: All 54 products are shown again

#### 3.4. should select a single product

**File:** `tests/product-selection/should-select-single-product.spec.ts`

**Steps:**
  1. Navigate to Product Selection and fill required fields (case ref, limit)
    - expect: Form fields filled
  2. Click 'Select' button next to 'Absence of easement - Access (Pedestrian & Vehicular)'
    - expect: 'You have selected 1 product' heading appears
    - expect: Selected product shown with 'Remove' button
    - expect: 'Proceed' button appears
    - expect: Product count decreases to '53 products found'
    - expect: Note: 'Please note that selecting more than four products will refer the quote to an underwriter.'

#### 3.5. should remove a selected product

**File:** `tests/product-selection/should-remove-selected-product.spec.ts`

**Steps:**
  1. Select a product in Product Selection
    - expect: Product is in selected list with Remove button
  2. Click 'Remove' button next to the selected product
    - expect: Product returns to available products list
    - expect: Selected products section updates
    - expect: Product count returns to 54

#### 3.6. should not show proceed without product selected

**File:** `tests/product-selection/should-require-product-selection.spec.ts`

**Steps:**
  1. Navigate to Product Selection and fill case ref and limit only
    - expect: No 'Proceed' button visible since no product is selected

#### 3.7. should validate required case reference on proceed

**File:** `tests/product-selection/should-validate-case-ref.spec.ts`

**Steps:**
  1. Navigate to Product Selection, leave case reference empty, enter limit, select a product
    - expect: Product selected, case ref is empty
  2. Click 'Proceed'
    - expect: Validation error shown for required case reference field

#### 3.8. should display product info tooltip

**File:** `tests/product-selection/should-display-product-info.spec.ts`

**Steps:**
  1. Navigate to Product Selection
    - expect: Products listed with info 'i' buttons
  2. Click the 'i' info button next to any product
    - expect: Product information tooltip or modal appears with relevant details

### 4. Step 2 - Statements of Fact

**Seed:** `tests/seed.spec.ts`

#### 4.1. should display statements of fact with confirm options

**File:** `tests/statements-of-fact/should-display-statements.spec.ts`

**Steps:**
  1. Complete Step 1 (case ref, limit, select 1 product) and click Proceed
    - expect: Step 2 'Statements of fact' is active in stepper
    - expect: Heading shows 'X statements of fact to agree'
    - expect: Description instructs to read and accept all statements
    - expect: Each statement shows text, associated product name in a list
    - expect: Each statement has 'Cannot confirm' and 'Confirm' buttons
    - expect: 'Back' and 'Proceed' buttons visible at bottom

#### 4.2. should confirm all statements and proceed

**File:** `tests/statements-of-fact/should-confirm-all-statements.spec.ts`

**Steps:**
  1. Navigate to Statements of Fact step
    - expect: All statements visible with Confirm/Cannot confirm buttons
  2. Click 'Confirm' for each statement one by one
    - expect: Each statement button changes to 'Confirmed' (active state)
  3. Click 'Proceed'
    - expect: Step 3 'Your quotes' loads
    - expect: Multiple insurer quote cards appear

#### 4.3. should handle cannot confirm for a statement

**File:** `tests/statements-of-fact/should-handle-cannot-confirm.spec.ts`

**Steps:**
  1. Navigate to Statements of Fact step
    - expect: Statements visible
  2. Click 'Cannot confirm' for one statement and 'Confirm' for the rest
    - expect: Statement marked as cannot confirm
  3. Click 'Proceed'
    - expect: System handles the unconfirmed statement (may refer to underwriter or show different quotes)

#### 4.4. should navigate back to product selection preserving data

**File:** `tests/statements-of-fact/should-navigate-back-preserving-data.spec.ts`

**Steps:**
  1. Navigate to Statements of Fact step
    - expect: Step 2 active
  2. Click 'Back' button
    - expect: Step 1 Product Selection loads
    - expect: Previously entered case reference is preserved
    - expect: Limit of indemnity is preserved
    - expect: Selected product is still shown

### 5. Step 3 - Your Quotes

**Seed:** `tests/seed.spec.ts`

#### 5.1. should display multiple insurer quotes

**File:** `tests/your-quotes/should-display-quotes.spec.ts`

**Steps:**
  1. Complete Steps 1-2 (case ref, limit 500000, select product, confirm all statements) and proceed to Step 3
    - expect: Loading spinner appears then disappears
    - expect: Heading shows 'X quotes found' (e.g., '4 quotes found')
    - expect: Validity date heading shown (e.g., 'valid until October 04, 2026')
    - expect: Each quote card shows insurer logo, name, financial rating, unlimited fees legal flag
    - expect: Each card shows premium with tax breakdown (e.g., 'Premium: £202.69' '(Including tax 12.00%: £21.72)')
    - expect: Each card shows product table with Product, Excess, Limitation columns
    - expect: 'Select quote' button on each card

#### 5.2. should select a quote and proceed to final details

**File:** `tests/your-quotes/should-select-quote.spec.ts`

**Steps:**
  1. Navigate to Your Quotes page with available quotes
    - expect: Multiple quote cards visible
  2. Click 'Select quote' on the first insurer card
    - expect: Step 4 'Final policy details' loads
    - expect: Form for insured details is visible

#### 5.3. should save and exit from quotes page

**File:** `tests/your-quotes/should-save-and-exit.spec.ts`

**Steps:**
  1. Navigate to Your Quotes page
    - expect: Quotes loaded
  2. Click 'Save & exit'
    - expect: User returns to Quote Manager dashboard
    - expect: Quote appears in table with appropriate status

### 6. Step 4 - Final Policy Details

**Seed:** `tests/seed.spec.ts`

#### 6.1. should display final policy details form

**File:** `tests/final-details/should-display-form.spec.ts`

**Steps:**
  1. Complete Steps 1-3 and select a quote to reach Step 4
    - expect: Step 4 'Final policy details' is active
    - expect: Heading 'Final policy details' visible
    - expect: Fields visible: Land registry number (optional), Insured name(s) (required *), Insured property postcode (required *), Address line 1 (required *), Address line 2 (optional), Address line 3 (optional), Address line 4 (optional), Town/city (required *)
    - expect: Vulnerability notice visible
    - expect: Back and Proceed buttons present

#### 6.2. should fill required fields and proceed to summary

**File:** `tests/final-details/should-fill-required-and-proceed.spec.ts`

**Steps:**
  1. Navigate to Final Policy Details
    - expect: Form with empty fields
  2. Enter 'Test Client Name' in insured name field
    - expect: Text accepted
  3. Enter 'EC3A 2BJ' in postcode field
    - expect: Text accepted
  4. Enter '52-54 Leadenhall Street' in address line 1 field
    - expect: Text accepted
  5. Enter 'London' in town/city field
    - expect: Text accepted
  6. Click 'Proceed'
    - expect: Step 5 Summary loads
    - expect: Summary shows case reference, limit, insured name, full address, insurer details

#### 6.3. should validate required insured name on proceed

**File:** `tests/final-details/should-validate-insured-name.spec.ts`

**Steps:**
  1. Navigate to Final Policy Details and fill postcode, address line 1, town/city but leave insured name empty
    - expect: Insured name field is empty
  2. Click 'Proceed'
    - expect: Validation error displayed for missing insured name

#### 6.4. should validate required postcode on proceed

**File:** `tests/final-details/should-validate-postcode.spec.ts`

**Steps:**
  1. Navigate to Final Policy Details and fill insured name, address line 1, town/city but leave postcode empty
    - expect: Postcode field is empty
  2. Click 'Proceed'
    - expect: Validation error displayed for missing postcode

#### 6.5. should navigate back to quotes

**File:** `tests/final-details/should-navigate-back-to-quotes.spec.ts`

**Steps:**
  1. Navigate to Final Policy Details
    - expect: Step 4 active
  2. Click 'Back' button
    - expect: Step 3 Your Quotes loads with previously available quotes

### 7. Step 5 - Summary & Order

**Seed:** `tests/seed.spec.ts`

#### 7.1. should display complete summary with all entered data

**File:** `tests/summary/should-display-summary.spec.ts`

**Steps:**
  1. Complete Steps 1-4 with known data and proceed to Summary
    - expect: Step 5 'Summary' is active
    - expect: 'Summary' heading visible
    - expect: 'My case reference/ file number' shows entered case ref
    - expect: 'Limit of indemnity' shows formatted amount (e.g., £500,000.00)
    - expect: 'Insured name(s)' shows entered name
    - expect: 'Insured property postcode' shows address and postcode
    - expect: Insurer section shows logo, name, premium with tax
    - expect: Action buttons: Back, Proceed to order, Email final draft, Review final draft, Save & exit

#### 7.2. should open order dialog with commencement date picker

**File:** `tests/summary/should-open-order-dialog.spec.ts`

**Steps:**
  1. Navigate to Summary and click 'Proceed to order'
    - expect: Modal dialog opens with 'Final policy details' heading
    - expect: Date picker for 'Confirm policy commencement date' with DD/MM/YYYY placeholder
    - expect: Date range hint (e.g., 'Select a date from 7 Apr 2026 through 7 May 2026')
    - expect: 'Order now' button is disabled

#### 7.3. should enable order after selecting commencement date

**File:** `tests/summary/should-enable-order-with-date.spec.ts`

**Steps:**
  1. Navigate to Summary and click 'Proceed to order'
    - expect: Order dialog opens with disabled 'Order now' button
  2. Click the date input to open calendar picker
    - expect: Calendar opens showing current month
    - expect: Past dates are disabled
    - expect: Dates beyond allowed range are disabled
  3. Select today's date from the calendar
    - expect: Date field shows formatted date (e.g., '7 Apr 2026')
    - expect: 'Order now' button becomes enabled

#### 7.4. should close order dialog and return to summary

**File:** `tests/summary/should-close-order-dialog.spec.ts`

**Steps:**
  1. Click 'Proceed to order' from Summary
    - expect: Order dialog opens
  2. Click 'Close' button on the dialog
    - expect: Dialog closes
    - expect: Summary page is still visible with all data intact

#### 7.5. should save and exit from summary

**File:** `tests/summary/should-save-and-exit.spec.ts`

**Steps:**
  1. Navigate to Summary page
    - expect: Summary displayed with all data
  2. Click 'Save & exit'
    - expect: User returns to Quote Manager dashboard
    - expect: Quote appears in table

#### 7.6. should navigate back from summary to final details

**File:** `tests/summary/should-navigate-back.spec.ts`

**Steps:**
  1. Navigate to Summary page
    - expect: Step 5 active
  2. Click 'Back' button
    - expect: Step 4 Final Policy Details loads with previously entered data preserved

### 8. Stepper Navigation

**Seed:** `tests/seed.spec.ts`

#### 8.1. should show correct active and disabled states in stepper

**File:** `tests/stepper/should-show-correct-states.spec.ts`

**Steps:**
  1. Start a new Residential E&W quote
    - expect: Step 1 is active, Steps 2-5 are disabled
  2. Complete Step 1 and proceed
    - expect: Step 2 is active, Step 1 is clickable, Steps 3-5 are disabled
  3. Complete Step 2 and proceed
    - expect: Step 3 is active, Steps 1-2 are clickable, Steps 4-5 are disabled
  4. Select a quote to proceed
    - expect: Step 4 is active, Steps 1-3 are clickable, Step 5 is disabled
  5. Complete Step 4 and proceed
    - expect: Step 5 is active, all Steps 1-5 are clickable

#### 8.2. should navigate between completed steps via stepper

**File:** `tests/stepper/should-navigate-between-steps.spec.ts`

**Steps:**
  1. Progress through all 5 steps with valid data
    - expect: All steps completed
  2. Click Step 1 'Product selection' in the stepper
    - expect: Step 1 loads with previously entered case reference and limit of indemnity preserved
  3. Click Step 5 'Summary' in the stepper
    - expect: Step 5 loads with all data intact

### 9. Quote Types & Jurisdictions

**Seed:** `tests/seed.spec.ts`

#### 9.1. should start Residential Scotland quote

**File:** `tests/jurisdictions/should-start-residential-scotland.spec.ts`

**Steps:**
  1. Login and click 'Scotland Start quote' under Residential
    - expect: URL contains jurisdiction=Scotland or similar parameter
    - expect: Product Selection page loads with Scotland-specific products

#### 9.2. should start Residential Northern Ireland quote

**File:** `tests/jurisdictions/should-start-residential-ni.spec.ts`

**Steps:**
  1. Login and click 'Northern Ireland Start quote' under Residential
    - expect: URL contains appropriate NI jurisdiction parameter
    - expect: Product Selection page loads with NI-specific products

#### 9.3. should start Commercial England and Wales quote

**File:** `tests/jurisdictions/should-start-commercial-ew.spec.ts`

**Steps:**
  1. Login and click 'England & Wales Start quote' under Commercial
    - expect: URL contains quoteType=Commercial and jurisdiction=EnglandAndWales
    - expect: Product Selection loads with commercial-specific products

#### 9.4. should start Commercial Scotland quote

**File:** `tests/jurisdictions/should-start-commercial-scotland.spec.ts`

**Steps:**
  1. Login and click 'Scotland Start quote' under Commercial
    - expect: URL contains Commercial/Scotland parameters
    - expect: Product Selection loads with Scotland commercial products

#### 9.5. should start Commercial Northern Ireland quote

**File:** `tests/jurisdictions/should-start-commercial-ni.spec.ts`

**Steps:**
  1. Login and click 'Northern Ireland Start quote' under Commercial
    - expect: URL contains Commercial/NI parameters
    - expect: Product Selection loads with NI commercial products

### 10. End-to-End Policy Creation

**Seed:** `tests/seed.spec.ts`

#### 10.1. should create Residential E&W policy with single product end-to-end

**File:** `tests/regression/TC_REG_006_create_residential_ew_policy_single_product.spec.ts`

**Steps:**
  1. Login with valid credentials and accept cookie consent
    - expect: Quote Manager dashboard loads
  2. Click 'England & Wales Start quote' under Residential
    - expect: Step 1 Product Selection loads
  3. Enter case reference 'E2E-SINGLE-{timestamp}' and limit of indemnity 500000
    - expect: Fields populated
  4. Select product 'Absence of easement - Access (Pedestrian & Vehicular)' and click Proceed
    - expect: Step 2 Statements of Fact loads
  5. Confirm all statements of fact and click Proceed
    - expect: Step 3 Your Quotes loads with multiple insurer quotes
  6. Select the first available quote (e.g., Intact Insurance UK Limited)
    - expect: Step 4 Final Policy Details loads
  7. Enter insured name 'E2E Test Client', postcode 'EC3A 2BJ', address line 1 '52-54 Leadenhall Street', town/city 'London' and click Proceed
    - expect: Step 5 Summary loads with all correct details
  8. Verify summary data: case ref, limit £500,000.00, insured name, address, insurer premium
    - expect: All data matches input
  9. Click 'Proceed to order', select today's date from calendar
    - expect: Order now button becomes enabled

#### 10.2. should create Residential E&W policy with multiple products

**File:** `tests/regression/TC_REG_005_create_residential_ew_policy_multiple_products.spec.ts`

**Steps:**
  1. Login and start Residential E&W quote
    - expect: Product Selection loads
  2. Enter case reference and limit of indemnity 500000
    - expect: Fields populated
  3. Select 4 different products
    - expect: 'You have selected 4 products' heading appears
  4. Click Proceed and confirm all statements for all products
    - expect: All statements confirmed, proceed to quotes
  5. Select a quote on Your Quotes page
    - expect: Step 4 loads
  6. Fill final policy details and proceed
    - expect: Summary shows all 4 products, combined pricing
  7. Click Proceed to order and select commencement date
    - expect: Order now button enabled

#### 10.3. should save and resume incomplete quote

**File:** (not implemented in this repo)

**Steps:**
  1. Login and start Residential E&W quote
    - expect: Product Selection loads
  2. Fill Step 1 (case ref, limit, product) and proceed through Step 2 to Step 3
    - expect: Step 3 Your Quotes loads
  3. Click 'Save & exit'
    - expect: Returns to Quote Manager dashboard
    - expect: Quote visible in table with 'Incomplete' status
  4. Click 'Open Quote' on the saved incomplete quote
    - expect: Quote wizard re-opens allowing user to continue from where they left off

### 11. Edge Cases & Negative Tests

**Seed:** `tests/seed.spec.ts`

#### 11.1. should validate zero or negative limit of indemnity

**File:** `tests/edge-cases/should-validate-invalid-limit.spec.ts`

**Steps:**
  1. Navigate to Product Selection and enter limit of indemnity as '0'
    - expect: Field shows 0 or shows validation error
  2. Select a product and click Proceed
    - expect: Validation error for invalid limit, or system rejects zero amount
  3. Clear and enter '-500000' in limit of indemnity
    - expect: Field rejects negative value or shows validation error

#### 11.2. should handle very large limit of indemnity

**File:** `tests/edge-cases/should-handle-large-limit.spec.ts`

**Steps:**
  1. Navigate to Product Selection and enter limit of indemnity as '99999999999'
    - expect: System accepts with correct currency formatting or shows max limit validation error

#### 11.3. should sanitize special characters in case reference

**File:** `tests/edge-cases/should-sanitize-case-ref.spec.ts`

**Steps:**
  1. Navigate to Product Selection and enter case reference with special characters like angle brackets and quotes
    - expect: Input is sanitized or safely accepted without causing XSS or rendering issues

#### 11.4. should warn when selecting more than 4 products

**File:** `tests/edge-cases/should-warn-over-four-products.spec.ts`

**Steps:**
  1. Navigate to Product Selection and select 5 products
    - expect: Warning about underwriter referral is displayed
    - expect: System may prevent selection or flag the quote for manual review

#### 11.5. should validate invalid postcode format

**File:** `tests/edge-cases/should-validate-invalid-postcode.spec.ts`

**Steps:**
  1. Navigate to Final Policy Details and enter 'INVALID123' in postcode field
    - expect: Field accepts input
  2. Fill remaining required fields and click Proceed
    - expect: Validation error for invalid postcode format

#### 11.6. should restrict commencement date to allowed range

**File:** `tests/edge-cases/should-restrict-commencement-date.spec.ts`

**Steps:**
  1. Open order dialog from Summary page and open calendar picker
    - expect: Calendar opens showing current month
  2. Observe past dates in the calendar
    - expect: All past dates are disabled and cannot be clicked
  3. Navigate to dates beyond the allowed range (~30 days ahead)
    - expect: Dates beyond the allowed range are disabled and cannot be clicked
