# Salesforce Quote Journey - Policy Creation (Underwriting Portal)

## Application Overview

Comprehensive test plan for the Salesforce MLIS Underwriting Portal Quote Journey flow at https://dualgroup--sitp.sandbox.my.salesforce.com/. Users log in as underwriting staff and navigate a 5-step wizard (Product Selection → Statements of Fact → Your Quotes → Final Policy Details → Summary) to create legal indemnity insurance policies. The portal supports Residential and Commercial quote types across England & Wales, Scotland, and Northern Ireland jurisdictions, with multiple insurer brands (My Legal Indemnity Shop, IC Insurance Solutions, Property Transaction Data). Broker Account and Broker User lookups drive brand availability. Products (54 for Residential EW) can be selected up to 4 for combined quotes; exceeding 4 triggers underwriter referral.

## Test Scenarios

### 1. Login & Navigation

**Seed:** `tests/seed.spec.ts`

#### 1.1. should login to Salesforce and navigate to Quote Journey

**File:** `tests/sf-quote-journey/login/should-login-and-navigate-to-quote-journey.spec.ts`

**Steps:**
  1. Navigate to https://dualgroup--sitp.sandbox.my.salesforce.com/
    - expect: Salesforce login page loads with 'Username' and 'Password' textboxes
    - expect: 'Log In to Sandbox' button is visible
  2. Fill 'Username' with valid credentials and 'Password' with valid password
    - expect: Fields accept input
  3. Click 'Log In to Sandbox' button
    - expect: Page redirects to Salesforce Lightning Experience
    - expect: 'MLIS Underwriting' app heading is visible
    - expect: Navigation bar shows: Accounts, Contacts, Submissions, Insurance Policies, Quote Journey
  4. Click the 'Quote Journey' link in the navigation bar
    - expect: Quote Journey page loads with heading 'Quote Journey'
    - expect: 5-step wizard is visible: Product selection, Statements of fact, Your quotes, Final policy details, Summary
    - expect: Only Step 1 'Product selection' is active; Steps 2-5 are disabled

#### 1.2. should show error for invalid Salesforce credentials

**File:** `tests/sf-quote-journey/login/should-show-error-invalid-credentials.spec.ts`

**Steps:**
  1. Navigate to https://dualgroup--sitp.sandbox.my.salesforce.com/
    - expect: Login page loads
  2. Fill Username with 'invalid@test.com' and Password with 'WrongPassword123'
    - expect: Fields accept input
  3. Click 'Log In to Sandbox' button
    - expect: Error message is displayed
    - expect: User remains on the login page

### 2. Step 1 - Product Selection

**Seed:** `tests/seed.spec.ts`

#### 2.1. should display product selection form with all required fields

**File:** `tests/sf-quote-journey/step1/should-display-product-selection-form.spec.ts`

**Steps:**
  1. Login to Salesforce and navigate to Quote Journey
    - expect: Step 1 'Product selection' page loads
    - expect: Heading 'Product selection' is visible
  2. Verify form fields are displayed
    - expect: 'Broker Account' search field is visible and empty
    - expect: 'Broker User' search field is visible and disabled
    - expect: 'Quote Type' combobox visible with default 'Residential'
    - expect: 'Jurisdiction' combobox visible with default 'England and Wales'
    - expect: 'Brand' combobox visible and disabled
    - expect: 'My case reference/ file number' textbox visible with placeholder
    - expect: 'Limit of indemnity' spinbutton is visible
  3. Verify product list section
    - expect: Heading 'Please select at least one product' is visible
    - expect: Product keyword search textbox is visible
    - expect: '54 products found' heading is visible
    - expect: Each product card shows name, info button, and 'Select' button

#### 2.2. should search and select broker account

**File:** `tests/sf-quote-journey/step1/should-search-select-broker-account.spec.ts`

**Steps:**
  1. Login and navigate to Quote Journey
    - expect: Quote Journey loads
  2. Click on 'Broker Account' search field and type 'MLIS', then clear the field
    - expect: Dropdown appears listing matching accounts: 'MLIS Test Intermediary', 'MLIS 01', etc.
  3. Select 'MLIS Test Intermediary' from the dropdown
    - expect: 'MLIS Test Intermediary' displayed as selected broker account
    - expect: 'Remove selected option' button appears
    - expect: 'Broker User' field becomes enabled

#### 2.3. should search and select broker user

**File:** `tests/sf-quote-journey/step1/should-search-select-broker-user.spec.ts`

**Steps:**
  1. Login, navigate to Quote Journey, select 'MLIS Test Intermediary' as Broker Account
    - expect: Broker Account selected, Broker User enabled
  2. Click 'Broker User' search field and type 't'
    - expect: Dropdown appears with matching users (e.g. 'test')
  3. Select 'test' from the dropdown
    - expect: User displayed as selected broker user
    - expect: 'Brand' combobox becomes enabled

