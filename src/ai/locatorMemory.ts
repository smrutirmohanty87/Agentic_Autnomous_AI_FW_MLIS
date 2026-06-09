/// <reference types="node" />

import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import { LocatorMemoryDb, LocatorRecord } from './types';
import { defaultLogger } from './logger';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireLock(lockPath: string, options?: { timeoutMs?: number; staleMs?: number }): Promise<() => Promise<void>> {
  const timeoutMs = options?.timeoutMs ?? 5000;
  const staleMs = options?.staleMs ?? 30000;

  const start = Date.now();
  let delay = 25;

  // Atomic create a lock file. On Windows/macOS/Linux, openSync('wx') is exclusive.
  // If a run crashes and leaves a stale lock behind, we clear it after staleMs.
  // This keeps JSON writes safe with Playwright parallel workers.
  while (true) {
    try {
      const fd = fsSync.openSync(lockPath, 'wx');
      try {
        fsSync.writeFileSync(fd, `${process.pid}:${Date.now()}`);
      } finally {
        fsSync.closeSync(fd);
      }

      return async () => {
        await fs.unlink(lockPath).catch(() => undefined);
      };
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code !== 'EEXIST') {
        throw error;
      }

      // Stale lock cleanup.
      try {
        const stat = fsSync.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > staleMs) {
          fsSync.unlinkSync(lockPath);
          continue;
        }
      } catch {
        // If we cannot stat/unlink, proceed to retry.
      }

      if (Date.now() - start > timeoutMs) {
        throw new Error(`Timed out waiting for locator memory lock: ${lockPath}`);
      }

      await sleep(delay);
      delay = Math.min(Math.floor(delay * 1.5), 250);
    }
  }
}

function nowIso() {
  return new Date().toISOString();
}

function toRecord(partial?: Partial<LocatorRecord>): LocatorRecord {
  return {
    primary: partial?.primary ?? '',
    fallbacks: Array.isArray(partial?.fallbacks) ? partial!.fallbacks! : [],
    successCount: typeof partial?.successCount === 'number' ? partial.successCount : 0,
    failureCount: typeof partial?.failureCount === 'number' ? partial.failureCount : 0,
    lastUsed: typeof partial?.lastUsed === 'string' ? partial.lastUsed : '',
  };
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath: string): Promise<LocatorMemoryDb> {
  if (!(await fileExists(filePath))) {
    return {};
  }
  const raw = await fs.readFile(filePath, 'utf-8');
  if (!raw.trim()) {
    return {};
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    return {};
  }
  return parsed as LocatorMemoryDb;
}

async function writeJsonAtomic(filePath: string, data: LocatorMemoryDb) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const content = JSON.stringify(data, null, 2);
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  await fs.writeFile(tmp, content, 'utf-8');

  try {
    // Best-effort atomic replace.
    await fs.rename(tmp, filePath);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    // On Windows, rename can intermittently fail (AV scanners, file watchers).
    // With an active lock, an in-place write is safe enough for our JSON DB.
    if (code === 'EPERM' || code === 'EBUSY' || code === 'EACCES') {
      await fs.writeFile(filePath, content, 'utf-8');
      await fs.unlink(tmp).catch(() => undefined);
      return;
    }
    await fs.unlink(tmp).catch(() => undefined);
    throw error;
  }
}

/**
 * JSON-backed locator memory with cross-process file locking.
 *
 * Notes:
 * - Playwright can run tests in parallel across workers (processes).
 * - We use an internal `.lock` file (atomic create) to prevent concurrent writes corrupting the JSON file.
 */
export class LocatorMemory {
  private readonly dbPath: string;
  private readonly enableWrites: boolean;

  constructor(options?: { dbPath?: string; enableWrites?: boolean }) {
    // Prefer a stable, repo-relative path so it works in Playwright runs
    // (and avoids relying on __dirname which is not always typed in TS tooling).
    const defaultPath = path.resolve(process.cwd(), 'src', 'ai', 'memoryDb.json');

    const envPath = process.env.AI_LOCATOR_DB_PATH;
    this.dbPath = options?.dbPath ?? envPath ?? defaultPath;
    this.enableWrites = options?.enableWrites ?? process.env.AI_LOCATOR_MEMORY_WRITE !== '0';
  }

