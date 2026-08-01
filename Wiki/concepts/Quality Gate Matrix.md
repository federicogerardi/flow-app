---
type: concept
tags:
  - wiki/concept
  - wiki/governance
  - wiki/quality
date_updated: 2026-08-01
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

## Evidence Template

Each release candidate must attach:

1. CI run URL.
2. OpenAPI diff summary.
3. Security scan summary.
4. Smoke test report.
5. Rollback plan owner.

## Sources

- [[Definition of Done]]
- [[Testing Strategy]]
- [[Secure SDLC Controls]]
- [[API Documentation - OpenAPI]]
- [[CI-CD Promotion Policy]]
- [[API SLO Catalog]]
- [[Frontend Error Observability]]
