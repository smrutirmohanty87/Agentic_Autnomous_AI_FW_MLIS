import { useEffect, useRef, useState } from 'react';
import type { DashboardData } from '../types/dashboard';

interface UseDashboardDataResult {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const POLL_MS = 3000;

export function useDashboardData(): UseDashboardDataResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function refetch(): void {
    setVersion(v => v + 1);
  }

  useEffect(() => {
    let mounted = true;

    async function loadFrom(url: string): Promise<DashboardData | null> {
      const response = await fetch(url + `?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!response.ok) return null;
      return (await response.json()) as DashboardData;
    }

    async function load(): Promise<void> {
      try {
        const runtime = await loadFrom('/agentic-qa-runtime.json');
        const payload = runtime ?? (await loadFrom('/mock-agentic-qa.json'));
        if (!payload) throw new Error('Failed to load runtime or mock dashboard data.');
        if (mounted) {
          setData(payload);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown data load error');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();

    // Poll so REPORT MODE picks up freshly written agentic-qa-runtime.json
    intervalRef.current = setInterval(() => { void load(); }, POLL_MS);

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [version]);

  return { data, isLoading, error, refetch };
}
