/**
 * Recovery Journey Replay Modal
 * Main modal component for replaying the recovery journey
 */

import React, { useEffect, useState } from 'react';
import { RecoveryReplayControls } from './RecoveryReplayControls';
import { RecoveryReplayTimeline } from './RecoveryReplayTimeline';
import type { RecoveryReplayData, ReplaySpeed, ReplayState } from '../types/recoveryReplay';

interface RecoveryJourneyReplayProps {
  isOpen: boolean;
  recoveryEvent: RecoveryReplayData | null;
  replayState: ReplayState;
  onClose: () => void;
  onPlay: () => void;
  onPause: () => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onReplay: () => void;
  onSpeedChange: (speed: ReplaySpeed) => void;
}

export function RecoveryJourneyReplay({
  isOpen,
  recoveryEvent,
  replayState,
  onClose,
  onPlay,
  onPause,
  onNextStep,
  onPreviousStep,
  onReplay,
  onSpeedChange,
}: RecoveryJourneyReplayProps) {
  const [displayDuration, setDisplayDuration] = useState(0);

  // Animate duration counter
  useEffect(() => {
    if (!recoveryEvent || !isOpen) {
      setDisplayDuration(0);
      return;
    }

    const targetDuration = recoveryEvent.recoveryDuration ?? 0;
    const stepIndex = replayState.currentStepIndex;
    const isInRecoveryPhase = stepIndex >= 4 && stepIndex <= 7;

    if (!isInRecoveryPhase) {
      setDisplayDuration(0);
      return;
    }

    // Animate duration based on step progress
    const stepProgress = (stepIndex - 4) / 4;
    const animatedDuration = targetDuration * stepProgress;

    const interval = setInterval(() => {
      setDisplayDuration(prev => {
        const increment = targetDuration / 20;
        const newValue = Math.min(prev + increment, targetDuration);
        return newValue;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [recoveryEvent, isOpen, replayState.currentStepIndex]);

  if (!isOpen || !recoveryEvent || replayState.steps.length === 0) {
    return null;
  }

  const currentStep = replayState.steps[replayState.currentStepIndex];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl shadow-cyan-500/20">
          {/* Header */}
          <div className="sticky top-0 border-b border-cyan-500/20 bg-slate-900/95 backdrop-blur px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-cyan-300">▶ Recovery Journey Replay</h2>
              <p className="mt-1 text-xs text-slate-400">{recoveryEvent.testName}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-slate-800 transition-colors"
              title="Close replay"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Main Step Display */}
            <div className="rounded-xl border border-cyan-500/20 bg-slate-800/50 p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-4xl">{currentStep?.icon}</div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-cyan-300">
                      {currentStep?.label}
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      Step {replayState.currentStepIndex + 1} of {replayState.steps.length}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <p className="text-sm text-slate-300">{currentStep?.description}</p>
                </div>

                {/* Confidence Meter */}
                {recoveryEvent.confidenceScore > 0 && (
                  <div className="border-t border-slate-700 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Recovery Confidence
                      </span>
                      <span className="text-lg font-bold text-emerald-400">
                        {recoveryEvent.confidenceScore}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-700/50 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 via-emerald-500 to-green-500 transition-all duration-300"
                        style={{
                          width: `${Math.min(recoveryEvent.confidenceScore, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Recovery Duration Counter */}
                {recoveryEvent.recoveryDuration && (
                  <div className="border-t border-slate-700 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Recovery Duration
                      </span>
                      <span className="text-lg font-bold font-mono text-cyan-300">
                        {displayDuration.toFixed(0)} ms
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <RecoveryReplayControls
              isPlaying={replayState.isPlaying}
              speed={replayState.speed}
              currentStepIndex={replayState.currentStepIndex}
              totalSteps={replayState.steps.length}
              onPlay={onPlay}
              onPause={onPause}
              onNextStep={onNextStep}
              onPreviousStep={onPreviousStep}
              onReplay={onReplay}
              onSpeedChange={onSpeedChange}
            />

            {/* Timeline */}
            <RecoveryReplayTimeline
              steps={replayState.steps}
              currentStepIndex={replayState.currentStepIndex}
            />
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700 bg-slate-900/50 px-6 py-4">
            <p className="text-xs text-slate-500">
              This replay uses actual recorded recovery data from{' '}
              <span className="font-mono text-slate-400">{recoveryEvent.recoveryId}</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
