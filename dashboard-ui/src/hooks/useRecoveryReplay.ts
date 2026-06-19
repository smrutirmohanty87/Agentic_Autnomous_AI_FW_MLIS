/**
 * useRecoveryReplay Hook
 * Manages replay state, step sequencing, and animation timing
 */

import { useState, useEffect, useCallback } from 'react';
import type { ReplayState, ReplayStep, ReplaySpeed, RecoveryReplayData, ReplayStepData } from '../types/recoveryReplay';

const STEP_DURATION_MS = 1000; // Base 1 second per step

export function useRecoveryReplay(recoveryEvent: RecoveryReplayData | null) {
  const [replayState, setReplayState] = useState<ReplayState>({
    isOpen: false,
    isPlaying: false,
    currentStepIndex: 0,
    speed: '1x',
    steps: [],
    startTime: undefined,
    pausedTime: undefined,
  });

  // Build replay steps from recovery event data
  const buildSteps = useCallback((event: RecoveryReplayData): ReplayStepData[] => {
    if (!event) return [];

    const startTime = new Date(event.recoveryStartTime).getTime();
    const step1Time = new Date(event.recoveryStartTime).toLocaleTimeString();
    const step6Time = event.recoveryEndTime
      ? new Date(event.recoveryEndTime).toLocaleTimeString()
      : step1Time;

    return [
      {
        step: 'failureDetected',
        label: '❌ Failure Detected',
        icon: '❌',
        description: `Test: ${event.testName}`,
        timestamp: step1Time,
        details: {
          'Failure Type': event.failureType,
          'Failed Locator': event.failedLocator,
        },
      },
      {
        step: 'healingStarted',
        label: '🔍 Healing Started',
        icon: '🔍',
        description: 'Searching Recovery Memory',
        timestamp: step1Time,
        details: {},
      },
      {
        step: 'memorySearch',
        label: '🧠 Memory Search',
        icon: '🧠',
        description: event.memoryHit === 'HIT' ? 'Memory Match Found' : 'No Match in Memory',
        timestamp: step1Time,
        details: {
          'Memory Result': event.memoryHit,
          'Confidence Score': `${event.confidenceScore}%`,
        },
      },
      {
        step: 'strategySelected',
        label: '🛠 Strategy Selected',
        icon: '🛠',
        description: event.recoveryStrategy,
        timestamp: step1Time,
        details: {
          Strategy: event.recoveryStrategy,
        },
      },
      {
        step: 'recoveryApplied',
        label: '⚡ Recovery Applied',
        icon: '⚡',
        description: 'Locator Updated',
        timestamp: step1Time,
        details: {
          'Strategy Applied': event.recoveryStrategy,
        },
      },
      {
        step: 'retestRunning',
        label: '🔄 Retest Running',
        icon: '🔄',
        description: 'Executing test with recovered locator',
        timestamp: step1Time,
        details: {},
      },
      {
        step: 'retestResult',
        label: `${event.retestResult === 'PASSED' ? '✅' : '❌'} Retest ${event.retestResult}`,
        icon: event.retestResult === 'PASSED' ? '✅' : '❌',
        description: `Retest Result: ${event.retestResult}`,
        timestamp: step6Time,
        details: {
          Result: event.retestResult,
        },
      },
      {
        step: 'workflowRecovered',
        label: '🚀 Workflow Recovered',
        icon: '🚀',
        description: 'Recovery Complete',
        timestamp: step6Time,
        details: {
          'Recovery Time': `${event.recoveryDuration ?? 0} ms`,
          'Final Status': event.finalStatus,
        },
      },
    ];
  }, []);

  // Initialize steps when recovery event is provided
  useEffect(() => {
    if (recoveryEvent) {
      const steps = buildSteps(recoveryEvent);
      setReplayState(prev => ({
        ...prev,
        steps,
        currentStepIndex: 0,
      }));
    }
  }, [recoveryEvent, buildSteps]);

  // Handle playback animation
  useEffect(() => {
    if (!replayState.isPlaying || !replayState.isOpen || replayState.steps.length === 0) {
      return;
    }

    const speedMultiplier = replayState.speed === '1x' ? 1 : replayState.speed === '2x' ? 0.5 : 0.2;
    const stepDuration = STEP_DURATION_MS * speedMultiplier;

    const timer = setTimeout(() => {
      setReplayState(prev => {
        if (prev.currentStepIndex < prev.steps.length - 1) {
          return {
            ...prev,
            currentStepIndex: prev.currentStepIndex + 1,
          };
        } else {
          // Replay completed
          return {
            ...prev,
            isPlaying: false,
          };
        }
      });
    }, stepDuration);

    return () => clearTimeout(timer);
  }, [replayState.isPlaying, replayState.isOpen, replayState.currentStepIndex, replayState.speed, replayState.steps.length]);

  const openReplay = useCallback(() => {
    setReplayState(prev => ({
      ...prev,
      isOpen: true,
      isPlaying: false,
      currentStepIndex: 0,
      startTime: Date.now(),
      pausedTime: undefined,
    }));
  }, []);

  const closeReplay = useCallback(() => {
    setReplayState(prev => ({
      ...prev,
      isOpen: false,
      isPlaying: false,
    }));
  }, []);

  const play = useCallback(() => {
    setReplayState(prev => ({
      ...prev,
      isPlaying: true,
      pausedTime: undefined,
    }));
  }, []);

  const pause = useCallback(() => {
    setReplayState(prev => ({
      ...prev,
      isPlaying: false,
      pausedTime: Date.now(),
    }));
  }, []);

  const nextStep = useCallback(() => {
    setReplayState(prev => ({
      ...prev,
      isPlaying: false,
      currentStepIndex: Math.min(prev.currentStepIndex + 1, prev.steps.length - 1),
    }));
  }, []);

  const previousStep = useCallback(() => {
    setReplayState(prev => ({
      ...prev,
      isPlaying: false,
      currentStepIndex: Math.max(prev.currentStepIndex - 1, 0),
    }));
  }, []);

  const replay = useCallback(() => {
    setReplayState(prev => ({
      ...prev,
      currentStepIndex: 0,
      isPlaying: true,
      startTime: Date.now(),
      pausedTime: undefined,
    }));
  }, []);

  const setSpeed = useCallback((speed: ReplaySpeed) => {
    setReplayState(prev => ({
      ...prev,
      speed,
    }));
  }, []);

  return {
    replayState,
    openReplay,
    closeReplay,
    play,
    pause,
    nextStep,
    previousStep,
    replay,
    setSpeed,
  };
}
