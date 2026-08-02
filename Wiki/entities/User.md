---
type: entity
tags:
  - wiki/entity
  - wiki/identity
date_updated: 2026-07-31
source_count: 2
---

# User

> Aggregate Root — [[Auth Dependencies]] context

## Definition

Represents an authenticated user of the platform. Generic subdomain — mostly off-the-shelf patterns.

## Structure

```typescript
// packages/domain/src/identity/entities/User.ts

class User {
  constructor(
    readonly userId: UserId,
    readonly email: Email,              // VO — validated
    readonly role: Role,                // VO — admin | member
    readonly status: UserStatus,        // VO — active | disabled
    readonly plan: Plan,                // ✅ documented here (referenced by Quota.enforceQuotaForPeriod)
    readonly createdAt: DateTime = DateTime.now(),
  ) {}
}

// Shared factory
class User {
  static create(email: Email, plan?: Plan): User {
    return new User(
      UserId.generate(),
      email,
      Role.Member,
      UserStatus.Active,
      plan ?? Plan.free(),
    );
  }
}
```

> **Type-design audit (2026-07-31)**: Added `plan` field — was missing from the User entity page but referenced by [[Quota]]'s `ensureQuotaForPeriod()` as `user.plan ?? Plan.free()`. Defaults to `Plan.free()` for new users.

- `userId: UserId`
- `email: Email` (VO)
- `role: Role` (`admin` | `member`)
- `status: UserStatus` (`active` | `disabled`)
- **`plan: Plan`** — billing plan (default: `free`); referenced by [[Quota]] for limit configuration
- Owns [[Workspace]]s
- Has a [[Quota]]

## Cross-Context References

- Referenced by [[Workspace]] via `UserId`
- Referenced by [[Quota]] via `UserId`
- Referenced by [[Session]] via `UserId`

## Sources

- [[sources/PRD]] — FR-S01 to FR-S06
- [[sources/USER-STORIES]] — US-A01 to US-A07
