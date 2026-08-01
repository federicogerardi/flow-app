---
type: concept
tags:
  - wiki/concept
  - wiki/governance
  - wiki/infrastructure
date_updated: 2026-08-01
source_count: 7
confidence: high
---

# CI-CD Promotion Policy

> Canonical promotion flow from development to production with explicit quality and rollback gates.

## Objective

Define one deterministic release path across environments so every deployment is traceable, test-gated, and reversible.

## Environments

| Environment | Branch | Deploy | Gates |
|-------------|--------|--------|-------|
| **Dev** | `dev` | Auto on merge | CI checks pass |
| **Staging** | `staging` | Auto on merge | CI checks + smoke tests |
| **Prod** | `main` | Manual approval | CI + staging validation + release owner approval |

## Promotion Flow

1. Feature branch → PR to `dev` → CI checks → merge.
2. `dev` → auto-sync to `staging` via `branch-sync.yml`.
3. Staging validation (smoke tests, regression, migration check).
4. `staging` → PR to `main` → CI + manual approval → merge.
5. `main` → deploy to **Prod**.
6. `main` → auto-sync back to `staging` + `dev` via `branch-sync.yml`.

## Branch Sync

After every PR merge, downstream branches are synchronized automatically:

- PR merged to `main` → `staging` + `dev` synced.
- PR merged to `staging` → `dev` synced.

Workflow: `.github/workflows/branch-sync.yml`. See [[Git Governance Policy]] for details.

## Required Gates by Stage

| Stage | Required gates | Blockers |
|-------|----------------|----------|
| PR merge gate | typecheck, lint, tests, OpenAPI checks, security baseline checks | any failed required check |
| Dev deploy gate | successful CI artifact + deploy success | failed deploy or failed smoke check |
| Staging gate | migration success, staging smoke/regression, SLO sanity | migration failure, error spike, failed regression |
| Prod gate | explicit manual approval + unchanged artifact digest + readiness checks | approval missing, digest drift, readiness failure |

## Artifact Integrity Rule

- The artifact promoted to Staging and Prod must be the exact artifact built at CI merge time.
- Rebuilds between environments are not allowed for the same release.
- Record artifact digest and commit SHA in release notes.

## Database Migration Policy

- Migrations run before app switch-over.
- Prefer forward-only, backward-compatible migrations.
- Destructive schema changes require two-step rollout (expand -> migrate -> contract).
- If migration fails, promotion stops and rollback plan is executed.

## Rollback Policy

Rollback triggers:

- sustained 5xx above SLO threshold,
- failed health/readiness checks,
- critical regression in core user flow,
- severe security issue discovered post-deploy.

Rollback actions:

1. Route traffic back to previous stable release.
2. Validate `/health` and critical endpoints.
3. Record incident with timestamp, scope, and root-cause owner.
4. Open corrective action before next promotion.

## Deployment Verification Checklist

- `/health` returns healthy state.
- Core APIs respond within expected baseline.
- Session start and SSE handshake are functional.
- Error-rate and latency are within alert guardrails.
- Logs show no critical startup/configuration failures.

## Ownership and Approvals

- Release owner: platform maintainer on duty.
- Backup approver: second maintainer for production promotion.
- Any emergency bypass must be documented with reason, risk, and follow-up deadline.

## Sources

- [[synthesis/project-model-multi-dimension-audit-2026-08-01]]
- [[Git Governance Policy]]
- [[Secure SDLC Controls]]
- [[Testing Strategy]]
- [[API Documentation - OpenAPI]]
- [[Environment Configuration]]
- [[Health Check - Deep]]
