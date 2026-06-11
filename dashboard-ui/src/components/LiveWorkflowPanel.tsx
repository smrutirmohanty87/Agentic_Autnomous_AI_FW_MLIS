import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import type { WorkflowAgentEntry, WorkflowStatus } from '../types/dashboard';

export interface LiveWorkflowPanelProps {
  status: WorkflowStatus;
}

function stateChip(state: WorkflowAgentEntry['state'], isCurrent: boolean): string {
  if (state === 'SUCCESS') return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300';
  if (state === 'FAILED')  return 'border-rose-400/40 bg-rose-500/10 text-rose-300';
  if (state === 'RUNNING') return 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300';
  return isCurrent
    ? 'border-cyan-400/20 bg-cyan-500/5 text-cyan-500'
    : 'border-white/10 bg-slate-800/40 text-slate-500';
}

function StateIcon({ state }: { state: WorkflowAgentEntry['state'] }) {
  if (state === 'SUCCESS') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (state === 'FAILED')  return <XCircle className="h-4 w-4 text-rose-400" />;
  if (state === 'RUNNING') return <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />;
  return <Clock className="h-4 w-4 text-slate-600" />;
}

export function LiveWorkflowPanel({ status }: LiveWorkflowPanelProps) {
  const elapsedSec = Math.round(
    (Date.now() - new Date(status.startedAt).getTime()) / 1000
  );

  return (
    <section className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-5 shadow-[0_18px_36px_rgba(2,10,26,0.32)]">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-100">Live Workflow</h2>
          <span className="flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-widest text-cyan-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
            </span>
            LIVE
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Workflow ID</p>
          <p className="font-mono text-xs text-slate-300">{status.workflowId}</p>
        </div>
      </div>

      {/* Current agent */}
      {status.currentAgent && (
        <div className="mb-4 rounded-xl border border-cyan-400/20 bg-cyan-900/20 px-4 py-2.5">
          <span className="text-xs uppercase tracking-[0.14em] text-cyan-400">Currently Running</span>
          <p className="mt-0.5 flex items-center gap-2 font-semibold text-cyan-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            {status.currentAgent}
          </p>
        </div>
      )}

      {/* Live tracking fields */}
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Current Step</p>
          <p className="mt-1 text-xs font-medium text-slate-200">{status.currentStep ?? 'Waiting for next action'}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Generated Test Name</p>
          <p className="mt-1 text-xs font-medium text-slate-200">{status.generatedTestName ?? 'Pending generator output'}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Requirement</p>
          <p className="mt-1 text-xs font-medium text-slate-200">{status.requirement ?? 'Not specified'}</p>
        </div>
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {status.agents.map(agent => {
          const isCurrent = agent.name === status.currentAgent;
          return (
            <div
              key={agent.name}
              className={`rounded-xl border px-3 py-3 transition-all ${
                isCurrent
                  ? 'border-cyan-400/30 bg-cyan-900/30 ring-1 ring-cyan-400/20'
                  : 'border-white/8 bg-slate-900/50'
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <p className={`text-xs font-semibold ${isCurrent ? 'text-cyan-200' : 'text-slate-300'}`}>
                  {agent.name}
                </p>
                <StateIcon state={agent.state} />
              </div>
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stateChip(agent.state, isCurrent)}`}>
                {agent.state}
              </span>
              {agent.durationMs != null && (
                <p className="mt-1.5 font-mono text-[10px] text-slate-500">{agent.durationMs}ms</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="mt-3 text-right text-xs text-slate-600">
        Elapsed: {elapsedSec}s · polling every 2s
      </p>
    </section>
  );
}
