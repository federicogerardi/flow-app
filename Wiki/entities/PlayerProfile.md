---
type: entity
tags:
  - wiki/entity
  - wiki/gamification
date_updated: 2026-08-04
source_count: 5
---

# PlayerProfile

> **🟢 Implemented** (2026-08-04). Gamification bounded context: `packages/domain/src/gamification/entities/PlayerProfile.ts`
>
> Aggregate Root — [[Gamification]] context

## Definition

A `PlayerProfile` represents the gamification state for a single [[User]]. It tracks XP, level, streak, and unlocked badges. It is a pure overlay — the User aggregate in [[Auth Dependencies]] is unchanged.

## Ubiquitous Language

- A player **earns XP** when they complete a session, promote an artifact, or exchange agent messages
- A player **levels up** when their XP crosses a threshold
- A player maintains a **streak** by being active on consecutive days
- A player **unlocks a badge** when they meet an achievement condition

## Lifecycle

A `PlayerProfile` is created automatically when a user performs their first gamified action (first session, first agent message, etc.). It is never deleted — even if the user becomes inactive.

## Structure

```typescript
// packages/domain/src/gamification/entities/PlayerProfile.ts

class PlayerProfile {
  private _badges: Achievement[];

  private constructor(
    readonly userId: UserId,
    readonly version: number,             // optimistic locking
    private _xpTotal: number,
    private _currentStreak: number,
    private _longestStreak: number,
    private _lastActiveDate: string | null, // UTC date "YYYY-MM-DD"
    readonly createdAt: DateTime,
    private _updatedAt: DateTime,
  ) {
    this._badges = [];
  }

  static create(userId: UserId): PlayerProfile {
    return new PlayerProfile(
      userId, 1, 0, 0, 0, null,
      DateTime.now(), DateTime.now(),
    );
  }

  /** Add XP — checks for level-up and returns events */
  addXP(amount: number): DomainEvent[] {
    if (amount <= 0) throw new ValidationError('XP amount must be positive');

    const oldLevel = this.level;
    this._xpTotal += amount;
    this._updatedAt = DateTime.now();

    const events: DomainEvent[] = [
      new XPEarned(this.userId, amount, this._xpTotal),
    ];

    // Level-up check
    if (this.level > oldLevel) {
      events.push(new LevelUp(this.userId, oldLevel, this.level));
    }

    return events;
  }

  /** Record daily activity — updates streak */
  /** Streak is based on UTC calendar date for global consistency */
  recordActivity(now: DateTime): DomainEvent | null {
    const today = now.toUTCDate(); // "2026-08-01"

    if (this._lastActiveDate === today) {
      return null; // already active today (UTC)
    }

    const yesterday = now.minus({ days: 1 }).toUTCDate();
    if (this._lastActiveDate === yesterday) {
      this._currentStreak++;
    } else {
      this._currentStreak = 1; // streak broken or first activity
    }

    if (this._currentStreak > this._longestStreak) {
      this._longestStreak = this._currentStreak;
    }

    this._lastActiveDate = today;
    this._updatedAt = DateTime.now();

    return new StreakUpdated(this.userId, this._currentStreak, this._longestStreak);
  }

  /** Unlock a badge */
  unlockBadge(badgeKey: string): Achievement {
    if (this.hasBadge(badgeKey)) {
      throw new BadgeAlreadyUnlockedError(this.userId, badgeKey);
    }
    const achievement = Achievement.unlock(this.userId, badgeKey);
    this._badges.push(achievement);
    this._updatedAt = DateTime.now();
    return achievement;
  }

  hasBadge(badgeKey: string): boolean {
    return this._badges.some(a => a.badgeKey === badgeKey);
  }

  // ── Getters ──
  get xpTotal(): number { return this._xpTotal; }
  get currentStreak(): number { return this._currentStreak; }
  get longestStreak(): number { return this._longestStreak; }
  get lastActiveDate(): string | null { return this._lastActiveDate; }
  get badges(): ReadonlyArray<Achievement> { return this._badges; }
  get updatedAt(): DateTime { return this._updatedAt; }

  get level(): number {
    const thresholds = [0, 200, 500, 1000, 2500, 5000, 10000];
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (this._xpTotal >= thresholds[i]) return i + 1;
    }
    return 1;
  }

  get levelProgress(): number {
    const thresholds = [0, 200, 500, 1000, 2500, 5000, 10000];
    const currentThreshold = thresholds[this.level - 1] ?? 0;
    const nextThreshold = thresholds[this.level] ?? Infinity;
    return ((this._xpTotal - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  }
}
```

