/// <reference types="node" />

import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import {
  startRecoveryEvent,
  patchRecoveryEvent,
} from '../../runtime/recoveryEvents';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function acquireLock(lockPath: string, options?: { timeoutMs?: number; staleMs?: number }): Promise<() => Promise<void>> {
  const timeoutMs = options?.timeoutMs ?? 5000;
  const staleMs = options?.staleMs ?? 30000;
  const startedAt = Date.now();
  let delay = 25;

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

      try {
        const stat = fsSync.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > staleMs) {
          fsSync.unlinkSync(lockPath);
          continue;
        }
      } catch {
        // Retry until the lock clears.
      }

      if (Date.now() - startedAt > timeoutMs) {
        throw new Error(`Timed out waiting for self-healing memory lock: ${lockPath}`);
      }

      await sleep(delay);
      delay = Math.min(Math.floor(delay * 1.5), 250);
    }
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

export interface HealPatternRecord {
  failedLocator: string;
  recoveredLocator: string;
  recoveryStrategy: string;
  successCount: number;
  lastUsedTimestamp: string;
}

export interface HealReuseRecord {
  memoryHitTimestamp: string;
  patternUsed: string;
  recoveryTimeMs: number;
  failedLocator: string;
  recoveredLocator: string;
}

export interface HealMemoryLiveState {
  failedLocator: string;
  searchingMemory: string;
  memoryHitStatus: 'SEARCHING' | 'HIT' | 'MISS';
  strategySelected: string;
  recoveryApplied: string;
  retestStatus: string;
  updatedAt: string;
}

export interface HealMemoryStats {
  knownHealPatterns: number;
  autoReusedPatterns: number;
  learningSuccessRate: number;
  averageRecoveryTimeMs: number;
  knowledgeBaseSize: number;
  memorySearches: number;
  memoryHits: number;
  memoryMisses: number;
}

export interface HealMemorySnapshot {
  updatedAt: string;
  knowledgeBase: HealPatternRecord[];
  autoReusedPatterns: HealReuseRecord[];
  stats: HealMemoryStats;
  currentSession: HealMemoryLiveState | null;
}

const ROOT = path.resolve(process.cwd());
const SOURCE_FILE = path.join(ROOT, 'healing', 'memory', 'heal-patterns.json');
const PUBLIC_FILE = path.join(ROOT, 'dashboard-ui', 'public', 'healing', 'memory', 'heal-patterns.json');
const LOCK_FILE = `${SOURCE_FILE}.lock`;

function defaultStats(): HealMemoryStats {
  return {
    knownHealPatterns: 0,
    autoReusedPatterns: 0,
    learningSuccessRate: 0,
    averageRecoveryTimeMs: 0,
    knowledgeBaseSize: 0,
    memorySearches: 0,
    memoryHits: 0,
    memoryMisses: 0,
  };
}

function defaultSnapshot(): HealMemorySnapshot {
  return {
    updatedAt: nowIso(),
    knowledgeBase: [],
    autoReusedPatterns: [],
    stats: defaultStats(),
    currentSession: null,
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath: string): Promise<HealMemorySnapshot> {
  if (!(await fileExists(filePath))) {
    return defaultSnapshot();
  }

  const raw = await fs.readFile(filePath, 'utf-8');
  if (!raw.trim()) {
    return defaultSnapshot();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<HealMemorySnapshot>;
    return normalizeSnapshot(parsed);
  } catch {
    return defaultSnapshot();
  }
}

async function writeJsonAtomic(filePath: string, data: HealMemorySnapshot): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const content = JSON.stringify(data, null, 2);
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  await fs.writeFile(tmp, content, 'utf-8');

  try {
    await fs.rename(tmp, filePath);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'EPERM' || code === 'EBUSY' || code === 'EACCES') {
      await fs.writeFile(filePath, content, 'utf-8');
      await fs.unlink(tmp).catch(() => undefined);
      return;
    }
    await fs.unlink(tmp).catch(() => undefined);
    throw error;
  }
}

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizePattern(value: unknown): HealPatternRecord | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<HealPatternRecord>;
  if (!candidate.failedLocator || !candidate.recoveredLocator || !candidate.recoveryStrategy) return null;
  return {
    failedLocator: candidate.failedLocator,
    recoveredLocator: candidate.recoveredLocator,
    recoveryStrategy: candidate.recoveryStrategy,
    successCount: safeNumber(candidate.successCount),
    lastUsedTimestamp: typeof candidate.lastUsedTimestamp === 'string' ? candidate.lastUsedTimestamp : nowIso(),
  };
}

function normalizeReuse(value: unknown): HealReuseRecord | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<HealReuseRecord>;
  if (!candidate.memoryHitTimestamp || !candidate.patternUsed || !candidate.failedLocator || !candidate.recoveredLocator) return null;
  return {
    memoryHitTimestamp: candidate.memoryHitTimestamp,
    patternUsed: candidate.patternUsed,
    recoveryTimeMs: safeNumber(candidate.recoveryTimeMs),
    failedLocator: candidate.failedLocator,
    recoveredLocator: candidate.recoveredLocator,
  };
}

