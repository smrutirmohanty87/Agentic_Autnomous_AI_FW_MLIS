/**
 * Recovery Replay Controls
 * Playback controls: Play, Pause, Next, Previous, Replay
 */

import React from 'react';
import type { ReplaySpeed } from '../types/recoveryReplay';

interface RecoveryReplayControlsProps {
  isPlaying: boolean;
  speed: ReplaySpeed;
  currentStepIndex: number;
  totalSteps: number;
  onPlay: () => void;
  onPause: () => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onReplay: () => void;
  onSpeedChange: (speed: ReplaySpeed) => void;
}

export function RecoveryReplayControls({
  isPlaying,
  speed,
  currentStepIndex,
  totalSteps,
  onPlay,
  onPause,
  onNextStep,
  onPreviousStep,
  onReplay,
  onSpeedChange,
}: RecoveryReplayControlsProps) {
  return (
    <div className="space-y-4">
      {/* Playback Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {isPlaying ? (
          <button
            onClick={onPause}
            className="flex items-center gap-2 rounded-lg bg-amber-500/20 px-3 py-2 text-sm font-medium text-amber-300 ring-1 ring-amber-400/30 transition-all hover:bg-amber-500/30"
            title="Pause replay"
          >
            <span className="text-lg">⏸</span>
            Pause
          </button>
        ) : (
          <button
            onClick={onPlay}
            className="flex items-center gap-2 rounded-lg bg-cyan-500/20 px-3 py-2 text-sm font-medium text-cyan-300 ring-1 ring-cyan-400/30 transition-all hover:bg-cyan-500/30"
            title="Play from current step"
          >
            <span className="text-lg">▶</span>
            Play
          </button>
        )}

        <button
          onClick={onPreviousStep}
          disabled={currentStepIndex === 0}
          className="flex items-center gap-2 rounded-lg bg-slate-600/50 px-3 py-2 text-sm font-medium text-slate-300 ring-1 ring-slate-500/30 transition-all hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Previous step"
        >
          <span className="text-lg">⏮</span>
          Previous
        </button>

        <button
          onClick={onNextStep}
          disabled={currentStepIndex === totalSteps - 1}
          className="flex items-center gap-2 rounded-lg bg-slate-600/50 px-3 py-2 text-sm font-medium text-slate-300 ring-1 ring-slate-500/30 transition-all hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next step"
        >
          <span className="text-lg">⏭</span>
          Next
        </button>

        <button
          onClick={onReplay}
          className="flex items-center gap-2 rounded-lg bg-violet-500/20 px-3 py-2 text-sm font-medium text-violet-300 ring-1 ring-violet-400/30 transition-all hover:bg-violet-500/30"
          title="Replay from beginning"
        >
          <span className="text-lg">🔁</span>
          Replay
        </button>
      </div>

      {/* Speed Control */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Speed</span>
        <div className="flex gap-2">
          {(['1x', '2x', '5x'] as const).map(speedOption => (
            <button
              key={speedOption}
              onClick={() => onSpeedChange(speedOption)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                speed === speedOption
                  ? 'bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-400/50'
                  : 'bg-slate-700/50 text-slate-400 ring-1 ring-slate-600/30 hover:bg-slate-700'
              }`}
            >
              {speedOption}
            </button>
          ))}
        </div>
      </div>

      {/* Step Progress */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Step {currentStepIndex + 1} of {totalSteps}
        </span>
        <div className="h-1 w-48 overflow-hidden rounded-full bg-slate-800/60">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
