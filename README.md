# Agentic QA Framework – Autonomous Test Orchestration

A production-ready **autonomous QA platform** that orchestrates multi-agent test workflows with live dashboard monitoring, intelligent test healing, and root cause analysis.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run the fresh 3-product commercial workflow demo
npm run demo:fresh-3p

# Open the dashboard
# → http://localhost:5173/
```

For detailed setup instructions, see [docs/guides/QUICK_START.md](docs/guides/QUICK_START.md).

---

## 📋 Project Overview

The Agentic QA Framework provides:

- **6-Agent Orchestration Pipeline**: Planner → Designer → Generator → Execution → RCA → Healing
- **Live Dashboard**: Real-time workflow monitoring with agent status, live tracking, and KPI metrics
- **Intelligent Healing**: Automated locator recovery with fallback strategies
- **Root Cause Analysis**: Post-execution failure analysis with actionable insights
- **Multi-Environment Support**: DURQA, SIT2, UAT2 with configurable credentials

### Core Workflow

```
Requirement Specification
         ↓
   [Planner]          ← Plan test cases from requirements
         ↓
   [Designer]         ← Register UI locators & page objects
         ↓
   [Generator]        ← Generate executable test plans
         ↓
   [Execution]        ← Run tests in browser (headed/headless)
         ↓
   [RCA]              ← Analyze failures & generate insights
         ↓
  [Healing]           ← Conditional: Auto-recover brittle locators
```

---

## 📁 Directory Structure

```
.
├── docs/                          # 📚 Complete documentation
│   ├── guides/                    # Setup & workflow guides
│   ├── architecture/              # Technical design docs
│   ├── QUICK_START.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   └── MASTER_CHECKLIST.md
│
├── src/                           # 🔧 Core framework
│   ├── ai/                        # AI agent implementations
│   ├── config/                    # Environment & credentials
│   ├── pages/                     # Page object models
│   └── reporters/                 # Test result reporters
│
├── orchestrator/                  # 🎯 Orchestration engine
│   ├── orchestrator.ts            # Main orchestrator
│   ├── demo.ts                    # Demo workflows
│   └── ...
│
├── dashboard-ui/                  # 📊 React Vite dashboard
│   ├── src/
│   │   ├── components/            # Dashboard components
│   │   └── App.tsx                # Main dashboard app
│   └── vite.config.ts
│
├── healing/                       # 🛠️ Self-healing engine
│   ├── healer.ts
│   ├── healingAgent.ts
│   └── locatorRegistry.ts
│
├── rca/                           # 🔍 Root cause analysis
│   └── rcaAnalyzer.ts
│
├── tests/                         # 🧪 Test specifications
│   ├── sanity/                    # Sanity tests
│   └── *.spec.ts
│
├── runtime/                       # ⚡ Live runtime state
│   ├── workflow-status.json       # Current workflow phase
│   ├── suite-progress.json        # Test execution progress
│   ├── heal-log.json              # Healing events
│   └── rca-results.json           # RCA analysis results
│
├── artifacts/                     # 📦 Build & result artifacts
│   └── pw-results.json
│
├── .env                           # 🔐 Environment variables (DURQA config)
├── .env.example                   # Template for .env
├── package.json                   # Dependencies & scripts
├── playwright.config.ts           # Playwright configuration
└── README.md                      # This file
```

---

## ⚙️ Configuration

### Environment Setup

1. **Copy environment template**:
   ```bash
   cp .env.example .env
   ```

2. **Configure credentials** in `.env`:
   ```env
   TEST_ENV=DURQA
   DURQA_MLIS_PORTAL_URL=https://...
   DURQA_MLIS_PORTAL_USERNAME=...
   DURQA_MLIS_PORTAL_PASSWORD=...
   ```

3. **Verify setup**:
   ```bash
   npm run env:validate
   ```

For complete environment setup, see [docs/guides/ENVIRONMENT_SETUP.md](docs/guides/ENVIRONMENT_SETUP.md).

---

## 🎮 Available Commands

| Command | Purpose |
|---------|---------|
| `npm run demo:fresh-3p` | Run fresh 3-product commercial workflow |
| `npm run demo` | Run default demo workflow |
| `npm test` | Run full Playwright test suite |
| `npm run dashboard:dev` | Start dashboard UI in dev mode |
| `npm run orchestrate` | Execute orchestrator pipeline |

---

## 📊 Live Dashboard

Access the dashboard at **http://localhost:5173/** while workflows execute:

- **Workflow Timeline**: Real-time agent execution phases
- **Live Tracking**: Current step, generated test name, requirement
- **Agent Status**: Success/failure indicators with timing
- **KPI Metrics**: Pass rate, failure analysis, healing stats
- **RCA Panel**: Root cause insights for failures
- **Test Progress**: Real-time test execution metrics

---

## 🧠 Architecture Highlights

### Multi-Agent Pipeline

Each agent is responsible for a specific phase:

- **Planner** (`src/ai/planner.ts`): Creates test plans from requirements
- **Designer** (`src/ai/designer.ts`): Registers UI locators for stability
- **Generator** (`src/ai/generator.ts`): Generates executable Playwright test code
- **Execution** (`orchestrator/orchestrator.ts`): Runs tests in browser
- **RCA** (`rca/rcaAnalyzer.ts`): Analyzes failures post-execution
- **Healing** (`healing/healingAgent.ts`): Auto-recovers brittle tests

### Live Monitoring

- **Runtime State** (`runtime/workflowStatus.ts`): Tracks workflow metadata
- **Dashboard Sync**: Real-time JSON polling for UI updates
- **Reporter Integration**: Captures logs at each phase

---

## 📖 Documentation

For detailed information, see:

| Document | Purpose |
|----------|---------|
| [QUICK_START.md](docs/guides/QUICK_START.md) | Setup & first run |
| [ENVIRONMENT_SETUP.md](docs/guides/ENVIRONMENT_SETUP.md) | Environment configuration |
| [FRESH_3P_WORKFLOW_GUIDE.md](docs/guides/FRESH_3P_WORKFLOW_GUIDE.md) | Fresh workflow demo |
| [HEALING_AGENT_WORKFLOW.md](docs/architecture/HEALING_AGENT_WORKFLOW.md) | Self-healing mechanism |
| [PLAYWRIGHT_DASHBOARD_INTEGRATION.md](docs/architecture/PLAYWRIGHT_DASHBOARD_INTEGRATION.md) | Dashboard architecture |
| [MASTER_CHECKLIST.md](docs/MASTER_CHECKLIST.md) | Implementation checklist |

---

## 🛠️ Development

### Running Tests

```bash
# Run all tests
npm test

