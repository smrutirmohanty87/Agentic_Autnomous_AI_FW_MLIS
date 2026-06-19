/**
 * Demo Mode Types
 * Defines the structure for demo mode visualization and state management
 */

export type DemoPhase =
  | 'requirement'
  | 'compression'
  | 'cache'
  | 'template'
  | 'planner'
  | 'designer'
  | 'generator'
  | 'execution'
  | 'healing'
  | 'rca'
  | 'replay';

export type DemoAgentStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface DemoPhaseConfig {
  phase: DemoPhase;
  label: string;
  description: string;
  icon: string;
  duration: number; // milliseconds to display before transition
  order: number;
}

export interface DemoAgentTransition {
  agent: string;
  status: DemoAgentStatus;
  duration: number; // milliseconds elapsed
  startTime: number; // timestamp
  endTime?: number; // timestamp
  output?: {
    generated?: number; // e.g., test cases count
    tokenCost?: number;
    cached?: boolean;
    cacheHits?: number;
    templateMatch?: string;
    confidence?: number;
    [key: string]: any;
  };
  error?: string;
}

export interface DemoOptimizationMetrics {
  compression?: {
    original: number;
    compressed: number;
    saved: number;
    percentage: number;
  };
  cache?: {
    result: 'HIT' | 'MISS';
    hits?: number;
    misses?: number;
  };
  template?: {
    matched: string;
    confidence: number;
  };
}

export interface DemoExecutionMetrics {
  currentTest?: string;
  totalTests?: number;
  passed?: number;
  failed?: number;
  progressPercent?: number;
  status?: 'RUNNING' | 'PASSED' | 'FAILED';
}

export interface DemoHealingEvent {
  step: 'failureDetected' | 'searchingMemory' | 'patternFound' | 'recoveryApplied' | 'retestRunning' | 'recovered';
  label: string;
  description: string;
  timestamp: number;
}

export interface DemoRCAResult {
  rootCause: string;
  confidence: number;
  recommendedFix: string;
  affectedComponent: string;
}

export interface DemoSummary {
  totalExecutionTime: number; // milliseconds
  tokensSaved?: number;
  cacheHits?: number;
  templateHits?: number;
  healingEvents?: number;
  recoverySuccessRate?: number;
  estimatedCostSaved?: number;
  phaseTimes: Record<DemoPhase, number>; // Time spent in each phase
}

export interface DemoState {
  enabled: boolean;
  isRunning: boolean;
  currentPhase: DemoPhase;
  currentPhaseIndex: number;
  phases: DemoPhaseConfig[];
  agentTransitions: DemoAgentTransition[];
  optimizationMetrics: DemoOptimizationMetrics;
  executionMetrics: DemoExecutionMetrics;
  healingEvents: DemoHealingEvent[];
  rcaResult?: DemoRCAResult;
  summary?: DemoSummary;
  startTime?: number;
  completedPhases: DemoPhase[];
  executiveMode: boolean; // Enhanced visualization mode
}

export interface DemoModeConfig {
  enabled: boolean;
  executiveMode?: boolean;
  autoPlay?: boolean;
  phaseDurations?: Record<DemoPhase, number>;
}
