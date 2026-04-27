# Pipeline Configuration Guide

## Overview
This framework is now fully configured to run in CI/CD pipelines with dedicated scripts for different test suites, including separate configurations for BDX test scenarios.

## Available Test Scripts

### BDX Test Scripts
- **`npm run test:bdx:intro`** - Run BDX INTRO scenario (TC_BDX_001 only)
- **`npm run test:bdx:rest`** - Run remaining BDX scenarios (TC_BDX_002, TC_BDX_003, TC_BDX_004)
- **`npm run test:bdx:all`** - Run all BDX tests
- **`npm run test:bdx:intro:chrome`** - Run BDX INTRO on Chrome only
- **`npm run test:bdx:rest:chrome`** - Run remaining BDX scenarios on Chrome only
- **`npm run test:bdx:all:chrome`** - Run all BDX tests on Chrome only

### General Test Scripts
- **`npm run test`** - Run all tests
- **`npm run test:sanity`** - Run sanity tests
- **`npm run test:regression`** - Run regression tests
- **`npm run test:sanity:chrome`** - Run sanity tests on Chrome
- **`npm run test:regression:chrome`** - Run regression tests on Chrome

## GitHub Actions Workflows

### 1. Main Playwright Tests (`.github/workflows/playwright.yml`)
Central workflow for all test suites with manual selection.

**Features:**
- Separate jobs for sanity, regression, and BDX tests
- Browser matrix testing (Chrome, Chromium)
- Manual workflow dispatch with test suite selection
- Scheduled daily runs of all tests at midnight
- Automatic artifact upload for reports and results

**Manual Trigger:**
```bash
# Via GitHub UI: Actions → Playwright Tests → Run workflow
# Select test suite: all, sanity, regression, or bdx
```

**Triggers:**
- Push to main/master/develop branches
- Pull requests
- Daily at midnight (scheduled)
- Manual dispatch

### 2. Sanity Tests (`.github/workflows/sanity-tests.yml`)
Dedicated workflow for sanity test suite (12 tests).

**Features:**
- Separate jobs per browser (Chrome, Chromium, Edge)
- Runs on changes to sanity tests or source code
- Scheduled runs every 6 hours for continuous monitoring
- Manual workflow dispatch with browser selection
- Fast execution (~30-45 minutes)

**Manual Trigger:**
```bash
# Via GitHub UI: Actions → Sanity Tests → Run workflow
# Select browser: all, chrome, chromium, or edge
```

**Triggers:**
- Push to main/master/develop affecting sanity tests
- Pull requests
- Every 6 hours (scheduled)
- Manual dispatch

### 3. Regression Tests (`.github/workflows/regression-tests.yml`)
Dedicated workflow for regression test suite (18 tests).

**Features:**
- Separate jobs per browser (Chrome, Chromium, Edge)
- Runs on changes to regression tests or source code
- Scheduled daily runs at 2 AM
- Manual workflow dispatch with browser selection
- Comprehensive testing (~90-120 minutes)

**Manual Trigger:**
```bash
# Via GitHub UI: Actions → Regression Tests → Run workflow
# Select browser: all, chrome, chromium, or edge
```

**Triggers:**
- Push to main/master/develop affecting regression tests
- Pull requests
- Daily at 2 AM (scheduled)
- Manual dispatch

### 4. BDX Tests (`.github/workflows/bdx-tests.yml`)
Dedicated workflow for BDX test scenarios (4 tests).

**Features:**
- Separate jobs for INTRO and REST scenarios
- Runs on changes to BDX tests or source code
- Manual workflow dispatch with test type selection
- Browser matrix testing (Chromium, Chrome, Microsoft Edge)
- Automatic reporting and artifact collection

**Manual Trigger:**
```bash
# Via GitHub UI: Actions → BDX Tests → Run workflow
# Select test type: intro, rest, or all
```

**Triggers:**
- Push to main/master/develop affecting BDX files
- Pull requests affecting BDX files
- Manual dispatch

## Running in Different CI/CD Systems

### GitHub Actions
Already configured - see workflows in `.github/workflows/`

### Jenkins
```groovy
pipeline {
    agent any
    
    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
                sh 'npx playwright install --with-deps'
            }
        }
        
        stage('BDX INTRO') {
            steps {
                sh 'npm run test:bdx:intro'
            }
        }
        
        stage('BDX REST') {
            steps {
                sh 'npm run test:bdx:rest'
            }
        }
    }
    
    post {
        always {
            publishHTML([
                reportDir: 'playwright-report',
                reportFiles: 'index.html',
                reportName: 'Playwright Report'
            ])
            archiveArtifacts artifacts: 'test-results/**,reports/**'
        }
    }
}
```

### Azure DevOps
```yaml
trigger:
  branches:
    include:
      - main
      - master
      - develop

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: BDX_INTRO
    jobs:
      - job: RunBDXIntro
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
          - script: npm ci
            displayName: 'Install dependencies'
          - script: npx playwright install --with-deps
            displayName: 'Install browsers'
          - script: npm run test:bdx:intro
            displayName: 'Run BDX INTRO tests'
          - task: PublishTestResults@2
            condition: always()
            inputs:
              testResultsFiles: 'reports/**/*.json'

  - stage: BDX_REST
    dependsOn: BDX_INTRO
    jobs:
      - job: RunBDXRest
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
          - script: npm ci
            displayName: 'Install dependencies'
          - script: npx playwright install --with-deps
            displayName: 'Install browsers'
          - script: npm run test:bdx:rest
            displayName: 'Run BDX REST tests'
          - task: PublishTestResults@2
            condition: always()
            inputs:
              testResultsFiles: 'reports/**/*.json'
```

