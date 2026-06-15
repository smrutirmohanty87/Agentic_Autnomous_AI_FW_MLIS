# Requirement Cache

## Overview

The Requirement Cache reduces LLM/token usage by avoiding redundant Planner and Designer executions for previously processed requirements.

## Architecture

### Cache Flow

```
Requirement
    ↓
Cache Check
    ↓
    ├─ Cache HIT → Load cached outputs → Skip Planner & Designer → Generator → Execution
    │
    └─ Cache MISS → Execute Planner → Execute Designer → Save to Cache → Generator → Execution
```

### Workflow Timeline

**Cache MISS (First Run):**
```
Requirement → Cache (MISS) → Planner (✓) → Designer (✓) → Generator → Execution → RCA → Healing
```

**Cache HIT (Subsequent Runs):**
```
Requirement → Cache (HIT) → Planner (⊘) → Designer (⊘) → Generator → Execution → RCA → Healing
```

## Cache Storage

### Location

- **Cache Directory**: `artifacts/cache/`
- **File Format**: JSON (one file per unique requirement)
- **Naming**: `{SHA256_HASH}.json`

### Cache Entry Structure

```json
{
  "requirement": "Create Commercial Quote",
  "requirementHash": "a1b2c3d4e5f6...",
  "plannerOutput": {
    "testCases": 5,
    "description": "Planned 5 test case(s)",
    "details": null
  },
  "designerOutput": {
    "locatorCount": 42,
    "description": "Registered 42 locator(s)",
    "details": null
  },
  "createdAt": "2026-06-15T10:30:00.000Z",
  "lastUsed": "2026-06-15T10:35:00.000Z"
}
```

## Hashing

### Algorithm

- **Type**: SHA256
- **Input**: Requirement text (lowercase, trimmed)
- **Stability**: Same requirement always produces same hash

### Examples

```
"Create Commercial Quote"
→ a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

"create commercial quote"  (case-insensitive)
→ a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

"Create  Commercial  Quote"  (extra whitespace trimmed)
→ a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

## Usage

### Programmatic

```typescript
import { getCache } from '../ai/cache/RequirementCache';

const cache = getCache();

// Check cache
const result = cache.check('Create Commercial Quote');
if (result.status === 'HIT') {
  console.log('Cache hit! Planner and Designer can be skipped.');
  const entry = result.entry;
} else {
  console.log('Cache miss. Execute Planner and Designer.');
}

// Save cache entry
const entry = cache.createEntry(
  'Create Commercial Quote',
  { testCases: 5, description: 'Planned 5 test case(s)' },
  { locatorCount: 42, description: 'Registered 42 locator(s)' }
);
cache.save(entry);

// List all cached requirements
const cached = cache.listCached();
console.log(`${cached.length} requirements cached`);

// Clear all cache (for testing)
cache.clear();
```

### Dashboard Integration

Cache status appears in runtime workflow data:

```json
{
  "kpis": {
    "cacheStatus": "HIT"
  },
  "agents": [
    { "name": "Cache", "status": "SUCCESS", "durationMs": 5 },
    { "name": "Planner", "status": "SKIPPED" },
    { "name": "Designer", "status": "SKIPPED" }
  ]
}
```

## Validation

### Test Scenario 1: Cache MISS (First Run)

```bash
# Run the orchestrator for a requirement
npx ts-node orchestrator/live-demo-cnr.ts

# Expected output:
# [cache] Cache MISS — will execute Planner and Designer
# [orchestrator] ✔ Planner agent — PASS
# [orchestrator] ✔ Designer agent — PASS
# [cache] 💾 Cached requirement: "..."
```

### Test Scenario 2: Cache HIT (Second Run)

```bash
# Run the same orchestrator again
npx ts-node orchestrator/live-demo-cnr.ts

# Expected output:
# [cache] ✔ CACHE HIT for requirement: "..."
# [orchestrator] ○ Planner agent — SKIPPED
# [orchestrator] ○ Designer agent — SKIPPED
```

### Validation Script

Create `scripts/validate-cache.ts`:

```typescript
import { orchestrate } from '../orchestrator/orchestrator';

