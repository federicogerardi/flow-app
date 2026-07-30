---
type: entity
tags:
  - wiki/entity
  - wiki/generation
date_updated: 2026-07-30
source_count: 4
---

# Session

> Aggregate Root — [[Content Generation]] context

## Definition

A `Session` is a single execution of a [[Tool as Static Configuration|Tool]] pipeline within a [[Workspace]]. It orchestrates the ordered execution of `WorkflowStep`s, each producing an [[Artifact]]. The session is the unit of work from the user's perspective: they start a generation, see progress, and receive a final deliverable.

## Ubiquitous Language

- **Session** (not "Generation" or "Job") — the user-facing term for a generation run
- A Session **has** Artifacts, it **belongs to** a Workspace, it **follows** a Tool's step definition

## Lifecycle

```
draft → ready → running → completed
                    ↓         ↓
                  failed   cancelled
```

| State | Meaning | Transition |
|-------|---------|------------|
| `draft` | Created, not yet configured | → `ready` on configure |
| `ready` | Inputs validated, ready to start | → `running` on start |
| `running` | Steps executing asynchronously | → `completed` on final step done |
| `completed` | All steps done, final artifact produced | Terminal |
| `failed` | Error in any step | Terminal |
| `cancelled` | User cancelled mid-execution | Terminal |

## Invariants

- Cannot transition to `running` unless `ready` and all required inputs satisfied
- Cannot `complete` without a `final` Artifact (one per Session)
- `IdempotencyKey` uniqueness: same `(userId, workspaceId, toolKey, inputHash)` → same Session
- Step execution is strictly sequential — no skipping, no reordering

## Internal Entities

- **[[Artifact]]** (1:N) — one per step. The last one is the final deliverable.

## Domain Events Emitted

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `SessionStarted` | Transition to `running` | UI (SSE), Monitoring |
| `StepCompleted` | Each artifact produced | UI progress, [[XState Integration|XState machine]] |
| `SessionCompleted` | Final artifact created | [[Workspace & Assets]] (promotion), [[Usage & Quota]] (credits) |
| `SessionFailed` | Error in any step | UI, Monitoring |

## Relationships

- Follows a [[Tool as Static Configuration|Tool]]'s step definition (`toolKey`)
- Belongs to a [[Workspace]] (`workspaceId`) — Workspace receives the final [[Artifact]] as [[Asset]] on completion
- Contains [[Artifact]] entities (one per step, last = final deliverable)
- Triggers [[Asset Promotion]] on completion

## Sources

- [[doodle/APP-CONCEPT]] — Tool catalog, architecture, BE-Driven workflow
- [[doodle/PRD]] — Functional requirements FR-W01 to FR-W09
- [[doodle/STARTUP]] — Domain definitions, Artifact vs Asset
- [[doodle/USER-STORIES]] — US-T01 to US-T10, US-GF01 to US-GF09