# MLIS Policy Cancellation - End-to-End Test Plan

## Application Overview

This test plan covers the complete Policy Cancellation workflow for the MLIS (Mortgage Lender Insurance Services) platform. The cancellation process is initiated exclusively from the Salesforce Lightning Portal (MLIS Underwriting app) using a Vlocity/OmniScript wizard with a 2-step process: Step 1 (Cancel Policy) and Step 2 (Enter Premiums). Post-cancellation verification spans both Salesforce Portal and Broker Portal. Navigation path: Global Search → Submission → Related tab → Insurance Policy → Show more actions → Cancel Policy. Two cancellation categories are supported: 'Cancel from Inception' (auto-fills date, Inside Cooling-Off Period) and 'Cancel Midterm' (editable date picker, Outside Cooling-Off Period). Premium return options: full (auto-populates negative GWP) or partial (manual entry). Tax: Insurance Premium Tax at 12% on UK premiums. Policy status path: In Force → Under Compliance Review → Cancelled → Lapsed. Broker Portal shows 'Live' status for active policies.

## Test Scenarios

### 1. Cancellation from Inception - Full Premium Return

**Seed:** `tests/seed.spec.ts`

#### 1.1. should cancel policy from inception with full premium return

**File:** `tests/sanity/TC_SAN_008_cancel_from_inception_full_premium_return.spec.ts`

**Steps:**
  1. Navigate to Salesforce Portal and log in with underwriter credentials
    - expect: MLIS Underwriting app loads with navigation bar showing Accounts, Contacts, Submissions, Insurance Policies, Quote Journey
  2. Click Search button in the Global Header and search for policy reference (e.g., DA-MLI-058587097)
    
  3. Click the Submission record to open it
    - expect: Submission record page loads with policy details
  4. Click the 'Related' tab on the Submission record
    - expect: Related tab shows 'Insurance Policies (1)' section with linked insurance policy
  5. Click the Insurance Policy link (e.g., DAU/00113901/ASST/00/26)
    - expect: Insurance Policy record loads with heading showing carrier and policy reference
    - expect: Status Path shows 'In Force' as selected stage
    - expect: Action buttons visible: Create MTA, Create Claim, New Note, Show more actions
  6. Click 'Show more actions' button on the Insurance Policy record
    - expect: Dropdown menu appears with options: Cancel Policy, Cancel and Reissue, Change Owner
  7. Click 'Cancel Policy' menu item
    - expect: Vlocity OmniScript cancellation wizard opens
    - expect: Step 1 'Cancel Policy' is shown as 'In Progress'
    - expect: Progress bar is visible
    - expect: Effective Date field is pre-populated with policy effective date and disabled
  8. Select '*Cancellation Category' = 'Cancel the Policy from Inception'
    - expect: 'Cancellation Effective Date' field appears and is disabled (auto-filled to match policy effective date)
    - expect: 'Cooling Period Display' shows 'Inside Cooling-Off Period'
  9. Select '*Cancellation Instigated By' = 'Customer'
    - expect: '*Cancellation Reason' dropdown appears below the Instigated By field
  10. Select '*Cancellation Reason' = 'Cover No Longer Required'
    - expect: '*Cancellation Notes/Narrative' text field appears below the Reason field
  11. Enter cancellation notes: 'Policy cancellation from inception - full premium return test'
    - expect: Notes text is entered in the textarea field
  12. Click 'Next' button
    - expect: Step 2 'Enter Premiums' loads
    - expect: Step 1 shows 'Completed' status
    - expect: Step 2 shows 'In Progress' status
    - expect: Progress bar shows 100%
  13. Select 'Do you want to return the full premium?' = 'Yes'
    - expect: 'Cancellation Return Premium' field auto-populates with negative of Gross Written Premium (e.g., -240.97)
    - expect: Gross Written Premium field shows original premium (e.g., 240.97) and is disabled
  14. Verify Tax Details grid shows correct Insurance Premium Tax row
    - expect: Tax grid shows: Name='Insurance Premium Tax', Type='Non Life', Taxable Premium matching GWP, Tax %=12, Tax Amount calculated correctly
    - expect: Settlement Method='Remitted to DUAL', Payable By='Insured', Administered By='Insurer', Opt Out='No'
    - expect: Total Tax Value is populated and disabled
    - expect: Tax Jurisdiction='United Kingdom', Quote Currency='GBP'
    - expect: click on calculate tax button tehn click ok from the dialog box.
  15. Click 'Next' button to submit the cancellation
    - expect: Cancellation processes successfully
    - expect: Confirmation message or redirect to policy record page

