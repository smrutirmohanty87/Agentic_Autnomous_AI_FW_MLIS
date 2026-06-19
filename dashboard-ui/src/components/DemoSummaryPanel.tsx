/**
 * Demo Summary Panel
 * Displays final demo results and metrics
 */

import React from 'react';
import type { DemoSummary } from '../types/demoMode';

interface DemoSummaryPanelProps {
  summary: DemoSummary;
  isVisible: boolean;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
}

export function DemoSummaryPanel({
  summary,
  isVisible,
}: DemoSummaryPanelProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl shadow-cyan-500/20">
        {/* Header */}
        <div className="border-b border-cyan-500/20 bg-slate-900/95 backdrop-blur px-8 py-6">
          <h2 className="text-2xl font-bold text-cyan-300">🎉 Demo Complete</h2>
          <p className="mt-2 text-sm text-slate-400">
            Here's a summary of the entire workflow execution
          </p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Main Metrics */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                Total Time
              </p>
              <p className="mt-2 text-2xl font-bold text-cyan-300">
                {formatDuration(summary.totalExecutionTime)}
              </p>
            </div>

            {summary.tokensSaved !== undefined && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                  Tokens Saved
                </p>
                <p className="mt-2 text-2xl font-bold text-amber-300">
                  {summary.tokensSaved}
                </p>
              </div>
            )}

            {summary.cacheHits !== undefined && (
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
                  Cache Hits
                </p>
                <p className="mt-2 text-2xl font-bold text-blue-300">
                  {summary.cacheHits}
                </p>
              </div>
            )}

            {summary.templateHits !== undefined && (
              <div className="rounded-lg bg-violet-500/10 border border-violet-500/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                  Template Hits
                </p>
                <p className="mt-2 text-2xl font-bold text-violet-300">
                  {summary.templateHits}
                </p>
              </div>
            )}
          </div>

          {/* Secondary Metrics */}
          <div className="border-t border-slate-700 pt-6">
            <p className="mb-4 text-sm font-semibold text-slate-300">Healing & Recovery</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {summary.healingEvents !== undefined && (
                <div className="rounded-lg bg-slate-800/50 border border-slate-600/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Healing Events</span>
                    <span className="text-2xl font-bold text-cyan-300">{summary.healingEvents}</span>
                  </div>
                </div>
              )}

              {summary.recoverySuccessRate !== undefined && (
                <div className="rounded-lg bg-slate-800/50 border border-slate-600/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Recovery Success Rate</span>
                    <span className="text-2xl font-bold text-emerald-300">{summary.recoverySuccessRate}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Estimated Cost Saved */}
          {summary.estimatedCostSaved !== undefined && (
            <div className="border-t border-slate-700 pt-6 rounded-lg bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-2">
                Estimated Cost Saved
              </p>
              <p className="text-3xl font-bold text-emerald-300">
                ${summary.estimatedCostSaved.toFixed(2)}
              </p>
            </div>
          )}

          {/* Phase Breakdown */}
          {Object.keys(summary.phaseTimes).length > 0 && (
            <div className="border-t border-slate-700 pt-6">
              <p className="mb-4 text-sm font-semibold text-slate-300">Phase Timing</p>
              <div className="space-y-2">
                {Object.entries(summary.phaseTimes)
                  .sort(([_, a], [__, b]) => b - a)
                  .map(([phase, time]) => (
                    <div key={phase} className="flex items-center justify-between text-xs">
                      <span className="capitalize text-slate-500">{phase}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-32 rounded-full bg-slate-700/50 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                            style={{
                              width: `${(time / summary.totalExecutionTime) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="w-16 text-right font-bold text-slate-300">
                          {formatDuration(time)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 bg-slate-900/50 px-8 py-4">
          <p className="text-xs text-slate-500">
            This demo showcased the entire Agentic QA Platform workflow from requirement analysis through recovery.
          </p>
        </div>
      </div>
    </div>
  );
}
