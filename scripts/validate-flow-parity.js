#!/usr/bin/env node
/*
 * Ensures fresh demo orchestrators stay aligned with generated/manual test behavior.
 *
 * Guardrails enforced for files matching orchestrator/live-demo-*-fresh.ts:
 * 1) No intentional forced-failure hooks (recoveryGate / "Intentional live-demo failure")
 * 2) No redundant page.goto() in non-login steps (common source of flow/manual mismatch)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ORCH_DIR = path.join(ROOT, 'orchestrator');

function listFreshDemoFiles() {
  if (!fs.existsSync(ORCH_DIR)) return [];
  return fs
    .readdirSync(ORCH_DIR)
    .filter((f) => /^live-demo-.*-fresh\.ts$/i.test(f))
    .map((f) => path.join(ORCH_DIR, f));
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function findViolations(filePath, text) {
  const violations = [];

  if (/Intentional live-demo failure/i.test(text)) {
    violations.push('Contains forced failure marker: "Intentional live-demo failure"');
  }

  if (/\brecoveryGate\b/.test(text)) {
    violations.push('Contains recoveryGate pattern (forced retry hook)');
  }

  const stepBlocks = text.match(/description:\s*'[^']+'[\s\S]*?action:\s*async\s*\(page\)\s*=>\s*\{[\s\S]*?\n\s*\},/g) || [];
  stepBlocks.forEach((block) => {
    const isLoginStep = /description:\s*'[^']*login[^']*'/i.test(block);
    const hasGoto = /\.goto\s*\(/.test(block);
    if (!isLoginStep && hasGoto) {
      violations.push('Found page.goto() in a non-login step block (can cause flow/manual mismatch)');
    }
  });

  return violations;
}

function main() {
  const files = listFreshDemoFiles();
  if (files.length === 0) {
    console.log('[validate:flows] No fresh demo orchestrators found.');
    process.exit(0);
  }

  const findings = [];

  for (const file of files) {
    const content = read(file);
    const violations = findViolations(file, content);
    if (violations.length > 0) {
      findings.push({ file, violations });
    }
  }

  if (findings.length === 0) {
    console.log(`[validate:flows] PASS: ${files.length} fresh demo orchestrator file(s) validated.`);
    process.exit(0);
  }

  console.error('[validate:flows] FAIL: Flow parity violations detected.');
  for (const finding of findings) {
    console.error(`\n  File: ${path.relative(ROOT, finding.file)}`);
    for (const v of finding.violations) {
      console.error(`   - ${v}`);
    }
  }

  process.exit(1);
}

main();
