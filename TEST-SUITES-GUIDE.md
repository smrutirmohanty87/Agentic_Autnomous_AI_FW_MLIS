# Test Suites - Quick Reference Guide

## Overview
The framework includes three main test suites ready for pipeline execution:
- **Sanity Tests** (12 tests) - Quick smoke tests
- **Regression Tests** (18 tests) - Comprehensive functional tests  
- **BDX Tests** (4 tests) - Business-specific scenarios

## Test Suite Breakdown

### Sanity Tests (12 Tests)
Located in `tests/sanity/`

**Commercial Tests:**
- TC_SAN_001: Create commercial EW policy (multiple products)
- TC_SAN_002: Create commercial EW policy (multiple products via referral)
- TC_SAN_003: Create commercial EW policy (single product)
- TC_SAN_004: Create commercial EW policy (single product via referral)
- TC_SAN_005: Complete full commercial EW quote journey

**Residential Tests:**
- TC_SAN_006: Complete full residential EW quote journey
- TC_SAN_007: Complete full residential EW multiple products quote journey
- TC_SAN_008: Cancel from inception full premium return

**Quick Quote Tests:**
- TC_SAN_009: Residential quick quote EW single product email quotes
- TC_SAN_010: Residential quick quote EW multiple products email quotes
- TC_SAN_011: Residential quick quote Scotland single product manual email
- TC_SAN_012: Residential quick quote Scotland multiple products manual email

**Execution Time:** ~30-45 minutes

### Regression Tests (18 Tests)
Located in `tests/regression/`

**Commercial Tests:**
- TC_REG_001: Create commercial NI policy (multiple products)
- TC_REG_002: Create commercial NI policy (single product)
- TC_REG_003: Create commercial Scotland policy (multiple products)
- TC_REG_004: Create commercial Scotland policy (single product)

**Residential Tests:**
- TC_REG_005: Create residential EW policy (multiple products)
- TC_REG_006: Create residential EW policy (single product)
- TC_REG_007: Create residential NI policy (multiple products)
- TC_REG_008: Create residential NI policy (single product)
- TC_REG_009: Create residential Scotland policy (multiple products)
- TC_REG_010: Create residential Scotland policy (single product)

**Salesforce Integration:**
- TC_REG_011: Open notes/attachments Salesforce EW policy
- TC_REG_012: Open notes/attachments Salesforce commercial EW policy
- TC_REG_013: Open notes/attachments Salesforce commercial Scotland policy

**Advanced Scenarios:**
- TC_REG_014: Create MTA (Mid-Term Adjustment)
- TC_REG_015: Cancel and reissue live policy
- TC_REG_016: Create MTA then cancel policy
- TC_REG_017: Create MTA then cancel and reissue
- TC_REG_018: Create MTA, cancel/reissue, then cancel policy

**Execution Time:** ~90-120 minutes

### BDX Tests (4 Tests)
Located in `tests/BDX/`

- TC_BDX_001: INTRO - Cancel full premium return
- TC_BDX_002: INTER COMM - Policy BDX lines
- TC_BDX_003: BDE COMM - Policy BDX lines
- TC_BDX_004: NO COMM - Policy BDX lines

**Execution Time:** ~45-60 minutes

## Running Tests Locally

### Sanity Tests
```bash
# All browsers
npm run test:sanity

# Specific browser
npm run test:sanity:chrome
npm run test:sanity:chromium
npm run test:sanity:edge

# Using scripts
.\scripts\run-sanity-tests.ps1 -Browser chrome     # PowerShell
./scripts/run-sanity-tests.sh chrome               # Bash
```

### Regression Tests
```bash
# All browsers
npm run test:regression

# Specific browser
npm run test:regression:chrome
npm run test:regression:chromium
npm run test:regression:edge

# Using scripts
.\scripts\run-regression-tests.ps1 -Browser chrome  # PowerShell
./scripts/run-regression-tests.sh chrome            # Bash
```

### BDX Tests
```bash
# All BDX tests
npm run test:bdx:all

# INTRO scenario only
npm run test:bdx:intro

# REST scenarios (002, 003, 004)
npm run test:bdx:rest

# Using scripts
.\scripts\run-bdx-tests.ps1 -TestType all          # PowerShell
./scripts/run-bdx-tests.sh all                     # Bash
```

## CI/CD Pipeline Execution

### GitHub Actions Workflows

**1. Sanity Tests** (`.github/workflows/sanity-tests.yml`)
- **Triggers:** Push, PR, every 6 hours, manual
- **Browsers:** Chrome, Chromium, Edge
- **Duration:** ~60 minutes
- **Manual:** Actions → Sanity Tests → Run workflow → Select browser

**2. Regression Tests** (`.github/workflows/regression-tests.yml`)
- **Triggers:** Push, PR, daily at 2 AM, manual
- **Browsers:** Chrome, Chromium, Edge
- **Duration:** ~120 minutes
- **Manual:** Actions → Regression Tests → Run workflow → Select browser

**3. BDX Tests** (`.github/workflows/bdx-tests.yml`)
- **Triggers:** Push, PR affecting BDX files, manual
- **Browsers:** Chromium, Chrome, Edge
- **Duration:** ~90 minutes
- **Manual:** Actions → BDX Tests → Run workflow → Select type

