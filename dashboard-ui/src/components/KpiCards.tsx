import { GaugeCircle, ShieldCheck, ShieldX, Wrench, SearchCheck, Activity, Timer } from 'lucide-react';
import type { DashboardData } from '../types/dashboard';

interface KpiCardsProps {
  kpis: DashboardData['kpis'];
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

export function KpiCards({ kpis }: KpiCardsProps) {
  const recoveryRate =
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
    },
    {
      label: 'Tests Passed',
      value: String(kpis.testsPassed),
      icon: ShieldCheck,
      style: 'ring-1 ring-emerald-300/40 bg-emerald-500/10',
    },
    {
      label: 'Tests Failed',
      value: String(kpis.testsFailed),
      icon: ShieldX,
      style: 'ring-1 ring-rose-300/45 bg-rose-500/10',
    },
    {
      label: 'Heal Events',
      value: String(kpis.healEvents),
      icon: Wrench,
      style: 'ring-1 ring-amber-300/45 bg-amber-500/10',
    },
    {
      label: 'RCA Events',
      value: String(kpis.rcaEvents),
      icon: SearchCheck,
      style: 'ring-1 ring-sky-300/45 bg-sky-500/10',
    },
    {
      label: 'Recovery Rate',
      value: recoveryRate,
      icon: Activity,
      style: 'ring-1 ring-violet-300/45 bg-violet-500/10',
    },
    {
      label: 'Exec Duration',
      value: execDuration,
      icon: Timer,
      style: 'ring-1 ring-teal-300/45 bg-teal-500/10',
    },
  ] as const;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
      {items.map(item => {
        const Icon = item.icon;
        return (
          <article
            key={item.label}
            className={`rounded-2xl border border-white/10 p-4 shadow-[0_16px_30px_rgba(2,10,26,0.3)] ${item.style}`}
          >
            <div className="mb-2 flex items-center justify-between text-slate-300">
              <p className="text-xs font-medium uppercase tracking-[0.16em]">{item.label}</p>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="text-2xl font-semibold text-slate-100">{item.value}</p>
          </article>
        );
      })}
    </section>
  );
}