  async get(elementName: string): Promise<LocatorRecord | null> {
    const db = await this.readAll();
    const entry = db[elementName];
    return entry ? toRecord(entry) : null;
  }

  async readAll(): Promise<LocatorMemoryDb> {
    return this.withLock(async () => {
      const db = await readJson(this.dbPath);
      // Normalize to avoid undefined fields.
      for (const key of Object.keys(db)) {
        db[key] = toRecord(db[key]);
      }
      return db;
    }, { readOnly: true });
  }

  async upsert(elementName: string, record: LocatorRecord): Promise<void> {
    await this.withLock(async () => {
      const db = await readJson(this.dbPath);
      db[elementName] = toRecord(record);
      if (this.enableWrites) {
        await writeJsonAtomic(this.dbPath, db);
      }
    });
  }

  /**
   * Called when a locator succeeds. If it was a fallback, it is promoted to primary.
   */
  async recordSuccess(elementName: string, usedLocator: string, meta?: { promoted?: boolean; previousPrimary?: string }) {
    await this.withLock(async () => {
      const db = await readJson(this.dbPath);
      const existing = toRecord(db[elementName]);

      const currentPrimary = existing.primary;
      const fallbacks = Array.from(new Set(existing.fallbacks ?? []));

      // Ensure used locator is in the set we know about.
      const known = [currentPrimary, ...fallbacks].filter(Boolean);
      const usedIsKnown = known.includes(usedLocator);
      if (!usedIsKnown && usedLocator) {
        fallbacks.unshift(usedLocator);
      }

      const shouldPromote = usedLocator && usedLocator !== currentPrimary;
      let newPrimary = currentPrimary;
      let newFallbacks = fallbacks;

      if (shouldPromote) {
        newPrimary = usedLocator;
        newFallbacks = [currentPrimary, ...fallbacks.filter((f) => f !== usedLocator && f !== currentPrimary)].filter(Boolean);
      }

      db[elementName] = {
        primary: newPrimary,
        fallbacks: newFallbacks,
        successCount: (existing.successCount ?? 0) + 1,
        failureCount: existing.failureCount ?? 0,
        lastUsed: nowIso(),
      };

      if (this.enableWrites) {
        await writeJsonAtomic(this.dbPath, db);
      }

      if (shouldPromote) {
        defaultLogger.success('Locator healed successfully (promoted fallback to primary).', {
          elementName,
          previousPrimary: meta?.previousPrimary ?? currentPrimary,
          newPrimary: usedLocator,
        });
      } else {
        defaultLogger.info('Locator succeeded using primary.', { elementName, primary: newPrimary });
      }

      defaultLogger.info('Memory updated.', { elementName });
    });
  }

  /**
   * Called when all locators (including healing) fail.
   */
  async recordFailure(elementName: string) {
    await this.withLock(async () => {
      const db = await readJson(this.dbPath);
      const existing = toRecord(db[elementName]);
      db[elementName] = {
        ...existing,
        primary: existing.primary ?? '',
        fallbacks: existing.fallbacks ?? [],
        successCount: existing.successCount ?? 0,
        failureCount: (existing.failureCount ?? 0) + 1,
        lastUsed: existing.lastUsed ?? '',
      };
      if (this.enableWrites) {
        await writeJsonAtomic(this.dbPath, db);
      }
    });
  }

  private async withLock<T>(fn: () => Promise<T>, _options?: { readOnly?: boolean }): Promise<T> {
    // If reads-only, still lock briefly to avoid reading half-written temp/rename windows on Windows.
    const lockPath = `${this.dbPath}.lock`;
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    if (!(await fileExists(this.dbPath))) {
      await fs.writeFile(this.dbPath, '{}', 'utf-8');
    }

    const release = await acquireLock(lockPath, {
      timeoutMs: Number(process.env.AI_LOCATOR_LOCK_TIMEOUT_MS ?? 5000),
      staleMs: Number(process.env.AI_LOCATOR_LOCK_STALE_MS ?? 30000),
    });

    try {
      return await fn();
    } finally {
      await release().catch(() => undefined);
    }
  }
}

export const defaultLocatorMemory = new LocatorMemory();
