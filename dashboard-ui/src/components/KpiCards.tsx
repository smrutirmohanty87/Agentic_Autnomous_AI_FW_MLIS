import { GaugeCircle, ShieldCheck, ShieldX, Wrench, SearchCheck, Activity, Timer } from 'lucide-react';
import type { DashboardData } from '../types/dashboard';
import type { MetricType } from './MetricDetailsDrawer';

interface KpiCardsProps {
  kpis: DashboardData['kpis'];
  onMetricClick?: (metric: MetricType) => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function cardBase(value: string): string {
  if (value === 'SUCCESS') return 'ring-1 ring-emerald-400/40 bg-emerald-500/10';
  if (value === 'FAILED') return 'ring-1 ring-rose-400/40 bg-rose-500/10';
  return 'ring-1 ring-cyan-400/30 bg-cyan-500/10';
}

export function KpiCards({ kpis, onMetricClick }: KpiCardsProps) {
  const recoveryRate =
    kpis.healingActivity === 'Retry Running'
      ? 'Pending'
      :
    kpis.healEvents > 0
      ? `${Math.round(((kpis.successfulHeals ?? kpis.healEvents) / kpis.healEvents) * 100)}%`
      : 'N/A';

  const execDuration =
    kpis.executionDurationMs != null ? formatDuration(kpis.executionDurationMs) : 'N/A';

  const items = [
    {
      label: 'Workflow Status',
      value: kpis.workflowStatus,
      icon: GaugeCircle,
      style: cardBase(kpis.workflowStatus),
      metric: 'workflowStatus' as MetricType,
    },
    {
      label: 'Tests Passed',
      value: String(kpis.testsPassed),
      icon: ShieldCheck,
      style: 'ring-1 ring-emerald-300/40 bg-emerald-500/10',
      metric: 'testsPassed' as MetricType,
    },
    {
      label: 'Tests Failed',
      value: String(kpis.testsFailed),
      icon: ShieldX,
      style: 'ring-1 ring-rose-300/45 bg-rose-500/10',
      metric: 'testsFailed' as MetricType,
    },
    {
      label: 'Heal Events',
      value: String(kpis.healEvents),
      icon: Wrench,
      style: 'ring-1 ring-amber-300/45 bg-amber-500/10',
      metric: 'healEvents' as MetricType,
    },
    {
      label: 'Healing Activity',
      value: kpis.healingActivity ?? 'Idle',
      icon: Activity,
      style: 'ring-1 ring-orange-300/45 bg-orange-500/10',
      metric: 'healingActivity' as MetricType,
    },
    {
      label: 'RCA Events',
      value: String(kpis.rcaEvents),
      icon: SearchCheck,
      style: 'ring-1 ring-sky-300/45 bg-sky-500/10',
      metric: 'rcaEvents' as MetricType,
    },
    {
      label: 'Recovery Rate',
      value: recoveryRate,
      icon: Activity,
      style: 'ring-1 ring-violet-300/45 bg-violet-500/10',
      metric: 'recoveryRate' as MetricType,
    },
    {
      label: 'Exec Duration',
      value: execDuration,
      icon: Timer,
      style: 'ring-1 ring-teal-300/45 bg-teal-500/10',
      metric: 'executionDuration' as MetricType,
    },
  ] as const;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-8">
      {items.map(item => {
        const Icon = item.icon;
        return (
          <article
            key={item.label}
            className={`rounded-2xl border border-white/10 p-4 shadow-[0_16px_30px_rgba(2,10,26,0.3)] cursor-pointer transition-transform hover:scale-105 hover:shadow-[0_20px_40px_rgba(2,10,26,0.5)] ${item.style}`}
            onClick={() => onMetricClick?.(item.metric)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onMetricClick?.(item.metric);
              }
            }}
          >
            <div className="mb-2 flex min-w-0 items-center justify-between gap-2 text-slate-300">
              <p className="min-w-0 break-words text-xs font-medium uppercase tracking-[0.16em] leading-tight">
                {item.label}
              </p>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="min-w-0 break-words text-2xl font-semibold leading-tight text-slate-100">
              {item.value}
            </p>
          </article>
        );
      })}
    </section>
  );
}
