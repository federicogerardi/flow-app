---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/governance
  - wiki/architecture
date_updated: 2026-08-02
source_count: 3
confidence: high
---

# Phase 9 Architectural Targets — Validation + Structural Gaps

> Decision record from the 2026-08-02 DDD architecture review. Documents 16 gaps between the aspirational wiki design and current code. Cosmetic gaps (ID VOs, DateTime) were resolved via wiki updates — those are **closed**. All 11 VALIDATION gaps closed via Phase 9a–9d (2026-08-02). STRUCTURAL gaps S1–S3 deferred to Phase 10+. S4–S5 deferred (no RFC yet).

## Decision Context

The wiki documents a richer architecture than the code implements. After analysis, gaps were categorized:

| Category | Action | Status |
|----------|--------|:---:|
| COSMETIC (5) | Wiki updated to match code — `string` IDs, `Date` timestamps, real method signatures | ✅ Closed |
| VALIDATION (11) | Refactor code toward wiki — runtime safety, no silent failures | ✅ Closed (Phase 9a–9d) |
| STRUCTURAL (5) | Requires design RFC before implementation — touches aggregate boundaries | 🔴 Open |

## VALIDATION Gaps (11) — Code → Wiki Alignment

These prevent bugs at runtime. They add validation guards, typed events, and proper error classes.

| # | Gap | File(s) | Risk if not fixed | Effort | Priority | Status |
|---|-----|---------|-------------------|:---:|:---:|:---:|
| V1 | `SessionStatus` type alias → class | `SessionStatus.ts`, `Session.ts`, `session-repository.ts`, `session-lifecycle.ts` | DB corruption silently accepted. No `isTerminal()`. 35+ `as` casts. | 1h 10m | **P0** | ✅ Phase 9a |
| V2 | `MembershipRole` type alias → class | `MembershipRole.ts`, `WorkspaceMembership.ts`, `workspace-repository.ts` | Authorization bypass via corrupted DB role field. 4 `as` casts. | 40m | **P0** | ✅ Phase 9b |
| V3 | `ToolKey` type alias → class | `ToolKey.ts`, `Session.ts`, `session-repository.ts` | Routing dispatch on invalid tool keys. 4 `as` casts. | 50m | P1 | ✅ Phase 9b |
| V4 | `AgentKey` type alias → class | `AgentKey.ts`, `Conversation.ts`, `conversation-repository.ts` | Agent dispatch on invalid keys. | 45m | P1 | ✅ Phase 9b |
| V5 | `ConversationStatus` type alias → class | `ConversationStatus.ts`, `conversation-repository.ts` | Invalid status values from DB. | 25m | P2 | ✅ Phase 9c |
| V6 | `MessageRole` type alias → class | `MessageRole.ts`, `conversation-repository.ts` | Invalid message roles from DB. | 25m | P2 | ✅ Phase 9c |
| V7 | `MembershipStatus` type alias → class | `MembershipStatus.ts`, `workspace-repository.ts` | Invalid membership status from DB. | 25m | P2 | ✅ Phase 9c |
| V8 | `ArtifactStatus` type alias → class | `ArtifactStatus.ts`, `Artifact.ts` | Currently unused in repos. Needed for lifecycle guards (V11). | 20m | P2 | ✅ Phase 9c |
| V9 | `apply()` weakly-typed events | `Session.ts` | Silently swallows unknown events. Per-field `as` casts on error payloads. | 1h 30m | P1 | ✅ Phase 9b |
| V10 | `throw new Error()` in domain | 6 VO files: `StepNumber.ts`, `WorkspaceMembership.ts`, `PromptTemplateId.ts`, `PromptVersion.ts`, `PromptComponent.ts`, `UserStatus.ts`, `UserRole.ts` | 11 errors bypass `ErrorMapper → HTTP status` pipeline. Client sees 500 instead of 422 with error code. | 30m | P0 | ✅ Phase 9a |
| V11 | Artifact lifecycle methods missing | `Artifact.ts` | Status transitions unguarded. `create()` hardcodes `'completed'`. Any caller can set any status. | 30m | P2 | ✅ Phase 9c |

### Sequencing

