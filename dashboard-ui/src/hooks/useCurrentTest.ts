import { useEffect, useRef, useState } from 'react';

export interface CurrentTest {
  status: 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED' | 'IDLE' | 'UNKNOWN';
  testName: string | null;
  startedAt: string | null;
  durationMs: number | null;
}

const POLL_MS = 2000;

export function useCurrentTest(): CurrentTest | null {
  const [data, setData] = useState<CurrentTest | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchData(): Promise<void> {
    try {
      const res = await fetch(`/current-test.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) return;
      const json: CurrentTest = await res.json();
      setData(json);
    } catch {
      // file not yet written — ignore
    }
  }

  useEffect(() => {
    void fetchData();
    intervalRef.current = setInterval(() => { void fetchData(); }, POLL_MS);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  return data;
}
