export type AgentStatus = 'SUCCESS' | 'FAILED' | 'RUNNING' | 'PENDING';

export interface Kpis {
  workflowStatus: AgentStatus;
  testsPassed: number;
  testsFailed: number;
  healEvents: number;
  healingActivity?: string;
  successfulHeals?: number;
  rcaEvents: number;
  executionDurationMs?: number;
}

export interface AgentRecord {
  name: 'Planner' | 'Designer' | 'Generator' | 'Execution' | 'Healing' | 'RCA';
  status: AgentStatus;
  durationMs: number;
}

export interface RcaRecord {
  failureType: string;
  rootCause: string;
  recoveryAction: string;
  confidence: number;
}

export interface HealingRecord {
  key?: string;
  failedLocator?: string;
  recoveredLocator?: string;
  failedStrategyIndex?: number;
  failedStrategy?: {
    type: string;
    value?: string;
    selector?: string;
    role?: string;
    options?: Record<string, unknown>;
    exact?: boolean;
  };
  healedStrategyIndex?: number;
  healedStrategy?: {
    type: string;
    value?: string;
    selector?: string;
    role?: string;
    options?: Record<string, unknown>;
    exact?: boolean;
  };
  recoveryTimeMs?: number;
  recoveryStatus?: AgentStatus;
  timestamp?: string;
  pageUrl?: string;
}

export interface TrendRecord {
  run: string;
  passed: number;
  failed: number;
}

export interface EventDistribution {
  name: string;
  value: number;
}

export interface AgentDuration {
  agent: string;
  durationMs: number;
}

export interface DashboardData {
  title: string;
  generatedAt: string;
  kpis: Kpis;
  agents: AgentRecord[];
  rcaSummary: RcaRecord[];
  healingAnalytics: HealingRecord[];
  workflowTimeline: string[];
  visualizations: {
    testTrend: TrendRecord[];
    eventDistribution: EventDistribution[];
    agentDurations: AgentDuration[];
  };
}

// ---------------------------------------------------------------------------
// Live workflow status (runtime/workflow-status.json)
// ---------------------------------------------------------------------------

export type WorkflowAgentState = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
export type WorkflowOverallStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface WorkflowAgentEntry {
  name: 'Planner' | 'Designer' | 'Generator' | 'Execution' | 'Healing' | 'RCA';
  state: WorkflowAgentState;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
}

export interface WorkflowStatus {
  workflowId: string;
  startedAt: string;
  completedAt?: string;
  overallStatus: WorkflowOverallStatus;
  currentAgent: WorkflowAgentEntry['name'] | null;
  agents: WorkflowAgentEntry[];
}
