/**
 * scripts/validate-cache.ts
 *
 * Validates the Requirement Cache implementation by running the same
 * requirement twice and comparing the cache status.
 *
 * Expected behavior:
 *
 *   Run #1: Cache MISS
 *   - Planner executes
 *   - Designer executes
 *   - Outputs saved to cache
 *
 *   Run #2: Cache HIT
 *   - Planner skipped
 *   - Designer skipped
 *   - Cached outputs used
 *
 * Usage:
 *   npx ts-node scripts/validate-cache.ts
 */

import { getCache, RequirementCache } from '../src/ai/cache/RequirementCache';
import { orchestrate } from '../orchestrator/orchestrator';
import type { TestCase } from '../orchestrator/orchestrator';
import { expect } from '@playwright/test';

// ============================================================================
// Simple Test Cases for Cache Validation
// ============================================================================

const TEST_REQUIREMENT = 'Cache Validation Test — Commercial Quote';

const testCases: TestCase[] = [
  {
    id: 'CACHE-001',
    name: 'Cache Validation: Login to Broker Portal',
    suite: 'Cache Validation',
    url: 'https://www.demo.opencart.com/',
    steps: [
      {
        description: 'Verify page loaded',
        action: async (page) => {
          await page.waitForLoadState('domcontentloaded');
          const title = await page.title();
          expect(title).toBeTruthy();
        },
      },
    ],
  },
];

const locatorMap: Parameters<typeof orchestrate>[0]['locatorMap'] = [
  {
    key: 'pageTitle',
    strategies: [
      { type: 'role', role: 'heading', options: { level: 1 } },
      { type: 'css', selector: 'h1' },
    ],
  },
];

// ============================================================================
// Validation Logic
// ============================================================================

