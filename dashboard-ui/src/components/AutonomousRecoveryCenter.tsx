import type { RecoveryEvent, RecoveryMetricType } from '../types/recoveryEvents';

interface AutonomousRecoveryCenterProps {
  events: RecoveryEvent[];
  healingRunning: boolean;
  onMetricClick?: (metric: RecoveryMetricType) => void;
}

interface TimelineStep {
  label: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  detail?: string;
}

function formatDuration(ms?: number): string {
  if (ms == null || ms <= 0) return '0ms';
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} sec`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${(seconds % 60).toFixed(0)}s`;
}

function badgeTone(status: TimelineStep['status']): string {
  if (status === 'SUCCESS') return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300';
  if (status === 'FAILED') return 'border-rose-400/40 bg-rose-500/10 text-rose-300';
  if (status === 'RUNNING') return 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300';
  return 'border-white/10 bg-slate-800/50 text-slate-400';
}

function pointTone(status: TimelineStep['status']): string {
  if (status === 'SUCCESS') return 'bg-emerald-400';
  if (status === 'FAILED') return 'bg-rose-400';
  if (status === 'RUNNING') return 'bg-cyan-400 animate-pulse';
  return 'bg-slate-500';
}

function buildTimeline(event: RecoveryEvent): TimelineStep[] {
  const hasStart = Boolean(event.recoveryStartTime);
  const hasMemoryResult = event.memoryHit === 'HIT' || event.memoryHit === 'MISS';
  const hasStrategy = event.recoveryStrategy && event.recoveryStrategy !== 'Pending';
  const hasRetestFinal = event.retestResult === 'PASSED' || event.retestResult === 'FAILED';

  const finalWorkflowStep: TimelineStep =
    event.finalStatus === 'RECOVERED'
      ? { label: 'Workflow Recovered', status: 'SUCCESS' }
      : event.finalStatus === 'FAILED'
      ? { label: 'Workflow Recovered', status: 'FAILED', detail: 'Recovery failed' }
      : { label: 'Workflow Recovered', status: 'PENDING' };

  return [
    {
      label: 'Failure Detected',
      status: hasStart ? 'SUCCESS' : 'PENDING',
      detail: event.failedLocator || undefined,
    },
    {
      label: 'Healing Started',
      status: hasStart ? (event.finalStatus === 'RUNNING' ? 'RUNNING' : 'SUCCESS') : 'PENDING',
    },
    {
      label: 'Searching Memory',
      status: event.memoryHit === 'SEARCHING' ? 'RUNNING' : hasMemoryResult ? 'SUCCESS' : 'PENDING',
    },
    {
      label: 'Memory Hit / Miss',
      status: hasMemoryResult ? 'SUCCESS' : event.memoryHit === 'SEARCHING' ? 'RUNNING' : 'PENDING',
      detail: hasMemoryResult ? event.memoryHit : undefined,
    },
    {
      label: 'Strategy Selected',
      status: hasStrategy ? 'SUCCESS' : event.finalStatus === 'RUNNING' ? 'RUNNING' : 'PENDING',
      detail: hasStrategy ? event.recoveryStrategy : undefined,
    },
    {
      label: 'Recovery Applied',
      status: hasStrategy ? 'SUCCESS' : 'PENDING',
    },
    {
      label: 'Retest Running',
      status: event.retestResult === 'RUNNING' ? 'RUNNING' : hasRetestFinal ? 'SUCCESS' : 'PENDING',
    },
    {
      label: 'Retest Passed / Failed',
      status: hasRetestFinal ? (event.retestResult === 'PASSED' ? 'SUCCESS' : 'FAILED') : 'PENDING',
      detail: hasRetestFinal ? event.retestResult : undefined,
    },
    finalWorkflowStep,
  ];
}

function metricCard(
  label: string,
  value: string,
  metric: RecoveryMetricType,
  accent: string,
  onMetricClick?: (metric: RecoveryMetricType) => void,
) {
  return (
    <article
      key={metric}
      onClick={() => onMetricClick?.(metric)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onMetricClick?.(metric);
      }}
      role="button"
      tabIndex={0}
      className={`cursor-pointer rounded-xl border border-white/10 p-4 shadow-[0_12px_24px_rgba(2,10,26,0.3)] transition-transform hover:scale-[1.02] hover:shadow-[0_16px_32px_rgba(2,10,26,0.4)] ${accent}`}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-100">{value}</p>
    </article>
  );
}

