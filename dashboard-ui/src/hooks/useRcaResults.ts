import { useEffect, useRef, useState } from 'react';

export interface LiveRcaEntry {
  testName: string;
  failureType: string;
  rootCause: string;
  recoveryAction: string;
  recoveryStatus: 'SUCCESS' | 'FAILED';
  confidence: number;
  recommendation: string;
  timestamp: string;
  errorMessage: string;
}

const POLL_MS = 2000;

export function useRcaResults(): LiveRcaEntry[] {
  const [entries, setEntries] = useState<LiveRcaEntry[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchData(): Promise<void> {
    try {
      const res = await fetch(`/rca-results.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) return;
      const json: LiveRcaEntry[] = await res.json();
      setEntries(json);
    } catch {
      // file not yet written — ignore
    }
  }

  useEffect(() => {
    void fetchData();
    intervalRef.current = setInterval(() => { void fetchData(); }, POLL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return entries;
}
