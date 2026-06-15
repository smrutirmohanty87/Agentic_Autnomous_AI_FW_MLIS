# Requirement Cache — Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Agentic QA Platform                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                         orchestrator/orchestrator.ts
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
              requirement      cacheCheck       agentRecords
                    │               │               │
                    ▼               ▼               ▼
          ┌──────────────────────────────┐
          │   Orchestrator Main Loop      │
          │                              │
          │  0. Cache Check              │
          │     ├─ Check requirement     │
          │     ├─ Hash requirement      │
          │     └─ Lookup in cache dir   │
          │                              │
          │  1. Planner (conditional)    │
          │     └─ Only if Cache MISS    │
          │                              │
          │  2. Designer (conditional)   │
          │     └─ Only if Cache MISS    │
          │     └─ Save to cache if MISS │
          │                              │
          │  3. Generator                │
          │  4. Execution                │
          │  5. RCA                      │
          │  6. Healing                  │
          └──────────────────────────────┘
```

## Cache Decision Tree

```
                            START
                              │
                    ┌─────────▼─────────┐
                    │ Requirement Input │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │  Cache Check Phase   │
                    └─────────┬────────────┘
                              │
                     ┌────────▼────────┐
                     │ Generate Hash   │
                     │ (SHA256)        │
                     └────────┬────────┘
                              │
           ┌──────────────────▼──────────────────┐
           │  Check artifacts/cache/{hash}.json  │
           └──────────────────┬──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
              ┌─────▼─────┐        ┌────▼─────┐
              │ File Found │        │ Not Found │
              │ (HIT)      │        │ (MISS)    │
              └─────┬─────┘        └────┬──────┘
                    │                   │
      ┌─────────────▼─────────────┐     │
      │ Load Cache Entry          │     │
      │ - plannerOutput           │     │
      │ - designerOutput          │     │
      │ - Update lastUsed         │     │
      └─────────────┬─────────────┘     │
                    │                   │
      ┌─────────────▼──────────────┐    │
      │ Skip Planner & Designer    │    │
      │ (Status = SKIPPED)         │    │
      └─────────────┬──────────────┘    │
                    │                   │
                    │      ┌────────────▼────────────┐
                    │      │ Execute Planner         │
                    │      │ - Plan test cases       │
                    │      │ - Count testCases       │
                    │      └────────────┬────────────┘
                    │                   │
                    │      ┌────────────▼────────────┐
                    │      │ Execute Designer        │
                    │      │ - Register locators     │
                    │      │ - Count locators        │
                    │      └────────────┬────────────┘
                    │                   │
                    │      ┌────────────▼────────────┐
                    │      │ Save to Cache           │
                    │      │ - Create entry          │
                    │      │ - Write {hash}.json     │
                    │      │ - Set createdAt         │
                    │      └────────────┬────────────┘
                    │                   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Continue with     │
                    │ Generator phase   │
                    │ (normal flow)     │
                    └─────────┬─────────┘
                              │
                         ...continues...
```

## Cache Storage Structure

```
Project Root
│
├── orchestrator/
│   └── orchestrator.ts
│       ├── import { getCache }
│       ├── runCacheCheck()
│       ├── Cache Check Phase
│       └── Conditional Planner/Designer
│
├── src/
│   └── ai/
│       └── cache/
│           ├── RequirementCache.ts ◄── Main implementation
│           ├── README.md
│           └── index.ts (optional exports)
│
└── artifacts/
    └── cache/
        ├── {hash1}.json ◄── Cached requirement
        ├── {hash2}.json ◄── Cached requirement
        ├── {hash3}.json ◄── Cached requirement
        └── EXAMPLE_CACHE_ENTRY.json (reference)

Legend:
  {hash} = SHA256 hash of requirement text
  Example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.json
```

## Class Hierarchy

```
┌──────────────────────────────────────────────┐
│         RequirementCache (class)             │
├──────────────────────────────────────────────┤
│ Properties:                                  │
│  - cacheDir: string                          │
├──────────────────────────────────────────────┤
│ Public Methods:                              │
│  + generateHash(requirement): string         │
│  + check(requirement): CacheCheckResult      │
│  + save(entry): void                         │
│  + createEntry(...): CacheEntry              │
│  + listCached(): CacheInfo[]                 │
│  + clear(): void                             │
├──────────────────────────────────────────────┤
│ Private Methods:                             │
│  - getCacheFilePath(hash): string            │
└──────────────────────────────────────────────┘
         │
         └─ getCache(): RequirementCache (singleton)
```

## Data Flow Diagram

### Cache MISS Path (First Run)

```
┌─────────────────┐
│  Requirement    │ "Create Commercial Quote"
└────────┬────────┘
         │
         ▼
┌──────────────────────────┐
│ 1. generateHash()        │
│    SHA256(requirement)   │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ 2. getCacheFilePath()    │
│    artifacts/cache/{h}   │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ 3. existsSync() ← NO     │ ✘ File not found
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ return MISS              │
└────────┬─────────────────┘
         │
         ▼
    SKIP CACHE,
    RUN PLANNER
        │
        ▼
    RUN DESIGNER
        │
        ▼
