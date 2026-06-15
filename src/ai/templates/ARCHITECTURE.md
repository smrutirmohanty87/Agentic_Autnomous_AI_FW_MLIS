# Template Library Agent — Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Agentic QA Platform                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                    orchestrator/orchestrator.ts
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         requirement    orchestrate()    dashboard
              │               │
              ▼               ▼
    ┌──────────────────────────────────────────┐
    │    Template Library Matching Pipeline     │
    │                                          │
    │  1. Load Templates                       │
    │  2. Extract Keywords                     │
    │  3. Score Matching                       │
    │  4. Return HIT/MISS                      │
    └──────────────────────────────────────────┘
              │
         ┌────┴────┐
         │          │
      HIT │          │ MISS
         ▼          ▼
     ┌──────┐    ┌─────────────┐
     │Use   │    │Continue with│
     │Template   │Standard     │
     │Structure  │Workflow     │
     └──────┘    └─────────────┘
```

## Class Hierarchy

```
┌──────────────────────────────────────────┐
│      TemplateLibrary (class)             │
├──────────────────────────────────────────┤
│ Properties:                              │
│  - templatesDir: string                  │
│  - templates: Map<string, Template>      │
├──────────────────────────────────────────┤
│ Public Methods:                          │
│  + match(requirement): TemplateMatchResult│
│  + getTemplate(id): Template | undefined │
│  + listTemplates(): TemplateInfo[]       │
│  + getTemplateCount(): number            │
├──────────────────────────────────────────┤
│ Private Methods:                         │
│  - loadTemplates(): void                 │
└──────────────────────────────────────────┘
         │
         └─ getTemplateLibrary(): TemplateLibrary (singleton)


┌──────────────────────────────────────────┐
│      TemplateMatcher (static class)      │
├──────────────────────────────────────────┤
│ Static Methods:                          │
│  + extractKeywords(text): string[]       │
│  + calculateConfidence(...): score       │
│  + isExactMatch(...): boolean            │
│  + isPartialMatch(...): boolean          │
│  + scoreMatch(...): MatchScore           │
│  + getMatchExplanation(...): string      │
└──────────────────────────────────────────┘
```

## Data Flow: Template Matching

### Template MISS Path

```
Requirement: "Execute random test"
    │
    ▼
┌─────────────────────┐
│ Extract Keywords    │
│ → ['execute',       │
│   'random', 'test'] │
└─────────┬───────────┘
          │
          ▼
┌──────────────────────────────────┐
│ Score Against Templates          │
│                                  │
│ commercial-quote: 0% → MISS     │
│ residential-quote: 0% → MISS    │
│ policy-cancellation: 0% → MISS  │
│ broker-search: 0% → MISS        │
│ user-verification: 0% → MISS    │
└──────────┬───────────────────────┘
           │
    ┌──────▼──────┐
    │ No match    │
    │ > 30%       │
    └──────┬──────┘
           │
           ▼
    return MISS
```

### Template HIT Path

```
Requirement: "Create Commercial Quote"
    │
    ▼
┌────────────────────────────┐
│ Extract Keywords           │
│ → ['create', 'commercial', │
│    'quote']                │
└─────────────┬──────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Score Against Templates                 │
│                                         │
│ commercial-quote:                       │
│   Exact: 'commercial', 'quote' (2)      │
│   Partial: (0)                          │
│   Score: (2×2 + 0) / (6×2) = 33%       │
│   → HIT ✓ (> 30% threshold)            │
│                                         │
│ residential-quote: 1/6 = 17% → MISS   │
│ policy-cancellation: 1/6 = 17% → MISS │
│ broker-search: 0/6 = 0% → MISS        │
│ user-verification: 0/6 = 0% → MISS    │
└──────────┬────────────────────────────┘
           │
    ┌──────▼──────────────┐
    │ Best Match Found    │
    │ commercial-quote    │
    │ 33% match          │
    └──────┬──────────────┘
           │
           ▼
    return HIT with template