async function validateCache() {
  const divider = '═'.repeat(70);
  console.log(`\n${divider}`);
  console.log('REQUIREMENT CACHE VALIDATION');
  console.log(divider);

  // Step 1: Clear cache to start fresh
  console.log('\n[SETUP] Clearing cache...');
  const cache = getCache();
  cache.clear();
  console.log('[SETUP] ✓ Cache cleared');

  // Step 2: Run 1 — Expected cache MISS
  console.log(`\n${divider}`);
  console.log('RUN #1: Cache MISS (first execution)');
  console.log(divider);

  const result1 = await orchestrate({
    suiteName: TEST_REQUIREMENT,
    testCases,
    locatorMap,
    demoMode: false,
  });

  const cacheAgent1 = result1.executedAgents.find(a => a.name === 'Cache');
  const plannerAgent1 = result1.executedAgents.find(a => a.name === 'Planner');
  const designerAgent1 = result1.executedAgents.find(a => a.name === 'Designer');

  console.log(`\n[RUN #1] Cache Agent:`, cacheAgent1?.detail);
  console.log(`[RUN #1] Planner Status:`, plannerAgent1?.status, `(${plannerAgent1?.detail})`);
  console.log(`[RUN #1] Designer Status:`, designerAgent1?.status, `(${designerAgent1?.detail})`);

  const run1CacheMiss = cacheAgent1?.detail?.includes('Cache MISS');
  const run1PlannerRan = plannerAgent1?.status === 'PASS';
  const run1DesignerRan = designerAgent1?.status === 'PASS';

  if (run1CacheMiss && run1PlannerRan && run1DesignerRan) {
    console.log('\n✓ Run #1 validation PASSED');
  } else {
    console.log('\n✘ Run #1 validation FAILED');
    console.log(`  - Cache MISS: ${run1CacheMiss ? '✓' : '✘'}`);
    console.log(`  - Planner ran: ${run1PlannerRan ? '✓' : '✘'}`);
    console.log(`  - Designer ran: ${run1DesignerRan ? '✓' : '✘'}`);
  }

  // Step 3: List cached requirements
  console.log('\n[CACHE STATE] Cached requirements:');
  const cached = cache.listCached();
  if (cached.length === 0) {
    console.log('  (no cached requirements)');
  } else {
    cached.forEach((entry, i) => {
      console.log(`  ${i + 1}. ${entry.requirement} (hash: ${entry.hash.substring(0, 8)}...)`);
      console.log(`     Created: ${entry.createdAt}, Last Used: ${entry.lastUsed}`);
    });
  }

  // Step 4: Run 2 — Expected cache HIT
  console.log(`\n${divider}`);
  console.log('RUN #2: Cache HIT (second execution, same requirement)');
  console.log(divider);

  const result2 = await orchestrate({
    suiteName: TEST_REQUIREMENT,
    testCases,
    locatorMap,
    demoMode: false,
  });

  const cacheAgent2 = result2.executedAgents.find(a => a.name === 'Cache');
  const plannerAgent2 = result2.executedAgents.find(a => a.name === 'Planner');
  const designerAgent2 = result2.executedAgents.find(a => a.name === 'Designer');

  console.log(`\n[RUN #2] Cache Agent:`, cacheAgent2?.detail);
  console.log(`[RUN #2] Planner Status:`, plannerAgent2?.status, `(${plannerAgent2?.detail})`);
  console.log(`[RUN #2] Designer Status:`, designerAgent2?.status, `(${designerAgent2?.detail})`);

  const run2CacheHit = cacheAgent2?.detail?.includes('Cache HIT');
  const run2PlannerSkipped = plannerAgent2?.status === 'SKIPPED';
  const run2DesignerSkipped = designerAgent2?.status === 'SKIPPED';

  if (run2CacheHit && run2PlannerSkipped && run2DesignerSkipped) {
    console.log('\n✓ Run #2 validation PASSED');
  } else {
    console.log('\n✘ Run #2 validation FAILED');
    console.log(`  - Cache HIT: ${run2CacheHit ? '✓' : '✘'}`);
    console.log(`  - Planner skipped: ${run2PlannerSkipped ? '✓' : '✘'}`);
    console.log(`  - Designer skipped: ${run2DesignerSkipped ? '✓' : '✘'}`);
  }

  // Step 5: Performance comparison
  console.log(`\n${divider}`);
  console.log('PERFORMANCE COMPARISON');
  console.log(divider);

  const plannerTime1 = plannerAgent1?.durationMs ?? 0;
  const designerTime1 = designerAgent1?.durationMs ?? 0;
  const skipTime2 = (plannerAgent2?.durationMs ?? 0) + (designerAgent2?.durationMs ?? 0);
  const timeSaved = plannerTime1 + designerTime1 - skipTime2;

  console.log(`\nRun #1 (Cache MISS):`);
  console.log(`  Planner: ${plannerTime1}ms`);
  console.log(`  Designer: ${designerTime1}ms`);
  console.log(`  Total Planner+Designer: ${plannerTime1 + designerTime1}ms`);

  console.log(`\nRun #2 (Cache HIT):`);
  console.log(`  Planner: ${plannerAgent2?.durationMs ?? 0}ms (skipped)`);
  console.log(`  Designer: ${designerAgent2?.durationMs ?? 0}ms (skipped)`);
  console.log(`  Total Planner+Designer: ${skipTime2}ms`);

  console.log(`\nTime Saved: ${timeSaved}ms (${((timeSaved / (plannerTime1 + designerTime1)) * 100).toFixed(1)}%)`);

  // Step 6: Final verdict
  console.log(`\n${divider}`);
  const validationPassed =
    run1CacheMiss && run1PlannerRan && run1DesignerRan &&
    run2CacheHit && run2PlannerSkipped && run2DesignerSkipped;

  if (validationPassed) {
    console.log('VALIDATION RESULT: ✓ ALL TESTS PASSED');
    console.log('\nCache implementation is working correctly!');
    console.log('- Cache MISS correctly skips cache, runs Planner/Designer, and saves');
    console.log('- Cache HIT correctly loads from cache and skips Planner/Designer');
    console.log('- Performance improvement achieved by avoiding redundant LLM calls');
  } else {
    console.log('VALIDATION RESULT: ✘ SOME TESTS FAILED');
    console.log('\nPlease review the detailed output above.');
  }

  console.log(divider + '\n');
}

// ============================================================================
// Entry Point
// ============================================================================

validateCache().catch(err => {
  console.error('[validation] Fatal error:', err);
  process.exit(1);
});
