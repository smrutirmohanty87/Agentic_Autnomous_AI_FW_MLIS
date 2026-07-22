import { OmniForm, RenoCoverage } from './renoTypes';
import { RenoPremiumEntry } from './renoData';

/**
 * Test data for the Oliva "Contractors Combined" (CONC) New Business flow on
 * the newprodqa2 sandbox — from `For creating policy for Contractors Combined
 * Product.docx` (40 screenshots catalogued in scratchpad cc_coverage_catalog.md;
 * images 2–22 + 40 are NATIVE newprodqa2 captures) + live org exploration.
 *
 * CONC deltas vs CARP: insured "UK Test Insured", Risk Type "Insurance (XoL)",
 * a 5-step Contractors Combined questionnaire, ONE coverage (Public & Products
 * Liability, 2-step form), FOUR available binders (must pick "Accelerant
 * Construction & Commercial 2026" by NAME), FULL per-RBS approval + the bulk
 * confirm button, and the same three fees.
 */

// ---------------------------------------------------------------------------
// Account / submission wizard
// ---------------------------------------------------------------------------

export const CC_ACCOUNT = {
  name: 'HOWDEN INSURANCE BROKERS LIMITED',
  intermediaryContact: 'James Chambers',
};

export const CC_CLIENT_INFO = {
  // Doc's native screenshots show "UK Test Insured", but the live-verified
  // existing client offered by the typeahead on newprodqa2 is "PG Test
  // Insured" (confirmed during CONC exploration itself).
  insuredName: 'PG Test Insured',
  industrySector: 'Construction',
  activityCode: 'Aerial & Satellite Erection',
  product: 'Contractors Combined',
  businessDescription: 'Business As Usual',
  yearBusinessEstablished: '2026',
  employeeSize: '90',
  clientTurnover: '900000',
  clientClassificationType: 'Consumer',
};

export const CC_RISK_INFO = {
  riskType: 'Insurance (XoL)',
  intermediaryReference: 'Test Reference',
  // Doc image 4 leaves this blank (and it is blank on the created policy,
  // image 40) — empty string makes the wizard skip the field.
  insurerQuotePolicyReference: '',
};

export const CC_INSURABLE = {
  // NOT the insured name: on Contractors Combined the 6 optional coverages
  // (EL, P&PL, CAR, PI, Terrorism, Legal Expenses) live under the
  // "Contractors Combined" PRODUCT card's Show Coverages — the risk-location
  // card ("PG Test Insured - United Kingdom") only offers Property Damage.
  // This value is the card text addRenoCoverage scopes to.
  insurableName: 'Contractors Combined',
};

// ---------------------------------------------------------------------------
// Product Questions — 5-step OmniScript (images 9–13)
// ---------------------------------------------------------------------------

export const CC_PRODUCT_FORM: OmniForm = {
  name: 'Contractors Combined Product Questions',
  steps: [
    {
      title: 'Oliva Standard Questions',
      fields: [
        { label: 'Contractors Company Website Checked', kind: 'radio', value: 'Yes' },
        { label: 'Current Insurer/MGA', kind: 'picklist', value: 'Other' },
        { label: 'Has an Insurer ever declined to issue or renew', kind: 'radio', value: 'No' },
        { label: 'prosecuted for Health & Safety', kind: 'radio', value: 'No' },
        { label: 'declared bankrupt', kind: 'radio', value: 'No' },
        { label: 'convicted or charged with any criminal offence', kind: 'radio', value: 'No' },
      ],
      action: 'Next',
    },
    {
      title: 'Contractors Combined',
      fields: [
        { label: 'Main trade description', kind: 'picklist', value: 'Other' },
        { label: 'Details of any trade memberships', kind: 'text', value: 'Test Reference 123' },
        { label: 'maximum height worked to', kind: 'text', value: '2000' },
        { label: 'maximum depth worked to', kind: 'text', value: '2000' },
        { label: 'application of heat away from your own premises', kind: 'text', value: '100' },
      ],
      action: 'Next',
    },
    {
      title: 'Types of Work',
      fields: [
        { label: 'Demolition in isolation of buildings', kind: 'radio', value: 'No' },
        { label: 'high risk contracts', kind: 'radio', value: 'No' },
        { label: 'Pile driving, quarrying or use of explosives', kind: 'radio', value: 'No' },
        { label: 'asbestos/silica', kind: 'radio', value: 'No' },
        { label: 'laying of main sewers', kind: 'radio', value: 'No' },
      ],
      action: 'Next',
    },
    {
      title: 'Work Locations',
      fields: [
        { label: 'Airside or at airports', kind: 'radio', value: 'No' },
        { label: 'ship, vessel, water craft', kind: 'radio', value: 'No' },
        { label: 'railways or railside', kind: 'radio', value: 'No' },
        { label: 'petrochemical works', kind: 'radio', value: 'No' },
        { label: 'Overseas, outside of the UK or offshore', kind: 'radio', value: 'No' },
        { label: 'coronavirus/communicable disease', kind: 'radio', value: 'Yes' },
      ],
      action: 'Next',
    },
    {
      title: 'Health & Safety Risk Management',
      fields: [
        { label: 'written and signed health & safety policy', kind: 'radio', value: 'Yes' },
        { label: 'external company to oversee the health', kind: 'radio', value: 'Yes' },
        { label: 'keep records of training provided', kind: 'radio', value: 'Yes' },
        { label: 'enforce the use of personal protective equipment', kind: 'radio', value: 'Yes' },
        { label: 'records of personal protective equipment supplied', kind: 'radio', value: 'Yes' },
        { label: 'risk assessments for each contract', kind: 'radio', value: 'Yes' },
        { label: 'written work method statements', kind: 'radio', value: 'Yes' },
        { label: 'facts that could be considered material', kind: 'radio', value: 'Yes' },
        { label: 'Additional Details (Material Facts)', kind: 'text', value: 'Test Reference 123456789!' },
      ],
      action: 'Save',
    },
  ],
};

