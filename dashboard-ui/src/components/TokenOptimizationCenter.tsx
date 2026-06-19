import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Cpu,
  TrendingDown,
  Database,
  XCircle,
  LayoutTemplate,
  SkipForward,
  DollarSign,
  Zap,
} from 'lucide-react';
import type { TokenOptimizationData } from '../types/tokenOptimization';
import type { TokenMetricType } from '../types/tokenOptimization';

interface TokenOptimizationCenterProps {
  data: TokenOptimizationData;
  onMetricClick?: (metric: TokenMetricType) => void;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function cardClickProps(metric: TokenMetricType, onMetricClick?: (m: TokenMetricType) => void) {
  return {
    onClick: () => onMetricClick?.(metric),
    role: 'button' as const,
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') onMetricClick?.(metric);
    },
  };
}

export function TokenOptimizationCenter({ data, onMetricClick }: TokenOptimizationCenterProps) {
  const { tokenStats, cacheStats, templateStats, costStats } = data;

  const tokensSaved     = tokenStats?.totalSavedTokens ?? 0;
  const tokenReduction  = tokenStats?.compressionRatio ?? 0;
  const cacheHits       = cacheStats?.hits ?? 0;
  const cacheMisses     = cacheStats?.misses ?? 0;
  const templateHits    = templateStats?.hits ?? 0;
  const plannerAvoided  = cacheStats?.plannerCallsAvoided ?? cacheHits;
  const designerAvoided = cacheStats?.designerCallsAvoided ?? cacheHits;
  const costSaved       = costStats?.estimatedSavings ?? 0;
  const trendData       = tokenStats?.trend ?? [];

  const cards = [
    {
      metric: 'tokensSaved' as TokenMetricType,
      label: 'Tokens Saved',
      value: fmt(tokensSaved),
      desc: 'Total tokens avoided through compression.',
      icon: Cpu,
      style: 'ring-1 ring-cyan-400/40 bg-cyan-500/10',
      valueColor: 'text-cyan-300',
    },
    {
      metric: 'tokenReduction' as TokenMetricType,
      label: 'Token Reduction %',
      value: `${tokenReduction}%`,
      desc: 'Average compression ratio.',
      icon: TrendingDown,
      style: 'ring-1 ring-teal-400/40 bg-teal-500/10',
      valueColor: 'text-teal-300',
    },
    {
      metric: 'cacheHits' as TokenMetricType,
      label: 'Cache Hits',
      value: fmt(cacheHits),
      desc: 'Requirements served from cache.',
      icon: Database,
      style: 'ring-1 ring-emerald-400/40 bg-emerald-500/10',
      valueColor: 'text-emerald-300',
    },
    {
      metric: 'cacheMisses' as TokenMetricType,
      label: 'Cache Misses',
      value: fmt(cacheMisses),
      desc: 'Requirements requiring fresh planning.',
      icon: XCircle,
      style: 'ring-1 ring-rose-400/40 bg-rose-500/10',
      valueColor: 'text-rose-300',
    },
    {
      metric: 'templateHits' as TokenMetricType,
      label: 'Template Hits',
      value: fmt(templateHits),
      desc: 'Requirements matched to reusable templates.',
      icon: LayoutTemplate,
      style: 'ring-1 ring-violet-400/40 bg-violet-500/10',
      valueColor: 'text-violet-300',
    },
    {
      metric: 'plannerCallsAvoided' as TokenMetricType,
      label: 'Planner Calls Avoided',
      value: fmt(plannerAvoided),
      desc: 'Planner executions skipped.',
      icon: SkipForward,
      style: 'ring-1 ring-amber-400/40 bg-amber-500/10',
      valueColor: 'text-amber-300',
    },
    {
      metric: 'designerCallsAvoided' as TokenMetricType,
      label: 'Designer Calls Avoided',
      value: fmt(designerAvoided),
      desc: 'Designer executions skipped.',
      icon: SkipForward,
      style: 'ring-1 ring-orange-400/40 bg-orange-500/10',
      valueColor: 'text-orange-300',
    },
    {
      metric: 'costSaved' as TokenMetricType,
      label: 'Est. AI Cost Saved',
      value: `$${costSaved.toFixed(2)}`,
      desc: 'Estimated LLM spend avoided.',
      icon: DollarSign,
      style: 'ring-1 ring-green-400/40 bg-green-500/10',
      valueColor: 'text-green-300',
    },
  ];

  const hasAnyData =
    tokenStats !== null || cacheStats !== null || templateStats !== null || costStats !== null;

  return (
    <section
      className="rounded-2xl border border-white/10 bg-slate-950/50 p-6 shadow-[0_20px_40px_rgba(2,10,26,0.40)]"
      aria-label="Token Optimization Center"
    >
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-violet-500/30 ring-1 ring-cyan-400/30">
            <Zap className="h-5 w-5 text-cyan-300" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Token Optimization Center</h2>
            <p className="text-xs text-slate-400">
              Business value from Compression · Cache · Template Library
            </p>
          </div>
        </div>
        {hasAnyData && (
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            ACTIVE
          </span>
        )}
      </div>

      {/* Metric Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <article
              key={card.metric}
              className={`cursor-pointer rounded-xl border border-white/10 p-3 shadow-[0_12px_24px_rgba(2,10,26,0.3)] transition-transform hover:scale-105 hover:shadow-[0_16px_32px_rgba(2,10,26,0.45)] ${card.style}`}
              title={card.desc}
              {...cardClickProps(card.metric, onMetricClick)}
            >
              <div className="mb-1.5 flex items-center justify-between text-slate-300">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] leading-tight">
                  {card.label}
                </p>
                <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              </div>
              <p className={`text-xl font-bold ${card.valueColor}`}>{card.value}</p>
              <p className="mt-1 text-[10px] leading-tight text-slate-500">{card.desc}</p>
            </article>
          );
        })}
      </div>

      {/* Token Savings Trend */}
      {trendData.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-slate-300">Token Savings Trend</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#1e293b" />
                <XAxis
                  dataKey="day"
                  stroke="#475569"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  stroke="#475569"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={v => `${(v / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  cursor={{ stroke: '#22d3ee', strokeWidth: 1, strokeOpacity: 0.4 }}
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [fmt(value), 'Tokens Saved']}
                />
                <Area
                  type="monotone"
                  dataKey="saved"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  fill="url(#tokenGradient)"
                  dot={{ r: 3, fill: '#22d3ee', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#22d3ee', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!hasAnyData && (
        <p className="py-4 text-center text-sm text-slate-500">
          No token optimization data available yet. Data will appear when agents run.
        </p>
      )}
    </section>
  );
}
