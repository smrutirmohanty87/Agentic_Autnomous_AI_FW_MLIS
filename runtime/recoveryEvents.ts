import * as fs from 'fs';
import * as path from 'path';

export type RecoveryMemoryHit = 'SEARCHING' | 'HIT' | 'MISS' | 'UNKNOWN';
export type RecoveryRetestResult = 'NOT_RUN' | 'RUNNING' | 'PASSED' | 'FAILED';
export type RecoveryFinalStatus = 'RUNNING' | 'RECOVERED' | 'FAILED';

export interface RecoveryEvent {
  recoveryId: string;
  workflowId: string;
  testName: string;
  failureType: string;
  failedLocator: string;
  memoryHit: RecoveryMemoryHit;
  confidenceScore: number;
  recoveryStrategy: string;
  recoveryStartTime: string;
  recoveryEndTime?: string;
  recoveryDuration?: number;
  retestResult: RecoveryRetestResult;
  finalStatus: RecoveryFinalStatus;
  failureReason?: string;
  updatedAt: string;
}

const ROOT = path.resolve(__dirname, '..');
const TARGETS = [
  path.join(ROOT, 'runtime', 'recovery-events.json'),
  path.join(ROOT, 'dashboard-ui', 'public', 'recovery-events.json'),
];

interface WorkflowMeta {
  workflowId?: string;
  generatedTestName?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function readWorkflowMeta(): WorkflowMeta {
  const workflowFile = path.join(ROOT, 'runtime', 'workflow-status.json');
  try {
    const raw = fs.readFileSync(workflowFile, 'utf8');
    const json = JSON.parse(raw) as { workflowId?: string; generatedTestName?: string };
    return {
      workflowId: json.workflowId,
      generatedTestName: json.generatedTestName,
    };
  } catch {
    return {};
  }
}

function readFromAnyTarget(): RecoveryEvent[] {
  for (const target of TARGETS) {
    try {
      if (!fs.existsSync(target)) continue;
      const raw = fs.readFileSync(target, 'utf8').trim();
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed as RecoveryEvent[];
      return [];
    } catch {
      // try next target
    }
  }
  return [];
}

function writeAll(events: RecoveryEvent[]): void {
  const json = JSON.stringify(events, null, 2);
  for (const target of TARGETS) {
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, json, 'utf8');
    } catch {
      // non-fatal: keep runtime resilient
    }
  }
}

function normalizeTestName(input?: string): string {
  if (input && input.trim().length > 0) return input;
  const meta = readWorkflowMeta();
  return meta.generatedTestName ?? 'Unknown test';
}

function getWorkflowId(input?: string): string {
  if (input && input.trim().length > 0) return input;
  const meta = readWorkflowMeta();
  return meta.workflowId ?? `run-${Date.now()}`;
}

export function resetRecoveryEvents(): void {
  writeAll([]);
}

export function readRecoveryEvents(): RecoveryEvent[] {
  return readFromAnyTarget();
}

export function upsertRecoveryEvent(event: RecoveryEvent): void {
  const events = readFromAnyTarget();
  const idx = events.findIndex(item => item.recoveryId === event.recoveryId);
  if (idx >= 0) {
    events[idx] = event;
  } else {
    events.unshift(event);
  }
  writeAll(events);
}

export function startRecoveryEvent(input: {
  recoveryId: string;
  workflowId?: string;
  testName?: string;
  failureType: string;
  failedLocator: string;
}): RecoveryEvent {
  const startedAt = nowIso();
  const event: RecoveryEvent = {
    recoveryId: input.recoveryId,
    workflowId: getWorkflowId(input.workflowId),
    testName: normalizeTestName(input.testName),
    failureType: input.failureType,
    failedLocator: input.failedLocator,
    memoryHit: 'SEARCHING',
    confidenceScore: 0,
    recoveryStrategy: 'Pending',
    recoveryStartTime: startedAt,
    retestResult: 'RUNNING',
    finalStatus: 'RUNNING',
    updatedAt: startedAt,
  };

  upsertRecoveryEvent(event);
  return event;
}

export function patchRecoveryEvent(
  recoveryId: string,
  patch: Partial<Omit<RecoveryEvent, 'recoveryId' | 'workflowId' | 'recoveryStartTime'>>,
): RecoveryEvent | null {
  const events = readFromAnyTarget();
  const idx = events.findIndex(item => item.recoveryId === recoveryId);
  if (idx < 0) return null;

  const next: RecoveryEvent = {
    ...events[idx],
    ...patch,
    updatedAt: nowIso(),
  };

  if (next.finalStatus !== 'RUNNING' && !next.recoveryEndTime) {
    next.recoveryEndTime = nowIso();
  }

  if (next.recoveryEndTime) {
    const startMs = new Date(next.recoveryStartTime).getTime();
    const endMs = new Date(next.recoveryEndTime).getTime();
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs >= startMs) {
      next.recoveryDuration = endMs - startMs;
    }
  }

  events[idx] = next;
  writeAll(events);
  return next;
}

export function finalizeRecoveryEvent(input: {
  recoveryId: string;
  retestResult: RecoveryRetestResult;
  finalStatus: RecoveryFinalStatus;
  failureReason?: string;
}): RecoveryEvent | null {
  return patchRecoveryEvent(input.recoveryId, {
    retestResult: input.retestResult,
    finalStatus: input.finalStatus,
    failureReason: input.failureReason,
    recoveryEndTime: nowIso(),
  });
}
