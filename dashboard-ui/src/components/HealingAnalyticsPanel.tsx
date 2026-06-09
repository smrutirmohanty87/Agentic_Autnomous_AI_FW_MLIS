import type { HealingRecord } from '../types/dashboard';

export interface HealingAnalyticsPanelProps {
  records: HealingRecord[];
}

function recoveryChip(status: string | undefined): string {
  if (status === 'SUCCESS') return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300';
  if (status === 'FAILED') return 'border-rose-400/40 bg-rose-500/10 text-rose-300';
  return 'border-cyan-300/40 bg-cyan-500/10 text-cyan-200';
}

function formatStrategy(strategy?: HealingRecord['failedStrategy']): string {
  if (!strategy) return 'Unknown';
  switch (strategy.type) {
    case 'css':
      return `css: ${strategy.selector ?? strategy.value ?? 'unknown'}`;
    case 'name':
    case 'placeholder':
    case 'label':
    case 'text':
    case 'testid':
      return `${strategy.type}: ${strategy.value ?? 'unknown'}`;
    case 'role':
      return `role: ${strategy.role ?? 'unknown'}`;
    default:
      return strategy.value ?? strategy.selector ?? strategy.role ?? strategy.type;
  }
}

function HealingEventCard({ record, highlight }: { record: HealingRecord; highlight?: boolean }) {
  const failedLocatorLabel = record.failedLocator ?? record.key ?? 'Unknown';
  const healedLocatorLabel =
    record.recoveredLocator ??
    (record.healedStrategy ? formatStrategy(record.healedStrategy) : 'Unknown');
  const recoveryStatus = record.recoveryStatus ?? 'SUCCESS';
  const recoveryTime = record.recoveryTimeMs ?? undefined;
  const timestampLabel = record.timestamp ? new Date(record.timestamp).toLocaleString() : '—';

  return (
    <article
      className={`rounded-xl border p-4 ${
        highlight
          ? 'border-cyan-500/30 bg-cyan-950/30'
          : 'border-white/10 bg-slate-900/70'
      }`}
    >
      {highlight && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400">
          Latest Event
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Failed Locator</p>
          <p className="mt-1 break-all font-mono text-xs text-rose-300">{failedLocatorLabel}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Recovered Locator</p>
          <p className="mt-1 break-all font-mono text-xs text-emerald-300">{healedLocatorLabel}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Recovery Time</p>
          <p className="mt-1 font-mono text-xs text-slate-200">
            {recoveryTime != null ? `${recoveryTime} ms` : timestampLabel}
          </p>
        </div>
        <div>
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${recoveryChip(recoveryStatus)}`}
          >
            {recoveryStatus}
          </span>
        </div>
      </div>
    </article>
  );
}

export function HealingAnalyticsPanel({ records }: HealingAnalyticsPanelProps) {
  const isEmpty = !records || records.length === 0;
  const latest = isEmpty ? null : records[records.length - 1];
  const totalCount = isEmpty ? 0 : records.length;

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 shadow-[0_18px_36px_rgba(2,10,26,0.32)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Healing Analytics</h2>
        {totalCount > 1 && (
          <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
            {totalCount} events
          </span>
        )}
      </div>

      {isEmpty ? (
        <p className="text-sm italic text-slate-400">No healing events detected</p>
      ) : (
        <div className="space-y-3">
          {latest && <HealingEventCard record={latest} highlight={totalCount > 1} />}
          {totalCount > 1 && (
            <>
              <p className="pt-1 text-xs uppercase tracking-[0.14em] text-slate-500">All Events</p>
              {records.map((record, index) => (
                <HealingEventCard key={`${record.failedLocator}-${index}`} record={record} />
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}
