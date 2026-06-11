#!/usr/bin/env node
/**
 * scripts/run-fresh-residential-3p-demo.js
 *
 * Orchestrates the fresh 3-product residential workflow with live dashboard display.
 *
 * Usage:
 *   npm run demo:fresh-res-3p
 */

const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function log(title, msg) {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  console.log(`[${time}] ${title}: ${msg}`);
}

function startDashboard() {
  return new Promise((resolve) => {
    log('DASHBOARD', 'Starting dashboard UI...');
    const dashboardDir = path.join(ROOT, 'dashboard-ui');
    const dashboardProc = spawn('npm', ['run', 'dev'], {
      cwd: dashboardDir,
      stdio: 'inherit',
      shell: true,
    });

    setTimeout(() => {
      log('DASHBOARD', 'Dashboard started on http://localhost:5173/');
      log('DASHBOARD', 'Open this URL in your browser to watch live transitions');
      resolve(dashboardProc);
    }, 5000);

    dashboardProc.on('error', (err) => {
      log('DASHBOARD', `Failed to start: ${err.message}`);
    });
  });
}

function runOrchestrator() {
  return new Promise((resolve) => {
    log('ORCHESTRATOR', 'Starting fresh residential 3-product workflow...');

    const orchestratorProc = spawn(
      'npx',
      ['ts-node', 'orchestrator/live-demo-residential-3p-fresh.ts'],
      {
        cwd: ROOT,
        stdio: 'inherit',
        shell: true,
      }
    );

    orchestratorProc.on('close', (code) => {
      if (code === 0) {
        log('ORCHESTRATOR', 'Workflow completed successfully');
        resolve(code);
      } else {
        log('ORCHESTRATOR', `Workflow completed with code ${code}`);
        resolve(code);
      }
    });

    orchestratorProc.on('error', (err) => {
      log('ORCHESTRATOR', `Failed to start: ${err.message}`);
      resolve(1);
    });
  });
}

async function main() {
  console.log('\n==============================================================');
  console.log('  FRESH 3-PRODUCT RESIDENTIAL WORKFLOW');
  console.log('  with Live Dashboard Integration');
  console.log('==============================================================\n');

  try {
    const dashboardProc = await startDashboard();
    await runOrchestrator();

    console.log('\n==============================================================');
    console.log('  WORKFLOW COMPLETE');
    console.log('  Dashboard displaying results at http://localhost:5173/');
    console.log('  Press Ctrl+C to exit');
    console.log('==============================================================\n');

    dashboardProc.on('close', () => {
      log('MAIN', 'Dashboard closed');
      process.exit(0);
    });
  } catch (err) {
    log('MAIN', `Error: ${err.message}`);
    process.exit(1);
  }
}

main();
