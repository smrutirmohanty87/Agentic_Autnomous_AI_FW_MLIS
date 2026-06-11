# Contributing to Agentic QA Framework

Thank you for your interest in contributing! This document provides guidelines and best practices for development.

---

## 🏗️ Architecture Overview

The framework follows a modular, agent-based architecture:

```
Requirement
    ↓
[Planner] → Test plans
    ↓
[Designer] → Locators & page objects
    ↓
[Generator] → Executable test code
    ↓
[Execution] → Browser automation
    ↓
[RCA] → Failure analysis
    ↓
[Healing] → Auto-recovery
```

Each agent is independent and can be extended or replaced.

---

## 📂 Directory Conventions

- **`src/ai/`** – Agent implementations
- **`src/pages/`** – Page object models (POM)
- **`src/config/`** – Configuration & credentials
- **`orchestrator/`** – Orchestration logic
- **`healing/`** – Self-healing engine
- **`rca/`** – Root cause analysis
- **`tests/`** – Test specifications
- **`docs/`** – Documentation

---

## 🔧 Development Setup

1. **Clone the repository**:
   ```bash
   git clone <repo>
   cd Agentic_Autnomous_AI_FW_MLIS
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Verify setup**:
   ```bash
   npm run env:validate
   npm test -- tests/example.spec.ts
   ```

---

## ✅ Code Standards

### TypeScript

- Use strict mode
- Type all function parameters and return values
- Avoid `any` types
- Use interfaces for object structures

### Naming Conventions

- **Files**: kebab-case (e.g., `healing-agent.ts`)
- **Classes**: PascalCase (e.g., `HealingAgent`)
- **Methods/Variables**: camelCase (e.g., `executeTest()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_TIMEOUT`)

### Comments

- Document complex logic with comments
- Use JSDoc for public functions
- Keep comments up-to-date with code changes

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific suite
npm test -- tests/sanity/

# Run in headed mode
npm test -- --headed

# Debug mode
npm test -- --debug
```

### Writing Tests

- Use descriptive test names
- Follow POM pattern
- Keep tests independent (no test order dependency)
- Clean up after tests

### Example Test Structure

```typescript
test.describe('@sanity | E2E | Login', () => {
  test('TC_001 | User can login with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(username, password);
    await expect(loginPage.dashboard).toBeVisible();
  });
});
```

---

## 🛠️ Adding a New Agent

### 1. Create Agent File

```typescript
// src/ai/myAgent.ts
export class MyAgent {
  async execute(input: Input): Promise<Output> {
    // Implementation
  }
}
```

### 2. Implement Required Interface

```typescript
interface Agent {
  name: string;
  execute(context: ExecutionContext): Promise<AgentResult>;
}
```

### 3. Integrate with Orchestrator

Update `orchestrator/orchestrator.ts`:

```typescript
const myAgent = new MyAgent();
const result = await myAgent.execute(context);
```

### 4. Update Documentation

Add entry to `docs/architecture/` with implementation details.

---

## 🌐 Adding a New Page Object

### 1. Create Page Object

```typescript
// src/pages/myPage.ts
export class MyPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(URL);
  }

  async expectLoaded() {
    await expect(this.page.locator('h1')).toBeVisible();
  }
}
```

### 2. Register Locators with Designer

Update designer agent to register necessary locators:

```typescript
this.locators.set('myElement', 'role=button[name="Click me"]');
```

### 3. Use Healing Registry

```typescript
const healer = new Healer(this.page);
const element = await healer.findElement('myElement');
```

---

## 📝 Commit Guidelines

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation
- **test**: Test additions/updates
- **refactor**: Code refactoring
- **perf**: Performance improvement
- **ci**: CI/CD changes

### Example

```
feat(healing): Add fallback locator strategy for dynamic elements

- Implements waitForElementAndClick with retry logic
- Adds locator caching to memory registry
- Includes telemetry for healing events

Closes #123
```

---

## 🚀 Pull Request Process

1. **Create feature branch**:
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make changes** following code standards

3. **Test thoroughly**:
   ```bash
   npm test
   npm run lint
   ```

4. **Update documentation**:
   - Add docs for new features
   - Update relevant README files

5. **Push and create PR**:
   ```bash
   git push origin feat/my-feature
   ```

6. **PR checklist**:
   - ✅ Tests pass
   - ✅ No lint errors
   - ✅ Documentation updated
   - ✅ Commit messages are clear

---

## 🐛 Debugging

### Enable Debug Logs

```bash
npm test -- --debug
```

### Check Runtime State

```bash
cat runtime/workflow-status.json
cat runtime/heal-log.json
cat rca-results.json
```

### Use Playwright Inspector

```bash
PWDEBUG=1 npm test
```

---

## 📊 Dashboard Development

### Starting Dashboard Dev Server

```bash
npm run dashboard:dev
# Opens http://localhost:5173/
```

### Dashboard File Structure

```
dashboard-ui/
├── src/
│   ├── components/          # React components
│   ├── hooks/               # Custom hooks
│   ├── types/               # TypeScript types
│   └── App.tsx              # Main component
├── public/                  # Static assets
└── vite.config.ts
```

---

## 🔐 Security Considerations

- Never commit `.env` files
- Keep credentials in environment variables only
- Sanitize logs that contain sensitive data
- Use HTTPS for API endpoints
- Validate all user inputs

---

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Project README](../README.md)
- [Architecture Docs](../docs/architecture/)

---

## ❓ Questions?

See the documentation in `docs/` or check existing issues for similar questions.

---

**Thank you for contributing!** 🙏
