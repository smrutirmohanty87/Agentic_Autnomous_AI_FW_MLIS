import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

declare const __dirname: string;
declare const process: { env: Record<string, string | undefined> };

const EXCEL_PATH = path.resolve(__dirname, '../../reports/policy-tracker.xlsx');
const loggedKeys = new Set<string>();

const HEADERS = [
  { header: 'Run #',        key: 'run',         width: 8  },
  { header: 'Policy Number', key: 'policyNumber', width: 26 },
  { header: 'Test Name',    key: 'testName',     width: 60 },
  { header: 'Portal Type',  key: 'portalType',   width: 28 },
  { header: 'Environment',  key: 'environment',  width: 14 },
  { header: 'Date / Time',  key: 'dateTime',     width: 22 },
];

function getEnvironment(): string {
  return (process.env.TEST_ENV ?? 'SIT2').trim().toUpperCase();
}

/**
 * Appends a policy-number entry to `reports/policy-tracker.xlsx`.
 * Creates the file (with styled headers) the first time it is called.
 *
 * @param policyNumber  The policy reference extracted from the broker portal.
 * @param testName      The Playwright test title (pass `test.info().title`).
 * @param portalType    Human-readable portal/product name, e.g. "EW Commercial".
 */
export async function logPolicyNumber(
  policyNumber: string,
  testName: string,
  portalType: string,
): Promise<void> {
  const environment = getEnvironment();
  const dedupeKey = `${environment}|${testName}|${policyNumber}`;
  if (loggedKeys.has(dedupeKey)) {
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const sheetName = 'Policy Numbers';

  // Ensure the reports directory exists.
  const reportsDir = path.dirname(EXCEL_PATH);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Load existing workbook or create a fresh one.
  if (fs.existsSync(EXCEL_PATH)) {
    await workbook.xlsx.readFile(EXCEL_PATH);
  }

  let sheet = workbook.getWorksheet(sheetName);

  if (!sheet) {
    sheet = workbook.addWorksheet(sheetName);

    // Style header row.
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F3864' }, // dark navy
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top:    { style: 'thin' },
        left:   { style: 'thin' },
        bottom: { style: 'thin' },
        right:  { style: 'thin' },
      };
    });
    headerRow.height = 22;
  }

  // Reapply column definitions on every run so object-based row writes remain stable
  // even when the workbook is loaded from disk (column keys are not persisted by ExcelJS).
  sheet.columns = HEADERS;

  // Determine the next run number.
  const lastRow = sheet.lastRow;
  const prevRun = lastRow && lastRow.number > 1
    ? (Number(lastRow.getCell(1).value) || 0)
    : 0;
  const nextRun = prevRun + 1;

  // Append data row.
  const now = new Date();
  const dateTimeStr = now.toLocaleString('en-GB', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dataRow = sheet.addRow({
    run:          nextRun,
    policyNumber: policyNumber,
    testName:     testName,
    portalType:   portalType,
    environment:  environment,
    dateTime:     dateTimeStr,
  });

  // Alternate row shading for readability.
  const isEven = nextRun % 2 === 0;
  dataRow.eachCell((cell) => {
    cell.fill = {
      type:    'pattern',
      pattern: 'solid',
      fgColor: { argb: isEven ? 'FFD9E1F2' : 'FFFFFFFF' },
    };
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FFBFBFBF' } },
      left:   { style: 'thin', color: { argb: 'FFBFBFBF' } },
      bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      right:  { style: 'thin', color: { argb: 'FFBFBFBF' } },
    };
    cell.alignment = { vertical: 'middle' };
  });
  // Centre-align run number.
  dataRow.getCell('run').alignment = { vertical: 'middle', horizontal: 'center' };

  // Freeze header row.
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  await workbook.xlsx.writeFile(EXCEL_PATH);
  loggedKeys.add(dedupeKey);

  console.log(
    `[PolicyTracker] Run #${nextRun} | ${policyNumber} | ${environment} | ${dateTimeStr}`,
  );
}
