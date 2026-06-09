const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(ROOT, 'reports');
const BUGS_DIR = path.join(REPORTS_DIR, 'bugs');
const TEST_RESULTS_DIR = path.join(ROOT, 'test-results');

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
ensureDir(REPORTS_DIR);
ensureDir(BUGS_DIR);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function runPlaywright(args = ['test', '--reporter=json']) {
  console.log('Running: npx playwright', args.join(' '));
  const res = spawnSync('npx', ['playwright', ...args], { encoding: 'utf8', cwd: ROOT, maxBuffer: 10 * 1024 * 1024 });
  return res;
}

function saveFile(filePath, content) {
  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
}

function latestTestResultsDir() {
  if (!fs.existsSync(TEST_RESULTS_DIR)) return null;
  const entries = fs.readdirSync(TEST_RESULTS_DIR).map(name => {
    const full = path.join(TEST_RESULTS_DIR, name);
    return { name, full, mtime: fs.statSync(full).mtimeMs };
  }).sort((a, b) => b.mtime - a.mtime);
  return entries.length ? entries[0].full : null;
}

function copyEvidence(srcDir, destDir) {
  ensureDir(destDir);
  if (!fs.existsSync(srcDir)) return;
  const files = fs.readdirSync(srcDir);
  for (const f of files) {
    const full = path.join(srcDir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      copyEvidence(full, path.join(destDir, f));
    } else if (/\.(png|jpg|jpeg|webm|zip|log|txt)$/.test(f) || f === 'trace.zip') {
      try { fs.copyFileSync(full, path.join(destDir, f)); } catch (e) { /* continue */ }
    }
  }
}

function extractFailingTestTitlesFromStdout(stdout) {
  // best-effort: look for lines like "1) › tests/example.spec.ts:... › test title"
  const titles = new Set();
  const lines = String(stdout).split(/\r?\n/);
  for (const l of lines) {
    const m = l.match(/\d+\) .* › .* › (.*)$/);
    if (m) titles.add(m[1].trim());
  }
  // fallback: look for '✖' lines containing test titles
  for (const l of lines) {
    const m = l.match(/✖ .* › (.*)$/);
    if (m) titles.add(m[1].trim());
  }
  return Array.from(titles);
}

function writeBugReport(runStdout, runStderr, evidenceDir, failingTitles) {
  const id = `BUG-${timestamp()}`;
  const bugDir = path.join(BUGS_DIR, id);
  ensureDir(bugDir);
  const evidenceOut = path.join(bugDir, 'evidence');
  ensureDir(evidenceOut);

  saveFile(path.join(bugDir, 'playwright.stdout.txt'), runStdout || '');
  saveFile(path.join(bugDir, 'playwright.stderr.txt'), runStderr || '');

  if (evidenceDir) copyEvidence(evidenceDir, evidenceOut);

  const reportLines = [];
  reportLines.push(`# ${id}`);
  reportLines.push('');
  reportLines.push('## Summary');
  reportLines.push('');
  reportLines.push(`- Timestamp: ${new Date().toISOString()}`);
  reportLines.push(`- Failing tests (best-effort extraction): ${failingTitles.length ? failingTitles.join('; ') : 'Unknown'}`);
  reportLines.push('');
  reportLines.push('## Stdout snippet');
  reportLines.push('');
  reportLines.push('```');
  reportLines.push((runStdout || '').split(/\r?\n/).slice(0, 200).join('\n'));
  reportLines.push('```');
  reportLines.push('');
  reportLines.push('## Stderr snippet');
  reportLines.push('');
  reportLines.push('```');
  reportLines.push((runStderr || '').split(/\r?\n/).slice(0, 200).join('\n'));
  reportLines.push('```');
  reportLines.push('');
  reportLines.push('## Evidence');
  reportLines.push('');
  reportLines.push('- Screenshots, traces, videos and logs are in the `evidence/` folder.');
  reportLines.push('');
  reportLines.push('## Suggested next steps');
  reportLines.push('');
  reportLines.push('- Review failure stack traces and evidence in `evidence/`');
  reportLines.push('- If a locator is flaky, consider using `getByRole`, stable attributes, or adding `:visible` qualifiers');
  reportLines.push('- Re-run the failing tests locally using `npx playwright test -g "<test name>"`');

  saveFile(path.join(bugDir, 'REPORT.md'), reportLines.join('\n'));
  console.log('Wrote bug report to', bugDir);
  return bugDir;
}

function rerunFailedTests(titles, maxRetries = 2) {
  const results = {};
  for (const t of titles) {
    let passed = false;
    for (let i = 0; i <= maxRetries; i++) {
      console.log(`Re-running test: ${t} (attempt ${i + 1}/${maxRetries + 1})`);
      const res = runPlaywright(['test', '-g', t, '--reporter=list']);
      if (res.status === 0) { passed = true; break; }
    }
    results[t] = passed;
  }
  return results;
}

// Start
(function main() {
  const res = runPlaywright();
  const ts = timestamp();
  const outJsonPath = path.join(REPORTS_DIR, `playwright-results-${ts}.json`);
  try { fs.writeFileSync(outJsonPath, res.stdout || ''); } catch (e) {}
  const outErrPath = path.join(REPORTS_DIR, `playwright-stderr-${ts}.txt`);
  try { fs.writeFileSync(outErrPath, res.stderr || ''); } catch (e) {}

  if (res.status === 0) {
    console.log('All tests passed. Exiting.');
    // write a simple summary
    const summary = `All tests passed at ${new Date().toISOString()}\n`;
    saveFile(path.join(REPORTS_DIR, `summary-${ts}.txt`), summary);
    process.exit(0);
  }

  console.log('Some tests failed; collecting evidence.');

  const latest = latestTestResultsDir();
  const failingTitles = extractFailingTestTitlesFromStdout(res.stdout || '');
  const bugDir = writeBugReport(res.stdout, res.stderr, latest, failingTitles);

  // Re-run failing tests individually
  if (failingTitles.length) {
    const rerunResults = rerunFailedTests(failingTitles, 1);
    const rerunReport = path.join(bugDir, 're-run-results.json');
    fs.writeFileSync(rerunReport, JSON.stringify(rerunResults, null, 2), 'utf8');
    console.log('Re-run results written to', rerunReport);
  }

  console.log('Autonomous runner finished: manual review may be required for some failures.');
  process.exit(res.status || 1);
})();
