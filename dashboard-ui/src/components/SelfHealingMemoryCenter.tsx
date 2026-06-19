import { BrainCircuit, Clock3, LibraryBig, ListChecks, Sparkles } from 'lucide-react';
import type { HealMemoryData, SelfHealingMemoryMetricType } from '../types/selfHealingMemory';

interface SelfHealingMemoryCenterProps {
  data: HealMemoryData | null;
  onMetricClick?: (metric: SelfHealingMemoryMetricType) => void;
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function cardClickProps(metric: SelfHealingMemoryMetricType, onMetricClick?: (m: SelfHealingMemoryMetricType) => void) {
  return {
    onClick: () => onMetricClick?.(metric),
    role: 'button' as const,
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') onMetricClick?.(metric);
    },
  };
}

export function SelfHealingMemoryCenter({ data, onMetricClick }: SelfHealingMemoryCenterProps) {
  const stats = data?.stats;
  const cards = [
    {
      metric: 'knownHealPatterns' as SelfHealingMemoryMetricType,
      label: 'Known Heal Patterns',
      value: stats?.knownHealPatterns ?? 0,
      desc: 'Recovered patterns captured from successful healing.',
      icon: BrainCircuit,
      style: 'ring-1 ring-cyan-400/40 bg-cyan-500/10',
      valueColor: 'text-cyan-300',
    },
    {
      metric: 'autoReusedPatterns' as SelfHealingMemoryMetricType,
      label: 'Auto-Reused Patterns',
      value: stats?.autoReusedPatterns ?? 0,
      desc: 'Patterns reused from memory on future failures.',
      icon: ListChecks,
      style: 'ring-1 ring-emerald-400/40 bg-emerald-500/10',
      valueColor: 'text-emerald-300',
    },
    {
      metric: 'learningSuccessRate' as SelfHealingMemoryMetricType,
      label: 'Learning Success Rate',
      value: `${stats?.learningSuccessRate ?? 0}%`,
      desc: 'Share of memory lookups that produced a reusable hit.',
      icon: Sparkles,
      style: 'ring-1 ring-violet-400/40 bg-violet-500/10',
      valueColor: 'text-violet-300',
    },
    {
      metric: 'averageRecoveryTime' as SelfHealingMemoryMetricType,
      label: 'Average Recovery Time',
      value: fmtDuration(stats?.averageRecoveryTimeMs ?? 0),
      desc: 'Average elapsed time for a memory-assisted recovery.',
      icon: Clock3,
      style: 'ring-1 ring-amber-400/40 bg-amber-500/10',
      valueColor: 'text-amber-300',
    },
    {
      metric: 'knowledgeBaseSize' as SelfHealingMemoryMetricType,
      label: 'Knowledge Base Size',
      value: stats?.knowledgeBaseSize ?? 0,
      desc: 'Stored healing patterns available for reuse.',
      icon: LibraryBig,
      style: 'ring-1 ring-sky-400/40 bg-sky-500/10',
      valueColor: 'text-sky-300',
    },
  ] as const;

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-6 shadow-[0_20px_40px_rgba(2,10,26,0.40)]" aria-label="Self-Healing Memory Center">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-100">Self-Healing Memory Center</h2>
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
              Active Memory
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Stores recovery patterns from successful healing and reuses them on future failures.
          </p>
        </div>
        <p className="text-xs text-slate-500">
          Updated {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'N/A'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <article
              key={card.metric}
              className={`cursor-pointer rounded-xl border border-white/10 p-4 shadow-[0_12px_24px_rgba(2,10,26,0.3)] transition-transform hover:scale-[1.03] hover:shadow-[0_16px_32px_rgba(2,10,26,0.45)] ${card.style}`}
              {...cardClickProps(card.metric, onMetricClick)}
            >
              <div className="mb-2 flex items-start justify-between gap-2 text-slate-300">
                <p className="min-w-0 break-words text-[10px] font-medium uppercase tracking-[0.14em] leading-tight">
                  {card.label}
                </p>
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              </div>
              <p className={`min-w-0 break-words text-xl font-bold leading-tight ${card.valueColor}`}>
                {card.value}
              </p>
              <p className="mt-1 min-w-0 break-words text-[10px] leading-tight text-slate-500">{card.desc}</p>
            </article>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-medium text-slate-300">Known Heal Patterns</h3>
          <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/50 p-3">
            {data?.knowledgeBase?.length ? data.knowledgeBase.map((pattern, index) => (
              <div key={`${pattern.failedLocator}-${pattern.recoveredLocator}-${index}`} className="rounded-lg border border-white/5 bg-slate-950/40 p-3">
                <p className="text-xs font-semibold text-slate-100 break-words">{pattern.failedLocator}</p>
                <p className="mt-1 text-xs text-emerald-300 break-words">Recovered: {pattern.recoveredLocator}</p>
                <p className="mt-1 text-xs text-slate-400 break-words">Strategy: {pattern.recoveryStrategy}</p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Success Count: {pattern.successCount} · Last Used: {new Date(pattern.lastUsedTimestamp).toLocaleString()}
                </p>
              </div>
            )) : <p className="text-sm text-slate-500">No patterns stored yet.</p>}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium text-slate-300">Auto-Reused Patterns</h3>
          <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/50 p-3">
            {data?.autoReusedPatterns?.length ? data.autoReusedPatterns.map((event, index) => (
              <div key={`${event.memoryHitTimestamp}-${index}`} className="rounded-lg border border-white/5 bg-slate-950/40 p-3">
                <p className="text-xs font-semibold text-slate-100 break-words">{event.patternUsed}</p>
                <p className="mt-1 text-xs text-cyan-300 break-words">Memory Hit: {new Date(event.memoryHitTimestamp).toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-400 break-words">Pattern Used: {event.failedLocator} → {event.recoveredLocator}</p>
                <p className="mt-1 text-[10px] text-slate-500">Recovery Time: {fmtDuration(event.recoveryTimeMs)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">No auto-reused patterns yet.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
