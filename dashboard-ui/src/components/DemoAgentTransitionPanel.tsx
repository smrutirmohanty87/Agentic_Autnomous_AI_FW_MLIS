/**
 * Demo Agent Transition Panel
 * Displays live agent transitions with status and output
 */

import React from 'react';
import type { DemoAgentTransition } from '../types/demoMode';

interface DemoAgentTransitionPanelProps {
  transitions: DemoAgentTransition[];
  executiveMode?: boolean;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getStatusColor(status: string): string {
  if (status === 'COMPLETED') return 'text-emerald-400';
  if (status === 'RUNNING') return 'text-cyan-400 animate-pulse';
  if (status === 'FAILED') return 'text-rose-400';
  return 'text-slate-400';
}

function getStatusBg(status: string): string {
  if (status === 'COMPLETED') return 'bg-emerald-500/10 border-emerald-500/30';
  if (status === 'RUNNING') return 'bg-cyan-500/10 border-cyan-500/30';
  if (status === 'FAILED') return 'bg-rose-500/10 border-rose-500/30';
  return 'bg-slate-700/30 border-slate-600/30';
}

export function DemoAgentTransitionPanel({
  transitions,
  executiveMode = false,
}: DemoAgentTransitionPanelProps) {
  const currentTransition = transitions.length > 0 ? transitions[transitions.length - 1] : null;

  return (
    <div className={`rounded-xl border bg-gradient-to-br from-slate-900 to-slate-800 p-6 ${
      executiveMode
        ? 'border-cyan-500/50 ring-2 ring-cyan-500/20'
        : 'border-cyan-500/30'
    }`}>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-cyan-300">
        {executiveMode ? '⭐ Current Agent' : 'Agent Transitions'}
      </h3>

      {currentTransition && (
        <div className={`rounded-lg border p-4 mb-4 ${getStatusBg(currentTransition.status)}`}>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <h4 className={`text-lg font-bold ${executiveMode ? 'text-2xl' : ''} ${getStatusColor(currentTransition.status)}`}>
                {currentTransition.agent}
              </h4>
              <p className="mt-1 text-xs text-slate-400 uppercase tracking-widest">
                {currentTransition.status}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${executiveMode ? 'text-2xl' : ''} text-cyan-300`}>
                {formatDuration(currentTransition.duration)}
              </p>
              <p className="text-xs text-slate-400">Elapsed</p>
            </div>
          </div>

          {/* Output Summary */}
          {currentTransition.output && Object.keys(currentTransition.output).length > 0 && (
            <div className="space-y-2 border-t border-slate-700 pt-3">
              {Object.entries(currentTransition.output)
                .filter(([_, value]) => value !== undefined && value !== null)
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-2">
                    <span className="text-xs text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <span className={`text-xs font-semibold ${
                      typeof value === 'number' ? 'text-cyan-300' : 'text-slate-300'
                    }`}>
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {currentTransition.error && (
            <div className="mt-3 rounded-lg bg-rose-500/10 border border-rose-500/30 p-2">
              <p className="text-xs text-rose-300">{currentTransition.error}</p>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {transitions.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">History</p>
          {transitions.slice(-4).reverse().map((transition, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/40 p-2 text-xs">
              <span className="text-slate-400">{transition.agent}</span>
              <span className={`${getStatusColor(transition.status)}`}>
                {transition.status === 'COMPLETED' ? '✓' : transition.status === 'FAILED' ? '✕' : '●'}
              </span>
              <span className="text-slate-500">{formatDuration(transition.duration)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
