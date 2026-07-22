import { OmniForm, RenoCoverage } from './renoTypes';
import { RenoPremiumEntry } from './renoData';
import { BinderChoice } from '../pages/BindersPage';

/**
 * Test data for the EXPANDED Oliva "Contractors Combined" (CONC) New Business
 * scenario ("CC2") on the newprodqa2 sandbox — from the SIT-captured
 * requirements doc (scratchpad cc2_catalog.md, 45 screenshots) re-derived live
 * on newprodqa2 via tests/explore-cc2.spec.ts (UW5 oliva.cons.puw5).
 *
 * CC2 deltas vs the existing CONC suite (ccData.ts):
 *  - NEW insured "Mr Jones Testing" (does NOT exist on newprodqa2 — REST 0
 *    rows) created through the wizard's "Create New Client = Yes" branch;
 *  - FOUR coverages: EL + PPL + CAR under the PRODUCT card, Property Damage
 *    under the risk-location card; PI/Terrorism NOT added;
 *  - a SECOND coverage-less insurable "Test" (London);
 *  - per-coverage binders (Accelerant Oliva Construction 2024 ×3 + Allianz
 *    Contractors Combined 2026 for PD) via BindersPage strict mode;
 *  - ONE fee, ERN exempt, ends at "Quote Issued" (no bind, no policy).
 */

// ---------------------------------------------------------------------------
// Users / account / submission wizard
// ---------------------------------------------------------------------------

export const CC2_USERS = {
  uw3: 'oliva.cons.puw3@dualgroup.com.newprodqa2',
  uw5: 'oliva.cons.puw5@dualgroup.com.newprodqa2',
};

export const CC2_ACCOUNT = {
  name: 'HOWDEN INSURANCE BROKERS LIMITED',
  // Doc (SIT) wants "James Allen" — REST-verified 22/07/2026: the ONLY James
  // contact on newprodqa2's HOWDEN account is "James Chambers"
  // (003Pv00000aSux6IAC). Deviation recorded in cc2_exploration_report.md.
  intermediaryContact: 'James Chambers',
};

/** Doc address for the new insured (7 Chelwood Close…). */
export const CC2_INSURED_ADDRESS = {
  search: '7 Chelwood Close, Coulsdon, Surrey, CR5 3EY, United Kingdom',
  addressLine: '7 Chelwood Close',
  city: 'Coulsdon',
  countyState: 'Surrey',
  postcode: 'CR5 3EY',
  country: 'United Kingdom',
};

export const CC2_CLIENT_INFO = {
  // NEW name typed into the wizard. REST-verified absent on newprodqa2, so the
  // run exercises the create-new-client path. LIVE FINDING (22/07/2026): the
  // wizard's "Create New Client" radio = Yes converts "Insured Name" into a
  // plain text input (no typeahead) and reveals NO other extra required
  // fields on the Client Information step — the doc's "No" + typing a fresh
  // name would stall (typeahead offers no option), so Yes is the working path.
  insuredName: 'Mr Jones Testing',
  createNewClient: true,
  // Proven CONC fallback insured if the create-new path is blocked
  // (CC2_CLIENT=existing).
  fallbackInsuredName: 'PG Test Insured',
  industrySector: 'Construction',
  activityCode: 'Aerial & Satellite Erection',
  product: 'Contractors Combined',
  businessDescription: 'Test',
  yearBusinessEstablished: '2026',
  employeeSize: '90',
  clientTurnover: '900000',
  clientClassificationType: 'Consumer',
};

export const CC2_RISK_INFO = {
  // Doc image 6: plain "Insurance" (existing CONC suite used "Insurance
  // (XoL)"; both exist as options — CC2 is doc-exact).
  riskType: 'Insurance',
  intermediaryReference: 'test',
  insurerQuotePolicyReference: '', // doc leaves blank
};

/** Card-scoping text for addRenoCoverage — EL/PPL/CAR live under the
 *  "Contractors Combined" PRODUCT card (proven CONC lesson); PD lives under
 *  the "<insured> - United Kingdom" risk-location card. */
