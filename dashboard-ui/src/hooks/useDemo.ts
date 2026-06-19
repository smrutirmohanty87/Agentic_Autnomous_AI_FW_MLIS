/**
 * useDemo Hook
 * Manages demo mode state, phase transitions, and visualization data
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  DemoState,
  DemoPhase,
  DemoPhaseConfig,
  DemoAgentTransition,
  DemoOptimizationMetrics,
  DemoExecutionMetrics,
  DemoHealingEvent,
  DemoRCAResult,
  DemoSummary,
} from '../types/demoMode';

const DEFAULT_PHASES: DemoPhaseConfig[] = [
  { phase: 'requirement', label: 'Requirement Analysis', description: 'Parsing test requirements', icon: '📋', duration: 2000, order: 1 },
  { phase: 'compression', label: 'Prompt Compression', description: 'Compressing test prompts', icon: '📦', duration: 3000, order: 2 },
  { phase: 'cache', label: 'Cache Agent', description: 'Checking memory cache', icon: '💾', duration: 3000, order: 3 },
  { phase: 'template', label: 'Template Library', description: 'Matching templates', icon: '📚', duration: 3000, order: 4 },
  { phase: 'planner', label: 'Test Planner', description: 'Planning test cases', icon: '🎯', duration: 3000, order: 5 },
  { phase: 'designer', label: 'Test Designer', description: 'Designing test logic', icon: '🎨', duration: 3000, order: 6 },
  { phase: 'generator', label: 'Test Generator', description: 'Generating test code', icon: '⚙️', duration: 3000, order: 7 },
  { phase: 'execution', label: 'Execution Engine', description: 'Running tests', icon: '🚀', duration: 5000, order: 8 },
  { phase: 'healing', label: 'Healing Agent', description: 'Healing failures', icon: '🏥', duration: 3000, order: 9 },
  { phase: 'rca', label: 'RCA Analysis', description: 'Root cause analysis', icon: '🔍', duration: 3000, order: 10 },
  { phase: 'replay', label: 'Recovery Replay', description: 'Replaying recovery', icon: '▶', duration: 2000, order: 11 },
];

export function useDemo(initialEnabled = false) {
  const [demoState, setDemoState] = useState<DemoState>({
    enabled: initialEnabled,
    isRunning: false,
    currentPhase: 'requirement',
    currentPhaseIndex: 0,
    phases: DEFAULT_PHASES,
    agentTransitions: [],
    optimizationMetrics: {},
    executionMetrics: {},
    healingEvents: [],
    completedPhases: [],
    executiveMode: false,
  });

  // Enable/disable demo mode
  const toggleDemoMode = useCallback(() => {
    setDemoState(prev => ({
      ...prev,
      enabled: !prev.enabled,
      isRunning: false,
      currentPhaseIndex: 0,
      currentPhase: 'requirement',
      completedPhases: [],
    }));
  }, []);

  // Toggle executive mode
  const toggleExecutiveMode = useCallback(() => {
    setDemoState(prev => ({
      ...prev,
      executiveMode: !prev.executiveMode,
    }));
  }, []);

  // Start demo
  const startDemo = useCallback(() => {
    setDemoState(prev => ({
      ...prev,
      isRunning: true,
      startTime: Date.now(),
      currentPhaseIndex: 0,
      currentPhase: 'requirement',
      completedPhases: [],
      agentTransitions: [],
      healingEvents: [],
    }));
  }, []);

  // Stop demo
  const stopDemo = useCallback(() => {
    setDemoState(prev => ({
      ...prev,
      isRunning: false,
    }));
  }, []);

  // Advance to next phase
  const nextPhase = useCallback(() => {
    setDemoState(prev => {
      if (prev.currentPhaseIndex < prev.phases.length - 1) {
        const nextIndex = prev.currentPhaseIndex + 1;
        const nextPhaseConfig = prev.phases[nextIndex];
        return {
          ...prev,
          currentPhaseIndex: nextIndex,
          currentPhase: nextPhaseConfig.phase,
          completedPhases: [...prev.completedPhases, prev.currentPhase],
        };
      }
      return {
        ...prev,
        isRunning: false,
        completedPhases: [...prev.completedPhases, prev.currentPhase],
      };
    });
  }, []);

  // Add agent transition
  const addAgentTransition = useCallback((transition: Omit<DemoAgentTransition, 'startTime'>) => {
    setDemoState(prev => ({
      ...prev,
      agentTransitions: [...prev.agentTransitions, { ...transition, startTime: Date.now() }],
    }));
  }, []);

  // Update optimization metrics
  const setOptimizationMetrics = useCallback((metrics: DemoOptimizationMetrics) => {
    setDemoState(prev => ({
      ...prev,
      optimizationMetrics: metrics,
    }));
  }, []);

  // Update execution metrics
  const setExecutionMetrics = useCallback((metrics: DemoExecutionMetrics) => {
    setDemoState(prev => ({
      ...prev,
      executionMetrics: metrics,
    }));
  }, []);

  // Add healing event
  const addHealingEvent = useCallback((event: Omit<DemoHealingEvent, 'timestamp'>) => {
    setDemoState(prev => ({
      ...prev,
      healingEvents: [...prev.healingEvents, { ...event, timestamp: Date.now() }],
    }));
  }, []);

  // Set RCA result
  const setRCAResult = useCallback((result: DemoRCAResult) => {
    setDemoState(prev => ({
      ...prev,
      rcaResult: result,
    }));
  }, []);

  // Set demo summary
  const setSummary = useCallback((summary: DemoSummary) => {
    setDemoState(prev => ({
      ...prev,
      summary,
    }));
  }, []);

  // Auto-advance phases during demo
  useEffect(() => {
    if (!demoState.isRunning || demoState.currentPhaseIndex >= demoState.phases.length) {
      return;
    }

    const currentPhaseConfig = demoState.phases[demoState.currentPhaseIndex];
    const timer = setTimeout(() => {
      nextPhase();
    }, currentPhaseConfig.duration);

    return () => clearTimeout(timer);
  }, [demoState.isRunning, demoState.currentPhaseIndex, demoState.phases, nextPhase]);

  return {
    demoState,
    toggleDemoMode,
    toggleExecutiveMode,
    startDemo,
    stopDemo,
    nextPhase,
    addAgentTransition,
    setOptimizationMetrics,
    setExecutionMetrics,
    addHealingEvent,
    setRCAResult,
    setSummary,
  };
}