# Run specific suite
npm test -- tests/sanity/TC_SAN_001.spec.ts

# Run in headed mode
npm test -- --headed

# Run in debug mode
npm test -- --debug
```

### Development Workflow

1. Update test specs in `tests/`
2. Run orchestrator: `npm run demo:fresh-3p`
3. Monitor dashboard: http://localhost:5173/
4. Check runtime files in `runtime/` for state
5. Review RCA results in `rca-results.json`

---

## 🔍 Troubleshooting

### Dashboard Not Loading

```bash
# Clear cache
rm runtime/workflow-status.json

# Restart
npm run demo:fresh-3p
```

### Tests Failing with Locator Errors

The Healing Agent will attempt recovery. Check:
- `runtime/heal-log.json` for healing attempts
- `rca-results.json` for failure analysis
- `runtime/current-test.json` for execution context

### Environment Variables Not Loading

Verify `.env` exists and contains required variables:
```bash
cat .env | grep TEST_ENV
```

---

## 📋 System Requirements

- **Node.js**: 18.0+
- **npm**: 9.0+
- **Browsers**: Chromium, Firefox, WebKit (via Playwright)
- **OS**: Windows 10+, macOS 11+, Linux

---

## 📄 License

[Your License Here]

---

## 🤝 Support

For issues, documentation updates, or feature requests, see [docs/](docs/) for architecture and implementation details.

---

## ✨ Key Features

✅ **Autonomous Test Orchestration** – 6-agent pipeline with conditional execution  
✅ **Live Dashboard** – Real-time monitoring with React/Vite  
✅ **Intelligent Healing** – Auto-recover failing tests with locator strategies  
✅ **RCA Integration** – Root cause analysis for every failure  
✅ **Multi-Environment** – DURQA, SIT2, UAT2 support  
✅ **Production-Ready** – Scalable, maintainable, documented framework  

---

**Last Updated**: June 2026  
**Version**: 1.0.0-production
