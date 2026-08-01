---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/roadmap
  - wiki/implementation
date_updated: 2026-08-01
---

# Implementation Roadmap — Rational Development Sequence (2026-08-01)

## Objective

Translate the current documentation baseline into an execution order that minimizes rework, validates value early, and keeps contracts/governance stable while code is introduced.

## Roadmap Principles

1. **Vertical slice first**: ship one end-to-end generation flow before expanding bounded contexts.
2. **Contract stability before feature breadth**: keep [[API Contract Baseline v1]] authoritative.
3. **Operational readiness from day one**: enforce [[Quality Gate Matrix]] and [[Definition of Done]] from the first implementation PR.
4. **Scoped expansion**: add collaboration and engagement contexts only after core async reliability is stable.

## Phase Plan

### Phase 0 — Foundation Bootstrap (Week 1)

Focus:

- Materialize monorepo runtime structure (`apps/backend`, `apps/frontend`, `packages/*`).
- Wire baseline tooling (typecheck, lint, tests, contract checks).
- Stand up local infrastructure with [[Docker Compose - Local Dev]].
- Fail-closed startup config using [[Environment Configuration]].

Exit criteria:

- Local development boots with 1–2 commands.
- CI required checks are active and blocking.

### Phase 1 — Core Async Generation Vertical Slice (Weeks 2–3)

Focus:

- `POST /api/tools/:toolKey/sessions` with idempotent replay contract.
- Worker execution pipeline from [[BullMQ Worker Wiring]].
- Runtime lifecycle consistency from [[Session Machine (XState v5)]].
- SSE progress stream (`session_started`, `step_completed`, `session_completed`, `session_failed`).
- Frontend integration via [[API Client + SSE Client]] and tool page state flow.

Canonical state semantics:

`draft -> ready -> queued -> running -> completed|failed|cancelled`

Exit criteria:

- One tool completes end-to-end in staging with deterministic status transitions.
- Idempotent replay validated (`201` create, `200` replay).

### Phase 2 — Reliability and Ops Hardening (Week 4) ✅

Focus:

- Implement and verify [[Concurrency & Conflict Policy]].
- Queue/worker stability thresholds from [[Job Queue - Monitoring and Stability]].
- Backend structured logging and error mapping consistency.
- Frontend telemetry baseline from [[Frontend Error Observability]].
- Data cleanup and retention jobs from [[Database Schema]].

Exit criteria:

- No duplicate terminal side effects under retries.
- Queue and error-rate SLOs are observable and alertable.

Implementation (2026-08-01, branch `feature/phase-2-reliability-ops`):

- `ConcurrencyError` class with `resourceId`, `expectedVersion`, `actualVersion` (mapped to `409`)
- `SessionRepository.saveWithLock()` — conditional `WHERE version = ?`, throws `ConcurrencyError` on zero-row update
- `KyselySessionRepository.saveWithLock()` — Kysely implementation with `numUpdatedRows === 0n` detection
- `ErrorMapper` updated — `ConcurrencyError` → `409` with structured response `{code, message, details, retryable}`
- Worker structured logging — `job_started`/`job_completed`/`job_failed` schema with `sessionId`, `durationMs`, `attempts`, `toolKey`, `stepCount`, `error`, `stack`
- Worker stall config — `lockDuration: 120s`, `stalledInterval: 30s`, `maxStalledCount: 2`
- `QueueHealthMonitor` — SLO checks (failure rate, queue depth, P95 latency, stalled jobs) with warning/critical thresholds
- `GET /admin/jobs` — queue stats + worker uptime + stability metrics
- `GET /admin/health` — health check endpoint returning status + active alerts
- `worker-process.ts` — SIGTERM graceful shutdown: `worker.pause()` → drain (30s timeout) → `worker.close()`
- `CleanupJob` — hourly scheduled cleanup for expired idempotency keys + snapshots >7 days

### Phase 3 — Workspace Collaboration (Weeks 5–6) ✅

Focus:

- Membership model rollout from [[Workspace Sharing]] and [[Workspace Permissions]].
- API + middleware role enforcement.
- Migration alignment for workspace ownership model.

Exit criteria:

- Owner/editor/viewer behavior is consistent across API and domain rules.
- Migration path is validated in staging with no data drift.

Implementation (2026-08-01, branch `feature/phase-3-workspace-collaboration`):

