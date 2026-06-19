/**
 * Demo Timeline Panel
 * Visualizes the demo phase progression timeline
 */

import React from 'react';
import type { DemoPhaseConfig, DemoPhase } from '../types/demoMode';

interface DemoTimelinePanelProps {
  phases: DemoPhaseConfig[];
  currentPhase: DemoPhase;
  completedPhases: DemoPhase[];
  onPhaseClick?: (phase: DemoPhase) => void;
}

export function DemoTimelinePanel({
  phases,
  currentPhase,
  completedPhases,
  onPhaseClick,
}: DemoTimelinePanelProps) {
  return (
    <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-cyan-300">
        Demo Timeline
      </h3>

      <div className="space-y-3">
        {phases.map((phase, index) => {
          const isActive = phase.phase === currentPhase;
          const isCompleted = completedPhases.includes(phase.phase);

          return (
            <div key={phase.phase} className="flex items-center gap-3">
              {/* Phase Number */}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-cyan-500/30 ring-2 ring-cyan-400 scale-110'
                    : isCompleted
                      ? 'bg-emerald-500/20 ring-1 ring-emerald-400/50'
                      : 'bg-slate-700/50 ring-1 ring-slate-600/30'
                }`}
              >
                {index + 1}
              </div>

              {/* Phase Content */}
              <button
                onClick={() => onPhaseClick?.(phase.phase)}
                className={`flex-1 text-left transition-all ${
                  isActive ? 'opacity-100' : isCompleted ? 'opacity-75' : 'opacity-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{phase.icon}</span>
                  <div>
                    <p className={`text-xs font-semibold ${
                      isActive ? 'text-cyan-300' : isCompleted ? 'text-emerald-300' : 'text-slate-400'
                    }`}>
                      {phase.label}
                    </p>
                    <p className="text-[10px] text-slate-500">{phase.description}</p>
                  </div>
                </div>
              </button>

              {/* Status Badge */}
              <div className="text-right">
                {isActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-300 ring-1 ring-cyan-400/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    Running
                  </span>
                )}
                {isCompleted && !isActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300 ring-1 ring-emerald-400/30">
                    ✓ Done
                  </span>
                )}
                {!isCompleted && !isActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 ring-1 ring-slate-600/30">
                    Pending
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-6 rounded-full bg-slate-800/60 h-1 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300"
          style={{
            width: `${((completedPhases.length + (completedPhases.includes(currentPhase) ? 0 : 1)) / phases.length) * 100}%`,
          }}
        />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Phase {completedPhases.length + 1} of {phases.length}
      </p>
    </div>
  );
}
