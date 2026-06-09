# Quick Start: Run Tests Now 🚀

## One-Line Test Execution

```bash
npm test
```

Done! Tests will run with the current environment configuration.

---

## Common Commands

### Run Tests
```bash
npm test                    # All tests, UAT2 environment
npm run test:sanity         # Sanity tests only
npm run test:regression     # Regression tests only
npm run test:debug          # Debug mode (opens inspector)
npm run test:report         # View latest HTML report
```

### Test in Different Environments
```bash
npm run test:uat2           # Explicitly use UAT2
npm run test:sit2           # Switch to SIT2 environment
```

---

## Configuration Status

✅ **Environment variables loaded from `.env`**
- MLIS_PORTAL_URL
- SALESFORCE_LIGHTNING_URL
- BROKER_USERNAME
- BROKER_PASSWORD
- SALESFORCE_USERNAME
- SALESFORCE_PASSWORD

✅ **Multiple environments supported**
- UAT2 (default)
- SIT2 (with SIT2_ prefix)

✅ **Ready for testing**
- Live dashboard integration
- Playwright reporter configured
- Environment auto-detection

---

## First Test Run: Step by Step

### Step 1: Verify Credentials (Optional)
```bash
# Open .env file and verify credentials are present
cat .env | grep BROKER_USERNAME
cat .env | grep SALESFORCE_USERNAME
```

### Step 2: Run Tests
```bash
npm test
```

**What happens:**
1. ✅ dotenv loads .env file
2. ✅ playwright.config.ts applies configuration
3. ✅ Tests connect to MLIS Portal
4. ✅ Live dashboard opens at http://localhost:5173 (if running)
5. ✅ Results display in terminal

### Step 3: View Report
```bash
npm run test:report
```

---

## Changing Environments

### Switch to SIT2
```bash
npm run test:sit2
```

**How it works:**
- TEST_ENV=SIT2 is set automatically
- envManager.ts uses SIT2_* variables from .env
- Tests connect to SIT2 MLIS Portal instead

---

## Troubleshooting: 5-Minute Fix

| Issue | Solution |
|-------|----------|
| Tests fail to connect | Verify credentials in `.env` are correct |
| Wrong environment used | Use `npm run test:sit2` or `npm run test:uat2` |
| Dashboard not showing | Ensure dashboard-ui is running: `npm run dashboard:ui` |
| "Missing BROKER_USERNAME" | Check .env file exists and has correct format |

---

## Need Help?

📖 Full documentation: [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)

📋 Configuration summary: [ENVIRONMENT_CONFIGURATION_COMPLETE.md](./ENVIRONMENT_CONFIGURATION_COMPLETE.md)

---

## Environment Variables Quick Reference

```env
# Default (UAT2) - no prefix needed
MLIS_PORTAL_URL
SALESFORCE_LIGHTNING_URL
BROKER_USERNAME
BROKER_PASSWORD
SALESFORCE_USERNAME
SALESFORCE_PASSWORD

# Alternative (SIT2) - use prefix
SIT2_MLIS_PORTAL_URL
SIT2_SALESFORCE_LIGHTNING_URL
SIT2_BROKER_USERNAME
SIT2_BROKER_PASSWORD
SIT2_SALESFORCE_USERNAME
SIT2_SALESFORCE_PASSWORD
```

---

## What's Configured

✅ `.env` file with all credentials  
✅ `playwright.config.ts` loads .env automatically  
✅ `package.json` has 7 test scripts  
✅ Environment manager validates variables  
✅ Support for multiple environments (UAT2, SIT2)  
✅ Live dashboard integration  
✅ HTML test reports  

---

**You're ready to start testing! 🎉**

```bash
npm test
```
