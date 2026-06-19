/**
 * Recovery Replay Types
 * Defines the structure for replay state, steps, and control
 */

export type ReplayStep =
  | 'failureDetected'
  | 'healingStarted'
  | 'memorySearch'
  | 'strategySelected'
  | 'recoveryApplied'
  | 'retestRunning'
  | 'retestResult'
  | 'workflowRecovered';

export interface ReplayStepData {
  step: ReplayStep;
  label: string;
  icon: string;
  description: string;
  timestamp?: string;
  details?: Record<string, string | number>;
}

export type ReplaySpeed = '1x' | '2x' | '5x';

export interface ReplayState {
  isOpen: boolean;
  isPlaying: boolean;
  currentStepIndex: number;
  speed: ReplaySpeed;
  steps: ReplayStepData[];
  startTime?: number;
  pausedTime?: number;
}

export interface RecoveryReplayData {
  recoveryId: string;
  testName: string;
  failureType: string;
  failedLocator: string;
  memoryHit: string;
  confidenceScore: number;
  recoveryStrategy: string;
  recoveryStartTime: string;
  recoveryEndTime?: string;
  recoveryDuration?: number;
  retestResult: string;
  finalStatus: string;
}