async function validateCache() {
  console.log('\n=== Cache Validation ===\n');

  const testCases = [
    // Your test cases here
  ];

  const locatorMap = [
    // Your locators here
  ];

  console.log('Run #1: Cache MISS');
  const result1 = await orchestrate({
    suiteName: 'Cache Test — First Run',
    testCases,
    locatorMap,
  });

  console.log('\nRun #2: Cache HIT');
  const result2 = await orchestrate({
    suiteName: 'Cache Test — First Run',
    testCases,
    locatorMap,
  });

  console.log('\n=== Results ===');
  console.log(`Run #1 agents:`, result1.executedAgents);
  console.log(`Run #2 agents:`, result2.executedAgents);

  const planner1 = result1.executedAgents.find(a => a.name === 'Planner');
  const planner2 = result2.executedAgents.find(a => a.name === 'Planner');

  if (planner1?.status === 'PASS' && planner2?.status === 'SKIPPED') {
    console.log('\n✓ Cache validation PASSED');
  } else {
    console.log('\n✘ Cache validation FAILED');
  }
}

validateCache().catch(console.error);
```

Run:
```bash
npx ts-node scripts/validate-cache.ts
```

## API Reference

### `RequirementCache` class

#### Constructor

```typescript
constructor(cacheDir: string = resolve(__dirname, '../../artifacts/cache'))
```

#### Methods

| Method | Signature | Returns | Description |
|--------|-----------|---------|-------------|
| `generateHash` | `(requirement: string) => string` | SHA256 hash | Generate stable hash from requirement |
| `check` | `(requirement: string) => CacheCheckResult` | `{ status, entry? }` | Check if requirement is cached |
| `save` | `(entry: CacheEntry) => void` | `void` | Save cache entry to disk |
| `createEntry` | `(requirement, planner, designer) => CacheEntry` | `CacheEntry` | Create new cache entry |
| `listCached` | `() => Array<...>` | Array | List all cached requirements |
| `clear` | `() => void` | `void` | Clear all cache (testing only) |

### `CacheCheckResult` type

```typescript
type CacheCheckResult = {
  status: 'HIT' | 'MISS';
  entry?: CacheEntry;
};
```

### `CacheEntry` type

```typescript
interface CacheEntry {
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
```

## Files Modified

| File | Changes |
|------|---------|
| `orchestrator/orchestrator.ts` | Added Cache agent; integrated cache check before Planner/Designer; conditional execution; cache save on MISS |
| `runtime/workflowStatus.ts` | (Optional) Add cacheStatus field to workflow data |

## Files Created

| File | Purpose |
|------|---------|
| `src/ai/cache/RequirementCache.ts` | Cache implementation |
| `artifacts/cache/` | Cache storage directory |

## Metrics

### Cache Performance

When cache is working effectively:

- **Cache HIT**: Planner and Designer skipped (~10s saved per execution)
- **Token Savings**: Proportional to Planner + Designer LLM calls avoided
- **Dashboard Visibility**: Cache status shown in workflow timeline

### Example Run

| Metric | Without Cache | With Cache (HIT) | Savings |
|--------|---------------|-----------------|---------|
| Planner Duration | 5s | 0s (skipped) | 5s |
| Designer Duration | 3s | 0s (skipped) | 3s |
| Total Workflow | 60s | 52s | 8s (13% reduction) |

## Limitations

1. **Exact Match Only**: Cache matches on exact requirement text (case-insensitive, trimmed)
2. **Locator Changes**: If locators change, old cache remains valid (use case-by-case)
3. **Manual Clear**: Cache persists across runs; clear manually if needed
4. **No TTL**: Cache entries don't expire automatically

## Future Enhancements

- [ ] Cache invalidation on design changes
- [ ] TTL (Time-To-Live) for cache entries
- [ ] Partial matching (fuzzy requirement search)
- [ ] Cache statistics dashboard
- [ ] Automatic cleanup policies
- [ ] Multi-level cache (memory + disk)

## Troubleshooting

### Cache Always MISS

**Symptom**: Cache always shows MISS, even for repeated requirements.

**Cause**: Requirements have different text (whitespace, punctuation).

**Solution**: Ensure requirement text is identical. Cache is case-insensitive and trims whitespace, but other differences matter.

### Cache Directory Not Created

**Symptom**: `artifacts/cache/` directory doesn't exist after first run.

**Cause**: Filesystem permissions or missing `artifacts/` parent directory.

**Solution**: Manually create `artifacts/cache/` or check write permissions.

### Stale Cache

**Symptom**: Test behavior changed, but cache still returns old outputs.

**Cause**: Requirements unchanged, but test design should have changed.

**Solution**: Run `cache.clear()` or delete specific `.json` files in `artifacts/cache/`.

## Related Documentation

- [Orchestrator Architecture](../../orchestrator/README.md)
- [Workflow Status](../../runtime/README.md)
- [Dashboard Integration](../../dashboard-ui/README.md)
