# Oliva Automation Integration (Isolated from MLIS)

## Purpose
This repository now supports running the nested Oliva automation project from the root workspace without impacting MLIS workflows.

Oliva project path:
- `oliva-automation/oliva-automation`

## Isolation Model
- MLIS tests remain under `tests/` and use root `playwright.config.ts`.
- Oliva tests remain under `oliva-automation/oliva-automation/tests/` and use its own `playwright.config.ts`.
- No MLIS scripts were changed in behavior.
- No shared Playwright config merge was introduced.

## Root Commands for Oliva
Run from repository root:

```bash
npm run oliva:install
npm run oliva:test
npm run oliva:test:headed
npm run oliva:test:debug
npm run oliva:report
npm run oliva:typecheck
```

These commands are wrappers that execute npm in the nested Oliva project only.

## Environment Setup (Oliva only)
1. Create `oliva-automation/oliva-automation/.env` from that project's `.env.example`.
2. Fill Salesforce credentials/URLs required by Oliva.
3. Run `npm run oliva:install` once.

## Notes
- Keep MLIS `.env` and Oliva `.env` independent.
- If both suites are run in parallel, prefer separate terminals to avoid confusion in logs.
- Ignore `oliva-automation/__MACOSX/` artifacts; they are packaging leftovers and not used at runtime.
