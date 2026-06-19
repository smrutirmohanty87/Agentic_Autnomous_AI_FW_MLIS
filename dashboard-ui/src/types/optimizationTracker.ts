export type OptimizationPhase = 'Compression' | 'Cache' | 'Template Library' | 'Completed';

export type OptimizationPhaseState = 'PENDING' | 'ACTIVE' | 'COMPLETE';

export interface OptimizationTimelineEntry {
  phase: OptimizationPhase;
  state: OptimizationPhaseState;
  detail?: string;
}

export interface OptimizationTrackerData {
  currentOptimizationPhase: OptimizationPhase;
  originalTokens: number;
  compressedTokens: number;
  tokensSaved: number;
  cacheResult: 'HIT' | 'MISS' | 'PENDING';
  templateMatch: 'HIT' | 'MISS' | 'PENDING';
  runningTotalTokensSaved: number;
  estimatedCostSaved: number;
  frozen: boolean;
  updatedAt: string;
  timeline: OptimizationTimelineEntry[];
}