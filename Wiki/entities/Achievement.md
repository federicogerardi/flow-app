---
type: entity
tags:
  - wiki/entity
  - wiki/gamification
date_updated: 2026-08-04
source_count: 4
---

# Achievement

> **🟢 Implemented** (2026-08-04). Gamification bounded context: `packages/domain/src/gamification/entities/Achievement.ts`
>
> Entity — owned by [[PlayerProfile]] aggregate in [[Gamification]] context

## Definition

An `Achievement` represents a badge unlocked by a player at a specific moment. Each badge key can be unlocked only once per player. Achievements are permanent — once earned, never revoked.

## Ubiquitous Language

- A player **unlocks** a badge when they meet the achievement condition
- A badge has a **tier** (common, rare, epic, legendary) and a **rarity**
- Unlocking a badge may award a **credit bonus** (see [[Gamification#achievements-badges|Achievements & Badges]])

## Structure

```typescript
// packages/domain/src/gamification/entities/Achievement.ts

class Achievement {
  private constructor(
    readonly achievementId: AchievementId,
    readonly userId: UserId,
    readonly badgeKey: string,
    readonly awardedAt: DateTime,
  ) {}

  static unlock(userId: UserId, badgeKey: string): Achievement {
    return new Achievement(
      AchievementId.generate(),
      userId,
      badgeKey,
      DateTime.now(),
    );
  }
}
```

## Value Objects

| VO | Type | Description |
|----|------|-------------|
| `AchievementId` | UUID | Unique identifier |
| `BadgeKey` | string | References a badge definition (e.g., `"first-session"`, `"tools-all"`) |

## Invariants

- A player cannot unlock the same badge twice — enforced by `PlayerProfile.unlockBadge()`
- `awardedAt` is set at unlock time and never modified
- Achievement is never deleted — badges are permanent

## Database

```sql
CREATE TABLE achievements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id),
    badge_key   VARCHAR(50)  NOT NULL,
    awarded_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, badge_key)
);
```

The `UNIQUE (user_id, badge_key)` constraint enforces the "once per player" invariant at the database level — a redundant safety net for the domain-level check in `PlayerProfile.unlockBadge()`.

## Relationship to PlayerProfile

`Achievement` is an **internal entity** of the `PlayerProfile` aggregate root. Badges are loaded, checked, and persisted only through the `PlayerProfile` aggregate:

```typescript
class PlayerProfile {
  private _badges: Achievement[];

  unlockBadge(badgeKey: string): Achievement { ... }
  hasBadge(badgeKey: string): boolean { ... }
  get badges(): ReadonlyArray<Achievement> { ... }
}
```

## Sources

- [[Gamification]] — Parent bounded context
- [[PlayerProfile]] — Parent aggregate root
- [[Gamification#achievements-badges|Achievements & Badges]] — Badge catalog