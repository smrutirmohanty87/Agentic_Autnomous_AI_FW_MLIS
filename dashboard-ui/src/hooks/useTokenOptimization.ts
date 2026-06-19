import { useEffect, useRef, useState } from 'react';
import type { TokenOptimizationData, TokenStats, CacheStats, TemplateStats, CostStats } from '../types/tokenOptimization';

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

export function useTokenOptimization(): TokenOptimizationData {
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [templateStats, setTemplateStats] = useState<TemplateStats | null>(null);
  const [costStats, setCostStats] = useState<CostStats | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadAll(): Promise<void> {
    const [ts, cs, tpl, cost] = await Promise.all([
      fetchJson<TokenStats>('/token-stats.json'),
      fetchJson<CacheStats>('/cache-stats.json'),
      fetchJson<TemplateStats>('/template-stats.json'),
      fetchJson<CostStats>('/cost-stats.json'),
    ]);
    if (ts !== null) setTokenStats(ts);
    if (cs !== null) setCacheStats(cs);
    if (tpl !== null) setTemplateStats(tpl);
    if (cost !== null) setCostStats(cost);
  }

  useEffect(() => {
    void loadAll();
    intervalRef.current = setInterval(() => { void loadAll(); }, POLL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { tokenStats, cacheStats, templateStats, costStats };
}
