/**
 * src/types/tokenOptimization.ts
 *
 * Type definitions for the Token Optimization Center.
 * Covers Prompt Compression, Requirement Cache, and Template Library agents.
 */

// ---------------------------------------------------------------------------
// Token Savings Stats (from token-stats.json)
// ---------------------------------------------------------------------------

export interface TokenSavingDetail {
  requirement: string;
  originalTokens: number;
  compressedTokens: number;
  reductionPercent: number;
  timestamp: string;
}

export interface TokenTrendPoint {
  day: string;
  saved: number;
}

export interface TokenStats {
  totalOriginalTokens: number;
  totalCompressedTokens: number;
  totalSavedTokens: number;
  compressionRatio: number;
  trend: TokenTrendPoint[];
  details: TokenSavingDetail[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Cache Stats (from cache-stats.json)
// ---------------------------------------------------------------------------

export interface CacheHitDetail {
  requirement: string;
  requirementHash: string;
  hitTimestamp: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  total: number;
  hitRate: number;
  plannerCallsAvoided: number;
  designerCallsAvoided: number;
  details: CacheHitDetail[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Template Stats (from template-stats.json)
// ---------------------------------------------------------------------------

export interface TemplateHitDetail {
  requirement: string;
  templateUsed: string;
  templateName: string;
  confidenceScore: number;
  timestamp: string;
}

export interface TemplateStats {
  hits: number;
  misses: number;
  total: number;
  hitRate: number;
  details: TemplateHitDetail[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Cost Stats (from cost-stats.json)
// ---------------------------------------------------------------------------

export interface CostBreakdown {
  compressionSavings: number;
  cacheSavings: number;
  templateSavings: number;
}

export interface CostStats {
  costPerThousandTokens: number;
  estimatedCostWithoutOptimization: number;
  estimatedCurrentCost: number;
  estimatedSavings: number;
  currency: string;
  breakdown: CostBreakdown;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Combined Token Optimization Data
// ---------------------------------------------------------------------------

export interface TokenOptimizationData {
  tokenStats: TokenStats | null;
  cacheStats: CacheStats | null;
  templateStats: TemplateStats | null;
  costStats: CostStats | null;
}

// ---------------------------------------------------------------------------
// Token Metric Types (for drill-down integration)
// ---------------------------------------------------------------------------

export type TokenMetricType =
  | 'tokensSaved'
  | 'tokenReduction'
  | 'cacheHits'
  | 'cacheMisses'
  | 'templateHits'
  | 'plannerCallsAvoided'
  | 'designerCallsAvoided'
  | 'costSaved';
