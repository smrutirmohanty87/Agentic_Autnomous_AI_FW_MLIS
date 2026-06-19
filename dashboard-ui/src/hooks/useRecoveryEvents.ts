import { useEffect, useRef, useState } from 'react';
import type { RecoveryEvent } from '../types/recoveryEvents';

const POLL_MS = 2000;

export function useRecoveryEvents(): RecoveryEvent[] {
  const [events, setEvents] = useState<RecoveryEvent[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchData(): Promise<void> {
    try {
      const res = await fetch(`/recovery-events.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) return;
      const json = (await res.json()) as RecoveryEvent[];
      setEvents(Array.isArray(json) ? json : []);
    } catch {
      // file may not exist during early startup
    }
  }

  useEffect(() => {
    void fetchData();
    intervalRef.current = setInterval(() => { void fetchData(); }, POLL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return events;
}