function normalizeSession(value: unknown): HealMemoryLiveState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<HealMemoryLiveState>;
  if (!candidate.failedLocator) return null;
  return {
    failedLocator: candidate.failedLocator,
    searchingMemory: typeof candidate.searchingMemory === 'string' ? candidate.searchingMemory : 'Searching memory',
    memoryHitStatus: candidate.memoryHitStatus === 'HIT' || candidate.memoryHitStatus === 'MISS' || candidate.memoryHitStatus === 'SEARCHING'
      ? candidate.memoryHitStatus
      : 'SEARCHING',
    strategySelected: typeof candidate.strategySelected === 'string' ? candidate.strategySelected : 'Pending',
    recoveryApplied: typeof candidate.recoveryApplied === 'string' ? candidate.recoveryApplied : 'Pending',
    retestStatus: typeof candidate.retestStatus === 'string' ? candidate.retestStatus : 'Pending',
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : nowIso(),
  };
}

function recomputeStats(snapshot: HealMemorySnapshot): HealMemorySnapshot {
  const totalRecoveryTime = snapshot.autoReusedPatterns.reduce((sum, item) => sum + safeNumber(item.recoveryTimeMs), 0);
  const searchCount = snapshot.stats.memorySearches;
  const hits = snapshot.stats.memoryHits;

  snapshot.stats.knownHealPatterns = snapshot.knowledgeBase.length;
  snapshot.stats.autoReusedPatterns = snapshot.autoReusedPatterns.length;
  snapshot.stats.knowledgeBaseSize = snapshot.knowledgeBase.length;
  snapshot.stats.averageRecoveryTimeMs = snapshot.autoReusedPatterns.length > 0
    ? Math.round(totalRecoveryTime / snapshot.autoReusedPatterns.length)
    : 0;
  snapshot.stats.learningSuccessRate = searchCount > 0 ? Math.round((hits / searchCount) * 100) : 0;
  return snapshot;
}

function normalizeSnapshot(value?: Partial<HealMemorySnapshot>): HealMemorySnapshot {
  const snapshot = defaultSnapshot();
  snapshot.updatedAt = typeof value?.updatedAt === 'string' ? value.updatedAt : snapshot.updatedAt;
  snapshot.knowledgeBase = Array.isArray(value?.knowledgeBase)
    ? value!.knowledgeBase!.map(normalizePattern).filter((item): item is HealPatternRecord => Boolean(item))
    : [];
  snapshot.autoReusedPatterns = Array.isArray(value?.autoReusedPatterns)
    ? value!.autoReusedPatterns!.map(normalizeReuse).filter((item): item is HealReuseRecord => Boolean(item))
    : [];
  snapshot.stats = {
    ...defaultStats(),
    ...(typeof value?.stats === 'object' && value?.stats ? {
      knownHealPatterns: safeNumber(value.stats.knownHealPatterns),
      autoReusedPatterns: safeNumber(value.stats.autoReusedPatterns),
      learningSuccessRate: safeNumber(value.stats.learningSuccessRate),
      averageRecoveryTimeMs: safeNumber(value.stats.averageRecoveryTimeMs),
      knowledgeBaseSize: safeNumber(value.stats.knowledgeBaseSize),
      memorySearches: safeNumber(value.stats.memorySearches),
      memoryHits: safeNumber(value.stats.memoryHits),
      memoryMisses: safeNumber(value.stats.memoryMisses),
    } : {}),
  };
  snapshot.currentSession = normalizeSession(value?.currentSession ?? null);
  return recomputeStats(snapshot);
}

async function syncSnapshot(snapshot: HealMemorySnapshot): Promise<void> {
  await writeJsonAtomic(SOURCE_FILE, snapshot);
  await writeJsonAtomic(PUBLIC_FILE, snapshot);
}

function mapRetestResult(value: string): 'NOT_RUN' | 'RUNNING' | 'PASSED' | 'FAILED' {
  const text = value.toUpperCase();
  if (text.includes('PASS')) return 'PASSED';
  if (text.includes('FAIL')) return 'FAILED';
  if (text.includes('RUNNING') || text.includes('PENDING')) return 'RUNNING';
  return 'NOT_RUN';
}

function mapFinalStatus(retestResult: 'NOT_RUN' | 'RUNNING' | 'PASSED' | 'FAILED'): 'RUNNING' | 'RECOVERED' | 'FAILED' {
  if (retestResult === 'PASSED') return 'RECOVERED';
  if (retestResult === 'FAILED') return 'FAILED';
  return 'RUNNING';
}

function confidenceForMemoryHit(status: HealMemoryLiveState['memoryHitStatus']): number {
  if (status === 'HIT') return 96;
  if (status === 'MISS') return 35;
  return 0;
}

