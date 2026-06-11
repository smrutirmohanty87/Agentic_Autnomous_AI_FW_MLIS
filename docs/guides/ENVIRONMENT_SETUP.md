# Environment Configuration Guide

This guide explains how to properly configure the test environment for the Playwright QA automation framework.

## Quick Start

### 1. Copy Environment Template
```bash
cp .env.example .env
```

### 2. Configure Credentials
Edit `.env` and replace placeholder values with your actual credentials:

```env
# Default (UAT2) environment
MLIS_PORTAL_URL=https://dualgroup--uat2.sandbox.my.site.com/mlisportal/
SALESFORCE_LIGHTNING_URL=https://dualgroup--uat2.sandbox.my.salesforce.com/
BROKER_USERNAME=your-actual-username@example.com
BROKER_PASSWORD=your-actual-password
SALESFORCE_USERNAME=your-actual-sf-username@example.com
SALESFORCE_PASSWORD=your-actual-sf-password
```

### 3. Run Tests
```bash
# Default environment (UAT2)
npm test

# Specific sanity tests
npm run test:sanity

# Regression tests
npm run test:regression

# Debug mode
npm run test:debug
```

## Environment Switching

### Available Environments
- **UAT2** (default) - Pre-configured in the `.env` file
- **SIT2** - Secondary staging environment

### Switch Environments

```bash
# Run tests in UAT2 (default)
npm run test:uat2

# Run tests in SIT2
npm run test:sit2

# Or use TEST_ENV variable
TEST_ENV=SIT2 npx playwright test
TEST_ENV=UAT2 npx playwright test
```

### Variable Naming Convention
- **UAT2** (default): Uses unprefixed variables
  - `MLIS_PORTAL_URL`
  - `SALESFORCE_LIGHTNING_URL`
  - `BROKER_USERNAME`
  - etc.

- **Other environments**: Use `{ENV}_` prefix
  - `SIT2_MLIS_PORTAL_URL`
  - `SIT2_SALESFORCE_LIGHTNING_URL`
  - `SIT2_BROKER_USERNAME`
  - etc.

## NPM Test Scripts

| Script | Purpose |
|--------|---------|
| `npm test` | Run all tests with default env (UAT2) |
| `npm run test:debug` | Run tests in debug mode |
| `npm run test:sanity` | Run sanity test suite |
| `npm run test:regression` | Run regression test suite |
| `npm run test:uat2` | Run tests in UAT2 environment |
| `npm run test:sit2` | Run tests in SIT2 environment |
| `npm run test:report` | Open HTML test report |

## Environment Configuration Details

### Playwright Configuration
The `playwright.config.ts` file automatically loads the `.env` file:

```typescript
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });
```

### Environment Manager (`src/config/envManager.ts`)
- Provides typed environment configuration
- Validates all required variables at runtime
- Throws error with variable name if any required env var is missing
- Caches configuration to avoid repeated file reads
- Automatically detects active environment from `TEST_ENV` variable

### Accessing Configuration in Tests
```typescript
import { getEnvConfig, getBrokerCredentials, getSalesforceCredentials } from '../config/env';

const config = getEnvConfig();
const brokerCreds = getBrokerCredentials();
const sfCreds = getSalesforceCredentials();
```

## Running Tests with Live Dashboard

The Playwright reporter automatically opens the live dashboard when tests start:

```bash
# Ensure dashboard-ui is running first
npm run dashboard:ui

# In another terminal, run tests
npm test

# Dashboard automatically opens at http://localhost:5173
```

## Security Best Practices

### ✅ DO
- ✅ Store credentials in `.env` file (locally only)
- ✅ Add `.env` to `.gitignore` (already configured)
- ✅ Use `.env.example` as template for documentation
- ✅ Rotate credentials regularly
- ✅ Use separate credentials per environment

### ❌ DON'T
- ❌ Commit `.env` file to git
- ❌ Hardcode credentials in test files
- ❌ Share credentials in messages or logs
- ❌ Use production credentials in test environments
- ❌ Store credentials in code comments

## Troubleshooting

### "Missing MLIS_PORTAL_URL" Error
- Ensure `.env` file exists in project root
- Verify the variable name matches expected format
- Check that dotenv is loaded in `playwright.config.ts`

### Tests Run in Wrong Environment
- Verify `TEST_ENV` variable is set correctly
- Check `.env` file for correct credentials for that environment
- Use `npm run test:uat2` or `npm run test:sit2` for explicit environment selection

### Dashboard Live Updates Not Working
- Ensure dashboard-ui is running: `npm run dashboard:ui`
- Check that dashboard is accessible at http://localhost:5173
- Verify network connectivity between test runner and dashboard

## Environment Variables Reference

### Core URLs
| Variable | Purpose | Example |
|----------|---------|---------|
| `MLIS_PORTAL_URL` | Broker portal base URL | `https://dualgroup--uat2.sandbox.my.site.com/mlisportal/` |
| `SALESFORCE_LIGHTNING_URL` | Salesforce instance URL | `https://dualgroup--uat2.sandbox.my.salesforce.com/` |

### Credentials
| Variable | Purpose | Format |
|----------|---------|--------|
| `BROKER_USERNAME` | Broker login username | Email or username |
| `BROKER_PASSWORD` | Broker login password | String (keep secure) |
| `SALESFORCE_USERNAME` | Salesforce login username | Email |
| `SALESFORCE_PASSWORD` | Salesforce login password | String (keep secure) |

### Optional Flags
| Variable | Purpose | Default |
|----------|---------|---------|
| `CI` | CI/CD environment flag | `false` |
| `TEST_ENV` | Active environment | `UAT2` |
| `TEST_TIMEOUT` | Test timeout (ms) | Playwright default |
| `LOG_LEVEL` | Logging level | `info` |

## Verifying Setup

```bash
# Verify dotenv is installed
npm list dotenv

# Verify playwright config loads env file correctly
npx ts-node -e "import './playwright.config'; console.log('✅ Config loaded')"

# Test a single test with UAT2
npm run test:uat2 tests/sanity/TC_SAN_001*.spec.ts

# View results
npm run test:report
```

## CI/CD Integration

For CI/CD pipelines, set environment variables directly instead of using `.env`:

```bash
# GitHub Actions example
- name: Run Tests
  env:
    MLIS_PORTAL_URL: ${{ secrets.MLIS_PORTAL_URL }}
    SALESFORCE_LIGHTNING_URL: ${{ secrets.SALESFORCE_LIGHTNING_URL }}
    BROKER_USERNAME: ${{ secrets.BROKER_USERNAME }}
    BROKER_PASSWORD: ${{ secrets.BROKER_PASSWORD }}
    SALESFORCE_USERNAME: ${{ secrets.SALESFORCE_USERNAME }}
    SALESFORCE_PASSWORD: ${{ secrets.SALESFORCE_PASSWORD }}
    TEST_ENV: UAT2
  run: npm test
```

## Related Files
- [playwright.config.ts](./playwright.config.ts) - Playwright configuration
- [.env](./.env) - Environment variables (not committed)
- [.env.example](./.env.example) - Template for environment variables
- [src/config/env.ts](./src/config/env.ts) - Public configuration API
- [src/config/envManager.ts](./src/config/envManager.ts) - Internal environment management