#### 1.2. should verify post-cancellation status on Salesforce Insurance Policy record

**File:** `tests/cancellation/verify-sf-post-cancellation.spec.ts`

**Steps:**
  1. Navigate to the Insurance Policy record after cancellation
    - expect: Insurance Policy record loads
  2. Verify the status Path component at the top of the record
    - expect: Path shows 'Cancelled' as the current/selected stage instead of 'In Force'
  3. Click the 'Details' tab
    - expect: Details tab loads with multiple sections
  4. Scroll to 'Cancellation Details' section and verify all fields
    - expect: Cancellation Date is populated
    - expect: Cancellation Effective Date matches policy inception date
    - expect: Cancellation Instigated By = 'Customer'
    - expect: Cancellation Type is populated
    - expect: Cancelled within Cooling Off Period = True
    - expect: Cancellation Reason = 'Cover No Longer Required'
    - expect: Cancellation Notes/Narrative contains the entered notes
  5. Verify 'Policy Details' section
    - expect: Status field shows 'Cancelled' (was 'In Force')
    - expect: Active flag changes to False
  6. Verify 'Premium and Renewal Details' section
    - expect: Total Cancellation Return Premium shows the negative return amount

#### 1.3. should verify post-cancellation status on Broker Portal

**File:** `tests/cancellation/verify-broker-portal-post-cancellation.spec.ts`

**Steps:**
  1. Navigate to Broker Portal and log in with broker credentials
    - expect: Broker Portal loads with Quote Manager page showing Start new quote sections for Residential and Commercial
  2. Search for the cancelled policy reference in the Quote Manager search box
    - expect: Policy appears in the results table
  3. Verify the Status column for the cancelled policy
    - expect: Status shows cancelled status (instead of 'Live')
    - expect: Document the exact status text shown for cancelled policies
  4. Check if document action buttons are still available for the cancelled policy
    - expect: Document whether 'Certificate of Insurance and Policy Wordings' and 'Debit Note/Invoice' buttons are still visible or disabled

### 2. Cancellation from Inception - Partial Premium Return

**Seed:** `tests/seed.spec.ts`

#### 2.1. should cancel policy from inception with partial premium return

**File:** `tests/cancellation/cancel-inception-partial-return.spec.ts`

**Steps:**
  1. Navigate to Insurance Policy record and initiate cancellation via Show more actions > Cancel Policy
    - expect: Cancellation wizard opens at Step 1
  2. Complete Step 1: Category='Cancel the Policy from Inception', Instigated By='Coverholder', Reason='Product Too Expensive', Notes='Partial return test'
    - expect: All fields populated correctly
  3. Click 'Next' to proceed to Step 2
    - expect: Step 2 'Enter Premiums' loads with Step 1 marked Completed
  4. Select 'Do you want to return the full premium?' = 'No'
    - expect: 'Cancellation Return Premium' field is empty and editable (spinbutton input)
  5. Enter a partial return amount (e.g., -120.00 — half the GWP)
    - expect: Partial amount is entered in the spinbutton field
  6. Click 'Calculate Tax' button
    - expect: Tax Details grid recalculates based on the entered partial premium
    - expect: Tax Amount updates proportionally
    - expect: Total Tax Value updates
  7. Click 'Next' to submit the cancellation
    - expect: Cancellation processes successfully with partial premium return

#### 2.2. should cancel policy from inception with zero premium return

**File:** `tests/cancellation/cancel-inception-zero-return.spec.ts`

