import { useEffect, useRef, useState } from 'react';
import type { WorkflowStatus } from '../types/dashboard';

const POLL_INTERVAL_MS = 1000;

interface UseWorkflowStatusResult {
  workflowStatus: WorkflowStatus | null;
  isLive: boolean;
  error: string | null;
}

export function useWorkflowStatus(): UseWorkflowStatusResult {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  async function fetchStatus(): Promise<void> {
    try {
      const res = await fetch(`/workflow-status.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) {
        setIsLive(false);
        // Keep polling — workflow-status.json may be created later by orchestrator
        return;
      }
      const data = (await res.json()) as WorkflowStatus;
      setWorkflowStatus(data);
      setError(null);

      if (data.overallStatus === 'RUNNING') {
        setIsLive(true);
      } else {
        setIsLive(false);
        // Do NOT stop polling — a new run may start at any time
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workflow status');
      setIsLive(false);
      // Keep polling — workflow-status.json may appear when the next run starts
    }
  }

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);

    return () => {
      stopPolling();
    };
  }, []);

  return { workflowStatus, isLive, error };
}