export function AutonomousRecoveryCenter({ events, healingRunning, onMetricClick }: AutonomousRecoveryCenterProps) {
  const attempts = events.length;
  const successful = events.filter(e => e.finalStatus === 'RECOVERED').length;
  const failed = events.filter(e => e.finalStatus === 'FAILED').length;
  const completed = events.filter(e => e.recoveryDuration != null && e.recoveryDuration > 0);
  const avgRecoveryMs = completed.length > 0
    ? Math.round(completed.reduce((sum, e) => sum + (e.recoveryDuration ?? 0), 0) / completed.length)
    : 0;
  const successRate = attempts > 0 ? Math.round((successful / attempts) * 100) : 0;

  const activeEvent = events.find(e => e.finalStatus === 'RUNNING') ?? events[0] ?? null;
  const timeline = activeEvent ? buildTimeline(activeEvent) : [];

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-6 shadow-[0_20px_40px_rgba(2,10,26,0.40)]" aria-label="Autonomous Recovery Center">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-100">Autonomous Recovery Center</h2>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${healingRunning ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300' : 'border-slate-600/30 bg-slate-700/20 text-slate-400'}`}>
              {healingRunning ? 'Live Recovery' : 'Recovery Summary'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Visualizes failure to recovery journey across healing, memory search, and retest outcomes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metricCard('Recovery Attempts', String(attempts), 'recoveryAttempts', 'bg-cyan-500/10 ring-1 ring-cyan-400/35', onMetricClick)}
        {metricCard('Successful Recoveries', String(successful), 'successfulRecoveries', 'bg-emerald-500/10 ring-1 ring-emerald-400/35', onMetricClick)}
        {metricCard('Failed Recoveries', String(failed), 'failedRecoveries', 'bg-rose-500/10 ring-1 ring-rose-400/35', onMetricClick)}
        {metricCard('Average Recovery Time', formatDuration(avgRecoveryMs), 'averageRecoveryTimeRecovery', 'bg-amber-500/10 ring-1 ring-amber-400/35', onMetricClick)}
        {metricCard('Recovery Success Rate', `${successRate}%`, 'recoverySuccessRate', 'bg-violet-500/10 ring-1 ring-violet-400/35', onMetricClick)}
      </div>

      {healingRunning && activeEvent ? (
        <div className="mt-6 rounded-xl border border-cyan-400/30 bg-cyan-500/5 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-cyan-200">Live Recovery Visualization</h3>
            <p className="text-xs text-cyan-300">{activeEvent.testName}</p>
          </div>
          <div className="space-y-2">
            {timeline.map(step => (
              <div key={step.label} className="flex items-start gap-3 rounded-lg border border-white/5 bg-slate-900/40 px-3 py-2">
                <span className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full ${pointTone(step.status)}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-slate-100">{step.label}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeTone(step.status)}`}>
                      {step.status}
                    </span>
                  </div>
                  {step.detail ? <p className="mt-1 break-words text-xs text-slate-400">{step.detail}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeEvent ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-slate-900/50 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-slate-200">Final Recovery Journey</h3>
            <p className="text-xs text-slate-400">{activeEvent.testName}</p>
          </div>
          <p className="text-xs text-slate-400">
            Final Status: <span className={activeEvent.finalStatus === 'RECOVERED' ? 'text-emerald-300' : activeEvent.finalStatus === 'FAILED' ? 'text-rose-300' : 'text-cyan-300'}>{activeEvent.finalStatus}</span>
            {' '}· Retest: <span className="text-slate-200">{activeEvent.retestResult}</span>
            {' '}· Duration: <span className="text-slate-200">{formatDuration(activeEvent.recoveryDuration)}</span>
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-500">
          No recovery attempts recorded for this run.
        </div>
      )}
    </section>
  );
}