**Steps:**
  1. Initiate cancellation and complete Step 1 with valid details
    - expect: Step 2 loads
  2. Select 'Do you want to return the full premium?' = 'No'
    - expect: Return Premium field is editable
  3. Enter '0' in the Cancellation Return Premium field
    - expect: Zero value accepted in the field
  4. Click 'Calculate Tax' and then 'Next' to submit
    - expect: Tax recalculates to reflect zero return
    - expect: Cancellation completes successfully with no refund

### 3. Midterm Cancellation

**Seed:** `tests/seed.spec.ts`

#### 3.1. should cancel policy midterm with full premium return

**File:** `tests/cancellation/cancel-midterm-full-return.spec.ts`

**Steps:**
  1. Navigate to Insurance Policy record and initiate cancellation
    - expect: Cancellation wizard opens
  2. Select '*Cancellation Category' = 'Cancel the Policy Midterm'
    - expect: '*Cancellation Effective Date' field becomes editable with a date picker (required, marked with *)
    - expect: 'Cooling Period Display' changes to 'Outside Cooling-Off Period'
  3. Enter a valid cancellation effective date using the date picker
    - expect: Date is accepted in the editable date field
  4. Select Instigated By = 'Customer', Reason = 'Alternative Competitor Product Purchased', enter notes
    - expect: All fields accepted
  5. Click 'Next' to Step 2
    - expect: Step 2 loads
  6. Select 'Do you want to return the full premium?' = 'Yes'
    - expect: Return premium auto-populates with negative of GWP
  7. Click 'Next' to submit
    - expect: Cancellation processes successfully
    - expect: Policy is cancelled with midterm effective date

#### 3.2. should cancel policy midterm with partial premium return

**File:** `tests/cancellation/cancel-midterm-partial-return.spec.ts`

**Steps:**
  1. Initiate midterm cancellation and complete Step 1 with: Category='Cancel the Policy Midterm', custom date, Instigated By='Coverholder', Reason='No Longer trading'
    - expect: Step 1 completed
  2. On Step 2, select 'Do you want to return the full premium?' = 'No' and enter a partial return amount
    - expect: Partial amount entered in editable field
  3. Click 'Calculate Tax' then 'Next' to submit
    - expect: Tax recalculates for partial amount
    - expect: Cancellation completes with midterm date and partial return

#### 3.3. should validate midterm cancellation effective date is within policy period

**File:** `tests/cancellation/cancel-midterm-date-validation.spec.ts`

**Steps:**
  1. Select 'Cancel the Policy Midterm' and enter a date before policy inception date
    - expect: Validation error prevents using a date before inception
  2. Enter a date after the policy expiry date
    - expect: Validation error prevents using a date after expiry
  3. Enter a valid date between inception and expiry
    - expect: Date is accepted and user can proceed

### 4. Cancellation Category Switching and Field Dynamics

**Seed:** `tests/seed.spec.ts`

#### 4.1. should switch between inception and midterm categories dynamically

**File:** `tests/cancellation/cancel-category-switching.spec.ts`

**Steps:**
  1. Open cancellation wizard and select 'Cancel the Policy from Inception'
    - expect: Cancellation Effective Date is disabled and auto-filled
    - expect: Cooling Period = 'Inside Cooling-Off Period'
  2. Switch to 'Cancel the Policy Midterm'
    - expect: Cancellation Effective Date becomes editable with date picker
    - expect: Cooling Period changes to 'Outside Cooling-Off Period'
  3. Switch back to 'Cancel the Policy from Inception'
    - expect: Fields revert to disabled/auto-filled state
    - expect: Cooling Period reverts to 'Inside Cooling-Off Period'
  4. Use '-- Clear --' option to deselect category
    - expect: Cancellation Effective Date and Cooling Period fields are hidden or reset

#### 4.2. should verify all cancellation reason options are available

**File:** `tests/cancellation/cancel-all-reasons.spec.ts`

