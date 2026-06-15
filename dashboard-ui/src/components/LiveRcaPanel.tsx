import { useRcaResults } from '../hooks/useRcaResults';

function confidenceBadge(pct: number): string {
  if (pct >= 85) return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300';
  if (pct >= 70) return 'border-amber-400/40 bg-amber-500/10 text-amber-300';
  return 'border-rose-400/40 bg-rose-500/10 text-rose-300';
}

export function LiveRcaPanel() {
  const entries = useRcaResults();

  if (entries.length === 0) return null;

  return (
    <section className="rounded-2xl border border-rose-500/20 bg-slate-950/50 p-5 shadow backdrop-blur">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-rose-400">
          Live RCA — Failed Tests
        </h2>
        <span className="rounded-full border border-rose-400/40 bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-300">
          {entries.length}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {entries.map((entry, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/10 bg-slate-900/70 p-4"
          >
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-medium text-slate-100 leading-snug">{entry.testName}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                  {entry.failureType}
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider ${confidenceBadge(entry.confidence)}`}>
                  {entry.confidence}% confidence
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Root Cause: </span>
              {entry.rootCause}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Action: </span>
              {entry.recoveryAction}
            </p>
            {entry.errorMessage && (
              <p className="mt-2 rounded bg-slate-800/60 px-3 py-1.5 font-mono text-[10px] text-slate-500 line-clamp-2">
                {entry.errorMessage}
              </p>
            )}
            <p className="mt-2 text-[10px] text-slate-600">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
