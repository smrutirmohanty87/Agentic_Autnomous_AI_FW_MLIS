#!/usr/bin/env node
/**
 * scripts/run-fresh-commercial-3p-demo.js
 *
 * Orchestrates the fresh 3-product commercial workflow with live dashboard display
 *
 * Usage:
 *   npm run demo:fresh-3p
 *   or
 *   node scripts/run-fresh-commercial-3p-demo.js
 *
 * What it does:
 *   1. Starts the dashboard UI on http://localhost:5173/
 *   2. Runs the fresh commercial 3-product orchestrator
 *   3. Dashboard shows live transitions in real-time
 *   4. Automatically refetches data when workflow completes
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function log(title, msg) {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  console.log(`[${time}] ${title}: ${msg}`);
}

function startDashboard() {
  return new Promise((resolve) => {
    log('DASHBOARD', 'Starting dashboard UI...');
    const dashboardProc = spawn('npm', ['run', 'dev', '--workspace=dashboard-ui'], {
      cwd: ROOT,
      stdio: 'inherit',
    });

    // Give dashboard 3 seconds to start
    setTimeout(() => {
      log('DASHBOARD', '✅ Dashboard started on http://localhost:5173/');
      log('DASHBOARD', 'Open this URL in your browser to watch live transitions');
      resolve(dashboardProc);
    }, 3000);

    dashboardProc.on('error', (err) => {
      log('DASHBOARD', `❌ Failed to start: ${err.message}`);
    });
  });
}

function runOrchestrator() {
  return new Promise((resolve, reject) => {
    log('ORCHESTRATOR', 'Starting fresh commercial 3-product workflow...\n');
    
    const orchestratorProc = spawn(
      'npx',
      ['ts-node', 'orchestrator/live-demo-commercial-3p-fresh.ts'],
      {
        cwd: ROOT,
        stdio: 'inherit',
      }
    );

    orchestratorProc.on('close', (code) => {
      if (code === 0) {
        log('ORCHESTRATOR', '✅ Workflow completed successfully');
        resolve(code);
      } else {
        log('ORCHESTRATOR', `❌ Workflow failed with code ${code}`);
        reject(new Error(`Orchestrator exited with code ${code}`));
      }
    });

    orchestratorProc.on('error', (err) => {
      log('ORCHESTRATOR', `❌ Failed to start: ${err.message}`);
      reject(err);
    });
  });
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  FRESH 3-PRODUCT COMMERCIAL WORKFLOW                        ║');
  console.log('║  with Live Dashboard Integration                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Start dashboard in background
    const dashboardProc = await startDashboard();

    // Run orchestrator
    await runOrchestrator();

    // Keep dashboard running
    log('MAIN', 'Orchestrator complete. Dashboard still running for inspection.');
    log('MAIN', 'Press Ctrl+C to exit.');

    // Dashboard process will keep running until user exits
    dashboardProc.on('close', () => {
      log('MAIN', 'Dashboard closed');
      process.exit(0);
    });
  } catch (err) {
    log('MAIN', `❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