```

## Orchestrator Integration

```
orchestrator.ts (main flow)
│
├─ Import TemplateLibrary
│  └─ import { getTemplateLibrary, TemplateStatus }
│
├─ Add AGENTS array entry
│  └─ const AGENTS = ['Cache', 'TemplateLibrary', ...]
│
├─ Create runTemplateLibraryCheck() function
│  ├─ Call getTemplateLibrary()
│  ├─ Call match(requirement)
│  ├─ Handle HIT
│  │  └─ Log matched template
│  └─ Handle MISS
│     └─ Log no match
│
├─ Modify orchestrate() function
│  ├─ Declare templateStatus variable
│  │
│  ├─ Call runTemplateLibraryCheck() after Cache
│  │  └─ updateWorkflowContext({ currentStep: 'TemplateLibrary: ...' })
│  │
│  ├─ Continue with Planner
│  │  └─ (standard workflow, template available as reference)
│  │
│  └─ Pass templateStatus to dashboard payload
│     ├─ kpis: { templateStatus, matchedTemplate }
│     └─ workflowTimeline: [..., 'TemplateLibrary', ...]
│
└─ Update dashboard payload
   ├─ Add templateStatus to KPIs
   ├─ Add matchedTemplate to KPIs
   └─ Support in workflow timeline
```

## Template Structure Visualization

```
Template (JSON File)
│
├─ id: "commercial-quote"
├─ name: "Commercial Quote"
├─ description: "..."
│
├─ keywords: [6 keywords]
│  ├─ "commercial"
│  ├─ "quote"
│  ├─ "case reference"
│  ├─ "limit of indemnity"
│  ├─ "broker"
│  └─ "policy"
│
├─ workflowSteps: [7 steps]
│  ├─ Step 1: Login (5000ms)
│  ├─ Step 2: Navigate to Quote (2000ms)
│  ├─ Step 3: Enter Case Reference (2000ms)
│  ├─ Step 4: Set Limit of Indemnity (3000ms)
│  ├─ Step 5: Review Terms (3000ms)
│  ├─ Step 6: Issue Policy (4000ms)
│  └─ Step 7: Verify Issued (2000ms)
│
├─ commonLocators: [6 locators]
│  ├─ loginEmail (input, 3 selectors)
│  ├─ loginPassword (input, 3 selectors)
│  ├─ caseReference (input, 3 selectors)
│  ├─ limitOfIndemnity (input, 3 selectors)
│  ├─ submitButton (button, 3 selectors)
│  └─ policyNumber (text, 3 selectors)
│
├─ validationPoints: [4 points]
│  ├─ Point 1: Login successful
│  ├─ Point 2: Case reference accepted
│  ├─ Point 3: Limit saved
│  └─ Point 4: Policy issued
│
├─ estimatedDurationMs: 21000
└─ createdAt: "2026-06-15T10:00:00.000Z"
```

## Keyword Matching Algorithm

```
Input: Requirement Text + Template Keywords

┌─────────────────────────────────┐
│ 1. Normalize Text               │
│    - Convert to lowercase       │
│    - Remove punctuation         │
│    - Split into words           │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│ 2. For Each Template Keyword    │
│    Check matching strategies    │
└──────────────┬──────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼───────────┐   ┌────▼─────────────┐
│ Exact Match   │   │ Partial Match    │
│ (Boundary)    │   │ (Substring)      │
│               │   │                  │
│ Regex:        │   │ case-insensitive │
│ \bkeyword\b  │   │ indexOf          │
│               │   │                  │
│ Weight: 2x    │   │ Weight: 1x       │
└───┬───────────┘   └────┬─────────────┘
    │                    │
    └──────────┬─────────┘
               │
