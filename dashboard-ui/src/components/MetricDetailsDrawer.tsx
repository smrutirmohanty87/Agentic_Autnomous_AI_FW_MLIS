import { X } from 'lucide-react';
import type { DashboardData, WorkflowStatus, HealingRecord, RcaRecord } from '../types/dashboard';
import type {
  TokenStats,
  CacheStats,
  TemplateStats,
  CostStats,
  TokenMetricType,
} from '../types/tokenOptimization';
import type { HealMemoryData, SelfHealingMemoryMetricType } from '../types/selfHealingMemory';
import type { RecoveryEvent, RecoveryMetricType } from '../types/recoveryEvents';

type CoreMetricType =
  | 'workflowStatus'
  | 'testsPassed'
  | 'testsFailed'
  | 'healEvents'
  | 'healingActivity'
  | 'rcaEvents'
  | 'recoveryRate'
  | 'executionDuration';

export type MetricType = CoreMetricType | TokenMetricType | SelfHealingMemoryMetricType | RecoveryMetricType;

interface MetricDetailsDrawerProps {
  isOpen: boolean;
  metricType: MetricType | null;
  dashboardData: DashboardData | null;
  workflowStatus: WorkflowStatus | null;
  healingAnalyticsRecords: HealingRecord[];
  rcaSummaryRecords: RcaRecord[];
  testsPassed: number;
  testsFailed: number;
  healEvents: number;
  successfulHeals: number;
  executionDurationMs?: number;
  // Token Optimization data (optional — drawer remains backward-compatible)
  tokenStats?: TokenStats | null;
  cacheStats?: CacheStats | null;
  templateStats?: TemplateStats | null;
  costStats?: CostStats | null;
  healingMemoryData?: HealMemoryData | null;
  recoveryEvents?: RecoveryEvent[];
  onClose: () => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function formatTimestamp(isoString?: string): string {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
}

function formatStrategy(strategy?: any): string {
  if (!strategy) return 'Unknown';
  if (strategy.type === 'xpath') return `XPath: ${strategy.value || 'N/A'}`;
  if (strategy.type === 'css') return `CSS: ${strategy.selector || 'N/A'}`;
  if (strategy.type === 'role') return `Role: ${strategy.role || 'N/A'}`;
  if (strategy.type === 'text') return `Text: ${strategy.value || 'N/A'}`;
  return strategy.type || 'Unknown';
}

// Render content based on metric type
function renderMetricContent(
  metricType: CoreMetricType,
  {
    dashboardData,
    workflowStatus,
    healingAnalyticsRecords,
    rcaSummaryRecords,
    testsPassed,
    testsFailed,
    healEvents,
    successfulHeals,
    executionDurationMs,
  }: Pick<MetricDetailsDrawerProps, 'dashboardData' | 'workflowStatus' | 'healingAnalyticsRecords' | 'rcaSummaryRecords' | 'testsPassed' | 'testsFailed' | 'healEvents' | 'successfulHeals' | 'executionDurationMs'>
): React.ReactNode {
  switch (metricType) {
    case 'workflowStatus': {
      if (!workflowStatus && !dashboardData?.agents) {
        return <p className="text-slate-400">No detailed data available</p>;
      }

      const agents = workflowStatus?.agents ?? dashboardData?.agents ?? [];
      const startTime = workflowStatus?.startedAt ?? dashboardData?.generatedAt;
      const endTime = workflowStatus?.completedAt;

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-400">Overall Status</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                {workflowStatus?.overallStatus ?? 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Workflow ID</p>
              <p className="mt-1 truncate text-sm font-mono text-slate-300">
                {workflowStatus?.workflowId ?? 'N/A'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400">Requirement</p>
            <p className="mt-1 text-sm text-slate-300">
              {workflowStatus?.requirement ?? dashboardData?.requirement ?? 'N/A'}
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-medium text-slate-400">Pipeline Stages</p>
            <div className="space-y-2 rounded-lg bg-slate-800/50 p-3">
              {agents.map((agent, idx) => {
                const statusColor =
                  agent.status === 'SUCCESS'
                    ? 'text-emerald-400'
                    : agent.status === 'FAILED'
                    ? 'text-rose-400'
                    : agent.status === 'RUNNING'
                    ? 'text-cyan-400'
                    : 'text-slate-400';

                return (
                  <div key={`${agent.name}-${idx}`} className="flex items-start justify-between text-sm">
                    <div>
                      <span className="font-medium text-slate-200">{agent.name}</span>
                      <span className={`ml-2 text-xs font-semibold ${statusColor}`}>
                        {agent.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {agent.durationMs ? formatDuration(agent.durationMs) : 'Pending'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-800/30 p-3">
            <div>
              <p className="text-xs font-medium text-slate-400">Started</p>
              <p className="mt-1 text-xs text-slate-300">{formatTimestamp(startTime)}</p>
            </div>
            {endTime && (
              <div>
                <p className="text-xs font-medium text-slate-400">Completed</p>
                <p className="mt-1 text-xs text-slate-300">{formatTimestamp(endTime)}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    case 'testsPassed': {
      if (testsPassed === 0) {
        return <p className="text-slate-400">No tests passed in this run</p>;
      }

      return (
        <div className="space-y-3">
          <div className="rounded-lg bg-emerald-500/10 p-3 ring-1 ring-emerald-400/30">
            <p className="text-xs font-medium text-slate-400">Total Passed</p>
            <p className="mt-1 text-2xl font-bold text-emerald-300">{testsPassed}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Success Rate</p>
            <p className="mt-1 text-sm font-semibold text-slate-200">
              {testsFailed > 0
                ? `${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`
                : '100%'}
            </p>
          </div>
          {dashboardData?.generatedTestName && (
            <div>
              <p className="text-xs font-medium text-slate-400">Test Name</p>
              <p className="mt-1 text-sm text-slate-300">{dashboardData.generatedTestName}</p>
            </div>
          )}
        </div>
      );
    }

    case 'testsFailed': {
      if (testsFailed === 0) {
        return <p className="text-slate-400">No tests failed in this run</p>;
      }

      return (
        <div className="space-y-3">
          <div className="rounded-lg bg-rose-500/10 p-3 ring-1 ring-rose-400/30">
            <p className="text-xs font-medium text-slate-400">Total Failed</p>
            <p className="mt-1 text-2xl font-bold text-rose-300">{testsFailed}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Failure Rate</p>
            <p className="mt-1 text-sm font-semibold text-slate-200">
              {Math.round((testsFailed / (testsPassed + testsFailed)) * 100)}%
            </p>
          </div>
          {rcaSummaryRecords.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Failure Analysis</p>
              <div className="space-y-2 rounded-lg bg-slate-800/50 p-2 text-xs">
                {rcaSummaryRecords.slice(0, 5).map((rca, idx) => (
                  <div key={idx} className="text-slate-300">
                    <p className="font-medium text-slate-200">{rca.failureType}</p>
                    <p className="text-xs text-slate-400">{rca.rootCause}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'healEvents': {
      if (healingAnalyticsRecords.length === 0) {
        return <p className="text-slate-400">No healing events recorded</p>;
      }

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-amber-500/10 p-3 ring-1 ring-amber-400/30">
              <p className="text-xs font-medium text-slate-400">Total Heals</p>
              <p className="mt-1 text-xl font-bold text-amber-300">{healingAnalyticsRecords.length}</p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-3 ring-1 ring-emerald-400/30">
              <p className="text-xs font-medium text-slate-400">Successful</p>
              <p className="mt-1 text-xl font-bold text-emerald-300">{successfulHeals}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-slate-400">Recent Heal Events</p>
            <div className="space-y-3 rounded-lg bg-slate-800/50 p-3 max-h-96 overflow-y-auto">
              {healingAnalyticsRecords.slice(0, 10).map((heal, idx) => (
                <div key={idx} className="border-b border-slate-700/50 pb-2 last:border-0">
                  <p className="text-xs font-semibold text-slate-200">Heal Event #{idx + 1}</p>
                  <div className="mt-2 space-y-1 text-xs text-slate-400">
                    <p>
                      <span className="text-slate-500">Failed:</span>{' '}
                      <span className="text-slate-300">{heal.failedLocator ?? formatStrategy(heal.failedStrategy)}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Recovered:</span>{' '}
                      <span className="text-slate-300">{heal.recoveredLocator ?? formatStrategy(heal.healedStrategy)}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Duration:</span>{' '}
                      <span className="text-slate-300">{heal.recoveryTimeMs ? `${heal.recoveryTimeMs}ms` : 'N/A'}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Status:</span>{' '}
                      <span
                        className={
                          heal.recoveryStatus === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'
                        }
                      >
                        {heal.recoveryStatus || 'UNKNOWN'}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 'healingActivity': {
      if (healingAnalyticsRecords.length === 0) {
        return <p className="text-slate-400">No healing activity recorded</p>;
      }

      return (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-400 mb-3">Healing Timeline</p>
          <div className="space-y-2 rounded-lg bg-slate-800/50 p-3">
            {healingAnalyticsRecords.slice(0, 5).map((heal, idx) => {
              const timeStr = heal.timestamp
                ? new Date(heal.timestamp).toLocaleTimeString()
                : `Event ${idx + 1}`;

              return (
                <div key={idx} className="flex gap-3 text-xs">
                  <div className="w-16 flex-shrink-0 font-mono text-slate-400">{timeStr}</div>
                  <div>
                    <p className="text-slate-200">
                      {idx === 0
                        ? 'Locator Failed'
                        : idx === 1
                        ? 'Fallback Activated'
                        : idx === 2
                        ? 'Locator Recovered'
                        : idx === 3
                        ? 'Retest Executed'
                        : 'Completed'}
                    </p>
                    <p className="text-slate-500">
                      {heal.failedLocator ? `Locator: ${heal.failedLocator}` : 'Processing...'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case 'rcaEvents': {
      if (rcaSummaryRecords.length === 0) {
        return <p className="text-slate-400">No RCA events recorded</p>;
      }

      return (
        <div className="space-y-3">
          <div className="rounded-lg bg-sky-500/10 p-3 ring-1 ring-sky-400/30">
            <p className="text-xs font-medium text-slate-400">Total RCA Events</p>
            <p className="mt-1 text-2xl font-bold text-sky-300">{rcaSummaryRecords.length}</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-slate-400">Root Cause Analysis</p>
            <div className="space-y-3 rounded-lg bg-slate-800/50 p-3 max-h-96 overflow-y-auto">
              {rcaSummaryRecords.map((rca, idx) => (
                <div key={idx} className="border-b border-slate-700/50 pb-2 last:border-0">
                  <p className="text-xs font-semibold text-slate-200">Failure #{idx + 1}</p>
                  <div className="mt-2 space-y-1 text-xs text-slate-400">
                    <p>
                      <span className="font-medium text-slate-500">Type:</span>{' '}
                      <span className="text-slate-300">{rca.failureType}</span>
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">Root Cause:</span>{' '}
                      <span className="text-slate-300">{rca.rootCause}</span>
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">Recommendation:</span>{' '}
                      <span className="text-slate-300">{rca.recoveryAction}</span>
                    </p>
                    <p>
                      <span className="font-medium text-slate-500">Confidence:</span>{' '}
                      <span className="text-slate-300">
                        {Math.round(rca.confidence * 100)}%
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 'recoveryRate': {
      const totalFailures = testsFailed;
      const autoHealed = successfulHeals;
      const manualFailures = Math.max(0, totalFailures - autoHealed);
      const recoveryPercentage = totalFailures > 0 ? Math.round((autoHealed / totalFailures) * 100) : 0;

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-700/50 p-3">
              <p className="text-xs font-medium text-slate-400">Total Failures</p>
              <p className="mt-1 text-xl font-bold text-slate-100">{totalFailures}</p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-3 ring-1 ring-emerald-400/30">
              <p className="text-xs font-medium text-slate-400">Auto-Healed</p>
              <p className="mt-1 text-xl font-bold text-emerald-300">{autoHealed}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-rose-500/10 p-3 ring-1 ring-rose-400/30">
              <p className="text-xs font-medium text-slate-400">Manual Failures</p>
              <p className="mt-1 text-xl font-bold text-rose-300">{manualFailures}</p>
            </div>
            <div className="rounded-lg bg-violet-500/10 p-3 ring-1 ring-violet-400/30">
              <p className="text-xs font-medium text-slate-400">Recovery %</p>
              <p className="mt-1 text-xl font-bold text-violet-300">{recoveryPercentage}%</p>
            </div>
          </div>
        </div>
      );
    }

    case 'executionDuration': {
      if (executionDurationMs === undefined && (!dashboardData?.agents || dashboardData.agents.length === 0)) {
        return <p className="text-slate-400">No duration data available</p>;
      }

      const agentDurations = dashboardData?.visualizations.agentDurations ?? [];
      const totalDuration = executionDurationMs ?? (dashboardData?.kpis.executionDurationMs ?? 0);

      return (
        <div className="space-y-4">
          <div className="rounded-lg bg-teal-500/10 p-4 ring-1 ring-teal-400/30">
            <p className="text-xs font-medium text-slate-400">Total Duration</p>
            <p className="mt-2 text-2xl font-bold text-teal-300">
              {formatDuration(totalDuration)}
            </p>
          </div>

          {(agentDurations.length > 0 || dashboardData?.agents) && (
            <div>
              <p className="mb-2 text-xs font-medium text-slate-400">Agent-wise Breakdown</p>
              <div className="space-y-2 rounded-lg bg-slate-800/50 p-3">
                {(agentDurations.length > 0
                  ? agentDurations
                  : dashboardData?.agents?.map(a => ({
                      agent: a.name,
                      durationMs: a.durationMs,
                    })) ?? []
                ).map((agent, idx) => {
                  const percentage =
                    totalDuration > 0 ? Math.round((agent.durationMs / totalDuration) * 100) : 0;
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-200">{agent.agent}</span>
                        <span className="text-xs text-slate-400">
                          {formatDuration(agent.durationMs)} ({percentage}%)
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-700/50">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-cyan-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    default:
      return <p className="text-slate-400">No detailed data available</p>;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Token Optimization drill-down content
// ──────────────────────────────────────────────────────────────────────────────

function renderTokenContent(
  metricType: TokenMetricType,
  props: Pick<MetricDetailsDrawerProps, 'tokenStats' | 'cacheStats' | 'templateStats' | 'costStats'>
): React.ReactNode {
  const { tokenStats, cacheStats, templateStats, costStats } = props;

  switch (metricType) {
    case 'tokensSaved': {
      if (!tokenStats) return <p className="text-slate-400">No detailed data available</p>;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-cyan-500/10 p-3 ring-1 ring-cyan-400/30">
              <p className="text-xs font-medium text-slate-400">Tokens Saved</p>
              <p className="mt-1 text-2xl font-bold text-cyan-300">
                {tokenStats.totalSavedTokens.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-slate-700/50 p-3">
              <p className="text-xs font-medium text-slate-400">Original Tokens</p>
              <p className="mt-1 text-2xl font-bold text-slate-200">
                {tokenStats.totalOriginalTokens.toLocaleString()}
              </p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-400">Per-Requirement Details</p>
            <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg bg-slate-800/50 p-3">
              {tokenStats.details.length === 0
                ? <p className="text-xs text-slate-500">No detail records yet.</p>
                : tokenStats.details.map((d, i) => (
                  <div key={i} className="border-b border-slate-700/50 pb-2 last:border-0">
                    <p className="text-xs font-medium text-slate-200">{d.requirement}</p>
                    <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-slate-400">
                      <span>Original: <span className="text-slate-300">{d.originalTokens}</span></span>
                      <span>Compressed: <span className="text-slate-300">{d.compressedTokens}</span></span>
                      <span>Saved: <span className="text-cyan-300">{d.reductionPercent}%</span></span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {new Date(d.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      );
    }

    case 'tokenReduction': {
      if (!tokenStats) return <p className="text-slate-400">No detailed data available</p>;
      return (
        <div className="space-y-4">
          <div className="rounded-lg bg-teal-500/10 p-4 ring-1 ring-teal-400/30">
            <p className="text-xs font-medium text-slate-400">Average Compression Ratio</p>
            <p className="mt-2 text-3xl font-bold text-teal-300">{tokenStats.compressionRatio}%</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-700/50 p-3">
              <p className="text-xs font-medium text-slate-400">Total Original</p>
              <p className="mt-1 text-lg font-semibold text-slate-200">
                {tokenStats.totalOriginalTokens.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-teal-500/10 p-3 ring-1 ring-teal-400/30">
              <p className="text-xs font-medium text-slate-400">Total Compressed</p>
              <p className="mt-1 text-lg font-semibold text-teal-300">
                {tokenStats.totalCompressedTokens.toLocaleString()}
              </p>
            </div>
          </div>
          <div>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-400"
                style={{ width: `${tokenStats.compressionRatio}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {tokenStats.compressionRatio}% reduction achieved
            </p>
          </div>
        </div>
      );
    }

    case 'cacheHits': {
      if (!cacheStats) return <p className="text-slate-400">No detailed data available</p>;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-3 ring-1 ring-emerald-400/30">
              <p className="text-xs font-medium text-slate-400">Cache Hits</p>
              <p className="mt-1 text-2xl font-bold text-emerald-300">{cacheStats.hits}</p>
            </div>
            <div className="rounded-lg bg-slate-700/50 p-3">
              <p className="text-xs font-medium text-slate-400">Hit Rate</p>
              <p className="mt-1 text-2xl font-bold text-slate-200">{cacheStats.hitRate}%</p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-400">Cache Hit Details</p>
            <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg bg-slate-800/50 p-3">
              {cacheStats.details.length === 0
                ? <p className="text-xs text-slate-500">No cache hits recorded yet.</p>
                : cacheStats.details.map((d, i) => (
                  <div key={i} className="border-b border-slate-700/50 pb-2 last:border-0">
                    <p className="text-xs font-medium text-slate-200">{d.requirement}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-500 truncate">
                      Hash: {d.requirementHash}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(d.hitTimestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      );
    }

    case 'cacheMisses': {
      if (!cacheStats) return <p className="text-slate-400">No detailed data available</p>;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-rose-500/10 p-3 ring-1 ring-rose-400/30">
              <p className="text-xs font-medium text-slate-400">Cache Misses</p>
              <p className="mt-1 text-2xl font-bold text-rose-300">{cacheStats.misses}</p>
            </div>
            <div className="rounded-lg bg-slate-700/50 p-3">
              <p className="text-xs font-medium text-slate-400">Total Requests</p>
              <p className="mt-1 text-2xl font-bold text-slate-200">{cacheStats.total}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">Miss Rate</p>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-red-400"
                style={{ width: `${Math.round((cacheStats.misses / cacheStats.total) * 100)}%` }}
              />
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {Math.round((cacheStats.misses / cacheStats.total) * 100)}% miss rate
              — each miss triggers fresh Planner + Designer execution.
            </p>
          </div>
        </div>
      );
    }

    case 'templateHits': {
      if (!templateStats) return <p className="text-slate-400">No detailed data available</p>;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-violet-500/10 p-3 ring-1 ring-violet-400/30">
              <p className="text-xs font-medium text-slate-400">Template Hits</p>
              <p className="mt-1 text-2xl font-bold text-violet-300">{templateStats.hits}</p>
            </div>
            <div className="rounded-lg bg-slate-700/50 p-3">
              <p className="text-xs font-medium text-slate-400">Hit Rate</p>
              <p className="mt-1 text-2xl font-bold text-slate-200">{templateStats.hitRate}%</p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-400">Template Match Details</p>
            <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg bg-slate-800/50 p-3">
              {templateStats.details.length === 0
                ? <p className="text-xs text-slate-500">No template matches recorded yet.</p>
                : templateStats.details.map((d, i) => (
                  <div key={i} className="border-b border-slate-700/50 pb-2 last:border-0">
                    <p className="text-xs font-medium text-slate-200">{d.requirement}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Template: <span className="text-violet-300">{d.templateName}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Confidence: <span className="text-violet-300">
                        {Math.round(d.confidenceScore * 100)}%
                      </span>
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      );
    }

    case 'plannerCallsAvoided': {
      if (!cacheStats) return <p className="text-slate-400">No detailed data available</p>;
      return (
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-500/10 p-4 ring-1 ring-amber-400/30">
            <p className="text-xs font-medium text-slate-400">Planner Calls Avoided</p>
            <p className="mt-2 text-3xl font-bold text-amber-300">{cacheStats.plannerCallsAvoided}</p>
            <p className="mt-1 text-xs text-slate-400">
              Planner executions skipped due to cache hits — each skip saves Planner token spend.
            </p>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-3">
            <p className="text-xs font-medium text-slate-400 mb-2">How It Works</p>
            <ol className="list-inside list-decimal space-y-1 text-xs text-slate-300">
              <li>Requirement arrives</li>
              <li>Cache is checked (SHA-256 hash)</li>
              <li>Cache HIT → Planner skipped</li>
              <li>Cached planner output is loaded</li>
              <li>Flow continues from Generator</li>
            </ol>
          </div>
        </div>
      );
    }

    case 'designerCallsAvoided': {
      if (!cacheStats) return <p className="text-slate-400">No detailed data available</p>;
      return (
        <div className="space-y-4">
          <div className="rounded-lg bg-orange-500/10 p-4 ring-1 ring-orange-400/30">
            <p className="text-xs font-medium text-slate-400">Designer Calls Avoided</p>
            <p className="mt-2 text-3xl font-bold text-orange-300">{cacheStats.designerCallsAvoided}</p>
            <p className="mt-1 text-xs text-slate-400">
              Designer executions skipped due to cache hits — saves locator registration overhead.
            </p>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-3">
            <p className="text-xs font-medium text-slate-400 mb-2">Saved Work Per Skip</p>
            <div className="space-y-1 text-xs text-slate-300">
              <p>✓ Locator generation skipped</p>
              <p>✓ DOM analysis skipped</p>
              <p>✓ Strategy registration skipped</p>
              <p>✓ Locator registry unchanged</p>
            </div>
          </div>
        </div>
      );
    }

    case 'costSaved': {
      if (!costStats) return <p className="text-slate-400">No detailed data available</p>;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-700/50 p-3">
              <p className="text-xs font-medium text-slate-400">Without Optimization</p>
              <p className="mt-1 text-lg font-bold text-slate-300">
                ${costStats.estimatedCostWithoutOptimization.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg bg-green-500/10 p-3 ring-1 ring-green-400/30">
              <p className="text-xs font-medium text-slate-400">Current Cost</p>
              <p className="mt-1 text-lg font-bold text-green-300">
                ${costStats.estimatedCurrentCost.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-emerald-500/10 p-4 ring-1 ring-emerald-400/30">
            <p className="text-xs font-medium text-slate-400">Total Savings</p>
            <p className="mt-1 text-3xl font-bold text-emerald-300">
              ${costStats.estimatedSavings.toFixed(2)}
            </p>
          </div>
          {costStats.breakdown && (
            <div>
              <p className="mb-2 text-xs font-medium text-slate-400">Savings Breakdown</p>
              <div className="space-y-2 rounded-lg bg-slate-800/50 p-3 text-xs">
                {[
                  { label: 'Compression', value: costStats.breakdown.compressionSavings, color: 'text-cyan-300' },
                  { label: 'Cache',       value: costStats.breakdown.cacheSavings,       color: 'text-emerald-300' },
                  { label: 'Template',    value: costStats.breakdown.templateSavings,    color: 'text-violet-300' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-slate-400">{row.label}</span>
                    <span className={`font-semibold ${row.color}`}>${row.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-[10px] text-slate-500">
            Rate: ${costStats.costPerThousandTokens} per 1,000 tokens
          </p>
        </div>
      );
    }
  }
}

function renderSelfHealingMemoryContent(
  metricType: SelfHealingMemoryMetricType,
  healingMemoryData: HealMemoryData | null | undefined,
): React.ReactNode {
  const data = healingMemoryData;
  if (!data) return <p className="text-slate-400">No detailed data available</p>;

  if (metricType === 'knownHealPatterns') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-cyan-500/10 p-3 ring-1 ring-cyan-400/30">
          <p className="text-xs font-medium text-slate-400">Known Heal Patterns</p>
          <p className="mt-1 text-2xl font-bold text-cyan-300">{data.stats.knownHealPatterns}</p>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-slate-400">Pattern Details</p>
          <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg bg-slate-800/50 p-3">
            {data.knowledgeBase.length === 0 ? (
              <p className="text-xs text-slate-500">No pattern records yet.</p>
            ) : data.knowledgeBase.map((pattern, index) => (
              <div key={`${pattern.failedLocator}-${index}`} className="border-b border-slate-700/50 pb-2 last:border-0">
                <p className="text-xs font-semibold text-slate-200 break-words">Failed Locator: {pattern.failedLocator}</p>
                <p className="mt-1 text-xs text-emerald-300 break-words">Recovered Locator: {pattern.recoveredLocator}</p>
                <p className="mt-1 text-xs text-slate-400 break-words">Strategy: {pattern.recoveryStrategy}</p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Success Count: {pattern.successCount} · Last Used: {formatTimestamp(pattern.lastUsedTimestamp)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (metricType === 'autoReusedPatterns') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-emerald-500/10 p-3 ring-1 ring-emerald-400/30">
          <p className="text-xs font-medium text-slate-400">Auto-Reused Patterns</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{data.stats.autoReusedPatterns}</p>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-slate-400">Memory Hit Events</p>
          <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg bg-slate-800/50 p-3">
            {data.autoReusedPatterns.length === 0 ? (
              <p className="text-xs text-slate-500">No memory hit events yet.</p>
            ) : data.autoReusedPatterns.map((event, index) => (
              <div key={`${event.memoryHitTimestamp}-${index}`} className="border-b border-slate-700/50 pb-2 last:border-0">
                <p className="text-xs font-semibold text-slate-200 break-words">{event.patternUsed}</p>
                <p className="mt-1 text-xs text-cyan-300">Memory Hit Timestamp: {formatTimestamp(event.memoryHitTimestamp)}</p>
                <p className="mt-1 text-xs text-slate-400 break-words">Pattern Used: {event.failedLocator} → {event.recoveredLocator}</p>
                <p className="mt-1 text-xs text-slate-300">Recovery Time: {formatDuration(event.recoveryTimeMs)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (metricType === 'learningSuccessRate') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-violet-500/10 p-4 ring-1 ring-violet-400/30">
          <p className="text-xs font-medium text-slate-400">Learning Success Rate</p>
          <p className="mt-2 text-3xl font-bold text-violet-300">{data.stats.learningSuccessRate}%</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-slate-700/50 p-3">
            <p className="text-xs font-medium text-slate-400">Searches</p>
            <p className="mt-1 text-lg font-bold text-slate-200">{data.stats.memorySearches}</p>
          </div>
          <div className="rounded-lg bg-emerald-500/10 p-3 ring-1 ring-emerald-400/30">
            <p className="text-xs font-medium text-slate-400">Hits</p>
            <p className="mt-1 text-lg font-bold text-emerald-300">{data.stats.memoryHits}</p>
          </div>
          <div className="rounded-lg bg-rose-500/10 p-3 ring-1 ring-rose-400/30">
            <p className="text-xs font-medium text-slate-400">Misses</p>
            <p className="mt-1 text-lg font-bold text-rose-300">{data.stats.memoryMisses}</p>
          </div>
        </div>
      </div>
    );
  }

  if (metricType === 'averageRecoveryTimeRecovery') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-amber-500/10 p-4 ring-1 ring-amber-400/30">
          <p className="text-xs font-medium text-slate-400">Average Recovery Time</p>
          <p className="mt-2 text-3xl font-bold text-amber-300">{formatDuration(data.stats.averageRecoveryTimeMs)}</p>
        </div>
        <p className="text-xs text-slate-400">
          Calculated from memory-hit recoveries only ({data.autoReusedPatterns.length} event(s)).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-sky-500/10 p-4 ring-1 ring-sky-400/30">
        <p className="text-xs font-medium text-slate-400">Knowledge Base Size</p>
        <p className="mt-2 text-3xl font-bold text-sky-300">{data.stats.knowledgeBaseSize}</p>
      </div>
      <p className="text-xs text-slate-400">
        Total reusable memory entries currently available for self-healing.
      </p>
    </div>
  );
}

function renderRecoveryContent(
  metricType: RecoveryMetricType,
  recoveryEvents: RecoveryEvent[] | undefined,
): React.ReactNode {
  const events = recoveryEvents ?? [];
  const attempts = events.length;
  const successful = events.filter(event => event.finalStatus === 'RECOVERED');
  const failed = events.filter(event => event.finalStatus === 'FAILED');
  const successCount = successful.length;
  const failureCount = failed.length;
  const successRate = attempts > 0 ? Math.round((successCount / attempts) * 100) : 0;

  if (metricType === 'recoveryAttempts') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-cyan-500/10 p-3 ring-1 ring-cyan-400/30">
          <p className="text-xs font-medium text-slate-400">Total Recovery Attempts</p>
          <p className="mt-1 text-2xl font-bold text-cyan-300">{attempts}</p>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-slate-400">Attempt Details</p>
          <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg bg-slate-800/50 p-3">
            {events.length === 0 ? (
              <p className="text-xs text-slate-500">No recovery attempts recorded.</p>
            ) : events.map((event, index) => (
              <div key={`${event.recoveryId}-${index}`} className="border-b border-slate-700/50 pb-2 last:border-0">
                <p className="text-xs font-semibold text-slate-200 break-words">{event.testName}</p>
                <p className="mt-1 text-xs text-slate-400">Failure Type: {event.failureType}</p>
                <p className="mt-0.5 text-xs text-slate-500">Timestamp: {formatTimestamp(event.recoveryStartTime)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (metricType === 'successfulRecoveries') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-emerald-500/10 p-3 ring-1 ring-emerald-400/30">
          <p className="text-xs font-medium text-slate-400">Successful Recoveries</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{successCount}</p>
        </div>
        <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg bg-slate-800/50 p-3">
          {successful.length === 0 ? (
            <p className="text-xs text-slate-500">No successful recoveries recorded.</p>
          ) : successful.map((event, index) => (
            <div key={`${event.recoveryId}-${index}`} className="border-b border-slate-700/50 pb-2 last:border-0">
              <p className="text-xs font-semibold text-slate-200 break-words">{event.testName}</p>
              <p className="mt-1 text-xs text-slate-400">Failure: {event.failedLocator}</p>
              <p className="mt-0.5 text-xs text-slate-400">Strategy: {event.recoveryStrategy}</p>
              <p className="mt-0.5 text-xs text-slate-400">Recovery Duration: {formatDuration(event.recoveryDuration ?? 0)}</p>
              <p className="mt-0.5 text-xs text-emerald-300">Retest Result: {event.retestResult}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (metricType === 'failedRecoveries') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-rose-500/10 p-3 ring-1 ring-rose-400/30">
          <p className="text-xs font-medium text-slate-400">Failed Recoveries</p>
          <p className="mt-1 text-2xl font-bold text-rose-300">{failureCount}</p>
        </div>
        <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg bg-slate-800/50 p-3">
          {failed.length === 0 ? (
            <p className="text-xs text-slate-500">No failed recoveries recorded.</p>
          ) : failed.map((event, index) => (
            <div key={`${event.recoveryId}-${index}`} className="border-b border-slate-700/50 pb-2 last:border-0">
              <p className="text-xs font-semibold text-slate-200 break-words">{event.testName}</p>
              <p className="mt-1 text-xs text-slate-400">Failure: {event.failedLocator}</p>
              <p className="mt-0.5 text-xs text-slate-400">Strategy Attempted: {event.recoveryStrategy}</p>
              <p className="mt-0.5 text-xs text-rose-300">Failure Reason: {event.failureReason ?? 'Recovery did not resolve failure'}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (metricType === 'averageRecoveryTime') {
    const completed = events.filter(event => event.recoveryDuration != null && event.recoveryDuration > 0);
    const averageMs = completed.length > 0
      ? Math.round(completed.reduce((sum, event) => sum + (event.recoveryDuration ?? 0), 0) / completed.length)
      : 0;

    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-amber-500/10 p-4 ring-1 ring-amber-400/30">
          <p className="text-xs font-medium text-slate-400">Average Recovery Time</p>
          <p className="mt-2 text-3xl font-bold text-amber-300">{formatDuration(averageMs)}</p>
        </div>
        <p className="text-xs text-slate-400">
          Calculated from {completed.length} completed recovery attempt(s).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-cyan-500/10 p-3 ring-1 ring-cyan-400/30">
          <p className="text-xs font-medium text-slate-400">Total Attempts</p>
          <p className="mt-1 text-xl font-bold text-cyan-300">{attempts}</p>
        </div>
        <div className="rounded-lg bg-emerald-500/10 p-3 ring-1 ring-emerald-400/30">
          <p className="text-xs font-medium text-slate-400">Success Count</p>
          <p className="mt-1 text-xl font-bold text-emerald-300">{successCount}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-rose-500/10 p-3 ring-1 ring-rose-400/30">
          <p className="text-xs font-medium text-slate-400">Failure Count</p>
          <p className="mt-1 text-xl font-bold text-rose-300">{failureCount}</p>
        </div>
        <div className="rounded-lg bg-violet-500/10 p-3 ring-1 ring-violet-400/30">
          <p className="text-xs font-medium text-slate-400">Recovery Percentage</p>
          <p className="mt-1 text-xl font-bold text-violet-300">{successRate}%</p>
        </div>
      </div>
    </div>
  );
}


export function MetricDetailsDrawer({
  isOpen,
  metricType,
  dashboardData,
  workflowStatus,
  healingAnalyticsRecords,
  rcaSummaryRecords,
  testsPassed,
  testsFailed,
  healEvents,
  successfulHeals,
  executionDurationMs,
  tokenStats,
  cacheStats,
  templateStats,
  costStats,
  healingMemoryData,
  recoveryEvents,
  onClose,
}: MetricDetailsDrawerProps) {
  if (!isOpen) return null;

  const TOKEN_METRIC_TYPES = new Set<string>([
    'tokensSaved', 'tokenReduction', 'cacheHits', 'cacheMisses',
    'templateHits', 'plannerCallsAvoided', 'designerCallsAvoided', 'costSaved',
  ]);
  const MEMORY_METRIC_TYPES = new Set<string>([
    'knownHealPatterns', 'autoReusedPatterns', 'learningSuccessRate', 'averageRecoveryTime', 'knowledgeBaseSize',
  ]);
  const RECOVERY_METRIC_TYPES = new Set<string>([
    'recoveryAttempts', 'successfulRecoveries', 'failedRecoveries', 'averageRecoveryTimeRecovery', 'recoverySuccessRate',
  ]);

  const metricLabels: Record<MetricType, string> = {
    workflowStatus: 'Workflow Status',
    testsPassed: 'Tests Passed',
    testsFailed: 'Tests Failed',
    healEvents: 'Heal Events',
    healingActivity: 'Healing Activity',
    rcaEvents: 'RCA Events',
    recoveryRate: 'Recovery Rate',
    executionDuration: 'Execution Duration',
    // Token Optimization
    tokensSaved: 'Tokens Saved',
    tokenReduction: 'Token Reduction %',
    cacheHits: 'Cache Hits',
    cacheMisses: 'Cache Misses',
    templateHits: 'Template Hits',
    plannerCallsAvoided: 'Planner Calls Avoided',
    designerCallsAvoided: 'Designer Calls Avoided',
    costSaved: 'Estimated AI Cost Saved',
    knownHealPatterns: 'Known Heal Patterns',
    autoReusedPatterns: 'Auto-Reused Patterns',
    learningSuccessRate: 'Learning Success Rate',
    averageRecoveryTime: 'Average Recovery Time',
    knowledgeBaseSize: 'Knowledge Base Size',
    recoveryAttempts: 'Recovery Attempts',
    successfulRecoveries: 'Successful Recoveries',
    failedRecoveries: 'Failed Recoveries',
    averageRecoveryTimeRecovery: 'Average Recovery Time',
    recoverySuccessRate: 'Recovery Success Rate',
  };

  const isTokenMetric = metricType !== null && TOKEN_METRIC_TYPES.has(metricType);
  const isMemoryMetric = metricType !== null && MEMORY_METRIC_TYPES.has(metricType);
  const isRecoveryMetric = metricType !== null && RECOVERY_METRIC_TYPES.has(metricType);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-md transform overflow-hidden bg-slate-900 shadow-xl transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/50 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-100">
            {metricType ? metricLabels[metricType] : 'Metric Details'}
          </h2>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(100vh - 60px)' }}>
          {metricType && isTokenMetric
            ? renderTokenContent(metricType as TokenMetricType, {
                tokenStats,
                cacheStats,
                templateStats,
                costStats,
              })
            : metricType && isMemoryMetric
            ? renderSelfHealingMemoryContent(metricType as SelfHealingMemoryMetricType, healingMemoryData)
            : metricType && isRecoveryMetric
            ? renderRecoveryContent(metricType as RecoveryMetricType, recoveryEvents)
            : metricType &&
              renderMetricContent(metricType as CoreMetricType, {
                dashboardData,
                workflowStatus,
                healingAnalyticsRecords,
                rcaSummaryRecords,
                testsPassed,
                testsFailed,
                healEvents,
                successfulHeals,
                executionDurationMs,
              })}
        </div>
      </div>
    </>
  );
}