**Steps:**
  1. Open cancellation wizard, select Category and Instigated By, then open *Cancellation Reason dropdown
    - expect: All 9 reason options are present: Product Unsuited/Misunderstood, Product Too Expensive, Alternative Competitor Product Purchased, Poor Service Complaint, Cover No Longer Required, No Longer trading, Cannot afford to pay, Cover Overlapped with Pre-Existing Cover, Other Reason
  2. Select each reason and verify the form accepts it
    - expect: Each reason allows the Notes field to appear and allows progression to Step 2

#### 4.3. should verify both instigated by values work correctly

**File:** `tests/cancellation/cancel-instigated-by-values.spec.ts`

**Steps:**
  1. Select Instigated By = 'Customer' and check Cancellation Reason options
    - expect: Cancellation Reason dropdown appears with available options
  2. Change to Instigated By = 'Coverholder' and check Cancellation Reason options
    - expect: Cancellation Reason dropdown updates (document any differences in options)

### 5. Tax Details and Premium Calculations

**Seed:** `tests/seed.spec.ts`

#### 5.1. should verify tax details grid values and calculations

**File:** `tests/cancellation/cancel-tax-details-verification.spec.ts`

**Steps:**
  1. Navigate to Step 2 of cancellation wizard
    - expect: Tax Details grid is visible with correct columns
  2. Verify Insurance Premium Tax row values
    - expect: Name='Insurance Premium Tax', Type='Non Life'
    - expect: Taxable Premium = GBP {original_premium}
    - expect: Tax % = 12
    - expect: Tax Amount = GBP {premium * 0.12}
    - expect: Settlement Method = 'Remitted to DUAL'
    - expect: Payable By = 'Insured'
    - expect: Administered By = 'Insurer'
    - expect: Opt Out = 'No'
  3. Verify disabled fields: Tax Jurisdiction, Quote Currency, Total Tax Value, Fiscal Code/Tax Number
    - expect: Tax Jurisdiction = 'United Kingdom' (disabled)
    - expect: Quote Currency = 'GBP' (disabled)
    - expect: Total Tax Value = sum of tax amounts (disabled)
    - expect: Fiscal Code/Tax Number = 'No' (disabled)

#### 5.2. should edit tax overwrite fields and recalculate

**File:** `tests/cancellation/cancel-tax-overwrite.spec.ts`

**Steps:**
  1. Click 'Edit Taxable Premium (Overwritten)' button in the tax grid
    - expect: Taxable Premium (Overwritten) field becomes editable
  2. Enter a different taxable premium value and click 'Calculate Tax'
    - expect: Tax amount recalculates based on overwritten premium
  3. Click 'Edit Tax % (Overwritten)' button and enter a different tax percentage
    - expect: Tax % (Overwritten) field becomes editable
  4. Click 'Calculate Tax' again
    - expect: Tax amount recalculates based on overwritten percentage
    - expect: Total Tax Value updates

#### 5.3. should add additional tax entry

**File:** `tests/cancellation/cancel-add-tax.spec.ts`

**Steps:**
  1. Click 'Add Tax' button on Step 2
    - expect: A new row is added to the Tax Details grid
  2. Fill in the new tax entry details and click 'Calculate Tax'
    - expect: Total Tax Value sums all tax entries including the new one

#### 5.4. should edit settlement method, payable by, administered by, and opt out

**File:** `tests/cancellation/cancel-edit-tax-grid-fields.spec.ts`

**Steps:**
  1. Click 'Edit' buttons on Settlement Method, Payable By, Administered By, and Opt Out columns
    - expect: Each field becomes editable
  2. Change each value and proceed with submission
    - expect: Changed values are accepted and persist through submission

### 6. Navigation and Wizard Controls

**Seed:** `tests/seed.spec.ts`

#### 6.1. should navigate between steps preserving data

**File:** `tests/cancellation/cancel-step-navigation.spec.ts`

**Steps:**
  1. Fill in all Step 1 fields and click 'Next'
    - expect: Step 2 loads with Step 1 showing 'Completed' and Step 2 showing 'In Progress'
  2. Click 'Previous' to return to Step 1
    - expect: All Step 1 field values are preserved (Category, Instigated By, Reason, Notes)
    - expect: Step 1 shows 'In Progress' and Step 2 shows 'Incomplete'
  3. Click 'Next' again to return to Step 2
    - expect: Step 2 field values are preserved including premium return selection

