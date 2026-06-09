import { useCurrentTest } from '../hooks/useCurrentTest';

// ─── Status meta ─────────────────────────────────────────────────────────────

const STATUS_META = {
  RUNNING: {
    label: 'RUNNING',
    dot: 'animate-ping bg-cyan-400',
    badge: 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300',
    ring: 'border-cyan-500/30',
  },
  PASSED: {
    label: 'PASSED',
    dot: 'bg-emerald-400',
    badge: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300',
    ring: 'border-emerald-500/30',
  },
  FAILED: {
    label: 'FAILED',
    dot: 'bg-rose-400',
    badge: 'border-rose-400/40 bg-rose-500/10 text-rose-300',
    ring: 'border-rose-500/30',
  },
  SKIPPED: {
    label: 'SKIPPED',
    dot: 'bg-amber-400',
    badge: 'border-amber-400/40 bg-amber-500/10 text-amber-300',
    ring: 'border-amber-500/30',
  },
  IDLE: {
    label: 'IDLE',
    dot: 'bg-slate-500',
    badge: 'border-slate-500/40 bg-slate-700/30 text-slate-400',
    ring: 'border-slate-700/40',
  },
  UNKNOWN: {
    label: 'UNKNOWN',
    dot: 'bg-slate-500',
    badge: 'border-slate-500/40 bg-slate-700/30 text-slate-400',
    ring: 'border-slate-700/40',
  },
} as const;

function fmt(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CurrentTestPanel() {
  const current = useCurrentTest();

  if (!current || current.status === 'IDLE') {
    return (
      <div className="rounded-2xl border border-slate-700/40 bg-slate-900/50 p-5 shadow backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Current Test
        </p>
        <p className="mt-2 text-sm text-slate-500 italic">No test running.</p>
      </div>
    );
  }

  const meta = STATUS_META[current.status] ?? STATUS_META.UNKNOWN;

  return (
    <div
      className={`rounded-2xl border bg-slate-900/50 p-5 shadow backdrop-blur ${meta.ring}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Current Test
        </p>

        {/* Status badge */}
        <span
          className={`flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-widest ${meta.badge}`}
        >
          <span className="relative flex h-2 w-2">
            {current.status === 'RUNNING' ? (
              <>
                <span
                  className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${meta.dot}`}
                />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </>
            ) : (
              <span className={`relative inline-flex h-2 w-2 rounded-full ${meta.dot}`} />
            )}
          </span>
          {meta.label}
        </span>
      </div>

      {/* Test name */}
      <p className="mt-3 font-mono text-sm font-medium leading-relaxed text-slate-100 break-all">
        {current.testName ?? '—'}
      </p>

      {/* Meta row */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
        {current.startedAt && (
          <span>
            Started:{' '}
            <span className="text-slate-200">
              {new Date(current.startedAt).toLocaleTimeString()}
            </span>
          </span>
        )}
        <span>
          Duration:{' '}
          <span className="text-slate-200">{fmt(current.durationMs)}</span>
        </span>
      </div>
    </div>
  );
}