### GitLab CI
```yaml
image: mcr.microsoft.com/playwright:v1.58.2-jammy

stages:
  - test

.test_template: &test_template
  before_script:
    - npm ci
  artifacts:
    when: always
    paths:
      - playwright-report/
      - test-results/
      - reports/
    expire_in: 30 days

bdx_intro:
  <<: *test_template
  stage: test
  script:
    - npm run test:bdx:intro

bdx_rest:
  <<: *test_template
  stage: test
  script:
    - npm run test:bdx:rest

sanity:
  <<: *test_template
  stage: test
  script:
    - npm run test:sanity
  only:
    - merge_requests
```

### CircleCI
```yaml
version: 2.1

orbs:
  node: circleci/node@5.0.0

jobs:
  bdx-intro:
    docker:
      - image: mcr.microsoft.com/playwright:v1.58.2-jammy
    steps:
      - checkout
      - node/install-packages
      - run:
          name: Run BDX INTRO tests
          command: npm run test:bdx:intro
      - store_artifacts:
          path: playwright-report
      - store_test_results:
          path: test-results

  bdx-rest:
    docker:
      - image: mcr.microsoft.com/playwright:v1.58.2-jammy
    steps:
      - checkout
      - node/install-packages
      - run:
          name: Run BDX REST tests
          command: npm run test:bdx:rest
      - store_artifacts:
          path: playwright-report
      - store_test_results:
          path: test-results

workflows:
  test:
    jobs:
      - bdx-intro
      - bdx-rest
```

## Local Pipeline Testing

### PowerShell (Windows)
```powershell
# Sanity Tests
npm run test:sanity
npm run test:sanity:chrome
.\scripts\run-sanity-tests.ps1 -Browser all
.\scripts\run-sanity-tests.ps1 -Browser chrome

# Regression Tests
npm run test:regression
npm run test:regression:chrome
.\scripts\run-regression-tests.ps1 -Browser all
.\scripts\run-regression-tests.ps1 -Browser chrome

# BDX Tests
npm run test:bdx:intro
npm run test:bdx:rest
npm run test:bdx:all
.\scripts\run-bdx-tests.ps1 -TestType all
.\scripts\run-bdx-tests.ps1 -TestType intro
```

### Bash (Linux/Mac)
```bash
# Sanity Tests
npm run test:sanity
npm run test:sanity:chrome
./scripts/run-sanity-tests.sh all
./scripts/run-sanity-tests.sh chrome

# Regression Tests
npm run test:regression
npm run test:regression:chrome
./scripts/run-regression-tests.sh all
./scripts/run-regression-tests.sh chrome

# BDX Tests
npm run test:bdx:intro
npm run test:bdx:rest
npm run test:bdx:all
./scripts/run-bdx-tests.sh all
./scripts/run-bdx-tests.sh intro
```

## Environment Variables for CI

Set these in your CI/CD system:

```bash
CI=true                    # Enables CI mode in Playwright
PLAYWRIGHT_WORKERS=1       # Limit parallel workers in CI
NODE_ENV=production        # Set environment
```

## Artifacts and Reports

The following artifacts are automatically collected:

1. **HTML Reports** - `playwright-report/`
2. **Test Results** - `test-results/`
3. **Custom Dashboard** - `reports/dashboard/`
4. **JSON Reports** - `reports/playwright-results-*.json`
5. **Screenshots/Videos** - `test-results/**/attachments/`

## Best Practices

1. **BDX INTRO tests** run separately as they may have different requirements
2. **BDX REST tests** (002, 003, 004) run together for efficiency
3. **Retry logic** enabled in CI (2 retries)
4. **Parallel execution** limited to 1 worker in CI for stability
5. **Artifacts** retained for 30 days
6. **Failure artifacts** (screenshots/videos) retained for 7 days

## Monitoring and Notifications

Configure notifications in your CI/CD system:

- **Email notifications** on test failures
- **Slack/Teams** integration for build status
- **GitHub Status Checks** for pull requests

## Troubleshooting

### Tests failing in CI but passing locally
- Check `CI` environment variable is set
- Verify browser installation with `npx playwright install --with-deps`
- Review timeout settings in `playwright.config.ts`

### Artifacts not uploading
- Verify paths in workflow configuration
- Check artifact size limits
- Ensure `if: ${{ !cancelled() }}` condition is present

### Slow test execution
- Reduce parallel workers: `PLAYWRIGHT_WORKERS=1`
- Split tests across multiple jobs
- Use faster runners if available

## Next Steps

1. Configure environment-specific variables in CI settings
2. Set up notifications for test failures
3. Integrate with test management systems if needed
4. Schedule regular test runs (already configured for daily runs)
5. Monitor test execution times and optimize as needed
