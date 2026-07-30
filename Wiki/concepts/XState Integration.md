---
type: concept
tags:
  - wiki/concept
  - wiki/architecture
date_updated: 2026-07-30
source_count: 4
confidence: high
---

# XState Integration

> Architectural pattern — XState v5 as application-layer workflow orchestrator

> **Implementation**: See [[Session Machine (XState v5)]] for the complete machine definition and [[Application Services]] for the use cases it orchestrates.

## Principle

XState v5 lives in the **application layer** (`apps/backend`), not in the domain (`packages/domain`). The domain is framework-agnostic pure TypeScript. XState orchestrates the execution but the domain owns the business rules.

```
┌──────────────────────────────────────┐
│  apps/backend (Application Layer)    │
│  ┌────────────────────────────────┐  │
│  │  XState Machine                │  │
│  │  - States and transitions      │  │
│  │  - Invokes domain methods      │  │
│  │  - Connects to BullMQ          │  │
│  │  - Emits domain events         │  │
│  └───────────┬────────────────────┘  │
│              │ calls                 │
└──────────────┼──────────────────────┘
               ▼
┌──────────────────────────────────────┐
│  packages/domain (Domain Layer)      │
│  ┌────────────────────────────────┐  │
│  │  Session (Aggregate Root)      │  │
│  │  - .configure() → guards       │  │
│  │  - .start()      → guards      │  │
│  │  - .addArtifact() → invariants  │  │
│  │  - .complete()   → event       │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

## Why This Separation?

| Concern | Domain (packages/domain) | Application (apps/backend) |
|---------|-------------------------|---------------------------|
| Business rules | ✅ What CAN happen | — |
| State transitions | ✅ Valid transitions | ✅ Execute transitions |
| Invariants | ✅ Enforced in methods | — |
| Workflow orchestration | — | ✅ XState machine |
| Infrastructure (BullMQ, LLM) | — | ✅ XState services/actions |
| Visualization | — | ✅ XState devtools |

## Benefits

- **Solid execution**: XState guarantees no invalid state transitions at runtime. If the domain throws, the machine goes to `failed`.
- **Serializable**: XState snapshots can be persisted to PostgreSQL and resumed after restart.
- **Generic machines**: A single `sessionMachine` works for all 11 tools — it reads steps from the [[Tool as Static Configuration|Tool definition]].
- **Domain purity**: Business rules are testable without XState, BullMQ, or any infrastructure.
- **Visual**: XState devtools show the state graph for every flow.

## Example: Session Machine

```typescript
const sessionMachine = createMachine({
  id: 'session',
  initial: 'draft',
  states: {
    draft:   { on: { CONFIGURE: 'ready' } },
    ready:   { on: { START: 'running' } },
    running: {
      initial: 'executingStep',
      states: {
        executingStep: {
          invoke: { src: 'executeStep' },  // → calls LLM/parser/crawler
          onDone: { target: 'stepCompleted' },
          onError: { target: '#session.failed' }
        },
        stepCompleted: {
          always: [
            { target: '#session.completed', guard: 'isLastStep' },
            { target: 'executingStep' }  // loop to next step
          ]
        }
      }
    },
    completed: { type: 'final' },
    failed:    { type: 'final' },
  }
});
```

## Frontend Symmetry

The same principle applies to the frontend: `ToolPage` uses XState v5 for UI state orchestration (setup → readiness → progress → completed), consuming domain types from `packages/domain` via `packages/contracts`.

## Sources

- [[doodle/APP-CONCEPT]] — Original XState as Aggregate Root concept, tool catalog
- [[doodle/PRD]] — BE-Driven workflow, FR-W01
- [[doodle/STARTUP]] — Ordered Step Chain, domain rules
- [[doodle/USER-STORIES]] — US-GF01 to US-GF04 (workflow & performance)