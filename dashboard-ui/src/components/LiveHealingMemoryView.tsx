import { Search, ShieldAlert, Sparkles, TestTube2, WandSparkles, RotateCcw } from 'lucide-react';
import type { HealMemoryLiveState } from '../types/selfHealingMemory';

interface LiveHealingMemoryViewProps {
  session: HealMemoryLiveState;
}

function statCard(label: string, value: string, icon: React.ComponentType<{ className?: string }>, tone: string) {
  return { label, value, icon, tone };
}

export function LiveHealingMemoryView({ session }: LiveHealingMemoryViewProps) {
  const cards = [
    statCard('Failed Locator', session.failedLocator, ShieldAlert, 'from-rose-500/15 to-orange-500/10'),
    statCard('Searching Memory', session.searchingMemory, Search, 'from-cyan-500/15 to-sky-500/10'),
    statCard('Memory Hit / Miss', session.memoryHitStatus, Sparkles, 'from-violet-500/15 to-fuchsia-500/10'),
    statCard('Strategy Selected', session.strategySelected, WandSparkles, 'from-emerald-500/15 to-teal-500/10'),
    statCard('Recovery Applied', session.recoveryApplied, RotateCcw, 'from-amber-500/15 to-yellow-500/10'),
    statCard('Retest Status', session.retestStatus, TestTube2, 'from-lime-500/15 to-emerald-500/10'),
  ];

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-cyan-950/20 p-5 shadow-[0_18px_36px_rgba(2,10,26,0.32)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">Live Healing View</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-100">Self-Healing Memory Center</h2>
        </div>
        <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
          In Progress
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <article
              key={card.label}
              className={`min-w-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br p-4 shadow-[0_12px_24px_rgba(2,10,26,0.28)] ${card.tone}`}
            >
              <div className="mb-2 flex items-start justify-between gap-2 text-slate-300">
                <p className="min-w-0 break-words text-[10px] font-medium uppercase tracking-[0.16em] leading-tight">
                  {card.label}
                </p>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              </div>
              <p className="min-w-0 break-words text-sm font-semibold leading-snug text-slate-50">
                {card.value}
              </p>
            </article>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500">This view is shown only while the healing agent is running.</p>
    </section>
  );
}
