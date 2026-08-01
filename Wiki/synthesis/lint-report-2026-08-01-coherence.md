---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/lint
  - wiki/governance
date_updated: 2026-08-01
---

# Lint Report — 2026-08-01 (Coherence)

## Scope

Coherence lint after operational-go remediation, with two layers:

1. Structural wiki lint (`scripts/wiki-lint.py`).
2. Contract-coherence checks across:
   - [[API Contract Baseline v1]]
   - [[API Routes]]
   - [[API Documentation - OpenAPI]]
   - [[Contracts Package]]
   - [[Error Mapping (Domain to HTTP)]]
   - [[Idempotency Implementation]]

## Results

### 1) Structural Lint

- First run: **FAILED** (2 `source_count` mismatches).
  - `[[Gamification]]`: `source_count` 6 vs listed sources 7.
  - `[[UI Component Map]]`: `source_count` 7 vs listed sources 8.
- Remediation applied in-place.
- Second run: **OK**
  - Output: `wiki-lint OK - 104 markdown files validated`.

### 2) Contract Coherence

#### Passed

- Canonical status enum aligned in OpenAPI baseline pages (`queued|draft|ready|running|completed|failed|cancelled`).
- Start-session replay contract aligned (`201` create, `200` replay + `replayed` flag).
- Error envelope aligned to include `retryable` in canonical pages.
- Correlation header aligned in error mapping snippet to `x-request-id`.

#### Remediation applied (queued-state closure)

Canonical contract pages were updated to make `queued` an explicit v1 status:

- `[[API Contract Baseline v1]]` updated to include `queued` in canonical enum.
- `[[API Documentation - OpenAPI]]` `Session.status` enum updated.
- `[[Contracts Package]]` `SessionDTO` and `SessionListItemDTO` updated.
- `[[Database Schema]]` `session_status` enum updated.
- `[[API Routes]]` governance enum line updated.

## Final Status

- **Structural lint:** PASS
- **Contract coherence lint:** PASS (queued-state drift closed)
- **Operational verdict for docs:** coherent baseline for implementation kickoff.

## Recommended next action

Keep `queued` semantics stable and enforce via CI contract checks so status drift does not reappear.

## Mini-remediation cleanup (applied)

To reduce ambiguity between `draft` and `queued`, the following clarifications were applied:

- lifecycle docs now consistently show `draft -> ready -> queued -> running` for async execution,
- contract baseline explicitly distinguishes internal/transient statuses (`draft`, `ready`) from API-facing runtime flow,
- domain structure and machine snippets were aligned on `QUEUE` and `WORKER_PICKUP` transition intent.

### Lexical hardening pass

- Historical transition labels using `START` were removed from canonical architecture pages.
- `Domain Events Catalog`, `BullMQ Worker Wiring`, and `ReadinessPolicy` are now aligned with `QUEUE` / `WORKER_PICKUP` naming.
- Verification query on `Wiki/concepts` + `Wiki/entities` found no residual `START` transition references.

### Ultra-strict guard naming pass

- Canonical guard name standardized from `canStart` to `canQueue` in architecture and domain-integration snippets.
- Backward compatibility preserved in prose: `canStart` is documented as a legacy alias.

## Referenced Pages

- [[API Contract Baseline v1]]
- [[API Routes]]
- [[API Documentation - OpenAPI]]
- [[Contracts Package]]
- [[Error Mapping (Domain to HTTP)]]
- [[Idempotency Implementation]]
- [[Session List - Live Status]]