## Invariants

- XP is always non-negative. No deductions.
- Streak can only increase or reset to 0. No partial decrements.
- Streak is based on **UTC calendar dates** for global consistency across timezones
- A badge can be unlocked only once per player — enforced by `unlockBadge()`
- Concurrent writes are protected by **optimistic locking** (`version` field)

## Value Objects

| VO | Type | Description |
|----|------|-------------|
| `PlayerId` | UUID (= UserId) | Shared identifier with [[Auth Dependencies]] |
| `XP` | int ≥ 0 | Experience points |
| `Level` | int 1-7 | Derived from XP thresholds |
| `Streak` | int ≥ 0 | Consecutive active days in UTC |

## Domain Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `XPEarned` | `addXP()` | userId, amount, xpTotal |
| `LevelUp` | `addXP()` crossing threshold | userId, oldLevel, newLevel |
| `StreakUpdated` | `recordActivity()` | userId, currentStreak, longestStreak |
| `AchievementUnlocked` | `unlockBadge()` | userId, badgeKey, badgeTier, creditReward, awardedAt |

## Database

```sql
CREATE TABLE player_profiles (
    user_id          UUID PRIMARY KEY REFERENCES users(id),
    version          INTEGER NOT NULL DEFAULT 1,       -- optimistic locking
    xp_total         INTEGER NOT NULL DEFAULT 0,
    current_streak   INTEGER NOT NULL DEFAULT 0,
    longest_streak   INTEGER NOT NULL DEFAULT 0,
    last_active_date DATE,                              -- UTC date "YYYY-MM-DD"
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- XP event log for seasonal queries (avoids reset race condition)
CREATE TABLE xp_transactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id),
    amount      INTEGER      NOT NULL,
    source      VARCHAR(50)  NOT NULL,       -- 'session_completed', 'artifact_promoted', 'achievement_reward'
    source_id   VARCHAR(120),                -- eventId for deduplication
    workspace_id UUID,                        -- for workspace-level aggregation
    season_id   VARCHAR(10)  NOT NULL,       -- '2026-Q3'
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xp_user_season ON xp_transactions(user_id, season_id);
CREATE INDEX idx_xp_workspace_season ON xp_transactions(workspace_id, season_id);

CREATE TABLE achievements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id),
    badge_key   VARCHAR(50)  NOT NULL,
    awarded_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, badge_key)
);

CREATE INDEX idx_achievements_user ON achievements(user_id);
```

> **Seasonal XP query** (replaces mutable `xp_seasonal` column):  
> `SELECT SUM(amount) FROM xp_transactions WHERE user_id = $1 AND season_id = $2`  
> No reset needed — the season filter provides the correct value at any time.

## Repository

```typescript
interface PlayerProfileRepository {
  findByUserId(userId: UserId): Promise<PlayerProfile | null>;
  findOrCreate(userId: UserId): Promise<PlayerProfile>;
  save(profile: PlayerProfile): Promise<void>;  // optimistic lock via version
```

## Sources

- [[Gamification]] — Parent bounded context
- [[Achievements & Badges]] — Badge catalog reference
- [[Gamification#Workspace Gamification]] — Leaderboard consumes seasonal XP
- [[Auth Dependencies]] — Shared UserId