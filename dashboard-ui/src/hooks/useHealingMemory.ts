import { useEffect, useRef, useState } from 'react';
import type { HealMemoryData } from '../types/selfHealingMemory';

const POLL_MS = 2000;

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

export function useHealingMemory(): HealMemoryData | null {
  const [data, setData] = useState<HealMemoryData | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadAll(): Promise<void> {
    const payload = await fetchJson<HealMemoryData>('/healing/memory/heal-patterns.json');
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