┌──────────────────────────┐
│ 4. createEntry()         │
│    Create CacheEntry obj │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ 5. save()                │
│    Write to disk         │
│    artifacts/cache/{h}.json
└──────────────────────────┘
```

### Cache HIT Path (Subsequent Runs)

```
┌─────────────────┐
│  Requirement    │ "Create Commercial Quote" (same)
└────────┬────────┘
         │
         ▼
┌──────────────────────────┐
│ 1. generateHash()        │
│    SHA256(requirement)   │
│    → Same hash ✓         │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ 2. getCacheFilePath()    │
│    artifacts/cache/{h}   │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ 3. existsSync() ← YES    │ ✓ File found
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ 4. readFileSync()        │
│    Load JSON             │
│    Parse CacheEntry      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ 5. Update lastUsed       │
│    Update timestamp      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ 6. save()                │
│    Write updated entry   │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ return HIT with entry    │
└────────┬─────────────────┘
         │
         ▼
    SKIP PLANNER
    SKIP DESIGNER
        │
        ▼
    CONTINUE WITH
    GENERATOR (using
    cached outputs)
```

## Orchestrator Integration Points

```
orchestrator.ts (main flow)
│
├─ Import RequirementCache
│  └─ import { getCache, CacheStatus }
│
├─ Add AGENTS array entry
│  └─ const AGENTS = ['Cache', 'Planner', ...]
│
├─ Create runCacheCheck() function
│  ├─ Call getCache()
│  ├─ Call cache.check(requirement)
│  ├─ Handle HIT
│  │  ├─ Mark Planner as SKIPPED
│  │  ├─ Mark Designer as SKIPPED
│  │  └─ Return { status: 'HIT', skipped: true }
│  └─ Handle MISS
│     └─ Return { status: 'MISS', skipped: false }
│
├─ Modify orchestrate() function
│  ├─ Declare cacheStatus variable
│  │
│  ├─ Call runCacheCheck() before Planner
│  │  └─ updateWorkflowContext({ currentStep: 'Cache: ...' })
│  │
│  ├─ Conditional runPlanner()
│  │  └─ if (!cacheCheckResult.skippedPlanner)
│  │
│  ├─ Conditional runDesigner()
│  │  ├─ if (!cacheCheckResult.skippedDesigner)
│  │  └─ save to cache here
│  │
│  └─ Pass cacheStatus to dashboard payload
│     └─ kpis: { cacheStatus, ... }
│
└─ Update dashboard payload
   ├─ Add workflowTimeline entry: 'Cache'
   ├─ Add cacheStatus to KPIs
   └─ Support SKIPPED agent status
```

## Hash Generation Process

```
Input Requirement
        │
        ▼
┌─────────────────────┐
│ toLowerCase()       │
│ "Create Commercial  │
│  Quote"             │
│     ↓               │
│ "create commercial  │
│  quote"             │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ trim()              │
│ Remove leading/     │
│ trailing spaces     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ SHA256 hash         │
│ (crypto library)    │
│                     │
│ Input: "create      │
│ commercial quote"   │
│                     │
│ Output:             │
│ a1b2c3d4e5f6...     │
└─────────┬───────────┘
          │
          ▼
    Stable Hash
    (deterministic)

Properties:
  - Always same for same input ✓
  - Case-insensitive ✓
  - Whitespace-normalized ✓
  - SHA256 (256-bit) ✓
  - Hex encoded (64 chars) ✓
```

## Workflow Timeline

### Dashboard Display

**Cache MISS Path:**
```
Requirement → Cache (HIT or MISS) → Planner → Designer → Generator → Execution → RCA → Healing
              ✓ SUCCESS (HIT)       ✘ SKIP    ✘ SKIP
```

**Cache HIT Path:**
```
Requirement → Cache (HIT or MISS) → Planner → Designer → Generator → Execution → RCA → Healing
              ✓ SUCCESS (HIT)       ⊘ SKIP    ⊘ SKIP
```

Dashboard shows:
- Cache agent status
- Planner/Designer status (PASS on MISS, SKIPPED on HIT)
- Progress through remaining agents

## Performance Impact

```
Without Cache:
Time → │ Cache │ Planner │ Designer │ Generator │ Execution │ RCA │
       │ 0.1s  │  5s     │   3s     │    2s     │   40s     │ 1s  │
       ├─────────────────────────────────────────────────────────────
Total:  51.1s

With Cache (HIT):
Time → │ Cache │ Planner │ Designer │ Generator │ Execution │ RCA │
       │ 0.1s  │  0s     │   0s     │    2s     │   40s     │ 1s  │
       │      (⊘ skip) (⊘ skip)
       ├─────────────────────────────────────────────────────────────
Total:  43.1s

Savings: 8s per cached execution (15.7% improvement)

With High Cache Hit Rate (90%):
Average time = 51.1s × 10% + 43.1s × 90% = 5.11s + 38.79s = 43.9s
Token savings = Planner tokens + Designer tokens avoided × 0.9
```

## Related Architecture Documents

- [Orchestrator Architecture](../../orchestrator/README.md)
- [Healing Architecture](../../healing/README.md)
- [RCA Architecture](../../rca/README.md)
- [Runtime Status Architecture](../../runtime/README.md)