```
V10 (Error classes, 30m) ──┐                 ✅ Phase 9a
                            ├── Phase 9a     ✅ Complete
V1  (SessionStatus, 1h10m) ─┘
                            │
V2  (MembershipRole, 40m) ──┤
V9  (apply() typing, 1h30m) ─┤── Phase 9b   ✅ Complete
V3  (ToolKey, 50m) ─────────┤
V4  (AgentKey, 45m) ────────┘
                            │
V5-V8 (remaining VOs, 1h35m) ── Phase 9c    ✅ Complete
V11 (Artifact lifecycle, 30m) ─┘
```

**Total VALIDATION effort: ~8h** ✅ Complete (2026-08-02)

---

## STRUCTURAL Gaps (5) — Requires Design RFC

These change aggregate boundaries or data flow. Each needs a design decision documented before implementation.

| # | Gap | Impact | RFC needed for | Status |
|---|-----|--------|---------------|:---:|
| S1 | Session `_artifacts` array | Adding artifacts collection to Session aggregate means `findById()` loads all artifacts — potential performance cost. Currently artifacts are queried separately from DB. | Aggregate boundary decision: 1:N owned entities vs separate aggregate. Loading strategy (eager/lazy). | 🔴 Phase 10 |
| S2 | Domain event payload data | Current events carry only `{ eventType, occurredAt, aggregateId }`. Wiki expects typed payloads: `SessionCompleted` with `{ toolKey, workspaceId, artifactId, content }`. | Event schema. Consumer contract. Backward compatibility. | 🔴 Phase 10 |
| S3 | Workspace asset domain logic | Migration 003 exists but no domain representation. `addAsset()`, asset uniqueness, source traceability all missing. | Whether to model Assets as owned entities or separate aggregate. Cross-context integration with [[Asset Promotion]]. | 🔴 Phase 11+ |
| S4 | Session temporal invariants | `CONFIGURE` sets `_startedAt` instead of `WORKER_PICKUP`. A session "starts" before it's actually picked up by a worker. | Correct temporal semantics. Impact on SSE progress events. | ⏳ Phase 10 |
| S5 | Tool stub content | All 11 tool keys resolve to the same `blogPostTool` stub. The registry pattern is correct but content is placeholder. | Tool authoring process. Prompt template integration. Credit cost model. | ⏳ Phase 10 |

### Recommended RFC order

| RFC | Why first | Timeline |
|-----|-----------|----------|
| S5 (Tool stubs) | Blocks all tool-specific features. Every tool behaves identically today. | Phase 9 |
| S4 (Temporal invariants) | Small scope (2 lines in `apply()`). Data already tracked correctly in `SessionLifecycle`. | Phase 9 |
| S2 (Domain event data) | Unblocks [[Asset Promotion]] and [[Usage & Quota]] consumers. | Phase 10 |
| S1 (Session `_artifacts`) | Largest scope. Enables `finalArtifact` getter and `COMPLETE` guard. Needs perf analysis. | Phase 10-11 |
| S3 (Workspace assets) | Largest feature surface. Blocks [[Workspace & Assets]] context completion. | Phase 11+ |

---

## What Was Closed (Cosmetic)

These wiki pages were updated to reflect actual code (2026-08-02):

| Page | Changes |
|------|---------|
| [[Session]] | Replaced aspirational code with real implementation. `SessionId`/`WorkspaceId`/`UserId` → `string`. `DateTime` → `Date`. `_artifacts` removed. `apply()` signature corrected. |
| [[Workspace]] | Fixed `transferOwnership()` — shows `_setRoleAsOwner()` delegation (code is better than wiki). `UserId` → `string` throughout. Added `🔴 Aspirational` marker on `addAsset()`. |
| [[Artifact]] | Fixed `create()` signature to match code. Added ⚠️ banner for lifecycle methods. VO types corrected. |

## Sources

- [[Session]] — Primary source of aspirational/code divergence (2026-08-02 update)
- [[Workspace]] — transferOwnership + addAsset gaps (2026-08-02 update)
- [[rule-4-vo-debt]] — 8 type-alias VOs catalogued with conversion roadmap
