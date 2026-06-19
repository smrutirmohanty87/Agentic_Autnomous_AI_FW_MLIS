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

export interface HealMemoryData {
  updatedAt: string;
  knowledgeBase: HealPatternRecord[];
  autoReusedPatterns: HealReuseRecord[];
  stats: HealMemoryStats;
  currentSession: HealMemoryLiveState | null;
}

export type SelfHealingMemoryMetricType =
  | 'knownHealPatterns'
  | 'autoReusedPatterns'
  | 'learningSuccessRate'
  | 'averageRecoveryTime'
  | 'knowledgeBaseSize';
