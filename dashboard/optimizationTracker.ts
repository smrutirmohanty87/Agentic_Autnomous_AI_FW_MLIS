import { writeFileSync } from 'fs';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type {
  OptimizationPhase,
  OptimizationPhaseState,
  OptimizationTimelineEntry,
  OptimizationTrackerData,
} from '../dashboard-ui/src/types/optimizationTracker';
import type {
  CacheStats,
  CostStats,
  TemplateStats,
  TokenStats,
} from '../dashboard-ui/src/types/tokenOptimization';

const DEFAULT_COST_PER_THOUSAND_TOKENS = 0.002;
const OUTPUT_PATH = resolve(__dirname, '../dashboard-ui/public/optimization-tracker.json');
const TOKEN_STATS_PATH = resolve(__dirname, '../dashboard-ui/public/token-stats.json');
const CACHE_STATS_PATH = resolve(__dirname, '../dashboard-ui/public/cache-stats.json');
const TEMPLATE_STATS_PATH = resolve(__dirname, '../dashboard-ui/public/template-stats.json');
const COST_STATS_PATH = resolve(__dirname, '../dashboard-ui/public/cost-stats.json');

function phaseStateFor(currentPhase: OptimizationPhase, phase: OptimizationPhase, frozen: boolean): OptimizationPhaseState {
  if (frozen) return 'COMPLETE';
  if (phase === currentPhase) return 'ACTIVE';

  const order: OptimizationPhase[] = ['Compression', 'Cache', 'Template Library', 'Completed'];
  return order.indexOf(phase) < order.indexOf(currentPhase) ? 'COMPLETE' : 'PENDING';
}

function buildTimeline(currentPhase: OptimizationPhase, frozen: boolean): OptimizationTimelineEntry[] {
  const phases: OptimizationPhase[] = ['Compression', 'Cache', 'Template Library', 'Completed'];
  return phases.map(phase => ({
    phase,
    state: phaseStateFor(currentPhase, phase, frozen),
    detail:
      phase === 'Compression'
        ? 'Prompt Compression Agent reduced the requirement into a compact workflow prompt.'
        : phase === 'Cache'
        ? 'Requirement Cache Agent evaluated reuse and skip eligibility.'
        : phase === 'Template Library'
        ? 'Template Library Agent matched reusable workflow structure.'
        : frozen
        ? 'Final optimization snapshot frozen after workflow completion.'
        : 'Awaiting final workflow completion.',
  }));
}

export interface OptimizationTrackerSnapshotInput {
  currentOptimizationPhase: OptimizationPhase;
  originalTokens: number;
  compressedTokens: number;
  cacheResult: 'HIT' | 'MISS' | 'PENDING';
  templateMatch: 'HIT' | 'MISS' | 'PENDING';
  runningTotalTokensSaved?: number;
  estimatedCostSaved?: number;
  frozen?: boolean;
  costPerThousandTokens?: number;
}

export function buildOptimizationTrackerPayload(
  input: OptimizationTrackerSnapshotInput,
): OptimizationTrackerData {
  const tokensSaved = Math.max(0, input.originalTokens - input.compressedTokens);
  const runningTotalTokensSaved = input.runningTotalTokensSaved ?? tokensSaved;
  const costPerThousandTokens = input.costPerThousandTokens ?? DEFAULT_COST_PER_THOUSAND_TOKENS;
  const estimatedCostSaved =
    input.estimatedCostSaved ?? (runningTotalTokensSaved / 1000) * costPerThousandTokens;
  const frozen = input.frozen ?? false;

  return {
    currentOptimizationPhase: input.currentOptimizationPhase,
    originalTokens: input.originalTokens,
    compressedTokens: input.compressedTokens,
    tokensSaved,
    cacheResult: input.cacheResult,
    templateMatch: input.templateMatch,
    runningTotalTokensSaved,
    estimatedCostSaved,
    frozen,
    updatedAt: new Date().toISOString(),
    timeline: buildTimeline(input.currentOptimizationPhase, frozen),
  };
}

