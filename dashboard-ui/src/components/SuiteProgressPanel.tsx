import { useSuiteProgress } from '../hooks/useSuiteProgress';

// ─── Stat tile ────────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string;
  value: number | string;
  colorClass: string;
}

function StatTile({ label, value, colorClass }: StatTileProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-700/40 bg-slate-900/60 px-4 py-3 shadow">
      <span className={`text-2xl font-bold tabular-nums ${colorClass}`}>{value}</span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SuiteProgressPanel() {
  const progress = useSuiteProgress();

  const isActive =
    progress !== null &&
    (progress.running > 0 || progress.passed > 0 || progress.failed > 0);

  const pct = progress?.progressPct ?? 0;

  return (
    <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-5 shadow backdrop-blur">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Suite Progress
        </p>
        {isActive && (
          <span className="flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-cyan-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
            </span>
            Live
          </span>
        )}
      </div>

      {/* Stat tiles */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Total" value={progress?.totalTests ?? 0} colorClass="text-slate-200" />
        <StatTile label="Passed" value={progress?.passed ?? 0} colorClass="text-emerald-400" />
        <StatTile label="Failed" value={progress?.failed ?? 0} colorClass="text-rose-400" />
        <StatTile label="Running" value={progress?.running ?? 0} colorClass="text-cyan-400" />
        <StatTile label="Pending" value={progress?.pending ?? 0} colorClass="text-amber-400" />
        <StatTile label="Progress" value={`${pct}%`} colorClass="text-violet-400" />
      </div>

      {/* Progress bar */}
      <div className="overflow-hidden rounded-full bg-slate-800/60 h-3">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Current test label */}
      {progress?.currentTest && (
        <p className="mt-3 truncate text-xs text-slate-400">
          <span className="font-medium text-slate-300">Running:</span>{' '}
          {progress.currentTest}
        </p>
      )}

      {/* Idle state */}
      {!isActive && (
        <p className="mt-3 text-xs text-slate-600">Waiting for test run to begin…</p>
      )}
    </div>
  );
}