┌──────────────▼──────────────────┐
│ 3. Calculate Score              │
│                                 │
│ score = (exact×2 + partial)     │
│         ─────────────────────   │
│         templateKeywords × 2    │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│ 4. Check Threshold              │
│                                 │
│ if score >= 0.3 → HIT           │
│ else → MISS                     │
└────────────────────────────────┘
```

## Workflow Timeline

### Without Template Library

```
Requirement → Cache → Planner → Designer → Generator → Execution → RCA → Healing
```

### With Template Library

```
Requirement → Cache → TemplateLibrary → Planner → Designer → Generator → Execution → RCA → Healing
                      (HIT or MISS)
```

Dashboard displays all agents in order, showing which ones executed.

## File Structure

```
Project Root
│
├── orchestrator/
│   └── orchestrator.ts
│       ├─ import { getTemplateLibrary }
│       ├─ AGENTS = ['Cache', 'TemplateLibrary', ...]
│       ├─ runTemplateLibraryCheck()
│       └─ integrate into orchestrate()
│
├── src/ai/templates/
│   ├── TemplateLibrary.ts ◄─ Main class
│   ├── TemplateMatcher.ts ◄─ Matching logic
│   └── README.md
│
└── artifacts/templates/
    ├── commercial-quote.json
    ├── residential-quote.json
    ├── policy-cancellation.json
    ├── broker-search.json
    └── user-verification.json
```

## Performance Characteristics

| Operation | Time | Impact |
|-----------|------|--------|
| Load templates (5 files) | ~50ms | Startup only |
| Extract keywords | ~2ms | Per requirement |
| Score matching (5 templates) | ~1ms | Per requirement |
| **Total per requirement** | **~3ms** | **Negligible** |

### Token Savings (per HIT)

```
Without Template:
  Planner: ~1000 tokens
  Designer: ~1000 tokens
  Total: ~2000 tokens

With Template (HIT):
  Planner: ~50 tokens (template reference)
  Designer: ~50 tokens (template reference)
  Total: ~100 tokens

Savings: 1900 tokens per HIT (95%)
```

With 50% template hit rate:
- Average: 1050 tokens per requirement
- Savings: 50% of Planner+Designer tokens

## State Transitions

```
                      START
                        │
                        ▼
            ┌─────────────────────┐
            │ Load Templates      │
            │ TemplateLibrary     │
            │ initialized         │
            └──────────┬──────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │ orchestrate() called      │
        │ with requirement          │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ Match requirement vs      │
        │ templates                 │
        └──────────┬───────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
    ┌────▼─────┐        ┌───▼──────┐
    │Template  │        │Template  │
    │HIT       │        │MISS      │
    │Score>=30%│        │Score<30% │
    └────┬─────┘        └───┬──────┘
         │                  │
    ┌────▼─────────────┐    │
    │Return HIT        │    │
    │+ template info   │    │
    └────┬─────────────┘    │
         │                  │
         │          ┌───────▼────────┐
         │          │Return MISS     │
         │          └───────┬────────┘
         │                  │
         └──────────┬───────┘
                    │
                    ▼
        ┌──────────────────────┐
        │ Continue with        │
        │ Planner (template    │
        │ available as ref)    │
        └─────────────────────┘
```

## Security Considerations

1. **Template Injection**: Templates loaded from `artifacts/templates/` (local, not user input)
2. **Regex Safety**: Standard regex patterns, no user-provided patterns
3. **JSON Validation**: Basic JSON structure assumed valid
4. **Keyword Matching**: Safe string operations, no code execution

## Future Architecture Enhancements

1. **Caching Layer**: Cache template matches for same requirement
2. **Semantic Matching**: Use embeddings for fuzzy template matching
3. **Template Versioning**: Support multiple template versions
4. **Dynamic Templates**: Load templates from database/API
5. **Learning System**: Auto-generate templates from test execution history
6. **Template Analytics**: Track template usage and accuracy metrics

## Related Architecture Documents

- [Cache Architecture](../cache/ARCHITECTURE.md)
- [Orchestrator Architecture](../../orchestrator/README.md)
- [Healing Architecture](../../healing/README.md)
- [RCA Architecture](../../rca/README.md)