// ---------------------------------------------------------------------------
// Coverage — ONE: Public & Products Liability (2 steps, images 15–16)
// ---------------------------------------------------------------------------

export const CC_COVERAGES: RenoCoverage[] = [
  {
    addRowName: 'Public & Products Liability',
    form: {
      name: 'Public & Products Liability',
      steps: [
        {
          title: 'Public & Products Liability',
          fields: [
            { label: 'Is public & products liability cover required', kind: 'picklist', value: 'Public & Products Liability' },
            { label: 'Trade 1 Turnover', kind: 'text', value: '1600.00' },
            { label: 'Turnover derived from heat work', kind: 'text', value: '1600.00' },
            { label: 'Annual payments to bona fide sub contractors', kind: 'text', value: '1600.00' },
            { label: 'Annual cost of materials', kind: 'text', value: '1600.00' },
          ],
          action: 'Next',
        },
        {
          title: 'Covers & Excess',
          fields: [
            { label: 'design turnover exceed 10%', kind: 'radio', value: 'No' },
            { label: 'turnover solely from fees only', kind: 'radio', value: 'No' },
            { label: 'financial loss extension', kind: 'radio', value: 'No' },
            { label: 'defective workmanship extension', kind: 'radio', value: 'No' },
            { label: 'professional indemnity extension', kind: 'radio', value: 'No' },
            { label: 'Heat Excess', kind: 'picklist', value: '1,000' },
            { label: 'Water Damage Excess', kind: 'picklist', value: '1,000' },
            { label: 'Underground Services Excess', kind: 'picklist', value: '1,000' },
            { label: 'All other third party property damage claims excess', kind: 'picklist', value: '1,000' },
            { label: 'Limit of liability required', kind: 'picklist', value: '0' },
          ],
          action: 'Save',
        },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Premiums (image18) — Insurable Name renders EMPTY on the CONC premium grid.
// ---------------------------------------------------------------------------

export const CC_PREMIUMS: RenoPremiumEntry[] = [
  { coverage: 'Public & Products Liability', insurable: '', technical: '1247.44', grossWritten: '1247.44', annualized: '', commissionRate: '5' },
];

/** "Is any part of policy Minimum & Deposit?" — Yes (image18). */
export const CC_MINIMUM_DEPOSIT = 'Yes';

// ---------------------------------------------------------------------------
// Binder — FOUR available binders on the PPL row (image20); the doc adds
// "Accelerant Construction & Commercial 2026" (section "Contractors Combined").
// BindersPage must click the Add button in THIS binder's row, not the first.
// ---------------------------------------------------------------------------

export const CC_BINDER = {
  name: 'Accelerant Construction & Commercial 2026',
  section: 'Contractors Combined',
  nrToBinder: 'New Business',
};

// ---------------------------------------------------------------------------
// Fees — same three as CARP (doc text; no fee screenshots in this doc).
// ---------------------------------------------------------------------------

export const CC_FEES = [
  {
    type: 'Third Party Fee',
    subType: 'Survey Fee',
    payableBy: 'Insured',
    administeredBy: 'DUAL',
    includedInGwp: 'Yes',
    charged: '150',
    description: 'TESTING FEES',
  },
  {
    type: 'Third Party Fee',
    subType: 'DUAL DNA+ Fee',
    // Conditional OmniScript field for the DNA+ sub-type; org records show 50
    // (live-diagnosed 22/07/2026 — save silently fails without it).
    dnaPaymentAmount: '50',
    payableBy: 'Insured',
    administeredBy: 'DUAL',
    includedInGwp: 'Yes',
    charged: '150',
    description: 'TESTING FEES',
  },
  {
    type: 'DUAL Fee',
    subType: 'DUAL Policy/Admin Fee',
    payableBy: 'Insured',
    administeredBy: 'DUAL',
    includedInGwp: 'Yes',
    charged: '150',
    description: 'TESTING FEES',
  },
];

// ---------------------------------------------------------------------------
// UAL / users / policy expectations — same Construction org setup.
// ---------------------------------------------------------------------------

export const CC_UAL = {
  approverName: 'T-0016-SIT2-SCC-CON-UW5 Auto-Provar',
  approverSearchTerms: ['t-0016', 'T-0016-SIT2-SCC-CON-UW5', 'T-0016'],
  errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
};

export const CC_USERS = {
  uw3: 'oliva.cons.puw3@dualgroup.com.newprodqa2',
  uw5: 'oliva.cons.puw5@dualgroup.com.newprodqa2',
};

export const CC_POLICY_EXPECTATIONS = {
  status: 'In Force',
  newMtaRenewal: 'New Business',
  // Doc image 40 also highlights the Risk ID and Product on the policy.
  product: 'Contractors Combined',
  riskIdPattern: /DOU\/\d+\/CONC\/\d+\/\d+/,
};