- `WorkspaceMembership` entity — `invite()`, `accept()`, `changeRole()`, `isOwner`, `isActive`
- `Workspace` aggregate — `_memberships` collection, `inviteMember()`, `acceptInvitation()`, `removeMember()`, `transferOwnership()`, `changeMemberRole()`, permission checks (`isOwner`, `canEdit`, `canView`, `getMemberRole`)
- Value Objects — `MembershipRole` (`owner|editor|viewer`), `MembershipStatus` (`invited|active`)
- Domain errors — `NotWorkspaceOwnerError`, `NotAWorkspaceMemberError`, `InsufficientWorkspacePermissionError`, `MemberAlreadyExistsError`, `CannotRemoveOwnerError`, `NotAnActiveMemberError`
- Domain events — `MemberInvited`, `MemberJoined`, `MemberRemoved`, `OwnershipTransferred`
- `WorkspaceRepository` interface — `findById()`, `findByMember()`, `save()`, `saveWithLock()`, `findMembership()`, `findPendingInvitations()`
- `KyselyWorkspaceRepository` — Kysely implementation with membership sync
- `requireWorkspaceRole()` middleware — HTTP guard with role check, admin bypass pattern
- API routes — 10 endpoints (workspaces CRUD, invitations, members, ownership transfer)
- Use cases — `InviteMemberUseCase`, `AcceptInvitationUseCase`, `TransferOwnershipUseCase`

### Phase 4 — Prompt Governance Runtime (Week 7)

Focus:

- Prompt/version contract enforcement with [[Prompt Versioning]] and [[Prompt Components]].
- Ensure idempotency signature remains stable with prompt identity.

Exit criteria:

- Prompt updates are traceable and replay-safe.

### Phase 5 — Expansion Tracks (Week 8+) ✅

Order:

1. [[Agent Chat]]
2. [[Gamification]]

Reasoning: chat has stronger direct workflow value and lower cross-context reward complexity than gamification.

Implementation (2026-08-01, branch `feature/phase-3-workspace-collaboration`):

- **Agent Chat bounded context** — Conversation aggregate, Message entity, 7 agent personas
- **Message entity** — `user()`, `agent()`, `system()` factories, immutable, append-only
- **Conversation aggregate** — `addMessage()`, `archive()`, auto-title from first message, `recentMessages(n)` for context window
- **7 agent personas** — strategist, copywriter, seo-specialist, ads-specialist, analyst, creative-director, email-marketer (static config)
- **ConversationRepository** — interface + `KyselyConversationRepository` with privacy scoping (`findByUserAndWorkspace`)
- **DB migration** — `007_conversations.sql` (conversations + messages tables)
- **6 API routes** — agents list, conversations CRUD, messages, archive
- **2 use cases** — `StartConversationUseCase`, `SendMessageUseCase`
- **Privacy invariant** — conversations private to creator, enforced at domain + API layers
- **Lint fix** — `migrate.ts` console.log → process.stdout/write (0 errors)

## Cross-Phase Non-Negotiables

- No merge without passing [[Quality Gate Matrix]] required checks.
- No API mutation without contract update in [[API Documentation - OpenAPI]].
- No naming drift from canonical queue lifecycle (`QUEUE` / `WORKER_PICKUP`, `canQueue`).
- No production promotion without [[CI-CD Promotion Policy]] gates.

## Risk Register (Top 4)

1. **Scope expansion too early**
   - Mitigation: phase gates and feature flags for non-core contexts.
2. **Contract drift under parallel delivery**
   - Mitigation: OpenAPI diff + typed contract enforcement in CI.
3. **Async reliability regressions**
   - Mitigation: replay/idempotency tests, snapshot recovery, queue SLO guardrails.
4. **Governance bypass pressure**
   - Mitigation: documented exception workflow and expiration policy.

## Recommended Immediate Backlog Order

1. Bootstrap + CI guardrails
2. Core session vertical slice
3. Reliability hardening
4. Workspace sharing
5. Prompt governance runtime
6. Agent chat
7. Gamification

## Referenced Pages

- [[API Contract Baseline v1]]
- [[Quality Gate Matrix]]
- [[Definition of Done]]
- [[CI-CD Promotion Policy]]
- [[Session Machine (XState v5)]]
- [[BullMQ Worker Wiring]]
- [[Concurrency & Conflict Policy]]
- [[Frontend Error Observability]]
- [[Workspace Sharing]]
- [[Workspace Permissions]]
- [[Prompt Versioning]]
- [[Agent Chat]]
- [[Gamification]]