function syncRecoveryEventFromSession(session: HealMemoryLiveState | null): void {
  if (!session?.failedLocator) return;

  const recoveryId = `memory-${session.failedLocator}`;
  const retestResult = mapRetestResult(session.retestStatus);
  const finalStatus = mapFinalStatus(retestResult);

  const patched = patchRecoveryEvent(recoveryId, {
    failedLocator: session.failedLocator,
    memoryHit: session.memoryHitStatus,
    confidenceScore: confidenceForMemoryHit(session.memoryHitStatus),
    recoveryStrategy: session.strategySelected || 'Pending',
    retestResult,
    finalStatus,
  });

  if (patched) return;

  startRecoveryEvent({
    recoveryId,
    failureType: 'LocatorBreakage',
    failedLocator: session.failedLocator,
  });

  patchRecoveryEvent(recoveryId, {
    memoryHit: session.memoryHitStatus,
    confidenceScore: confidenceForMemoryHit(session.memoryHitStatus),
    recoveryStrategy: session.strategySelected || 'Pending',
    retestResult,
    finalStatus,
  });
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  await fs.mkdir(path.dirname(SOURCE_FILE), { recursive: true });
  if (!(await fileExists(SOURCE_FILE))) {
    await syncSnapshot(defaultSnapshot());
  }

  const release = await acquireLock(LOCK_FILE, { timeoutMs: 5000, staleMs: 30000 });
  try {
    return await fn();
  } finally {
    await release().catch(() => undefined);
  }
}

function upsertPattern(snapshot: HealMemorySnapshot, input: { failedLocator: string; recoveredLocator: string; recoveryStrategy: string }): HealPatternRecord {
  const existing = snapshot.knowledgeBase.find(
    pattern => pattern.failedLocator === input.failedLocator && pattern.recoveredLocator === input.recoveredLocator && pattern.recoveryStrategy === input.recoveryStrategy,
  );

  if (existing) {
    existing.successCount += 1;
    existing.lastUsedTimestamp = nowIso();
    return existing;
  }

  const record: HealPatternRecord = {
    failedLocator: input.failedLocator,
    recoveredLocator: input.recoveredLocator,
    recoveryStrategy: input.recoveryStrategy,
    successCount: 1,
    lastUsedTimestamp: nowIso(),
  };
  snapshot.knowledgeBase.unshift(record);
  return record;
}

export async function readHealMemorySnapshot(): Promise<HealMemorySnapshot> {
  return withLock(async () => readJson(SOURCE_FILE));
}

export async function lookupHealPattern(failedLocator: string): Promise<HealPatternRecord | null> {
  const snapshot = await readHealMemorySnapshot();
  return snapshot.knowledgeBase.find(pattern => pattern.failedLocator === failedLocator) ?? null;
}

export async function publishHealMemorySession(session: HealMemoryLiveState | null): Promise<void> {
  await withLock(async () => {
    const snapshot = normalizeSnapshot(await readJson(SOURCE_FILE));
    snapshot.currentSession = session ? normalizeSession(session) : null;
    snapshot.updatedAt = nowIso();
    await syncSnapshot(recomputeStats(snapshot));
    syncRecoveryEventFromSession(snapshot.currentSession);
  });
}

export async function recordHealMemorySearch(input: {
  failedLocator: string;
  hit: boolean;
  patternUsed?: string;
  recoveredLocator?: string;
  recoveryTimeMs?: number;
}): Promise<void> {
  await withLock(async () => {
    const snapshot = normalizeSnapshot(await readJson(SOURCE_FILE));
    snapshot.stats.memorySearches += 1;
    if (input.hit) {
      snapshot.stats.memoryHits += 1;
      const pattern = input.recoveredLocator
        ? upsertPattern(snapshot, {
            failedLocator: input.failedLocator,
            recoveredLocator: input.recoveredLocator,
            recoveryStrategy: input.patternUsed ?? input.recoveredLocator,
          })
        : null;

      if (pattern) {
        pattern.lastUsedTimestamp = nowIso();
      }

      if (input.patternUsed && input.recoveredLocator) {
        snapshot.autoReusedPatterns.unshift({
          memoryHitTimestamp: nowIso(),
          patternUsed: input.patternUsed,
          recoveryTimeMs: safeNumber(input.recoveryTimeMs),
          failedLocator: input.failedLocator,
          recoveredLocator: input.recoveredLocator,
        });
      }
    } else {
      snapshot.stats.memoryMisses += 1;
    }

    snapshot.updatedAt = nowIso();
    await syncSnapshot(recomputeStats(snapshot));
  });
}

export async function recordHealPatternLearning(input: {
  failedLocator: string;
  recoveredLocator: string;
  recoveryStrategy: string;
}): Promise<void> {
  await withLock(async () => {
    const snapshot = normalizeSnapshot(await readJson(SOURCE_FILE));
    upsertPattern(snapshot, input);
    snapshot.updatedAt = nowIso();
    await syncSnapshot(recomputeStats(snapshot));
  });
}
