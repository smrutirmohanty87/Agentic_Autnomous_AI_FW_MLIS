/**
 * src/ai/cache/RequirementCache.ts
 *
 * Requirement Cache — Stores and retrieves Planner and Designer outputs
 * to avoid redundant LLM calls for the same requirements.
 *
 * Cache Flow:
 *
 *   Requirement
 *       ↓
 *   Cache Check
 *       ↓
 *   If HIT:
 *       - Skip Planner
 *       - Skip Designer
 *       - Load cached outputs
 *       - Continue from Generator
 *   If MISS:
 *       - Execute Planner
 *       - Execute Designer
 *       - Save outputs to cache
 *       - Continue normally
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { mkdirSync, readdirSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CacheStatus = 'HIT' | 'MISS';

export interface CacheEntry {
  requirement: string;
  requirementHash: string;
  plannerOutput: {
    testCases: number;
    description: string;
    details?: unknown;
  };
  designerOutput: {
    locatorCount: number;
    description: string;
    details?: unknown;
  };
  createdAt: string;
  lastUsed: string;
}

export interface CacheCheckResult {
  status: CacheStatus;
  entry?: CacheEntry;
}

// ---------------------------------------------------------------------------
// RequirementCache class
// ---------------------------------------------------------------------------

export class RequirementCache {
  private cacheDir: string;

  constructor(cacheDir: string = resolve(__dirname, '../../artifacts/cache')) {
    this.cacheDir = cacheDir;
    mkdirSync(this.cacheDir, { recursive: true });
  }

  /**
   * Generate a stable SHA256 hash from requirement text.
   *
   * Example:
   *   "Create Commercial Quote"
   *   → always produces same hash
   */
  generateHash(requirement: string): string {
    return createHash('sha256')
      .update(requirement.toLowerCase().trim())
      .digest('hex');
  }

  /**
   * Get cache file path for a requirement hash.
   */
  private getCacheFilePath(hash: string): string {
    return resolve(this.cacheDir, `${hash}.json`);
  }

  /**
   * Check if a requirement is cached.
   * Returns cache status and entry if HIT.
   */
  check(requirement: string): CacheCheckResult {
    const hash = this.generateHash(requirement);
    const filePath = this.getCacheFilePath(hash);

    if (!existsSync(filePath)) {
      return { status: 'MISS' };
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const entry: CacheEntry = JSON.parse(content);

      // Update lastUsed timestamp
      entry.lastUsed = new Date().toISOString();
      this.save(entry);

      console.log(`[cache] ✔ CACHE HIT for requirement: "${requirement.substring(0, 50)}..."`);
      return { status: 'HIT', entry };
    } catch (err) {
      console.warn(`[cache] ✘ Failed to read cache entry: ${err instanceof Error ? err.message : String(err)}`);
      return { status: 'MISS' };
    }
  }

  /**
   * Save a new cache entry.
   */
  save(entry: CacheEntry): void {
    const filePath = this.getCacheFilePath(entry.requirementHash);

    try {
      writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
      console.log(`[cache] 💾 Cached requirement: "${entry.requirement.substring(0, 50)}..."`);
    } catch (err) {
      console.warn(`[cache] ✘ Failed to save cache entry: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Create a cache entry from Planner and Designer outputs.
   */
  createEntry(
    requirement: string,
    plannerOutput: { testCases: number; description: string; details?: unknown },
    designerOutput: { locatorCount: number; description: string; details?: unknown }
  ): CacheEntry {
    return {
      requirement,
      requirementHash: this.generateHash(requirement),
      plannerOutput,
      designerOutput,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };
  }

  /**
   * List all cached requirements.
   */
  listCached(): Array<{ requirement: string; hash: string; createdAt: string; lastUsed: string }> {
    try {
      const files = readdirSync(this.cacheDir);
      const cached = files
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const filePath = resolve(this.cacheDir, f);
          const content = readFileSync(filePath, 'utf-8');
          const entry: CacheEntry = JSON.parse(content);
          return {
            requirement: entry.requirement,
            hash: entry.requirementHash,
            createdAt: entry.createdAt,
            lastUsed: entry.lastUsed,
          };
        });
      return cached;
    } catch (err) {
      console.warn(`[cache] ✘ Failed to list cached requirements: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  /**
   * Clear all cache entries (for testing).
   */
  clear(): void {
    try {
      const files = readdirSync(this.cacheDir);
      files.forEach(f => {
        if (f.endsWith('.json')) {
          const filePath = resolve(this.cacheDir, f);
          const fs = require('fs');
          fs.unlinkSync(filePath);
        }
      });
      console.log('[cache] 🧹 Cache cleared');
    } catch (err) {
      console.warn(`[cache] ✘ Failed to clear cache: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

let cacheInstance: RequirementCache | null = null;

export function getCache(): RequirementCache {
  if (!cacheInstance) {
    cacheInstance = new RequirementCache();
  }
  return cacheInstance;
}