#### 6.2. should save cancellation for later and resume

**File:** `tests/cancellation/cancel-save-for-later.spec.ts`

**Steps:**
  1. Fill in Step 1 fields and click 'Save for later' button
    - expect: Confirmation or success message appears
    - expect: Data is saved
  2. Navigate away from the cancellation wizard and return to the Insurance Policy record
    - expect: Insurance Policy record loads with status still 'In Force'
  3. Reopen the cancellation wizard to check if saved data can be resumed
    - expect: Previously saved data is restored or a way to resume is available

#### 6.3. should exit wizard without submitting and preserve policy status

**File:** `tests/cancellation/cancel-exit-without-submit.spec.ts`

**Steps:**
  1. Fill in Step 1 fields and navigate away (browser back or click navigation link)
    - expect: Unsaved changes warning dialog may appear
  2. Confirm exit and return to the Insurance Policy record
    - expect: Policy status remains 'In Force' unchanged
    - expect: No partial cancellation was applied

### 7. Validation and Error Handling

**Seed:** `tests/seed.spec.ts`

#### 7.1. should validate required fields on Step 1

**File:** `tests/cancellation/cancel-step1-validation.spec.ts`

**Steps:**
  1. Click 'Next' without selecting Cancellation Category
    - expect: Validation error displayed for required Cancellation Category field
  2. Select Category but leave Instigated By empty, click 'Next'
    - expect: Validation error for required Instigated By field
  3. Select Instigated By but leave Reason empty, click 'Next'
    - expect: Validation error for required Reason field
  4. Select Reason but leave Notes empty, click 'Next'
    - expect: Validation error for required Notes field (if Notes is required)

#### 7.2. should validate midterm cancellation requires effective date

**File:** `tests/cancellation/cancel-midterm-date-required.spec.ts`

**Steps:**
  1. Select 'Cancel the Policy Midterm' and leave *Cancellation Effective Date empty, fill other fields, click 'Next'
    - expect: Validation error for missing cancellation effective date

#### 7.3. should handle empty return premium on Step 2

**File:** `tests/cancellation/cancel-empty-premium.spec.ts`

**Steps:**
  1. On Step 2, select full premium return = 'No' and leave Cancellation Return Premium empty, click 'Next'
    - expect: Validation error is shown OR system defaults to 0 (document actual behavior)

#### 7.4. should validate return premium does not exceed GWP

**File:** `tests/cancellation/cancel-premium-exceeds-gwp.spec.ts`

**Steps:**
  1. On Step 2, select full premium return = 'No' and enter a return premium greater than GWP (e.g., -500.00 when GWP is 240.97)
    - expect: Validation prevents return premium exceeding original GWP
    - expect: Error message displayed

#### 7.5. should handle positive return premium value

**File:** `tests/cancellation/cancel-positive-premium.spec.ts`

**Steps:**
  1. On Step 2, enter a positive value (e.g., 100.00 instead of -100.00) in Cancellation Return Premium
    - expect: System either auto-converts to negative, rejects, or accepts — document actual behavior

#### 7.6. should reject non-numeric characters in premium fields

**File:** `tests/cancellation/cancel-premium-input-validation.spec.ts`

**Steps:**
  1. Attempt to type alphabetic and special characters in the Cancellation Return Premium spinbutton
    - expect: Spinbutton rejects non-numeric input
    - expect: Only numeric values with up to 2 decimal places accepted

### 8. Search and Navigation Paths

**Seed:** `tests/seed.spec.ts`

#### 8.1. should navigate to Insurance Policy via Insurance Policies tab

**File:** `tests/cancellation/cancel-nav-via-policies-tab.spec.ts`

**Steps:**
  1. Click 'Insurance Policies' in the Global navigation bar
    - expect: Insurance Policies list view loads
  2. Search or filter for the target policy and open it
    - expect: Insurance Policy record loads with all action buttons
  3. Initiate cancellation via Show more actions > Cancel Policy
    - expect: Cancellation wizard opens correctly