#### 2.4. should show validation when broker user has no allowed brands

**File:** `tests/sf-quote-journey/step1/should-show-no-brands-validation.spec.ts`

**Steps:**
  1. Login, navigate to Quote Journey, select 'MLIS Test Intermediary' as Broker Account
    - expect: Broker Account selected
  2. Search and select broker user 'Andrew Xu'
    - expect: Validation message 'The selected user does not have any allowed brands.' is displayed
    - expect: 'Brand' combobox remains disabled or non-functional

#### 2.5. should select brand from dropdown

**File:** `tests/sf-quote-journey/step1/should-select-brand.spec.ts`

**Steps:**
  1. Login, select Broker Account and valid Broker User
    - expect: Brand combobox is enabled
  2. Click 'Brand' combobox
    - expect: Dropdown shows: 'My Legal Indemnity Shop', 'IC Insurance Solutions', 'Property Transaction Data'
  3. Select 'My Legal Indemnity Shop'
    - expect: Brand is set to 'My Legal Indemnity Shop'

#### 2.6. should change quote type

**File:** `tests/sf-quote-journey/step1/should-change-quote-type.spec.ts`

**Steps:**
  1. Login and navigate to Quote Journey
    - expect: Quote Type default is 'Residential'
  2. Click 'Quote Type' combobox and select 'Commercial'
    - expect: Quote Type changes to 'Commercial'
    - expect: Product list may update for commercial products

#### 2.7. should change jurisdiction

**File:** `tests/sf-quote-journey/step1/should-change-jurisdiction.spec.ts`

**Steps:**
  1. Login and navigate to Quote Journey
    - expect: Jurisdiction default is 'England and Wales'
  2. Click 'Jurisdiction' combobox and select 'Scotland'
    - expect: Jurisdiction changes to 'Scotland'
    - expect: Product list may update for jurisdiction-specific products

#### 2.8. should filter products by keyword search

**File:** `tests/sf-quote-journey/step1/should-filter-products-by-keyword.spec.ts`

**Steps:**
  1. Navigate to Quote Journey Step 1
    - expect: '54 products found' heading visible
  2. Type 'Planning' in product search textbox
    - expect: Product list filters to products containing 'Planning'
    - expect: Product count heading updates
  3. Clear the search field
    - expect: Full product list restored to 54 products

#### 2.9. should select and remove a product

**File:** `tests/sf-quote-journey/step1/should-select-and-remove-product.spec.ts`

**Steps:**
  1. Click 'Select' on 'Adverse Possession' product
    - expect: 'You have selected 1 product' heading appears
    - expect: Selected product shown with 'Remove' button
    - expect: 'Proceed' button visible
    - expect: Product count changes to '53 products found'
  2. Click 'Remove' button next to 'Adverse Possession'
    - expect: Product is deselected
    - expect: Product count returns to '54 products found'
    - expect: 'Proceed' button no longer visible

#### 2.10. should select multiple products up to 4

**File:** `tests/sf-quote-journey/step1/should-select-multiple-products.spec.ts`

**Steps:**
  1. Select 4 different products one by one
    - expect: After each selection, heading updates: '1 product', '2 products', '3 products', '4 products'
    - expect: All 4 listed with Remove buttons
    - expect: 'Proceed' button visible
    - expect: Note about referral for more than 4 products visible

#### 2.11. should fill all fields and proceed to Step 2

**File:** `tests/sf-quote-journey/step1/should-complete-step1-and-proceed.spec.ts`

**Steps:**
  1. Select Broker Account 'MLIS Test Intermediary', Broker User 'test', Brand 'My Legal Indemnity Shop'
    - expect: All fields set correctly
  2. Fill case reference 'TEST-QJ-001' and limit of indemnity '500000'
    - expect: Limit formatted as '500,000.00'
  3. Select 'Adverse Possession' product and click 'Proceed'
    - expect: Step 2 'Statements of fact' page loads
    - expect: Steps 1 and 2 in wizard are active

### 3. Step 2 - Statements of Fact

**Seed:** `tests/seed.spec.ts`

#### 3.1. should display statements of fact for selected product

**File:** `tests/sf-quote-journey/step2/should-display-statements-of-fact.spec.ts`

**Steps:**
  1. Complete Step 1 with Adverse Possession and proceed
    - expect: Heading '8 statements of fact to agree' visible
    - expect: Each statement has heading text, product name, 'Confirm' and 'Cannot confirm' buttons
  2. Verify statements include key texts about unregistered land, occupation for 5+ years, no main structure, not adjacent to railway, residential dwelling, enclosed boundary, no third-party contact, no local authority contact
    - expect: All 8 expected statements are present

#### 3.2. should confirm all statements and proceed