export function writeOptimizationTrackerSnapshot(
  input: OptimizationTrackerSnapshotInput,
): OptimizationTrackerData {
  const payload = buildOptimizationTrackerPayload(input);
  writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  return payload;
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

export function writeOptimizationCenterSnapshot(
  input: OptimizationTrackerSnapshotInput,
): void {
  const payload = buildOptimizationTrackerPayload(input);
  const costPerThousandTokens = input.costPerThousandTokens ?? DEFAULT_COST_PER_THOUSAND_TOKENS;
  const addedSavings = (payload.tokensSaved / 1000) * costPerThousandTokens;

  const tokenStats = readJson<TokenStats>(TOKEN_STATS_PATH) ?? {
    totalOriginalTokens: 0,
    totalCompressedTokens: 0,
    totalSavedTokens: 0,
    compressionRatio: 0,
    trend: [],
    details: [],
    updatedAt: new Date().toISOString(),
  };

  tokenStats.totalOriginalTokens += payload.originalTokens;
  tokenStats.totalCompressedTokens += payload.compressedTokens;
  tokenStats.totalSavedTokens += payload.tokensSaved;
  tokenStats.compressionRatio = tokenStats.totalOriginalTokens > 0
    ? Math.round((tokenStats.totalSavedTokens / tokenStats.totalOriginalTokens) * 100)
    : 0;
  tokenStats.trend = [...tokenStats.trend, { day: new Date().toLocaleDateString('en-US', { weekday: 'short' }), saved: payload.tokensSaved }];
  tokenStats.details = [...tokenStats.details, {
    requirement: 'Live workflow optimization',
    originalTokens: payload.originalTokens,
    compressedTokens: payload.compressedTokens,
    reductionPercent: payload.originalTokens > 0 ? Math.round((payload.tokensSaved / payload.originalTokens) * 100) : 0,
    timestamp: payload.updatedAt,
  }];
  tokenStats.updatedAt = payload.updatedAt;

  const cacheStats = readJson<CacheStats>(CACHE_STATS_PATH) ?? {
    hits: 0,
    misses: 0,
    total: 0,
    hitRate: 0,
    plannerCallsAvoided: 0,
    designerCallsAvoided: 0,
    details: [],
    updatedAt: new Date().toISOString(),
  };
  cacheStats.hits += payload.cacheResult === 'HIT' ? 1 : 0;
  cacheStats.misses += payload.cacheResult === 'MISS' ? 1 : 0;
  cacheStats.total += 1;
  cacheStats.hitRate = cacheStats.total > 0 ? Math.round((cacheStats.hits / cacheStats.total) * 100) : 0;
  if (payload.cacheResult === 'HIT') {
    cacheStats.plannerCallsAvoided += 1;
    cacheStats.designerCallsAvoided += 1;
  }
  cacheStats.details = [...cacheStats.details, {
    requirement: 'Live workflow optimization',
    requirementHash: `optimization-${Date.now()}`,
    hitTimestamp: payload.updatedAt,
  }];
  cacheStats.updatedAt = payload.updatedAt;

  const templateStats = readJson<TemplateStats>(TEMPLATE_STATS_PATH) ?? {
    hits: 0,
    misses: 0,
    total: 0,
    hitRate: 0,
    details: [],
    updatedAt: new Date().toISOString(),
  };
  templateStats.hits += payload.templateMatch === 'HIT' ? 1 : 0;
  templateStats.misses += payload.templateMatch === 'MISS' ? 1 : 0;
  templateStats.total += 1;
  templateStats.hitRate = templateStats.total > 0 ? Math.round((templateStats.hits / templateStats.total) * 100) : 0;
  if (payload.templateMatch === 'HIT') {
    templateStats.details = [...templateStats.details, {
      requirement: 'Live workflow optimization',
      templateUsed: 'optimization-tracker',
      templateName: 'Live Optimization Tracker',
      confidenceScore: 1,
      timestamp: payload.updatedAt,
    }];
  }
  templateStats.updatedAt = payload.updatedAt;

  const costStats = readJson<CostStats>(COST_STATS_PATH) ?? {
    costPerThousandTokens,
    estimatedCostWithoutOptimization: 0,
    estimatedCurrentCost: 0,
    estimatedSavings: 0,
    currency: 'USD',
    breakdown: {
      compressionSavings: 0,
      cacheSavings: 0,
      templateSavings: 0,
    },
    updatedAt: new Date().toISOString(),
  };
  costStats.costPerThousandTokens = costPerThousandTokens;
  costStats.estimatedCostWithoutOptimization = tokenStats.totalOriginalTokens / 1000 * costPerThousandTokens;
  costStats.estimatedSavings += addedSavings;
  costStats.estimatedCurrentCost = Math.max(0, costStats.estimatedCostWithoutOptimization - costStats.estimatedSavings);
  costStats.breakdown.compressionSavings += addedSavings;
  costStats.updatedAt = payload.updatedAt;

  writeFileSync(TOKEN_STATS_PATH, JSON.stringify(tokenStats, null, 2), 'utf-8');
  writeFileSync(CACHE_STATS_PATH, JSON.stringify(cacheStats, null, 2), 'utf-8');
  writeFileSync(TEMPLATE_STATS_PATH, JSON.stringify(templateStats, null, 2), 'utf-8');
  writeFileSync(COST_STATS_PATH, JSON.stringify(costStats, null, 2), 'utf-8');
}