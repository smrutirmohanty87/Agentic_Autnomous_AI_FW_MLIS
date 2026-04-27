const fs = require('fs');
const path = require('path');

const rows = [
  ['Test Case ID', 'Suite', 'Category', 'Module / Feature', 'Test Case Title', 'Portal(s)', 'Tags'],

  // ── SANITY ──────────────────────────────────────────────────────────────────
  ['TC_SAN_001', 'Sanity', 'Policy Creation', 'Commercial – England & Wales', 'Create Commercial England & Wales policy (multiple products)', 'MLIS Broker Portal', '@sanity'],
  ['TC_SAN_002', 'Sanity', 'Policy Creation', 'Commercial – England & Wales', 'Create Commercial England & Wales policy (multiple products) via referral', 'MLIS Broker Portal', '@sanity'],
  ['TC_SAN_003', 'Sanity', 'Policy Creation', 'Commercial – England & Wales', 'Create Commercial England & Wales policy (single product)', 'MLIS Broker Portal', '@sanity'],
  ['TC_SAN_004', 'Sanity', 'Policy Creation', 'Commercial – England & Wales', 'Create Commercial England & Wales policy (single product) via referral', 'MLIS Broker Portal', '@sanity'],
  ['TC_SAN_005', 'Sanity', 'Quote Journey', 'Commercial – England & Wales', 'Complete full commercial England & Wales quote journey end-to-end', 'MLIS Broker Portal + Salesforce', '@sanity'],
  ['TC_SAN_006', 'Sanity', 'Quote Journey', 'Residential – England & Wales', 'Complete full residential England & Wales quote journey end-to-end', 'MLIS Broker Portal + Salesforce', '@sanity'],
  ['TC_SAN_007', 'Sanity', 'Quote Journey', 'Residential – England & Wales', 'Complete full residential England & Wales quote journey with multiple products', 'MLIS Broker Portal + Salesforce', '@sanity'],
  ['TC_SAN_008', 'Sanity', 'Cancellation', 'Policy Cancellation', 'Cancel policy from inception (full premium return)', 'MLIS Broker Portal + Salesforce', '@sanity'],
  ['TC_SAN_009', 'Sanity', 'Quick Quote', 'Residential Quick Quote – England & Wales', 'Residential quick quote E&W (single product) + email quotes + close dialog', 'MLIS Portal', '@sanity'],
  ['TC_SAN_010', 'Sanity', 'Quick Quote', 'Residential Quick Quote – England & Wales', 'Residential quick quote E&W (multiple products) + email quotes + close dialog', 'MLIS Portal', '@sanity'],
  ['TC_SAN_011', 'Sanity', 'Quick Quote', 'Residential Quick Quote – Scotland', 'Residential quick quote Scotland (single product) + enter manually + email quotes + close dialog', 'MLIS Portal', '@sanity'],
  ['TC_SAN_012', 'Sanity', 'Quick Quote', 'Residential Quick Quote – Scotland', 'Residential quick quote Scotland (multiple products) + enter manually + email quotes + close dialog (slow)', 'MLIS Portal', '@sanity'],

  // ── REGRESSION ──────────────────────────────────────────────────────────────
  ['TC_REG_001', 'Regression', 'Policy Creation', 'Commercial – Northern Ireland', 'Create Commercial Northern Ireland policy (multiple products)', 'MLIS Broker Portal', '@regression'],
  ['TC_REG_002', 'Regression', 'Policy Creation', 'Commercial – Northern Ireland', 'Create Commercial Northern Ireland policy (single product)', 'MLIS Broker Portal', '@regression'],
  ['TC_REG_003', 'Regression', 'Policy Creation', 'Commercial – Scotland', 'Create Commercial Scotland policy (multiple products)', 'MLIS Broker Portal', '@regression'],
  ['TC_REG_004', 'Regression', 'Policy Creation', 'Commercial – Scotland', 'Create Commercial Scotland policy (single product)', 'MLIS Broker Portal', '@regression'],
  ['TC_REG_005', 'Regression', 'Policy Creation', 'Residential – England & Wales', 'Create Residential England & Wales policy (multiple products)', 'MLIS Broker Portal', '@regression'],
  ['TC_REG_006', 'Regression', 'Policy Creation', 'Residential – England & Wales', 'Create Residential England & Wales policy (single product)', 'MLIS Broker Portal', '@regression'],
  ['TC_REG_007', 'Regression', 'Policy Creation', 'Residential – Northern Ireland', 'Create Residential Northern Ireland policy (multiple products)', 'MLIS Broker Portal', '@regression'],
  ['TC_REG_008', 'Regression', 'Policy Creation', 'Residential – Northern Ireland', 'Create Residential Northern Ireland policy (single product)', 'MLIS Broker Portal', '@regression'],
  ['TC_REG_009', 'Regression', 'Policy Creation', 'Residential – Scotland', 'Create Residential Scotland policy (multiple products)', 'MLIS Broker Portal', '@regression'],
  ['TC_REG_010', 'Regression', 'Policy Creation', 'Residential – Scotland', 'Create Residential Scotland policy (single product)', 'MLIS Broker Portal', '@regression'],
  ['TC_REG_011', 'Regression', 'Notes & Attachments', 'Salesforce – England & Wales', 'Open Notes & Attachments in Salesforce (England & Wales policy)', 'MLIS Broker Portal + Salesforce', '@regression'],
  ['TC_REG_012', 'Regression', 'Notes & Attachments', 'Salesforce – Commercial EW', 'Open Notes & Attachments in Salesforce (Commercial EW policy)', 'MLIS Broker Portal + Salesforce', '@regression'],
  ['TC_REG_013', 'Regression', 'Notes & Attachments', 'Salesforce – Commercial Scotland', 'Open Notes & Attachments in Salesforce (Commercial Scotland policy)', 'MLIS Broker Portal + Salesforce', '@regression'],
  ['TC_REG_014', 'Regression', 'MTA', 'Mid-Term Adjustment', 'Create MTA (Mid-Term Adjustment) on a live policy', 'MLIS Broker Portal + Salesforce', '@regression'],
  ['TC_REG_015', 'Regression', 'Cancellation', 'Cancel and Reissue', 'Cancel and reissue a live policy', 'MLIS Broker Portal + Salesforce', '@regression'],
  ['TC_REG_016', 'Regression', 'MTA + Cancellation', 'Mid-Term Adjustment', 'Create MTA (Mid-Term Adjustment) then cancel the policy', 'MLIS Broker Portal + Salesforce', '@regression'],
  ['TC_REG_017', 'Regression', 'MTA + Cancel & Reissue', 'Mid-Term Adjustment', 'Create MTA (Mid-Term Adjustment) then cancel and reissue the policy', 'MLIS Broker Portal + Salesforce', '@regression'],
  ['TC_REG_018', 'Regression', 'MTA + Cancel & Reissue + Cancellation', 'Mid-Term Adjustment', 'Create MTA then cancel and reissue then cancel the policy', 'MLIS Broker Portal + Salesforce', '@regression'],

  // ── BDX ─────────────────────────────────────────────────────────────────────
  ['TC_BDX_001', 'BDX', 'Cancellation BDX', 'From Inception – INTRO', 'Cancel policy from inception (full premium return) – verify BDX cancellation lines', 'MLIS Broker Portal + Salesforce BDX', '@sanity'],
  ['TC_BDX_002', 'BDX', 'BDX Lines', 'Intermediary Commission – INTER_COMM', 'Verify BDX lines generated (Intermediary Commission)', 'MLIS Broker Portal + Salesforce BDX', '@sanity'],
  ['TC_BDX_003', 'BDX', 'BDX Lines', 'Broker Deal Commission – BDE_COMM', 'Verify BDX lines generated (Broker Deal Commission)', 'MLIS Broker Portal + Salesforce BDX', '@sanity'],
  ['TC_BDX_004', 'BDX', 'BDX Lines', 'No Commission – NO_COMM', 'Verify BDX lines generated (No Commission)', 'MLIS Broker Portal + Salesforce BDX', '@sanity'],
  ['TC_BDX_005', 'BDX', 'NB-MTA', 'Mid-Term Adjustment – NB_MTA', 'Create NB-MTA (Mid-Term Adjustment) on a live policy (MTA Premium = 75)', 'MLIS Broker Portal + Salesforce', '@sanity'],
];

const escape = (cell) => '"' + String(cell).replace(/"/g, '""') + '"';
const csvLines = rows.map(r => r.map(escape).join(','));

// UTF-8 BOM so Excel auto-detects encoding
const output = '\uFEFF' + csvLines.join('\r\n');
const outPath = path.resolve(__dirname, '..', 'Test_Cases_Documentation.csv');
fs.writeFileSync(outPath, output, 'utf8');
console.log('Generated: ' + outPath);
