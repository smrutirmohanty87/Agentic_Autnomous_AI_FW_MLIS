import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Salesforce Lightning is slow and stateful: single worker, no parallelism,
 * generous timeouts. The full NB-policy journey is one long E2E test.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30 * 60 * 1000,
  expect: { timeout: 45_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.SF_BASE_URL ?? 'https://dualgroup--sitp.sandbox.my.salesforce.com',
    actionTimeout: 45_000,
    navigationTimeout: 90_000,
    viewport: { width: 1920, height: 1080 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});