#### 8.2. should navigate to Insurance Policy via Submission Related tab

**File:** `tests/cancellation/cancel-nav-via-submission.spec.ts`

**Steps:**
  1. Use Global Search to find policy, open Submission record, click Related tab, click Insurance Policy link
    - expect: Insurance Policy record loads
    - expect: All action buttons present: Create MTA, Create Claim, New Note, Show more actions

### 9. Post-Cancellation State Verification

**Seed:** `tests/seed.spec.ts`

#### 9.1. should verify policy path stages after cancellation

**File:** `tests/cancellation/cancel-verify-path-stages.spec.ts`

**Steps:**
  1. Open cancelled Insurance Policy record and check Path component
    - expect: Path stages visible: In Force → Under Compliance Review → Cancelled → Lapsed
    - expect: 'Cancelled' is the current/selected stage
  2. Check if status can be changed back to 'In Force'
    - expect: Status cannot be reverted to 'In Force' (cancelled is terminal) OR document if revert is possible

#### 9.2. should verify action buttons after cancellation

**File:** `tests/cancellation/cancel-verify-actions-disabled.spec.ts`

**Steps:**
  1. On cancelled policy, check if 'Create MTA' button is available or disabled
    - expect: Create MTA should be disabled or hidden for cancelled policies
  2. Click 'Show more actions' and check Cancel Policy option
    - expect: 'Cancel Policy' should be hidden or show error if clicked on already cancelled policy
  3. Check 'Create Claim' button behavior
    - expect: Document whether claims can still be created on cancelled policies

#### 9.3. should verify cancellation details section is fully populated

**File:** `tests/cancellation/cancel-verify-details-section.spec.ts`

**Steps:**
  1. Open cancelled policy Details tab and check Cancellation Details section
    - expect: Cancellation Date is populated
    - expect: Cancellation Effective Date matches inception or midterm date
    - expect: Cancellation Type is populated
    - expect: Cancelled within Cooling Off Period = True for Inception, False for Midterm
    - expect: Cancellation Instigated By matches selected value
    - expect: Cancellation Reason matches selected value
    - expect: Cancellation Notes/Narrative matches entered text
  2. Check Compliance Review section
    - expect: Compliance Flag status is documented
    - expect: Compliance Approver field is checked for auto-assignment

### 10. Regional Policy Cancellations

**Seed:** `tests/seed.spec.ts`

#### 10.1. should cancel residential England and Wales policy

**File:** `tests/cancellation/cancel-residential-ew.spec.ts`

**Steps:**
  1. Complete full cancellation workflow for an E&W residential policy
    - expect: Cancellation completes successfully
    - expect: All cancellation details recorded correctly
    - expect: Broker Portal status updates

#### 10.2. should cancel residential Scotland policy

**File:** `tests/cancellation/cancel-residential-scotland.spec.ts`

**Steps:**
  1. Complete full cancellation workflow for a Scotland residential policy
    - expect: Cancellation completes successfully
    - expect: Document any Scotland-specific field or behavior differences
    - expect: Verify tax calculations for Scotland

#### 10.3. should cancel residential Northern Ireland policy

**File:** `tests/cancellation/cancel-residential-ni.spec.ts`

**Steps:**
  1. Complete full cancellation workflow for a Northern Ireland residential policy
    - expect: Cancellation completes successfully
    - expect: Document any NI-specific field or behavior differences

#### 10.4. should cancel commercial England and Wales policy

**File:** `tests/cancellation/cancel-commercial-ew.spec.ts`

**Steps:**
  1. Complete full cancellation workflow for an E&W commercial policy
    - expect: Cancellation completes successfully
    - expect: Document any commercial-specific differences in premium/tax structure

#### 10.5. should cancel commercial Scotland policy

**File:** `tests/cancellation/cancel-commercial-scotland.spec.ts`

**Steps:**
  1. Complete full cancellation workflow for a Scotland commercial policy
    - expect: Document region + type specific behavior

