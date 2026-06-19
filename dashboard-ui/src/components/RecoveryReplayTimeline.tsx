/**
 * Recovery Replay Timeline
 * Visualizes the recovery journey with step indicators
 */

import React from 'react';
import type { ReplayStepData } from '../types/recoveryReplay';

interface RecoveryReplayTimelineProps {
  steps: ReplayStepData[];
  currentStepIndex: number;
  onStepClick?: (index: number) => void;
}

export function RecoveryReplayTimeline({
  steps,
  currentStepIndex,
  onStepClick,
}: RecoveryReplayTimelineProps) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-300">Recovery Timeline</h3>
      </div>

      {/* Visual Timeline */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;

          return (
            <div key={index} className="flex gap-4">
              {/* Timeline Dot */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => onStepClick?.(index)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold transition-all ${
                    isActive
                      ? 'ring-2 ring-cyan-400 bg-cyan-500/20 scale-110'
                      : isCompleted
                        ? 'bg-emerald-500/20 ring-1 ring-emerald-400/50'
                        : 'bg-slate-700/50 ring-1 ring-slate-600/30'
                  }`}
                  title={`Go to ${step.label}`}
                >
                  {step.icon}
                </button>

                {/* Timeline Connector */}
                {index < steps.length - 1 && (
                  <div
                    className={`my-2 h-8 w-0.5 transition-colors ${
                      isCompleted ? 'bg-emerald-500/40' : isActive ? 'bg-cyan-400/40' : 'bg-slate-600/30'
                    }`}
                  />
                )}
              </div>

              {/* Step Content */}
              <div className="pt-1 pb-4 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4
                      className={`text-sm font-semibold transition-colors ${
                        isActive ? 'text-cyan-300' : isCompleted ? 'text-emerald-300' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      {step.description}
                    </p>
                  </div>
                  {step.timestamp && (
                    <span className="text-xs text-slate-500 whitespace-nowrap">{step.timestamp}</span>
                  )}
                </div>

                {/* Step Details */}
                {step.details && Object.keys(step.details).length > 0 && (
                  <div className="mt-2 space-y-1 rounded-lg bg-slate-800/30 p-2">
                    {Object.entries(step.details).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-2 text-xs">
                        <span className="text-slate-500">{key}:</span>
                        <span className="font-medium text-slate-300">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
