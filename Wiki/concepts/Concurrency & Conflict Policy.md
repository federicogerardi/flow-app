---
type: concept
tags:
  - wiki/concept
  - wiki/backend
  - wiki/governance
date_updated: 2026-08-01
source_count: 8
confidence: high
---

# Concurrency & Conflict Policy

> Uniform write-conflict policy for API and domain operations across synchronous routes and async workers.

## Objective

Prevent lost updates, duplicate side effects, and ambiguous retry behavior by standardizing optimistic concurrency, idempotency, and conflict responses.

## Scope

This policy applies to:

- all mutating HTTP endpoints,
- worker-driven state transitions,
- aggregate writes with user-driven concurrent edits,
- event handlers that can process duplicate or out-of-order messages.

## Concurrency Controls by Use Case

| Use case | Control | Contract |
|---------|---------|----------|
| Session creation (`POST /api/tools/:toolKey/sessions`) | Idempotency key claim | Same logical request returns existing session (`200`) or creates new (`201`) |
| Aggregate updates (workspace, profile, mutable resources) | Optimistic locking (`version`) | Update succeeds only if version matches expected version |
| Event processing retries | Idempotent event guard (`eventId`) | Duplicate event does not apply side effects twice |
| Background jobs | Queue lock + retry with backoff | Stalled/failed jobs resume or retry without duplicate terminal state |

## HTTP Conflict Contract

### Standard conflict outcomes

- `409 CONFLICT` for version mismatch or uniqueness race.
- `412 PRECONDITION_FAILED` when `If-Match` is required and missing/invalid (optional adoption path).
- `422` only for semantic validation failures, never for write races.

### Response shape

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Resource modified by another actor",
    "details": {
      "resourceId": "uuid",
      "expectedVersion": 4,
      "actualVersion": 5
    },
    "retryable": true
  }
}
```

## Optimistic Locking Standard

- Mutable aggregates expose a numeric `version` field.
- Repository update uses conditional write (`WHERE id = ? AND version = ?`).
- On success, version increments by 1.
- On zero-row update, repository throws `ConcurrencyError` mapped to `409`.

## Optional HTTP Preconditions (Recommended)

For high-collaboration resources, support ETag-based preconditions:

- Read response includes `ETag: "<version>"`.
- Write requests include `If-Match: "<version>"`.
- Missing required precondition -> `428 PRECONDITION_REQUIRED` (if enabled).
- Mismatch -> `412 PRECONDITION_FAILED`.

If ETag preconditions are not enabled yet, version in request body remains acceptable as an interim contract.

## Retry Policy for Clients

- Never blind-retry `409` without re-fetching latest resource state.
- Retry idempotent writes only when server marks `retryable: true`.
- Preserve original `Idempotency-Key` on network retry for session-start endpoints.

## Worker and Event Consistency Rules

- Worker retries must resume from persisted snapshot where applicable.
- Event handlers must store processed event IDs for deduplication.
- Side effects (credit updates, promotions, notifications) must be idempotent under retry.

## Storage-Level Enforcement Requirements

Policy claims are valid only when persistence guarantees are present:

- Idempotency table must enforce unique key (`PRIMARY KEY` or `UNIQUE`) on `key_hash`.
- Event dedupe table must enforce unique `(consumer_name, dedupe_key)`.
- Mutable aggregate updates must use conditional update by `id` + `version`.
- Dedupe/idempotency retention windows must be explicit and cleaned by scheduled jobs.

Without these constraints, the policy is considered non-compliant.

## Governance Requirements

- Every new write endpoint documents conflict behavior in OpenAPI.
- Every mutable repository documents its concurrency strategy.
- Tests must include at least one concurrent update scenario per critical aggregate.

## Implementation

Implemented in Phase 2 (2026-08-01, branch `feature/phase-2-reliability-ops`):

| Component | File | Description |
|-----------|------|-------------|
| `ConcurrencyError` | `packages/domain/src/shared/concurrency-error.ts` | Domain error with `resourceId`, `expectedVersion`, `actualVersion` |
| `SessionRepository.saveWithLock()` | `packages/domain/src/generation/repositories/SessionRepository.ts` | Interface method for conditional version-based update |
| `KyselySessionRepository.saveWithLock()` | `packages/infra-db/src/repositories/session-repository.ts` | Kysely implementation: `UPDATE WHERE id = ? AND version = ?`, throws `ConcurrencyError` on `numUpdatedRows === 0n` |
| `ErrorMapper` | `apps/backend/src/infrastructure/error-handler.ts` | `ConcurrencyError` → `409` with structured response |

### Conflict response shape

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Resource <id> modified by another actor (expected v4, actual v5)",
    "details": {
      "resourceId": "uuid",
      "expectedVersion": 4,
      "actualVersion": 5
    },
    "retryable": true
  }
}
```

### Worker optimistic locking

Worker saves session state via `saveWithLock(session, expectedVersion)` to prevent duplicate terminal side effects under retries. If a concurrent update modifies the session between load and save, the worker receives a `409 CONFLICT` and BullMQ retries the job.

## Sources

- [[Idempotency]]
- [[API Routes]]
- [[Error Mapping (Domain to HTTP)]]
- [[Database Schema]]
- [[Gamification]]
- [[BullMQ Worker Wiring]]
- [[Job Queue - Monitoring and Stability]]
- [[API Contract Baseline v1]]
