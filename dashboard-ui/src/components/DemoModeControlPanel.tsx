/**
 * Demo Mode Control Panel
 * Main control interface for demo mode
 */

import React from 'react';
import type { DemoState } from '../types/demoMode';
import { DemoTimelinePanel } from './DemoTimelinePanel';
import { DemoAgentTransitionPanel } from './DemoAgentTransitionPanel';
import { DemoOptimizationMetricsPanel } from './DemoOptimizationMetricsPanel';

interface DemoModeControlPanelProps {
  demoState: DemoState;
  onToggle: () => void;
  onToggleExecutiveMode: () => void;
  onStart: () => void;
  onStop: () => void;
}

export function DemoModeControlPanel({
  demoState,
  onToggle,
  onToggleExecutiveMode,
  onStart,
  onStop,
}: DemoModeControlPanelProps) {
  if (!demoState.enabled) {
    return null;
  }

  return (
    <div className={`space-y-6 ${demoState.executiveMode ? 'fixed inset-0 z-40 p-8 bg-slate-900 overflow-y-auto' : ''}`}>
      {/* Control Bar */}
      <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 to-slate-800 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-cyan-300 flex items-center gap-2">
              <span className="text-2xl">🎬</span>
              Demo Mode
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {demoState.isRunning ? 'Demo running - Watch the workflow unfold' : 'Ready to demonstrate'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {demoState.isRunning ? (
              <button
                onClick={onStop}
                className="flex items-center gap-2 rounded-lg bg-rose-500/20 px-4 py-2 text-sm font-medium text-rose-300 ring-1 ring-rose-400/30 transition-all hover:bg-rose-500/30"
              >
                <span>⏹</span>
                Stop Demo
              </button>
            ) : (
              <button
                onClick={onStart}
                className="flex items-center gap-2 rounded-lg bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-300 ring-1 ring-cyan-400/30 transition-all hover:bg-cyan-500/30"
              >
                <span>▶</span>
                Start Demo
              </button>
            )}

            <button
              onClick={onToggleExecutiveMode}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ring-1 transition-all ${
                demoState.executiveMode
                  ? 'bg-violet-500/20 text-violet-300 ring-violet-400/30 hover:bg-violet-500/30'
                  : 'bg-slate-700/50 text-slate-400 ring-slate-600/30 hover:bg-slate-700'
              }`}
            >
              <span>⭐</span>
              {demoState.executiveMode ? 'Exit Executive Mode' : 'Executive Mode'}
            </button>

            <button
              onClick={onToggle}
              className="flex items-center gap-2 rounded-lg bg-slate-700/50 px-4 py-2 text-sm font-medium text-slate-400 ring-1 ring-slate-600/30 transition-all hover:bg-slate-700"
            >
              <span>✕</span>
              Close Demo
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {demoState.executiveMode ? (
        <div className="space-y-8">
          {/* Executive Mode Layout - Fullscreen */}
          <div className="grid gap-8">
            {/* Timeline - Large */}
            <DemoTimelinePanel
              phases={demoState.phases}
              currentPhase={demoState.currentPhase}
              completedPhases={demoState.completedPhases}
            />

            {/* Agent Transition - Prominent */}
            <DemoAgentTransitionPanel
              transitions={demoState.agentTransitions}
              executiveMode={true}
            />

            {/* Optimization Metrics */}
            <DemoOptimizationMetricsPanel
              metrics={demoState.optimizationMetrics}
              executiveMode={true}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Timeline */}
          <div>
            <DemoTimelinePanel
              phases={demoState.phases}
              currentPhase={demoState.currentPhase}
              completedPhases={demoState.completedPhases}
            />
          </div>

          {/* Metrics */}
          <div className="space-y-6">
            {/* Agent Transition */}
            <DemoAgentTransitionPanel
              transitions={demoState.agentTransitions}
              executiveMode={false}
            />

            {/* Optimization */}
            <DemoOptimizationMetricsPanel
              metrics={demoState.optimizationMetrics}
              executiveMode={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
