---
type: concept
tags:
  - wiki/concept
  - wiki/governance
  - wiki/quality
date_updated: 2026-08-02
source_count: 7
confidence: high
---

# Quality Gate Matrix

> Measurable and enforceable CI gates required for merge and promotion.

## Objective

Convert policy-level quality requirements into deterministic pass/fail controls.

## Mandatory Merge Gates

| Gate | Scope | Threshold | Block policy |
|------|-------|-----------|--------------|
| Typecheck | all affected workspaces | 0 errors | Block merge |
| Lint | all affected workspaces | 0 errors (warnings allowed only by explicit rule) | Block merge |
| Unit/Integration tests | affected workspaces | 100% pass, no focused tests | Block merge |
| Coverage (backend) | `apps/backend` | lines >= 80 for application/generation; branches >= 70 | Block merge |
| Coverage (frontend) | `apps/frontend` | lines >= 70; branches >= 60; machines lines >= 90 | Block merge |
| API contract check | backend APIs | OpenAPI generate + lint + diff pass | Block merge |
| Secrets scan | full repo diff | 0 leaked credentials/tokens | Block merge |
| Dependency vulnerability scan | prod dependency graph | 0 critical/high unresolved | Block merge |

## Mandatory Promotion Gates (Staging -> Prod)

| Gate | Scope | Threshold | Block policy |
|------|-------|-----------|--------------|
| Staging smoke suite | core user flows | 100% pass | Block promotion |
| Health/readiness | backend + worker | all checks healthy | Block promotion |
| API/SSE sanity | session start + stream | handshake success; expected events received | Block promotion |
| Error budget guardrail | API + frontend telemetry | no active critical breach window | Block promotion |
| Release evidence | artifact digest + commit SHA + approver | required fields complete | Block promotion |

## Security Exception Workflow (Time-Bound)

Medium-risk exceptions are allowed only with a tracked record containing:

- `owner`
- `justification`
- `compensatingControls`
- `expiryDate` (max 30 days)
- `approver`

Expired exceptions are treated as gate failures.

## Frontend Observability Gate

Promotion requires:

- source maps uploaded for release,
- telemetry DSN configured,
- synthetic staging error captured and deobfuscated,
- fatal JS error rate below agreed threshold window.

See [[Frontend Error Observability]].

## Definition of Done

Feature completion requires passing ALL mandatory gates below. The matrix thresholds above supply the numerical values; this section defines the scope and enforcement rules.

### PR Acceptance Checklist

Before merge, the PR must include explicit confirmation of:

1. Scope and impacted contexts.
2. Test evidence (commands and result summary).
3. Contract impact (`none` or linked OpenAPI diff).
4. Security impact (`none` or mitigation details).
5. Rollback notes for risky changes.

### Coverage Rules

- New business logic requires tests for happy path and at least one failure path.
- Every new API write endpoint (`POST`, `PUT`, `DELETE`) must include success response schema, non-2xx error schema, and retry/idempotency semantics.
- Frontend state-machine changes require transition tests for updated states and guards.

### Release Readiness Extension

For production promotion, the DoD extends with:

- staging verification completed,
- health and readiness checks green,
- error rate and latency within SLO guardrails,
- rollback path confirmed.

This aligns feature completion with the promotion gates in [[CI-CD Promotion Policy]].

### Non-Compliance Handling

- If any mandatory gate fails, the feature is not considered done.
- Emergency bypass is allowed only with documented owner, risk, and follow-up deadline.
- Repeated bypasses are tracked as governance debt and reviewed monthly.

## Sources

- Quality Gate Matrix (incorporates [[Quality Gate Matrix#Definition of Done]])
- [[Testing Strategy]]
- [[Secure SDLC Controls]]
- [[API Documentation - OpenAPI]]
- [[CI-CD Promotion Policy]]
- [[Job Queue - Monitoring and Stability]]
- [[Frontend Error Observability]]
- [[Git Governance Policy]]
