import { useEffect, useRef, useState } from 'react';

export interface SuiteProgress {
  totalTests: number;
  passed: number;
  failed: number;
  running: number;
  pending: number;
  currentTest: string | null;
  progressPct: number;
  startedAt: string | null;
  durationMs: number | null;
  suiteStatus: 'RUNNING' | 'PASSED' | 'FAILED' | null;
  updatedAt: string | null;
}

const POLL_MS = 2000;

export function useSuiteProgress(): SuiteProgress | null {
  const [data, setData] = useState<SuiteProgress | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchData(): Promise<void> {
    try {
      const res = await fetch(`/suite-progress.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) return;
      const json: SuiteProgress = await res.json();
      setData(json);
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

  return data;
}
