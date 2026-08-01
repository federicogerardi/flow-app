---
type: concept
tags:
  - wiki/concept
  - wiki/governance
  - wiki/delivery
date_updated: 2026-08-01
source_count: 7
confidence: high
---

# Definition of Done

> Canonical completion checklist for feature delivery across backend, frontend, and infrastructure.

## Objective

Define one measurable quality gate so a feature is considered complete only when build, quality, security, contracts, and documentation are all verified.

## DoD Scope

The DoD applies to:

- backend feature work,
- frontend feature work,
- cross-cutting API contract changes,
- infrastructure/configuration changes that impact runtime behavior.

## Mandatory Gates

| Area | Required check | Failure policy |
|------|----------------|----------------|
| Build integrity | Typecheck and build succeed in all affected workspaces | Block merge |
| Code quality | Lint passes with zero errors | Block merge |
| Tests | Unit/integration tests pass; changed area meets coverage threshold from [[Quality Gate Matrix]] | Block merge |
| API contract | OpenAPI generate + lint + diff pass for API changes | Block merge |
| Security baseline | Secret scan + dependency vulnerability scan pass at required severity gate | Block merge |
| Runtime safety | Required env vars validated fail-closed at startup | Block release |
| Observability | New critical paths emit structured logs and error codes | Block release |
| Documentation | Wiki pages and contracts updated for behavior changes | Block merge |

## Coverage Rules

- New business logic requires tests for happy path and at least one failure path.
- Every new API write endpoint (`POST`, `PUT`, `DELETE`) must include:
  - success response schema,
  - non-2xx error schema,
  - retry/idempotency semantics.
- Frontend state-machine changes require transition tests for updated states and guards.

## Enforcement Source of Truth

Numerical thresholds and CI enforceability are defined in [[Quality Gate Matrix]].
If this page and the matrix diverge, the matrix is authoritative for merge/promotion gates.

## Pull Request Acceptance Checklist

Before merge, the PR must include explicit confirmation of:

1. Scope and impacted contexts.
2. Test evidence (commands and result summary).
3. Contract impact (`none` or linked OpenAPI diff).
4. Security impact (`none` or mitigation details).
5. Rollback notes for risky changes.

## Release Readiness Extension

For production promotion, the DoD extends with:

- staging verification completed,
- health and readiness checks green,
- error rate and latency within SLO guardrails,
- rollback path confirmed.

This extension aligns feature completion with the promotion gates in [[CI-CD Promotion Policy]].

## Non-Compliance Handling

- If any mandatory gate fails, the feature is not considered done.
- Emergency bypass is allowed only with documented owner, risk, and follow-up deadline.
- Repeated bypasses are tracked as governance debt and reviewed monthly.

## Sources

- [[Testing Strategy]]
- [[API Documentation - OpenAPI]]
- [[Secure SDLC Controls]]
- [[CI-CD Promotion Policy]]
- [[API SLO Catalog]]
- [[Git Governance Policy]]
- [[Quality Gate Matrix]]
