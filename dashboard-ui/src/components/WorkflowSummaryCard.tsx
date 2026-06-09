import {
  Timer,
  Activity,
  ShieldCheck,
  ShieldX,
  Wrench,
  FlaskConical,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { DashboardData } from '../types/dashboard';

export interface WorkflowSummaryCardProps {
  data: DashboardData;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

interface SummaryRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}

function SummaryRow({ icon, label, value, valueClass = 'text-slate-100' }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-slate-900/60 px-4 py-3">
      <div className="flex items-center gap-2.5 text-slate-400">
        <span className="h-4 w-4 shrink-0">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-[0.14em]">{label}</span>
      </div>
      <span className={`font-mono text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

export function WorkflowSummaryCard({ data }: WorkflowSummaryCardProps) {
  const { kpis, title, rcaSummary } = data;

  const recoveryRate =
    kpis.healEvents > 0
      ? `${Math.round(((kpis.successfulHeals ?? kpis.healEvents) / kpis.healEvents) * 100)}%`
      : 'N/A';

  const execDuration =
    kpis.executionDurationMs != null ? formatDuration(kpis.executionDurationMs) : 'N/A';

  const rcaGenerated = rcaSummary && rcaSummary.length > 0;

  const statusClass =
    kpis.workflowStatus === 'SUCCESS'
      ? 'text-emerald-300'
      : kpis.workflowStatus === 'FAILED'
      ? 'text-rose-300'
      : 'text-cyan-300';

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 shadow-[0_18px_36px_rgba(2,10,26,0.32)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Workflow Summary</h2>
        <span className="text-xs text-slate-500">{title}</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SummaryRow
          icon={<FlaskConical className="h-4 w-4" />}
          label="Requirement"
          value={title}
          valueClass="text-cyan-200 truncate max-w-[180px]"
        />
        <SummaryRow
          icon={
            kpis.workflowStatus === 'SUCCESS' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-400" />
            )
          }
          label="Workflow Status"
          value={kpis.workflowStatus}
          valueClass={statusClass}
        />
        <SummaryRow
          icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
          label="Passed Tests"
          value={String(kpis.testsPassed)}
          valueClass="text-emerald-300"
        />
        <SummaryRow
          icon={<ShieldX className="h-4 w-4 text-rose-400" />}
          label="Failed Tests"
          value={String(kpis.testsFailed)}
          valueClass={kpis.testsFailed > 0 ? 'text-rose-300' : 'text-slate-400'}
        />
        <SummaryRow
          icon={<Wrench className="h-4 w-4 text-amber-400" />}
          label="Heal Events"
          value={String(kpis.healEvents)}
          valueClass="text-amber-300"
        />
        <SummaryRow
          icon={<Activity className="h-4 w-4 text-violet-400" />}
          label="Recovery Rate"
          value={recoveryRate}
          valueClass="text-violet-300"
        />
        <SummaryRow
          icon={<Timer className="h-4 w-4 text-teal-400" />}
          label="Execution Duration"
          value={execDuration}
          valueClass="text-teal-300"
        />
        <SummaryRow
          icon={
            rcaGenerated ? (
              <CheckCircle2 className="h-4 w-4 text-sky-400" />
            ) : (
              <XCircle className="h-4 w-4 text-slate-500" />
            )
          }
          label="RCA Generated"
          value={rcaGenerated ? 'Yes' : 'No'}
          valueClass={rcaGenerated ? 'text-sky-300' : 'text-slate-400'}
        />
      </div>
    </section>
  );
}
