import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import type { DashboardData, AgentStatus } from '../types/dashboard';

interface AgentStatusSectionProps {
  agents: DashboardData['agents'];
}

function StatusBadge({ status, name }: { status: AgentStatus; name: string }) {
  if (status === 'SUCCESS') {
    return <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-label={`${name} successful`} />;
  }
  if (status === 'RUNNING') {
    return <Loader2 className="h-5 w-5 animate-spin text-cyan-400" aria-label={`${name} running`} />;
  }
  if (status === 'FAILED') {
    return <XCircle className="h-5 w-5 text-rose-400" aria-label={`${name} failed`} />;
  }
  // PENDING
  return <Clock className="h-5 w-5 text-slate-500" aria-label={`${name} pending`} />;
}

function cardBorder(status: AgentStatus) {
  if (status === 'SUCCESS') return 'border-emerald-500/30';
  if (status === 'RUNNING') return 'border-cyan-400/40 shadow-[0_0_12px_rgba(34,211,238,0.15)]';
  if (status === 'FAILED') return 'border-rose-500/30';
  return 'border-white/10';
}

function statusLabel(status: AgentStatus) {
  if (status === 'RUNNING') return <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300">Running</span>;
  if (status === 'PENDING') return <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Pending</span>;
  if (status === 'FAILED') return <span className="text-[10px] font-semibold uppercase tracking-widest text-rose-300">Failed</span>;
  return null;
}

export function AgentStatusSection({ agents }: AgentStatusSectionProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 shadow-[0_18px_36px_rgba(2,10,26,0.32)]">
      <header className="mb-4 flex items-end justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Agent Status</h2>
        <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Pipeline</span>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {agents.map(agent => (
          <div
            key={agent.name}
            className={`rounded-xl border bg-slate-900/70 px-4 py-3 transition-all duration-1500 ${cardBorder(agent.status)}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-100">{agent.name}</p>
              <StatusBadge status={agent.status} name={agent.name} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              {statusLabel(agent.status)}
              {agent.status === 'SUCCESS' && (
                <p className="text-xs text-slate-400">Duration: {agent.durationMs} ms</p>
              )}
              {agent.status === 'PENDING' && (
                <p className="text-xs text-slate-600">Waiting to start…</p>
              )}
              {agent.status === 'RUNNING' && (
                <p className="text-xs text-cyan-400/70">In progress…</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
