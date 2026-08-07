---
type: concept
tags:
  - wiki/concept
  - wiki/backend
  - wiki/contracts
date_updated: 2026-08-07
source_count: 8
confidence: high
---

# API Contract Baseline v1

> Canonical contract freeze for Flow App API v1. This page is the single source of truth for cross-page consistency.

## Objective

Eliminate contract drift between [[API Routes]], [[API Documentation - OpenAPI]], [[Contracts Package]], and runtime mappers.

## Canonical Request/Response Rules

- Base API version: `/api` (v1).
- Correlation header: `X-Request-Id` (canonical name, case-insensitive on wire).
- Content type: `application/json` for REST responses.
- Error envelope (all non-2xx):

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human-readable message",
    "details": {},
    "retryable": false
  }
}
```

`retryable` is mandatory in the error contract.

## Canonical Session Status Enum

The only valid `Session.status` values in v1 are:

`queued | draft | ready | running | completed | failed | cancelled`

`queued` is canonical for async execution and represents a session accepted by the API and waiting for worker pickup.

### Status Semantics (internal vs API-facing)

| Status | Layer | Meaning |
|--------|-------|---------|
| `draft` | domain/internal | Session object created before queue admission. Typically transient. |
| `ready` | domain/internal | Readiness validated; eligible for queue admission. |
| `queued` | API + persistence | Admitted to queue, waiting for worker pickup. |
| `running` | API + persistence | Worker is executing one or more steps. |
| `completed` | API + persistence | Final artifact produced successfully. |
| `failed` | API + persistence | Terminal failure with error payload. |
| `cancelled` | API + persistence | Terminal user/system cancellation. |

Contract note: `POST /api/tools/:toolKey/sessions` returns `queued` for accepted requests.

## Start Session Endpoint Contract

`POST /api/tools/:toolKey/sessions`

- Requires authentication.
- Supports `Idempotency-Key` header.
- Returns:
  - `201 Created` for first accepted request,
  - `200 OK` for idempotent replay.
- Both `201` and `200` share the same response shape:

```json
{
  "session": {
    "id": "uuid",
    "toolKey": "blog-post",
    "workspaceId": "uuid",
    "status": "queued",
    "stepCount": 3,
    "createdAt": "2026-08-01T12:00:00Z"
  },
  "replayed": false
}
```

`replayed = true` only on idempotent replay (`200`).

## Conflict and Precondition Semantics

- `409 CONFLICT`: optimistic-lock mismatch or uniqueness race.
- `412 PRECONDITION_FAILED`: `If-Match` provided but does not match current version.
- `428 PRECONDITION_REQUIRED`: endpoint requires `If-Match`, but request omitted it.
- `422`: semantic/validation errors only (not write races).

## SSE Event Schema (v1)

Canonical server events for `/api/sessions/:id/events`:

- `session_started`
- `step_completed`
- `session_completed`
- `session_failed`

Payload must always be emitted in one `data:` JSON object per event and match [[Contracts Package]] event DTOs.

## Contract Enforcement

- OpenAPI is generated from schema definitions that mirror contracts.
- CI must fail on enum drift, removed fields, or incompatible response changes.
- Error-code registry used by [[Error Mapping (Domain to HTTP)]] must be exhaustive and aligned with this baseline.

## Sources

- [[API Routes]]
- [[API Documentation - OpenAPI]]
- [[Contracts Package]]
- [[Error Mapping (Domain to HTTP)]]
- [[Concurrency & Conflict Policy]]
- [[Idempotency]]
- [[CI-CD Promotion Policy]]