**4. Main Playwright Tests** (`.github/workflows/playwright.yml`)
- **Triggers:** Push, PR, daily at midnight, manual
- **Options:** All, Sanity, Regression, BDX
- **Manual:** Actions → Playwright Tests → Run workflow → Select suite

### Pipeline Strategy

**Pull Requests:**
- Run Sanity tests (fast feedback)
- Optional: Run affected test suite

**Main/Master Branch:**
- Run full Sanity suite
- Run Regression suite
- Run BDX suite

**Scheduled Runs:**
- Sanity: Every 6 hours
- Regression: Daily at 2 AM
- All tests: Daily at midnight

## Test Execution Matrix

| Suite | Tests | Chrome | Chromium | Edge | Duration |
|-------|-------|--------|----------|------|----------|
| Sanity | 12 | ✓ | ✓ | ✓ | 30-45 min |
| Regression | 18 | ✓ | ✓ | ✓ | 90-120 min |
| BDX INTRO | 1 | ✓ | ✓ | ✓ | 15-20 min |
| BDX REST | 3 | ✓ | ✓ | ✓ | 30-40 min |

## Artifacts Generated

Each pipeline run produces:
- HTML reports (`playwright-report/`)
- Test results (`test-results/`)
- Custom dashboard (`reports/dashboard/`)
- Screenshots (on failure)
- Videos (on failure)
- Traces (on failure)

**Retention:**
- Reports: 30 days
- Failure artifacts: 7 days

## Quick Commands Reference

```bash
# SANITY
npm run test:sanity                    # All sanity tests
npm run test:sanity:chrome             # Sanity on Chrome
npm run test:sanity:chromium           # Sanity on Chromium
npm run test:sanity:edge               # Sanity on Edge

# REGRESSION
npm run test:regression                # All regression tests
npm run test:regression:chrome         # Regression on Chrome
npm run test:regression:chromium       # Regression on Chromium
npm run test:regression:edge           # Regression on Edge

# BDX
npm run test:bdx:all                   # All BDX tests
npm run test:bdx:intro                 # INTRO scenario
npm run test:bdx:rest                  # REST scenarios
npm run test:bdx:intro:chrome          # INTRO on Chrome
npm run test:bdx:rest:chrome           # REST on Chrome
npm run test:bdx:all:chrome            # All BDX on Chrome

# ALL TESTS
npm test                               # Run everything
```

## PowerShell Scripts

```powershell
# Sanity
.\scripts\run-sanity-tests.ps1 -Browser all|chrome|chromium|edge

# Regression
.\scripts\run-regression-tests.ps1 -Browser all|chrome|chromium|edge

# BDX
.\scripts\run-bdx-tests.ps1 -TestType all|intro|rest
```

## Bash Scripts

```bash
# Sanity
./scripts/run-sanity-tests.sh all|chrome|chromium|edge

# Regression
./scripts/run-regression-tests.sh all|chrome|chromium|edge

# BDX
./scripts/run-bdx-tests.sh all|intro|rest
```

## Environment Variables

```bash
CI=true                    # Enable CI mode
PLAYWRIGHT_WORKERS=1       # Limit parallel execution
NODE_ENV=production        # Set environment
```

## Best Practices

### When to Run Each Suite

**Sanity Tests:**
- Before every deployment
- On every PR
- Every 6 hours for continuous monitoring
- Quick validation after changes

**Regression Tests:**
- Before major releases
- Daily overnight runs
- After significant feature changes
- Complete functional validation

**BDX Tests:**
- When BDX functionality changes
- Before BDX-related deployments
- After premium calculation changes
- Business-critical scenario validation

### Parallel Execution

**Local Development:**
- Use default parallel workers
- Run specific browsers for speed

**CI/CD:**
- Limit to 1 worker (`PLAYWRIGHT_WORKERS=1`)
- Run browser matrix in parallel jobs
- Separate suites into different jobs

## Monitoring & Reporting

### View Results

**GitHub Actions:**
1. Go to Actions tab
2. Select workflow run
3. Download artifacts
4. Open HTML report

**Local:**
```bash
# Open report
start playwright-report/index.html      # Windows
open playwright-report/index.html       # Mac
xdg-open playwright-report/index.html   # Linux
```

### Test Summary

Each pipeline run provides:
- Pass/Fail count per browser
- Execution duration
- Failed test details
- Screenshots/videos of failures
- Comprehensive HTML report

## Troubleshooting

### Sanity Tests Failing
1. Check basic functionality
2. Verify environment configuration
3. Review recent code changes
4. Check service availability

### Regression Tests Timing Out
1. Increase timeout in workflow
2. Review test execution times
3. Optimize slow tests
4. Split into smaller jobs

### BDX Tests Inconsistent
1. Check data dependencies
2. Verify premium calculations
3. Review policy creation flow
4. Check Salesforce integration

## Additional Resources

- [Full Pipeline Documentation](PIPELINE.md)
- [BDX Tests Guide](BDX-TESTS-GUIDE.md)
- Test Plans: `tests/*.plan.md`
- Bug Reports: `reports/bugs/`
