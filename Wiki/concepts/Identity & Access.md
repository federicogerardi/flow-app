---
type: concept
tags:
  - wiki/concept
  - wiki/identity
date_updated: 2026-07-30
source_count: 2
confidence: high
---

# Identity & Access

> Generic Bounded Context — `packages/domain/src/identity/`

## Responsibility

User identity, authentication, and role-based access control. Generic subdomain — mostly off-the-shelf patterns (OAuth, JWT, RBAC).

## Aggregate Root

**[[User]]** — an authenticated platform user with a role.

## Key Concepts

- OAuth (Google, GitHub) + email/password
- JWT + refresh token session management
- RBAC: `admin` vs `member`
- Session listing and revocation

## Cross-Context Role

All other contexts reference `UserId` (shared identifier). Identity does not depend on any other context.

## Sources

- [[sources/PRD]] — FR-S01 to FR-S06
- [[sources/USER-STORIES]] — US-A01 to US-A07