**File:** `tests/sf-quote-journey/step2/should-confirm-all-statements-and-proceed.spec.ts`

**Steps:**
  1. Click 'Confirm' on each of the 8 statements
    - expect: Each shows 'Confirmed' after clicking
    - expect: 'Back' and 'Proceed' buttons appear
  2. Click 'Proceed'
    - expect: Step 3 'Your quotes' page loads

#### 3.3. should mark statement as cannot confirm

**File:** `tests/sf-quote-journey/step2/should-mark-cannot-confirm.spec.ts`

**Steps:**
  1. Click 'Cannot confirm' on one statement
    - expect: Statement marked accordingly
    - expect: System may allow proceeding with referral or show warning

#### 3.4. should navigate back to Step 1

**File:** `tests/sf-quote-journey/step2/should-navigate-back-from-step2.spec.ts`

**Steps:**
  1. Click 'Back' button on Step 2
    - expect: Step 1 loads
    - expect: Previously entered data is preserved

### 4. Step 3 - Your Quotes

**Seed:** `tests/seed.spec.ts`

#### 4.1. should display quotes from multiple insurers

**File:** `tests/sf-quote-journey/step3/should-display-quotes.spec.ts`

**Steps:**
  1. Complete Steps 1-2 and proceed to Step 3
    - expect: Heading '4 quotes found' visible
    - expect: Validity date shown
    - expect: 'Quote summary', 'Email quote', 'Return to submission' buttons visible (disabled)
  2. Verify each quote card
    - expect: Insurer logo, name, financial rating, unlimited fees legal, premium with tax, 'Select quote' button, 'View specimen policy' link, product table with Product/Excess/Limitation columns

#### 4.2. should display correct premium details per quote

**File:** `tests/sf-quote-journey/step3/should-display-premium-details.spec.ts`

**Steps:**
  1. Verify AXA XL quote
    - expect: Premium £216.20 (tax 12.00%: £23.16)
    - expect: Rating AA- (S&P)
    - expect: Unlimited fees: Yes
    - expect: Adverse Possession, Excess 2500, Limitation NONE
  2. Verify Accredited Insurance quote
    - expect: Premium £308.09 (tax 12.00%: £33.01)
    - expect: Rating A- (AM Best)
    - expect: Unlimited fees: No
    - expect: Adverse Possession, Excess NIL, Limitation NONE
  3. Verify Intact Insurance quote
    - expect: Premium £310.79 (tax 12.00%: £33.30)
  4. Verify Aviva Insurance quote
    - expect: Premium £316.20 (tax 12.00%: £33.88)

#### 4.3. should select quote and proceed to Step 4

**File:** `tests/sf-quote-journey/step3/should-select-quote-and-proceed.spec.ts`

**Steps:**
  1. Click 'Select quote' on AXA XL quote
    - expect: Step 4 'Final policy details' page loads

### 5. Step 4 - Final Policy Details

**Seed:** `tests/seed.spec.ts`

#### 5.1. should display final policy details form

**File:** `tests/sf-quote-journey/step4/should-display-final-policy-details.spec.ts`

**Steps:**
  1. Complete Steps 1-3 and proceed to Step 4
    - expect: Heading 'Final policy details' visible
    - expect: 'Land registry number' field visible (optional)
    - expect: 'Insured name(s)' textbox visible (required)
    - expect: 'Insured property postcode' field visible (required)
    - expect: 'Address line 1' field visible (required)
    - expect: 'Town/city' field visible (required)

#### 5.2. should fill policy details and proceed to Step 5

**File:** `tests/sf-quote-journey/step4/should-fill-policy-details-and-proceed.spec.ts`

**Steps:**
  1. Fill 'Insured name(s)' with 'John Smith', postcode 'SW1A 1AA', address '10 Downing Street', town 'London'
    - expect: Fields accept input
  2. Click 'Next' / 'Proceed' button
    - expect: Step 5 'Summary' page loads
    - expect: All 5 wizard steps are active

#### 5.3. should validate required fields

**File:** `tests/sf-quote-journey/step4/should-validate-required-fields.spec.ts`

**Steps:**
  1. Click 'Next'/'Proceed' without filling required fields
    - expect: Validation errors shown for Insured name(s), address fields
    - expect: User remains on Step 4

### 6. Step 5 - Summary & Order

**Seed:** `tests/seed.spec.ts`

#### 6.1. should display summary with all entered details

**File:** `tests/sf-quote-journey/step5/should-display-summary.spec.ts`

**Steps:**
  1. Complete Steps 1-4 and proceed to Step 5
    - expect: Heading 'Summary' visible
    - expect: Case reference: 'TEST-QJ-001'
    - expect: Limit of indemnity: '£500,000.00'
    - expect: Insured name(s): 'John Smith'
    - expect: Address: 10 Downing Street, London, SW1A 1AA
    - expect: Insurer: AXA XL with logo, Premium: £216.20
    - expect: 'Back', 'Proceed to order', 'Email final draft', 'Review final draft', 'Review final' visible

