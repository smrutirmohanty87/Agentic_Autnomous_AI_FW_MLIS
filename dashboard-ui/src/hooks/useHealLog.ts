import { useEffect, useRef, useState } from 'react';
import type { HealingRecord } from '../types/dashboard';

const POLL_MS = 2000;

export function useHealLog(): HealingRecord[] {
  const [records, setRecords] = useState<HealingRecord[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchData(): Promise<void> {
    try {
      const res = await fetch(`/heal-log.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) return;
      const json: HealingRecord[] = await res.json();
      setRecords(json);
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

  return records;
}