export const CC2_PRODUCT_CARD = 'Contractors Combined';

// ---------------------------------------------------------------------------
// Product Questions — the doc does NOT fill the questionnaire. LIVE FINDING
// (22/07/2026, verified end-to-end on quotes 0Q0Pu000006io0sKAA and
// 0Q0Pu000006iu33KAA): coverages CAN be added, premiums entered, binders
// selected, RBS approved, clauses/fee/ERN saved AND the quote reaches Status
// "Issued" WITHOUT ever opening the questionnaire — it is NOT enforced
// anywhere on this org. Kept here (CC2_FILL_FORM=1) for optional doc-plus
// coverage; values from the proven CONC suite.
// ---------------------------------------------------------------------------

export const CC2_PRODUCT_FORM: OmniForm = {
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
// Coverages — THREE under the product card (doc order): EL (1 step), PPL
// (2 steps), CAR (1 step — top half discovered live, see CAR notes).
// ---------------------------------------------------------------------------

export const CC2_COVERAGES: RenoCoverage[] = [
  // A) Employers Liability — single "Coverage Questions" step (LIVE-CAPTURED
  // 22/07/2026, run 8 screenshot): Territorial Limits RO "Worldwide"; the 4
  // wagerolls; Limit RO 10,000,000.00 / Limit Type RO "Any one occurrence";
  // then a "Trade Details" section (an "Add" link adds more rows) whose row
  // fields are LITERALLY labelled "*Trade Description", "*(Name of trade
  // description) wageroll" and "(Name of trade description) headcount".
  // The trade row needs bespoke handling (the generic engine mis-targets the
  // row's dropdown) — see CC2_EL_TRADE + the explore spec's fillElTradeRow.
  {
    addRowName: 'Employers Liability',
    form: {
      name: 'Employers Liability',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Drivers Supervisory Wageroll', kind: 'currency', value: '123' },
            { label: 'Drivers Supervisory Headcount', kind: 'number', value: '1234' },
            { label: 'Heat Wageroll', kind: 'currency', value: '12345' },
            { label: 'Woodworking/ Metalworking Wageroll', kind: 'currency', value: '2343' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // B) Public & Products Liability — 2 steps; cover required = "Public
  // Liability" (doc; CONC suite used "Public & Products Liability").
  {
    addRowName: 'Public & Products Liability',
    form: {
      name: 'Public & Products Liability',
      steps: [
        {
          title: 'Public & Products Liability',
          fields: [
            { label: 'Is public & products liability cover required', kind: 'picklist', value: 'Public Liability' },
            { label: 'Trade 1 Turnover', kind: 'currency', value: '10000' },
            { label: 'Turnover derived from heat work', kind: 'currency', value: '1234' },
            { label: 'Annual payments to bona fide sub contractors', kind: 'currency', value: '2000' },
            { label: 'Annual cost of materials', kind: 'currency', value: '1200' },
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
            { label: 'Heat Excess', kind: 'picklist', value: '250' },
            { label: 'Water Damage Excess', kind: 'picklist', value: '250' },
            { label: 'Underground Services Excess', kind: 'picklist', value: '250' },
            { label: 'All other third party property damage claims excess', kind: 'picklist', value: '250' },
            { label: 'Limit of liability required', kind: 'picklist', value: '1,000,000' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // C) Contractors All Risks — doc screenshot missed the TOP half. LIVE
  // DISCOVERY (22/07/2026, run 9 validation dump): the top of the form is
  //   Territorial Limits (RO) → "*Is contract works cover required" (radio)
  //   → "*Maximum Contract Value" → "Maximum contract period (months)".
  // The doc's cut-off "1,234.00 + blank field to its right" = Maximum
  // Contract Value 1234 / period blank (and Limit calc 1,357.00 = 1234
  // contract works + 123 own plant — confirms it).
  // ORG-REQUIRED fields the doc left BLANK (run 9 errors — must be filled):
  //   *Total value of employees tools, *Employees Tools Excess,
  //   *All other car claims excess.
  {
    addRowName: 'Contractors All Risks',
    form: {
      name: 'Contractors All Risks',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            // -- top half (discovered live) --
            { label: 'Is contract works cover required', kind: 'radio', value: 'Yes' },
            { label: 'Maximum Contract Value', kind: 'currency', value: '1234' },
            // "Maximum contract period (months)" left blank (unstarred; doc blank)
            // -- lower half (doc image 19) --
            { label: 'Is employees tools cover required', kind: 'radio', value: 'Yes' },
            // REQUIRED by org (doc blank) — sensible non-doc value:
            { label: 'Total value of employees tools', kind: 'currency', value: '1234' },
            { label: 'Maximum sum insured employees tools per employee', kind: 'currency', value: '1234' },
            // REQUIRED by org (doc blank):
            { label: 'Employees Tools Excess', kind: 'picklist', value: '250' },
            { label: 'Is own plant cover required', kind: 'radio', value: 'Yes' },
            { label: 'Total value of own plant', kind: 'currency', value: '123' },
            { label: 'Is DUAL DNA+ Required', kind: 'radio', value: 'Yes' },
            { label: 'Number of new DUAL DNA+ kits required', kind: 'picklist', value: '1' },
            { label: 'DNA+ Lifecycle', kind: 'picklist', value: '2' },
            { label: 'Is hired in plant cover required', kind: 'radio', value: 'No' },
            { label: 'Theft & malicious damage excess', kind: 'picklist', value: '250' },
            // REQUIRED by org (doc blank):
            { label: 'All other car claims excess', kind: 'picklist', value: '250' },
          ],
          action: 'Save',
        },
      ],
    },
  },
];

/** EL Trade Details row (labels are live-verified literals). */
export const CC2_EL_TRADE = {
  tradeDescription: 'Aerial & Satellite Erection',
  wageroll: '123',
  headcount: '', // doc leaves blank
};

// D) Property Damage — on the "<insured> - United Kingdom" risk-location card.
export const CC2_PD_COVERAGE: RenoCoverage = {
  addRowName: 'Property Damage',
  form: {
    name: 'Property Damage',
    steps: [
      {
        title: 'Coverage Questions',
        fields: [
          { label: 'What level of property cover is required', kind: 'picklist', value: 'Option 1' },
          { label: 'NACOSS approved alarm system', kind: 'radio', value: 'Yes' },
          { label: 'Property Excess', kind: 'picklist', value: '350' },
        ],
        action: 'Save',
      },
    ],
  },
};

/** Second, coverage-less insurable (doc §2.4) — its modal is single-step
 *  (Save; no "Care Specific Questions" step like the Care org). */
export const CC2_SECOND_LOCATION = {
  insurableName: 'Test',
  addressSearch: 'London, UK',
  addressLine: 'London',
  city: 'London',
  countyState: 'Greater London',
  postcode: 'ec3a2bj', // doc types it lowercase
  country: 'United Kingdom',
  latitude: '51.5072178',
  longitude: '-0.1275862',
};

// ---------------------------------------------------------------------------
// Premiums — Minimum & Deposit Yes; EL commission 0, others 20 (the doc's 200
// was rejected: "Number must be between 0 and 100"); CAR also gets 100%
// Annualized GP = 10. PD row carries the insured name as Insurable.
// ---------------------------------------------------------------------------

export const CC2_MINIMUM_DEPOSIT = 'Yes';

export const CC2_PREMIUMS: RenoPremiumEntry[] = [
  { coverage: 'Employers Liability', insurable: '', technical: '100', grossWritten: '200', annualized: '', commissionRate: '0' },
  { coverage: 'Public & Products Liability', insurable: '', technical: '100', grossWritten: '200', annualized: '', commissionRate: '20' },
  { coverage: 'Contractors All Risks', insurable: '', technical: '100', grossWritten: '200', annualized: '10', commissionRate: '20' },
  { coverage: 'Property Damage', insurable: 'Mr Jones', technical: '100', grossWritten: '200', annualized: '', commissionRate: '20' },
];

// ---------------------------------------------------------------------------
// Binders — strict per-coverage mode (BindersPage 3rd ctor arg). REST-verified
// live sections on newprodqa2: EL/PPL/CAR map via BOTH Accelerant Oliva
// Construction 2024 AND Accelerant C&C 2026 (sect Contractors Combined);
// Property Damage maps ONLY via Allianz Contractors Combined 2026 (sect
// Property Damage). Doc's 2023 binders don't exist here → 2024/2026 analogs.
// ---------------------------------------------------------------------------

export const CC2_BINDERS: BinderChoice[] = [
  { coverage: 'Employers Liability', name: 'Accelerant Oliva Construction 2024', section: 'Contractors Combined', nrToBinder: 'New Business' },
  { coverage: 'Public & Products Liability', name: 'Accelerant Oliva Construction 2024', section: 'Contractors Combined', nrToBinder: 'New Business' },
  { coverage: 'Contractors All Risks', name: 'Accelerant Oliva Construction 2024', section: 'Contractors Combined', nrToBinder: 'New Business' },
  { coverage: 'Property Damage', name: 'Allianz Contractors Combined 2026', section: 'Property Damage', nrToBinder: 'New Business' },
];

/** Default binder for BindersPage's 2nd ctor arg (unused in strict mode but
 *  required by the signature). */
export const CC2_BINDER_DEFAULT = CC2_BINDERS[0];

// ---------------------------------------------------------------------------
// Fee — ONE fee (doc §2.9; Type/Sub Type never captured in the doc). Org
// picklists (REST describe 22/07/2026): Type = DUAL Fee | Carrier Fee | Third
// Party Fee; Sub Type = DUAL DNA+ Fee | Lead Survey Engineering Fee(s) |
// Legal Fee | Sanctiekosten | Survey Fee | Other Fee | DUAL Policy/Admin Fee.
// Valid payable/administered combos: Insured/DUAL, DUAL/DUAL,
// DUAL/Intermediary (doc-captured validation).
// ---------------------------------------------------------------------------

export const CC2_FEE = {
  type: 'Third Party Fee',
  subType: 'Survey Fee',
  payableBy: 'Insured',
  administeredBy: 'DUAL',
  includedInGwp: 'Yes',
  charged: '100',
  description: 'test',
};

// LIVE FINDING (22/07/2026, run 11): because the CAR coverage sets "Is DUAL
// DNA+ Required = Yes" (doc-exact, image 19), marking the quote "Quote Issued"
// is HARD-BLOCKED with "A corresponding DNA+ fee must be added" until a DUAL
// DNA+ Fee also exists on the quote. The doc only screenshots one (Survey)
// fee, but that section used recycled SITP shots — on newprodqa2 the DNA+ fee
// is mandatory. Sub Type "DUAL DNA+ Fee" needs the conditional "Fee Cost"
// field (Fee__c.DNA_Payment_Amount__c = 50) or the OmniScript save silently
// fails (proven pattern from ccData/caraData).
export const CC2_DNA_FEE = {
  type: 'Third Party Fee',
  subType: 'DUAL DNA+ Fee',
  dnaPaymentAmount: '50',
  payableBy: 'Insured',
  administeredBy: 'DUAL',
  includedInGwp: 'Yes',
  charged: '100',
  description: 'test',
};

// ---------------------------------------------------------------------------
// UAL config for QuoteStatusPage (UW5 login should self-clear UAL).
// ---------------------------------------------------------------------------

export const CC2_UAL = {
  approverName: 'T-0016-SIT2-SCC-CON-UW5 Auto-Provar',
  approverSearchTerms: ['t-0016', 'T-0016-SIT2-SCC-CON-UW5', 'T-0016'],
  errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
};

/** Assertion anchors. */
export const CC2_EXPECTATIONS = {
  submissionRiskIdPattern: /DOU\/\d+\/CONC\/\d+/,
  quoteRiskIdPattern: /DOU\/\d+\/CONC\/\d+\/\d+/,
  dualShareGwp: 'GBP 800.00', // 4 × 200 before the fee
};