#### 6.2. should show commencement date dialog on proceed to order

**File:** `tests/sf-quote-journey/step5/should-show-commencement-date-dialog.spec.ts`

**Steps:**
  1. Click 'Proceed to order'
    - expect: Dialog modal with heading 'Final policy details'
    - expect: 'Confirm policy commencement date' field with placeholder 'DD/MM/YYYY'
    - expect: 'Select a date before 12 May 2026' text visible
    - expect: 'Order now' button visible but disabled
    - expect: Date picker button available

#### 6.3. should enter commencement date and enable order button

**File:** `tests/sf-quote-journey/step5/should-enter-date-and-enable-order.spec.ts`

**Steps:**
  1. Enter date '14/04/2026' in commencement date field
    - expect: Date formatted to '14 Apr 2026' on blur
  2. Click outside the date field
    - expect: 'Order now' button becomes enabled

#### 6.4. should complete order and display policy issued confirmation

**File:** `tests/sf-quote-journey/step5/should-complete-order-and-confirm.spec.ts`

**Steps:**
  1. Enter commencement date and click 'Order now'
    - expect: 'Processing Request' dialog with 'Please wait' message and loading indicator
  2. Wait for processing to complete
    - expect: 'Policy issued' heading visible
    - expect: Congratulations message about policy in force
    - expect: Policy number displayed (format: DA-MLI-XXXXXXXXX)
    - expect: 'Debit note/invoice' and 'Policy document' download links
    - expect: 'Policy documents sent to' shows email
    - expect: 'Back to quote manager' and 'Return to submission' buttons visible

#### 6.5. should navigate back from summary

**File:** `tests/sf-quote-journey/step5/should-navigate-back-from-summary.spec.ts`

**Steps:**
  1. Click 'Back' button on Step 5
    - expect: Step 4 loads with preserved data
  2. Click 'Back' again
    - expect: Step 3 loads with quotes still available

### 7. End-to-End Complete Flow

**Seed:** `tests/seed.spec.ts`

#### 7.1. should complete full policy creation flow end-to-end

**File:** `tests/sf-quote-journey/e2e/should-complete-full-residential-ew-flow.spec.ts`

**Steps:**
  1. Login to Salesforce
    - expect: MLIS Underwriting app loads
  2. Navigate to Quote Journey, fill Step 1: Broker 'MLIS Test Intermediary', User 'test', Brand 'My Legal Indemnity Shop', Quote Type 'Residential', Jurisdiction 'England and Wales', case ref, indemnity 500000, select 'Adverse Possession', Proceed
    - expect: Step 2 loads
  3. Confirm all 8 statements, Proceed
    - expect: Step 3 loads with 4 quotes
  4. Select AXA XL quote (lowest premium £216.20)
    - expect: Step 4 loads
  5. Fill insured 'John Smith', address '10 Downing Street', 'London', 'SW1A 1AA', Proceed
    - expect: Step 5 Summary loads
  6. Click 'Proceed to order', enter commencement date, click 'Order now'
    - expect: 'Policy issued' with policy number
    - expect: Documents available for download
  7. Click 'Back to quote manager'
    - expect: Returns to Quote Journey page

### 8. Edge Cases & Negative Scenarios

**Seed:** `tests/seed.spec.ts`

#### 8.1. should handle removing broker account after selecting user

**File:** `tests/sf-quote-journey/edge-cases/should-handle-remove-broker-account.spec.ts`

**Steps:**
  1. Select broker account and user, then click 'Remove selected option' on Broker Account
    - expect: Broker Account cleared
    - expect: Broker User cleared or disabled
    - expect: Brand reverts to disabled

#### 8.2. should navigate via wizard step buttons

**File:** `tests/sf-quote-journey/edge-cases/should-navigate-via-wizard-steps.spec.ts`

**Steps:**
  1. Complete through Step 5, then click Step 1 button
    - expect: Navigates to Step 1 with data preserved
  2. Click Step 3 button
    - expect: Navigates to Step 3 with quotes available

#### 8.3. should display product info on info button click

**File:** `tests/sf-quote-journey/edge-cases/should-display-product-info.spec.ts`

**Steps:**
  1. Click 'i' info button on 'Adverse Possession' product
    - expect: Product description popup or tooltip displayed
    - expect: Information is relevant to the product

#### 8.4. should handle selecting more than 4 products

**File:** `tests/sf-quote-journey/edge-cases/should-handle-more-than-4-products.spec.ts`

**Steps:**
  1. Select 5 different products
    - expect: Warning about referral to underwriter displayed
    - expect: Flow may route to referral path
