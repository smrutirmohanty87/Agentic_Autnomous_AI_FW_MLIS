import type { OptimizationTrackerData } from '../types/optimizationTracker';

interface LiveOptimizationTrackerProps {
  data: OptimizationTrackerData | null;
}

function formatTokens(value: number): string {
  return value.toLocaleString('en-US');
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function phaseTone(state: OptimizationTrackerData['timeline'][number]['state']): string {
  switch (state) {
    case 'ACTIVE':
      return 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200';
    case 'COMPLETE':
      return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200';
    default:
      return 'border-white/10 bg-slate-800/50 text-slate-400';
  }
}

function statCard(label: string, value: string, accent: string, sublabel?: string) {
  return { label, value, accent, sublabel };
}

export function LiveOptimizationTracker({ data }: LiveOptimizationTrackerProps) {
  if (!data) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 shadow-[0_14px_28px_rgba(2,10,26,0.30)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Live Optimization Tracker</h2>
            <p className="mt-1 text-xs text-slate-400">
              Waiting for optimization telemetry from the workflow runtime.
            </p>
          </div>
          <span className="rounded-full border border-slate-600/40 bg-slate-700/30 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Idle
          </span>
        </div>
      </section>
    );
  }

  const cards = [
    statCard('Current Optimization Phase', data.currentOptimizationPhase, 'from-cyan-500/15 to-sky-500/10'),
    statCard('Original Tokens', formatTokens(data.originalTokens), 'from-indigo-500/15 to-cyan-500/10'),
    statCard('Compressed Tokens', formatTokens(data.compressedTokens), 'from-teal-500/15 to-emerald-500/10'),
    statCard('Tokens Saved', formatTokens(data.tokensSaved), 'from-cyan-500/15 to-teal-500/10'),
    statCard('Cache HIT/MISS', data.cacheResult, 'from-amber-500/15 to-orange-500/10'),
    statCard('Template Match', data.templateMatch, 'from-violet-500/15 to-fuchsia-500/10'),
    statCard('Running Total Tokens Saved', formatTokens(data.runningTotalTokensSaved), 'from-emerald-500/15 to-cyan-500/10'),
    statCard('Estimated Cost Saved', formatCurrency(data.estimatedCostSaved), 'from-lime-500/15 to-emerald-500/10'),
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 shadow-[0_14px_28px_rgba(2,10,26,0.30)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-100">Live Optimization Tracker</h2>
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              {data.frozen ? 'Frozen' : 'Live'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Compression, cache, and template telemetry streamed from the workflow runtime.
          </p>
        </div>
        <p className="text-xs text-slate-500">
          Updated {new Date(data.updatedAt).toLocaleString()}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => (
          <article
            key={card.label}
            className={`min-w-0 overflow-hidden rounded-xl border p-3 shadow-[0_10px_20px_rgba(2,10,26,0.26)] transition-all duration-700 ease-out ${card.accent}`}
          >
            <p className="min-w-0 break-words text-[10px] font-medium uppercase tracking-[0.16em] leading-tight text-slate-300">
              {card.label}
            </p>
            <p className="mt-1.5 min-w-0 break-words text-xl font-bold leading-tight text-slate-50">
              {card.value}
            </p>
            {card.sublabel ? (
              <p className="mt-1 min-w-0 break-words text-[11px] leading-snug text-slate-500">
                {card.sublabel}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      <div className="mt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-slate-200">Optimization Timeline</h3>
          <span className="text-xs text-slate-500">
            {data.frozen ? 'Final timeline frozen after workflow completion.' : 'Live phase progression.'}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {data.timeline.map(step => (
            <div
              key={step.phase}
              className={`flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-700 ease-out ${phaseTone(step.state)} ${step.state === 'ACTIVE' ? 'shadow-[0_0_0_1px_rgba(34,211,238,0.35)]' : ''}`}
            >
              <span className="min-w-0 break-words leading-tight">{step.phase}</span>
              <span className={`shrink-0 opacity-70 ${step.state === 'ACTIVE' ? 'animate-pulse' : ''}`}>
                {step.state}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-300">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-100">Current Phase:</span>
            <span className="max-w-full rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-xs font-semibold text-cyan-200 transition-all duration-700 ease-out animate-pulse break-words">
              {data.currentOptimizationPhase}
            </span>
          </div>
          <p className="mt-2 break-words text-xs text-slate-400">
            Cache result: <span className="text-slate-200">{data.cacheResult}</span> · Template match:{' '}
            <span className="text-slate-200">{data.templateMatch}</span>
          </p>
        </div>
      </div>
    </section>
  );
}