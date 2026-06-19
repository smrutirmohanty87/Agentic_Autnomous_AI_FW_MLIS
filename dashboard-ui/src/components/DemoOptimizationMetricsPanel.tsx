/**
 * Demo Optimization Metrics Panel
 * Displays live compression, cache, and template matching results
 */

import React from 'react';
import type { DemoOptimizationMetrics } from '../types/demoMode';

interface DemoOptimizationMetricsPanelProps {
  metrics: DemoOptimizationMetrics;
  executiveMode?: boolean;
}

export function DemoOptimizationMetricsPanel({
  metrics,
  executiveMode = false,
}: DemoOptimizationMetricsPanelProps) {
  const hasCompressionData = metrics.compression !== undefined;
  const hasCacheData = metrics.cache !== undefined;
  const hasTemplateData = metrics.template !== undefined;

  return (
    <div className={`grid gap-3 ${executiveMode ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
      {/* Compression Results */}
      {hasCompressionData && (
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-slate-800 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-300">
            📦 Compression
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Original</span>
              <span className="text-sm font-bold text-slate-300">{metrics.compression!.original}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Compressed</span>
              <span className="text-sm font-bold text-cyan-300">{metrics.compression!.compressed}</span>
            </div>
            <div className="h-1 rounded-full bg-slate-700/50 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-500"
                style={{
                  width: `${(metrics.compression!.compressed / metrics.compression!.original) * 100}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between border-t border-slate-700 pt-2">
              <span className="text-xs text-slate-400">Saved</span>
              <span className="text-sm font-bold text-emerald-300">
                {metrics.compression!.saved} ({metrics.compression!.percentage}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cache Result */}
      {hasCacheData && (
        <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-slate-800 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-300">
            💾 Cache
          </p>
          <div className="space-y-3">
            <div className={`rounded-lg border p-3 text-center ${
              metrics.cache!.result === 'HIT'
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-slate-700/30 border-slate-600/30'
            }`}>
              <p className={`text-2xl font-bold ${
                metrics.cache!.result === 'HIT' ? 'text-emerald-300' : 'text-slate-400'
              }`}>
                {metrics.cache!.result}
              </p>
            </div>
            {metrics.cache!.hits !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Hits:</span>
                <span className="font-bold text-emerald-300">{metrics.cache!.hits}</span>
              </div>
            )}
            {metrics.cache!.misses !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Misses:</span>
                <span className="font-bold text-slate-400">{metrics.cache!.misses}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Template Match */}
      {hasTemplateData && (
        <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-slate-800 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-violet-300">
            📚 Template
          </p>
          <div className="space-y-3">
            <p className="text-sm font-bold text-slate-200">{metrics.template!.matched}</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Confidence</span>
                <span className="text-sm font-bold text-violet-300">{metrics.template!.confidence}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500"
                  style={{
                    width: `${metrics.template!.confidence}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!hasCompressionData && !hasCacheData && !hasTemplateData && (
        <div className="col-span-full rounded-xl border border-slate-600/30 bg-slate-800/30 p-4 text-center">
          <p className="text-xs text-slate-500">Optimization metrics will appear here during demo</p>
        </div>
      )}
    </div>
  );
}
