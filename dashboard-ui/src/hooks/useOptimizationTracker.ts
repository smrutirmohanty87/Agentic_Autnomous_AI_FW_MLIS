import { useEffect, useRef, useState } from 'react';
import type { OptimizationTrackerData } from '../types/optimizationTracker';

const POLL_MS = 3000;

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(`${url}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function useOptimizationTracker(): OptimizationTrackerData | null {
  const [data, setData] = useState<OptimizationTrackerData | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadAll(): Promise<void> {
    const runtime = await fetchJson<OptimizationTrackerData>('/optimization-tracker.json');
    const payload = runtime ?? (await fetchJson<OptimizationTrackerData>('/mock-optimization-tracker.json'));
    if (payload !== null) setData(payload);
  }

  useEffect(() => {
    void loadAll();
    intervalRef.current = setInterval(() => { void loadAll(); }, POLL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return data;
}