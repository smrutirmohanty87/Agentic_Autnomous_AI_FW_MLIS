export type RecoveryMemoryHit = 'SEARCHING' | 'HIT' | 'MISS' | 'UNKNOWN';
export type RecoveryRetestResult = 'NOT_RUN' | 'RUNNING' | 'PASSED' | 'FAILED';
export type RecoveryFinalStatus = 'RUNNING' | 'RECOVERED' | 'FAILED';

export interface RecoveryEvent {
  recoveryId: string;
  workflowId: string;
  testName: string;
  failureType: string;
  failedLocator: string;
  memoryHit: RecoveryMemoryHit;
  confidenceScore: number;
  recoveryStrategy: string;
  recoveryStartTime: string;
  recoveryEndTime?: string;
  recoveryDuration?: number;
  retestResult: RecoveryRetestResult;
  finalStatus: RecoveryFinalStatus;
  failureReason?: string;
  updatedAt: string;
}

export type RecoveryMetricType =
  | 'recoveryAttempts'
  | 'successfulRecoveries'
  | 'failedRecoveries'
  | 'averageRecoveryTimeRecovery'
  | 'recoverySuccessRate';