#### 10.6. should cancel commercial Northern Ireland policy

**File:** `tests/cancellation/cancel-commercial-ni.spec.ts`

**Steps:**
  1. Complete full cancellation workflow for a Northern Ireland commercial policy
    - expect: Document region + type specific behavior

### 11. Edge Cases and Special Scenarios

**Seed:** `tests/seed.spec.ts`

#### 11.1. should prevent cancellation of already cancelled policy

**File:** `tests/cancellation/cancel-already-cancelled.spec.ts`

**Steps:**
  1. Open a previously cancelled Insurance Policy record and click 'Show more actions'
    - expect: 'Cancel Policy' option is either not present or present
  2. If Cancel Policy is present, click it
    - expect: System prevents re-cancellation with an error message or the wizard shows appropriate state

#### 11.2. should handle cancellation of policy with existing claims

**File:** `tests/cancellation/cancel-policy-with-claims.spec.ts`

**Steps:**
  1. Attempt to cancel a policy that has existing claims linked
    - expect: System either prevents cancellation with warning about existing claims OR allows it with appropriate handling
    - expect: Document actual behavior

#### 11.3. should handle cancellation of policy with MTA applied

**File:** `tests/cancellation/cancel-policy-with-mta.spec.ts`

**Steps:**
  1. Attempt to cancel a policy that has had an MTA (Mid-Term Adjustment) applied
    - expect: Cancellation handles MTA'd policies correctly
    - expect: Premium return accounts for MTA changes in the latest version premium

#### 11.4. should handle cancellation of multi-product policy

**File:** `tests/cancellation/cancel-multi-product-policy.spec.ts`

**Steps:**
  1. Initiate cancellation for a policy with multiple products/coverages
    - expect: Premium return covers all products' combined premiums
    - expect: Tax calculations account for total combined premium

#### 11.5. should handle midterm cancellation of perpetuity duration policy

**File:** `tests/cancellation/cancel-perpetuity-policy.spec.ts`

**Steps:**
  1. Initiate midterm cancellation for a policy with 'Perpetuity' duration (expiry 31/12/2999)
    - expect: Date picker allows valid midterm dates
    - expect: Document any special handling for perpetuity policies

#### 11.6. should handle concurrent cancellation attempts from two sessions

**File:** `tests/cancellation/cancel-concurrent-attempts.spec.ts`

**Steps:**
  1. Open the same Insurance Policy in two different browser tabs and initiate cancellation in both
    - expect: Only one cancellation should succeed
    - expect: Second attempt should show appropriate conflict/error message

### 12. Cancel and Reissue Workflow

**Seed:** `tests/seed.spec.ts`

#### 12.1. should complete cancel and reissue workflow

**File:** `tests/cancellation/cancel-and-reissue.spec.ts`

**Steps:**
  1. Navigate to Insurance Policy record and click 'Show more actions' > 'Cancel and Reissue'
    - expect: Cancel and Reissue wizard or form opens
  2. Document all fields and steps in the Cancel and Reissue workflow
    - expect: All form fields identified and documented
  3. Complete the Cancel and Reissue process
    - expect: Old policy is cancelled and new policy is created
    - expect: 'Cancel and Rewrite Reason' field on old policy is populated
    - expect: New policy is linked to old policy

### 13. Audit and Activity Tracking

**Seed:** `tests/seed.spec.ts`

#### 13.1. should verify activity timeline after cancellation

**File:** `tests/cancellation/cancel-verify-activity-timeline.spec.ts`

**Steps:**
  1. Open cancelled Insurance Policy record and check Activity panel
    - expect: Chatter tab shows any automated cancellation posts
    - expect: Activity tab shows any tasks or events created by cancellation process

#### 13.2. should verify submission record reflects policy cancellation

**File:** `tests/cancellation/cancel-verify-submission.spec.ts`

**Steps:**
  1. Navigate to the parent Submission record (via Source Submission Name link)
    - expect: Submission record loads
  2. Check Related tab for Insurance Policy status
    - expect: Insurance Policy status reflects cancellation from the Submission record view
