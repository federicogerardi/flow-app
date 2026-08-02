---
type: concept
tags:
  - wiki/concept
  - wiki/governance
  - wiki/process
date_updated: 2026-08-01
source_count: 4
confidence: high
---

# Git Governance Policy

> Canonical source-control policy for Flow App repositories.

## Objective

Provide one explicit model for branches, pull requests, commit format, and merge gates so delivery is consistent across backend, frontend, and shared packages.

## Branching Model

### Permanent Branches

| Branch | Purpose | Protection | Direct push |
|--------|---------|------------|-------------|
| `main` | Always releasable, production | Status checks + linear history + no force push + no delete | ❌ PR only |
| `staging` | Validation pre-prod, smoke tests | Status checks + no force push + no delete | ❌ PR only |
| `dev` | Fast feedback, development | None | ✅ Allowed |

### Temporary Branches

- `feature/<scope>-<short-name>`: short-lived implementation branches.
- `fix/<scope>-<short-name>`: short-lived bug-fix branches.
- `chore/<scope>-<short-name>`: tooling/docs/maintenance branches.
- `release/<yyyy-mm-dd>-<tag>`: optional stabilization branch only when needed for coordinated releases.

### Promotion Flow

```
feature/* ──PR──▶ dev ──merge──▶ staging ──merge──▶ main ──▶ prod
```

1. `feature/*` → PR a `dev` (CI checks).
2. `dev` → merge a `staging` (smoke tests).
3. `staging` → PR a `main` (CI + manual approval).
4. `main` → deploy prod.

### Branch Sync Policy

After every PR merge, downstream branches are automatically synchronized:

| Trigger | Sync Target | Strategy | Workflow |
|---------|-------------|----------|----------|
| PR merged to `main` | `staging` + `dev` | Auto-merge (`-X theirs`) | `branch-sync.yml` |
| PR merged to `staging` | `dev` | Auto-merge (`-X theirs`) | `branch-sync.yml` |

Conflict resolution: `-X theirs` means upstream wins (`main` > `staging` > `dev`). If merge fails, manual sync is required.

## Rules

- No direct pushes to `main` or `staging`.
- Branch lifetime target: <= 5 working days.
- Rebase or merge `main` at least daily for branches open longer than 2 days.

## Commit Convention

Format:

`<type>(<scope>): <summary>`

Allowed `type` values:

- `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `build`, `ci`.

Examples:

- `feat(workspace): add membership role guard for invite endpoint`
- `fix(generation): preserve idempotency replay response headers`
- `docs(wiki): add API SLO catalog`

## Pull Request Policy

Required for all changes into `main`.

PR checklist (minimum):

1. Problem and scope are clear.
2. Contract impact documented (if API/events/types changed).
3. Tests added or rationale provided.
4. No secrets/credentials in diff.
5. Migration notes included if schema changed.

Review policy:

- Minimum 1 approval for docs-only or low-risk change.
- Minimum 2 approvals for schema/API/auth/security changes.
- Author cannot self-approve merge.

## Merge Gates

The following checks must pass before merge:

- Typecheck (all workspaces).
- Tests (as defined in [[Testing Strategy]]).
- OpenAPI contract checks (as defined in [[API Documentation - OpenAPI]]).
- Lint checks.

If a gate is intentionally bypassed (exceptional case), the PR must include:

- reason,
- risk,
- rollback plan,
- explicit approver acknowledgement.

## Release and Hotfix

- Default release source: `main`.
- Hotfix flow: `fix/*` branch -> PR to `main` -> fast-track review (still requires green checks).
- If `release/*` branch exists, bug fixes must be cherry-picked back to `main` before closure.

## Governance Ownership

- Primary owner: platform maintainers.
- Enforced through branch protection and CI requirements.
- Reviewed monthly or after major incidents.

## Sources

- [[synthesis/project-model-multi-dimension-audit-2026-08-01]]
- [[Testing Strategy]]
- [[API Documentation - OpenAPI]]
- [[sources/PRD]]
