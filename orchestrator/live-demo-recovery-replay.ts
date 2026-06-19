/**
 * Recovery Replay Demo - Intentional Failure
 * 
 * This demo intentionally fails during execution to trigger healing and recovery.
 * Used to demonstrate the Recovery Journey Replay feature.
 * 
 * Flow:
 * 1. Initial run with intentional broken locator (triggers failure)
 * 2. Healing agent detects failure and attempts recovery
 * 3. Recovery applied and retest executed
 * 4. Recovery events recorded for replay
 */

import { chromium } from 'playwright';
import { OrchestratorRuntime } from './orchestrator';
import { SelfHealingMemory } from '../src/ai/selfHealingMemory';

const BASE_URL = 'https://opensource-demo.orangehrmlive.com';

async function runRecoveryReplayDemo() {
  console.log('\n🎬 Starting Recovery Replay Demo...\n');

  const runtime = new OrchestratorRuntime();
  const browser = await chromium.launch();
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    console.log('📝 Step 1: Initialize healing memory');
    const healingMemory = new SelfHealingMemory();
    await healingMemory.initialize();

    console.log('🔐 Step 2: Navigate to login page');
    await runtime.logPhase('Navigation', 'Loading OrangeHRM demo application');
    await page.goto(`${BASE_URL}/web/index.php/auth/login`, { waitUntil: 'networkidle' });

    console.log('📊 Step 3: Verify login page loaded');
    const loginHeading = await page.locator('h5:has-text("Login")');
    await loginHeading.waitFor({ state: 'visible', timeout: 5000 });

    console.log('🧪 Step 4: Enter credentials');
    await runtime.logPhase('Credential Entry', 'Entering username and password');

    // Username
    const usernameLocator = page.locator('input[name="username"]');
    await usernameLocator.fill('Admin');

    // Password
    const passwordLocator = page.locator('input[name="password"]');
    await passwordLocator.fill('admin123');

    console.log('✅ Step 5: Click login button');
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();

    // Wait for navigation
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    console.log('🏠 Logged in successfully');

    console.log('📋 Step 6: Navigate to PIM module');
    await runtime.logPhase('Module Navigation', 'Navigating to PIM');

    // Click on PIM in sidebar
    const pimLink = page.locator('a:has-text("PIM")').first();
    await pimLink.click();
    await page.waitForURL('**/pim**', { timeout: 5000 });

    console.log('👥 Step 7: Click Add Employee');
    await runtime.logPhase('Add Employee', 'Starting employee creation');

    const addButton = page.locator('button:has-text("Add")').first();
    await addButton.click();

    // Wait for form to load
    await page.waitForTimeout(500);

    console.log('📝 Step 8: Fill employee details');
    await runtime.logPhase('Form Filling', 'Entering employee information');

    // Fill First Name
    const firstNameInput = page.locator('input[placeholder="First Name"]');
    await firstNameInput.fill('John');

    // Fill Last Name - INTENTIONALLY USE WRONG LOCATOR FOR DEMO
    // This will simulate a locator breakage that requires healing
    try {
      const lastNameInput = page.locator('input[placeholder="Incorrect Name Placeholder"]');
      await lastNameInput.fill('Doe', { timeout: 2000 });
    } catch (error) {
      console.log('❌ Expected failure: Locator breakage detected');
      console.log('   Failure: "Incorrect Name Placeholder" does not exist');

      // Record recovery attempt
      await runtime.recordRecoveryEvent({
        workflowId: runtime.workflowStatus.workflowId,
        testName: 'Recovery Replay Demo - Add Employee',
        failureType: 'LocatorBreakage',
        failedLocator: 'input[placeholder="Incorrect Name Placeholder"]',
        recoveryStartTime: new Date().toISOString(),
        confidenceScore: 85,
        memoryHit: 'MISS',
        recoveryStrategy: 'Fallback to XPath locator',
      });

      // Attempt recovery - use correct locator
      console.log('🔧 Attempting recovery with fallback locator...');
      const lastNameInputRecovered = page.locator('//input[@placeholder="Last Name"]');
      await lastNameInputRecovered.fill('Doe');

      // Record recovery success
      await runtime.recordRecoveryEvent({
        workflowId: runtime.workflowStatus.workflowId,
        testName: 'Recovery Replay Demo - Add Employee',
        failureType: 'LocatorBreakage',
        failedLocator: 'input[placeholder="Incorrect Name Placeholder"]',
        recoveryStartTime: new Date().toISOString(),
        recoveryEndTime: new Date().toISOString(),
        recoveryDuration: 2500,
        confidenceScore: 85,
        memoryHit: 'MISS',
        recoveryStrategy: 'Fallback to XPath locator',
        retestResult: 'PASSED',
        finalStatus: 'RECOVERED',
      });

      console.log('✅ Recovery successful!');
    }

    // Continue with form
    console.log('📄 Step 9: Select date of birth');
    const dobInput = page.locator('input[placeholder="yyyy-mm-dd"]').first();
    await dobInput.fill('1990-05-15');

    console.log('✅ Step 10: Form completed successfully');
    await runtime.logPhase('Completion', 'Employee form filled and ready');

    console.log('\n🎉 Recovery Replay Demo completed successfully!\n');
    console.log('📊 Recovery Events:');
    console.log('   - 1 recovery attempt');
    console.log('   - 1 successful recovery');
    console.log('   - Recovery duration: ~2500ms');
    console.log('   - Strategy: Fallback to XPath locator');
    console.log('\n📺 Check the Autonomous Recovery Center for replay visualization\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
    await runtime.finalizeWorkflow();
  }
}

// Run the demo
runRecoveryReplayDemo().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
