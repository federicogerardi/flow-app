---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/implementation
  - wiki/gamification
  - wiki/roadmap
date_updated: 2026-08-04
source_count: 6
confidence: high
---

# Phase 13 — Gamification Implementation Plan

## Overview

Add the gamification bounded context — an event-driven overlay on the operational layer that rewards productive usage patterns with XP, levels, streaks, achievements, and workspace leaderboards. Zero modifications to existing domain code — gamification listens to existing domain events and operates asynchronously via BullMQ.

## Architecture Authority

- **[[Gamification]]** — authoritative domain design (aggregates, mechanics, architecture)
- **[[gamification-proposal]]** — synthesis of the total file inventory, DB schema, API routes
- **[[PlayerProfile]]** — aggregate root structure (canonical template)
- **[[Achievements & Badges]]** — badge catalog + AchievementEvaluator + credit reward flow
- **[[DDD Domain Design Rules]]** — all 14 rules enforced; this is the highest DDD drift risk phase
- **[[implementation-roadmap-2026-08-01]]** — Phase 13 section with DDD risk register

## Requirements

- Points system awarding XP on `SessionCompleted`, `MessageAdded`, `MemberJoined`
- 7 levels (Novice → Guru) with XP thresholds [0, 200, 500, 1000, 2500, 5000, 10000]
- Streak tracking (UTC calendar dates) with bonus XP at days 3, 7, 30
- 22 badges across 4 tiers (Common/Rare/Epic/Legendary) with credit rewards
- 5 workspace challenges (weekly team goals)
- Workspace leaderboard (read model projection, relative XP visibility)
- Workspace health score (computed on-read, 5-component weighted formula)
- Quarterly seasons with exclusive badges and leaderboard resets
- Async BullMQ processing — gamification never blocks the main flow
- Event deduplication via `gamification_processed_events` table (at-least-once delivery from source contexts)
- Optimistic locking on `player_profiles` (version column) for concurrent event handling

## Architecture Changes

- **New bounded context**: `packages/domain/src/gamification/` — 2 aggregates, 9 VOs, 2 domain services, 5 domain events
- **New DB tables** (migration 009): `player_profiles`, `xp_transactions`, `achievements`, `gamification_processed_events`, `workspace_leaderboard`, `workspace_challenges`, `challenge_contributions`
- **New DB types**: 7 table interfaces added to `packages/infra-db/src/types.ts`
- **New BullMQ queue**: `gamification-events` — processes `SessionCompleted`, `MessageAdded`, `MemberJoined`
- **New repository implementations**: `KyselyPlayerProfileRepository`, `KyselyWorkspaceChallengeRepository`
- **New API routes**: 5 endpoints under `/api/me/profile`, `/api/workspaces/:id/leaderboard`, `/api/workspaces/:id/health`, `/api/workspaces/:id/challenges`, `/api/seasons/current`
- **Modified files**: `session-worker.ts` (wire gamification event publisher on completion), `send-message.usecase.ts` (wire on `MessageAdded`), `accept-invitation.usecase.ts` (wire on `MemberJoined`), `app.ts` (register routes)

## DDD Drift Risk Assessment

**Overall: 🔴 HIGH** — 8 specific risks across all 14 rules. This is the highest-risk phase in the roadmap. Three pre-commit checklists apply.

| # | Risk | Rule | Probability | Prevention |
|---|------|------|-------------|------------|
| 1 | 9 VOs as `type` aliases instead of classes | Rule 4 | High | Every VO (`XP`, `Level`, `Streak`, `BadgeKey`, `BadgeTier`, `ChallengeStatus`, `ChallengeKey`, `SeasonId`, `AchievementId`) must be a class with `private constructor`, `static from()`, `equals()`. No exception. |
| 2 | `XPCalculator`/`AchievementEvaluator` throwing bare `Error` | Rule 3 | High | All gamification errors extend `DomainError` with `code` + `retryable`. `InvalidXPError`, `MaxLevelReachedError`, `BadgeAlreadyUnlockedError`, `InsufficientXPError`. |
| 3 | Event handler mutating DB directly (`player.xp += 50`) | Rule 1 | High | All mutations go through `playerProfile.addXP(amount, source)`. The aggregate handles level-up, streak update, badge check internally. |
| 4 | `PlayerProfileRepository.save()` with leaderboard/notification side-effects | Rule 5 | High | `save()` persists only `player_profiles` + `achievements`. Leaderboard projection and XP transactions are separate calls. |
| 5 | Custom factory names: `PlayerProfile.init()`, `Achievement.unlock()` | Rule 6 | Medium | Aggregate root: `PlayerProfile.create(userId)`. Child entity: `Achievement.create(userId, badgeKey)`. |
| 6 | `AchievementEvaluator` accessing `(session as any)._status` | Rule 1 | Medium | Cross-context access uses only public API: read the event payload (which carries all needed data). Never access private fields of other aggregates. |
| 7 | Event types as bare strings: `'SessionCompleted'` | — | Medium | Reference event types from origin bounded context: `import { SessionCompleted } from '../generation/domain-events/SessionCompleted'`. |
| 8 | `PlayerProfile` missing `_version` (no optimistic locking) | Rule 7, Pattern 7 | Medium | `version` is a constructor param, incremented on every mutation. Repository uses `saveWithLock(profile, expectedVersion)`. |

### Pre-Commit Checklist

For every new file under `packages/domain/src/gamification/`, verify before merge:

- [ ] Rule 1: No `as any` on private fields (own or cross-aggregate)
- [ ] Rule 2: Zero imports from `zod`, `yup`, or validation libraries
- [ ] Rule 3: Every error extends `DomainError` with `code` + `retryable`
- [ ] Rule 4: Every VO with a finite domain is a class, not a type alias
- [ ] Rule 5: `save()` touches only aggregate + owned entity tables
- [ ] Rule 6: Aggregate root uses `static create()`, never `init()` or `start()`
- [ ] Rule 7: `_version` present, `private` constructor, business methods return `DomainEvent | null`, child collections as `ReadonlyArray<T>`

## Implementation Steps

### Phase 13a — Domain Foundation (7 files)

**1. Create gamification directory structure** (New: `packages/domain/src/gamification/`)

- Action: Create directory tree with empty barrel files
- Why: Establish the bounded context namespace before writing entities
- Dependencies: None
- Risk: Low

```
packages/domain/src/gamification/
├── entities/
├── value-objects/
├── domain-services/
├── domain-events/
├── badges/
├── repositories/
└── index.ts
```

**2. Create all domain errors** (File: `packages/domain/src/gamification/errors.ts`)

- Action: Create `DomainError` subclasses for the entire bounded context
- Why: Rule 3 — every error must extend `DomainError` with `code` + `retryable`. Created first so all other files can import them.
- Dependencies: None (imports only `DomainError` from `shared/`)
- Risk: Low
- Canonical pattern (matches [[Conversation]] errors):

```typescript
export class MaxLevelReachedError extends DomainError {
  readonly code = 'MAX_LEVEL_REACHED';
  readonly retryable = false;
  constructor(userId: string, level: number) {
    super(`User ${userId} has reached max level ${level}`);
  }
}

export class BadgeAlreadyUnlockedError extends DomainError {
  readonly code = 'BADGE_ALREADY_UNLOCKED';
  readonly retryable = false;
  constructor(userId: string, badgeKey: string) {
    super(`User ${userId} already unlocked badge "${badgeKey}"`);
  }
}

export class InvalidXPValueError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(amount: number) {
    super(`XP amount must be positive, got ${amount}`);
  }
}

export class ChallengeAlreadyActiveError extends DomainError { ... }
export class ChallengeNotActiveError extends DomainError { ... }
export class InvalidSeasonError extends DomainError { ... }
```

- Error codes to add to `ErrorMapper.toHttpStatus()` (in Phase 12d):
  - `MAX_LEVEL_REACHED` → 409
  - `BADGE_ALREADY_UNLOCKED` → 409
  - `VALIDATION_ERROR` → 400 (already mapped)
  - `CHALLENGE_NOT_ACTIVE` → 409
  - `INVALID_SEASON` → 400

**3. Create all value objects** (9 files in `packages/domain/src/gamification/value-objects/`)

- Action: Create class VOs following Rule 4 canonical pattern
- Why: Rule 4 — every value with a finite domain must be a class. Created before entities because entities import them.
- Dependencies: Step 2 (errors)
- Risk: **High** — this is the most common DDD violation (Rule 4). Every VO must have `private constructor`, `static from()`, `equals()`. No type aliases.

| # | File | Pattern | Key methods |
|---|------|---------|-------------|
| 3a | `XP.ts` | Encapsulated number | `static of(amount: number)`, `equals()`, `add()`, `get value(): number`. Validates `> 0`. |
| 3b | `Level.ts` | Derived from XP | `static fromXP(xp: number)`, `equals()`. Thresholds: [0, 200, 500, 1000, 2500, 5000, 10000]. `nextThresholdXP()`, `progressToNext(xp)`. |
| 3c | `Streak.ts` | Non-negative int | `static of(days: number)`, `static zero()`, `equals()`, `increment()`. |
| 3d | `BadgeKey.ts` | String identifier | `static from(value: string)`, `equals()`. Catalog constants: `static readonly FirstSession = new BadgeKey('first-session')`, etc. |
| 3e | `BadgeTier.ts` | common/rare/epic/legendary | `static readonly Common/Rare/Epic/Legendary`, `static from(value)`, `creditReward(): 10/25/50/100`. |
| 3f | `ChallengeStatus.ts` | active/completed | `static readonly Active/Completed`, `static from(value)`, `isActive/isCompleted`. |
| 3g | `ChallengeKey.ts` | String identifier | `static from(value)`, `equals()`. Catalog constants: `ContentSprint`, `AssetBuilder`, `AiDialogue`, `FullCoverage`, `PowerWeek`. |
| 3h | `SeasonId.ts` | Q-YYYY format | `static current()`, `static from(value: string)`, `equals()`, `startDate()`, `endDate()`, `label()`. |
| 3i | `AchievementId.ts` | UUID | `static generate()`, `static from(id: string)`, `equals()`. Matches `SessionId`/`ArtifactId` pattern. |

Canonical VO template (from `MembershipRole`):

```typescript
export class BadgeTier {
  private constructor(private readonly _value: BadgeTierValue, private readonly _creditReward: number) {}

  static readonly Common = new BadgeTier('common', 10);
  static readonly Rare = new BadgeTier('rare', 25);
  static readonly Epic = new BadgeTier('epic', 50);
  static readonly Legendary = new BadgeTier('legendary', 100);

  static from(value: string): BadgeTier {
    switch (value) {
      case 'common': return BadgeTier.Common;
      case 'rare': return BadgeTier.Rare;
      case 'epic': return BadgeTier.Epic;
      case 'legendary': return BadgeTier.Legendary;
      default: throw new InvalidBadgeTierError(value);
    }
  }

  equals(other: BadgeTier): boolean { return this._value === other._value; }
  toString(): string { return this._value; }
  get value(): BadgeTierValue { return this._value; }
  get creditReward(): number { return this._creditReward; }
}
```

**4. Create Achievement entity** (File: `packages/domain/src/gamification/entities/Achievement.ts`)

- Action: Child entity owned by `PlayerProfile`. Immutable — unlocked once, never modified.
- Why: Rule 1 — must be created only through `PlayerProfile.unlockBadge()`. Exposes `badgeKey`, `awardedAt`, `achievementId`.
- Dependencies: Step 3i (AchievementId), Step 3d (BadgeKey)
- Risk: Low

```typescript
export class Achievement {
  private constructor(
    readonly achievementId: string,
    readonly userId: string,
    readonly badgeKey: BadgeKey,
    readonly awardedAt: Date,
  ) {}

  static create(userId: string, badgeKey: BadgeKey): Achievement {
    return new Achievement(randomUUID(), userId, badgeKey, new Date());
  }

  static reconstitute(id: string, userId: string, badgeKey: BadgeKey, awardedAt: Date): Achievement {
    return new Achievement(id, userId, badgeKey, awardedAt);
  }
}
```

**5. Create PlayerProfile aggregate root** (File: `packages/domain/src/gamification/entities/PlayerProfile.ts`)

- Action: Aggregate root following Pattern 7 canonical template. User-scoped gamification state.
- Why: Core aggregate — XP, level, streak, badges. Optimistic locking via `_version`. All mutations return `DomainEvent | null`.
- Dependencies: Steps 3a-e (XP, Level, Streak, BadgeKey, BadgeTier), Step 4 (Achievement)
- Risk: **High** — must follow canonical aggregate root template exactly. `private constructor`, `_version`, `ReadonlyArray<Achievement>`, business methods return `DomainEvent | null`.

Canonical structure (aligned with [[PlayerProfile]] wiki definition):

```typescript
export class PlayerProfile {
  private _achievements: Achievement[];
  private _version: number;

  private constructor(
    readonly userId: string,
    private _xpTotal: number,
    private _currentStreak: number,
    private _longestStreak: number,
    private _lastActiveDate: string | null,  // UTC "YYYY-MM-DD"
    readonly createdAt: Date,
    private _updatedAt: Date,
    version: number,
    achievements: Achievement[],
  ) {
    this._version = version;
    this._achievements = [...achievements];
  }

  static create(userId: string): PlayerProfile {
    return new PlayerProfile(userId, 0, 0, 0, null, new Date(), new Date(), 1, []);
  }

  static reconstitute(/* all fields verbatim */): PlayerProfile { /* pass-through */ }

  // ── Business methods ──
  /**
   * Award XP for an action. Checks for level-up.
   * Returns [XPEarned, LevelUp?] events.
   */
  addXP(amount: number, source: string): DomainEvent[] {
    if (amount <= 0) throw new InvalidXPValueError(amount);
    const oldLevel = this.level;
    this._xpTotal += amount;
    this._updatedAt = new Date();
    this._version++;

    const events: DomainEvent[] = [new XPEarned(this.userId, amount, this._xpTotal, source)];
    if (this.level > oldLevel) {
      events.push(new LevelUp(this.userId, oldLevel, this.level));
    }
    return events;
  }

  /**
   * Record daily activity — updates streak based on UTC calendar date.
   * Returns StreakUpdated or null if already active today.
   */
  recordActivity(todayUTC: string): DomainEvent | null {
    if (this._lastActiveDate === todayUTC) return null;
    const yesterday = this._dayBefore(todayUTC);
    if (this._lastActiveDate === yesterday) {
      this._currentStreak++;
    } else {
      this._currentStreak = 1;
    }
    if (this._currentStreak > this._longestStreak) {
      this._longestStreak = this._currentStreak;
    }
    this._lastActiveDate = todayUTC;
    this._updatedAt = new Date();
    this._version++;
    return new StreakUpdated(this.userId, this._currentStreak, this._longestStreak);
  }

  /** Award streak bonus XP at milestones (3, 7, 30 days). Returns null if no milestone. */
  getStreakBonus(): DomainEvent | null {
    const bonusXP = this._currentStreak === 3 ? 15 : this._currentStreak === 7 ? 35 : this._currentStreak === 30 ? 150 : 0;
    if (bonusXP === 0) return null;
    return this.addXP(bonusXP, 'streak_bonus')[0]; // XPEarned only, no LevelUp for bonus tracking
  }

  /** Unlock a badge. Throws BadgeAlreadyUnlockedError if already owned. */
  unlockBadge(badgeKey: BadgeKey, tier: BadgeTier): Achievement {
    if (this.hasBadge(badgeKey)) throw new BadgeAlreadyUnlockedError(this.userId, badgeKey.value);
    const achievement = Achievement.create(this.userId, badgeKey);
    this._achievements.push(achievement);
    this._updatedAt = new Date();
    this._version++;
    return achievement;
  }

  hasBadge(badgeKey: BadgeKey): boolean {
    return this._achievements.some((a) => a.badgeKey.equals(badgeKey));
  }

  // ── Derived getters ──
  get level(): Level { return Level.fromXP(this._xpTotal); }
  get badgeCount(): number { return this._achievements.length; }

  // ── Public getters ──
  get xpTotal(): number { return this._xpTotal; }
  get currentStreak(): number { return this._currentStreak; }
  get longestStreak(): number { return this._longestStreak; }
  get lastActiveDate(): string | null { return this._lastActiveDate; }
  get updatedAt(): Date { return this._updatedAt; }
  get version(): number { return this._version; }
  get achievements(): ReadonlyArray<Achievement> { return this._achievements; }

  private _dayBefore(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
}
```

**6. Create badge catalog** (File: `packages/domain/src/gamification/badges/badge-definition.ts`)

- Action: Type definition for badge metadata. Pure data — no behavior.
- Why: Shared type between `badge-catalog.ts` and `AchievementEvaluator`.
- Dependencies: Steps 3d (BadgeKey), 3e (BadgeTier)
- Risk: Low

```typescript
/** Stats queried from DB by the worker, passed into AchievementEvaluator for
 *  badges that count across all time (sessions-100, tools-all, etc.). */
export interface AllTimeStats {
  totalSessions: number;
  totalPromotions: number;
  totalAgentMessages: number;
  distinctToolsUsed: number;
  distinctAgentsUsed: number;
  workspacesJoined: number;
}

export interface BadgeConditionContext {
  player: PlayerProfile;
  eventType: string;
  eventPayload: Record<string, unknown>;
  allTimeStats?: AllTimeStats; // from DB queries
}

export interface BadgeDefinition {
  key: BadgeKey;
  name: string;
  description: string;
  tier: BadgeTier;
  icon: string;
  condition: (ctx: BadgeConditionContext) => boolean;
  seasonal?: SeasonId; // if seasonal-only badge
}
```

**7. Create badge catalog instances** (File: `packages/domain/src/gamification/badges/badge-catalog.ts`)

- Action: 22 `BadgeDefinition` instances from [[Achievements & Badges]] catalog
- Why: Single source of truth for all badge conditions. Imported by `AchievementEvaluator`.
- Dependencies: Step 6 (badge-definition)
- Risk: Low (pure data)

---

### Phase 13b — Domain Services & Events (8 files)

**8. Create XPCalculator domain service** (File: `packages/domain/src/gamification/domain-services/XPCalculator.ts`)

- Action: Stateless pure function — maps event type to XP amount. Zero I/O, zero infrastructure imports.
- Why: Rule 15 — business rule encapsulated in a VO/domain service, not in application layer.
- Dependencies: Step 3a (XP)
- Risk: Low (pure function, deterministic)

```typescript
export class XPCalculator {
  static xpFor(eventType: string): number {
    switch (eventType) {
      case 'SessionCompleted': return 50;
      case 'ArtifactPromoted': return 100;  // > Deferred: event not yet emitted by generation context
      case 'MemberJoined': return 75;
      case 'MessageAdded': return 10;
      default: return 0;
    }
  }
}
```

**9. Create AchievementEvaluator domain service** (File: `packages/domain/src/gamification/domain-services/AchievementEvaluator.ts`)

- Action: Pure function — evaluates all badges against a player profile and event context. Returns newly unlocked achievements.
- Why: Rule 15 — badge condition logic lives in domain, not in worker.
- Dependencies: Steps 5 (PlayerProfile), 6 (badge-definition), 7 (badge-catalog)
- Risk: **Medium** — condition functions need player state + event data + optionally DB-stats. The condition function receives everything it needs via `BadgeConditionContext` to avoid DB calls inside the evaluator.

```typescript
export class AchievementEvaluator {
  constructor(private badges: BadgeDefinition[]) {}

  evaluate(player: PlayerProfile, eventType: string, eventPayload: Record<string, unknown>, allTimeStats?: AllTimeStats): Achievement[] {
    const unlocked: Achievement[] = [];
    for (const badge of this.badges) {
      if (player.hasBadge(badge.key)) continue;
      const ctx: BadgeConditionContext = { player, eventType, eventPayload, allTimeStats };
      if (badge.condition(ctx)) {
        const achievement = player.unlockBadge(badge.key, badge.tier);
        unlocked.push(achievement);
      }
    }
    return unlocked;
  }
}
```

**10. Create SeasonService domain service** (File: `packages/domain/src/gamification/domain-services/SeasonService.ts`)

- Action: Pure function — determines current season from date. Zero I/O.
- Why: Season logic (Q1 = Jan-Mar, etc.) is a business rule — belongs in domain.
- Dependencies: Step 3h (SeasonId)
- Risk: Low

**11. Create domain events** (5 files in `packages/domain/src/gamification/domain-events/`)

- Action: Immutable DTOs implementing `DomainEvent` interface. No behavior — data only.
- Why: Pattern 8 — events carry all data the consumer needs.
- Dependencies: Step 3 (VOs)
- Risk: Low
- Canonical pattern (matches `SessionCompleted`):

```typescript
// XPEarned.ts
export class XPEarned implements DomainEvent {
  readonly eventType = 'XPEarned';
  readonly occurredAt = new Date();
  constructor(
    readonly aggregateId: string,  // userId
    readonly userId: string,
    readonly amount: number,
    readonly newTotal: number,
    readonly source: string,
  ) {}
}

// LevelUp.ts
export class LevelUp implements DomainEvent {
  readonly eventType = 'LevelUp';
  readonly occurredAt = new Date();
  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly oldLevel: number,
    readonly newLevel: number,
  ) {}
}

// AchievementUnlocked.ts — carries creditReward for Quota context
export class AchievementUnlocked implements DomainEvent {
  readonly eventType = 'AchievementUnlocked';
  readonly occurredAt = new Date();
  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly badgeKey: string,
    readonly badgeTier: string,
    readonly creditReward: number,
    readonly awardedAt: Date,
  ) {}
}

// StreakUpdated.ts
// ChallengeCompleted.ts
```

---

### Phase 13c — WorkspaceChallenge Aggregate (5 files)

**12. Create WorkspaceChallenge aggregate root** (File: `packages/domain/src/gamification/entities/WorkspaceChallenge.ts`)

- Action: Workspace-scoped aggregate for weekly team challenges. Simple lifecycle: active → completed.
- Why: Second aggregate root per [[Gamification#Workspace Gamification]]. Scoped to one workspace + one week.
- Dependencies: Steps 3f (ChallengeStatus), 3g (ChallengeKey), 2 (errors)
- Risk: Medium — must follow Pattern 7 exactly, simpler than PlayerProfile but still an aggregate root.

```typescript
export class WorkspaceChallenge {
  private _version: number;

  private constructor(
    readonly challengeId: string,
    readonly workspaceId: string,
    readonly challengeKey: ChallengeKey,
    private _progress: number,
    readonly target: number,
    private _status: ChallengeStatus,
    readonly weekStart: string,      // UTC "YYYY-MM-DD" (Monday)
    readonly createdAt: Date,
    private _completedAt: Date | null,
    version: number,
  ) {
    this._version = version;
  }

  static create(workspaceId: string, challengeKey: ChallengeKey, target: number, weekStart: string): WorkspaceChallenge { ... }
  static reconstitute(/* all fields */): WorkspaceChallenge { ... }

  /** Contribute progress. Returns ChallengeCompleted event if target reached. */
  contribute(amount: number = 1): DomainEvent | null {
    if (!this._status.isActive) return null;
    this._progress = Math.min(this._progress + amount, this.target);
    this._version++;
    if (this._progress >= this.target) {
      this._status = ChallengeStatus.Completed;
      this._completedAt = new Date();
      return new ChallengeCompleted(this.challengeId, this.workspaceId, this.challengeKey.value);
    }
    return null;
  }

  get progress(): number { return this._progress; }
  get status(): ChallengeStatus { return this._status; }
  get version(): number { return this._version; }
}
```

**13. Create challenge catalog** (File: `packages/domain/src/gamification/badges/challenge-catalog.ts`)

- Action: 5 challenge definitions from [[Gamification#Workspace Gamification]]
- Why: Single source of truth for challenge types, targets, and XP rewards.
- Dependencies: Step 3g (ChallengeKey)
- Risk: Low

---

### Phase 13d — Repositories & DB Schema (5 files)

**14. Create DB migration** (File: `packages/infra-db/migrations/009_gamification.sql`)

- Action: CREATE TABLE for all 7 gamification tables per [[gamification-proposal#Database]]
- Why: Persistence layer for the gamification bounded context
- Dependencies: None
- Risk: Medium — must include version column for optimistic locking, UNIQUE constraints for idempotency, correct index design

```sql
CREATE TABLE player_profiles (
    user_id          UUID PRIMARY KEY REFERENCES users(id),
    version          INTEGER NOT NULL DEFAULT 1,
    xp_total         INTEGER NOT NULL DEFAULT 0,
    current_streak   INTEGER NOT NULL DEFAULT 0,
    longest_streak   INTEGER NOT NULL DEFAULT 0,
    last_active_date DATE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE achievements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id),
    badge_key   VARCHAR(50)  NOT NULL,
    awarded_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, badge_key)
);

CREATE TABLE xp_transactions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users(id),
    amount       INTEGER      NOT NULL,
    source       VARCHAR(50)  NOT NULL,
    source_id    VARCHAR(120),
    workspace_id UUID,
    season_id    VARCHAR(10)  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xp_user_season ON xp_transactions(user_id, season_id);
CREATE INDEX idx_xp_workspace_season ON xp_transactions(workspace_id, season_id);

CREATE TABLE gamification_processed_events (
    event_id     VARCHAR(120) PRIMARY KEY,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_processed_expires ON gamification_processed_events(expires_at);

CREATE TABLE workspace_leaderboard (
    user_id      UUID NOT NULL REFERENCES users(id),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    xp           INTEGER NOT NULL DEFAULT 0,
    season_id    VARCHAR(10) NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, workspace_id, season_id)
);

CREATE TABLE workspace_challenges (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id   UUID         NOT NULL REFERENCES workspaces(id),
    challenge_key  VARCHAR(50)  NOT NULL,
    progress       INTEGER      NOT NULL DEFAULT 0,
    target         INTEGER      NOT NULL,
    status         VARCHAR(20)  NOT NULL DEFAULT 'active',
    week_start     DATE         NOT NULL,
    completed_at   TIMESTAMPTZ,
    UNIQUE (workspace_id, challenge_key, week_start)
);

CREATE TABLE challenge_contributions (
    challenge_id UUID    NOT NULL REFERENCES workspace_challenges(id),
    user_id      UUID    NOT NULL REFERENCES users(id),
    amount       INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (challenge_id, user_id)
);
```

**15. Add DB types** (Modify: `packages/infra-db/src/types.ts`)

- Action: Add 7 table interfaces to the `DB` interface
- Why: Kysely type-safety for gamification tables
- Dependencies: Step 14 (migration)
- Risk: Low

```typescript
export interface PlayerProfilesTable { ... }
export interface AchievementsTable { ... }
export interface XPTransactionsTable { ... }
export interface GamificationProcessedEventsTable { ... }
export interface WorkspaceLeaderboardTable { ... }
export interface WorkspaceChallengesTable { ... }
export interface ChallengeContributionsTable { ... }

export interface DB {
  // ... existing tables ...
  player_profiles: PlayerProfilesTable;
  achievements: AchievementsTable;
  xp_transactions: XPTransactionsTable;
  gamification_processed_events: GamificationProcessedEventsTable;
  workspace_leaderboard: WorkspaceLeaderboardTable;
  workspace_challenges: WorkspaceChallengesTable;
  challenge_contributions: ChallengeContributionsTable;
}
```

**16. Create PlayerProfileRepository interface** (File: `packages/domain/src/gamification/repositories/PlayerProfileRepository.ts`)

- Action: Repository interface per Pattern 9 — domain language, not SQL
- Why: Domain defines what, infra implements how
- Dependencies: Step 5 (PlayerProfile)
- Risk: Low

```typescript
export interface PlayerProfileRepository {
  findByUserId(userId: string): Promise<PlayerProfile | null>;
  findOrCreate(userId: string): Promise<PlayerProfile>;
  save(profile: PlayerProfile): Promise<void>;          // Aggregate + achievements only (Rule 5)
  saveWithLock(profile: PlayerProfile, expectedVersion: number): Promise<void>;  // Optimistic
}
```

**17. Create WorkspaceChallengeRepository interface** (File: `packages/domain/src/gamification/repositories/WorkspaceChallengeRepository.ts`)

- Action: Repository for workspace challenges
- Why: Pattern 9 — dedicated interface per aggregate
- Dependencies: Step 12 (WorkspaceChallenge)
- Risk: Low

```typescript
export interface WorkspaceChallengeRepository {
  findActiveForWorkspace(workspaceId: string, weekStart: string): Promise<WorkspaceChallenge[]>;
  findOrCreate(workspaceId: string, challengeKey: ChallengeKey, target: number, weekStart: string): Promise<WorkspaceChallenge>;
  save(challenge: WorkspaceChallenge): Promise<void>;
  findAllForWorkspace(workspaceId: string, filters?: { status?: ChallengeStatus }): Promise<WorkspaceChallenge[]>;
}
```

**18. Create KyselyPlayerProfileRepository** (File: `packages/infra-db/src/repositories/player-profile-repository.ts`)

- Action: Kysely implementation with optimistic locking + owned entity sync (achievements)
- Why: Persistence implementation. `saveWithLock()` checks `WHERE version = ?` and throws `ConcurrencyError`.
- Dependencies: Steps 14 (migration), 15 (types), 16 (interface)
- Risk: **Medium** — must sync achievements (owned entity) inside `save()` per Rule 5. Must implement `saveWithLock` with `numUpdatedRows === 0n`.

**19. Create KyselyWorkspaceChallengeRepository** (File: `packages/infra-db/src/repositories/workspace-challenge-repository.ts`)

- Action: Kysely implementation for workspace challenges
- Why: Persistence implementation
- Dependencies: Steps 14, 15, 17
- Risk: Low

---

### Phase 13e — Gamification Event Pipeline (4 files)

**20. Create GamificationEventPublisher** (File: `apps/backend/src/application/gamification/gamification-event-publisher.ts`)

- Action: Enqueues BullMQ jobs on the `gamification-events` queue when domain events occur. Thin adapter — no business logic.
- Why: Separation of concerns — domain events are emitted, this publisher enqueues async processing. Don't block the main flow.
- Dependencies: Steps 11 (domain events), BullMQ
- Risk: Medium — must include event ID (`sessionId` or `messageId`) for deduplication

```typescript
export type GamificationEventType = 'SessionCompleted' | 'MessageAdded' | 'MemberJoined';

export interface GamificationEventJob {
  eventType: GamificationEventType;
  eventId: string;     // Unique ID for deduplication (sessionId, messageId, etc.)
  userId: string;
  workspaceId: string;
  payload: Record<string, unknown>;
}

export class GamificationEventPublisher {
  constructor(private queue: Queue<GamificationEventJob>) {}

  async publishSessionCompleted(sessionId: string, workspaceId: string, userId: string, toolKey: string): Promise<void> {
    await this.queue.add('gamification', {
      eventType: 'SessionCompleted',
      eventId: sessionId,
      userId,
      workspaceId,
      payload: { toolKey, sessionId },
    });
  }

  async publishMessageAdded(messageId: string, workspaceId: string, userId: string, conversationId: string): Promise<void> {
    await this.queue.add('gamification', {
      eventType: 'MessageAdded',
      eventId: messageId,
      userId,
      workspaceId,
      payload: { conversationId },
    });
  }

  async publishMemberJoined(workspaceId: string, userId: string): Promise<void> {
    await this.queue.add('gamification', {
      eventType: 'MemberJoined',
      eventId: `${workspaceId}:${userId}`, // once per user per workspace
      userId,
      workspaceId,
      payload: {},
    });
  }
}
```

**21. Create gamification worker** (File: `apps/backend/src/application/gamification/gamification-worker.ts`)

- Action: BullMQ worker that processes `gamification-events` jobs. Orchestrates XP award, achievement evaluation, streak update, challenge contribution, leaderboard update. ALL with optimistic locking + deduplication.
- Why: Async processing — gamification never blocks the main flow. Resilient to concurrent events.
- Dependencies: Steps 5, 8, 9, 10, 16, 17, 20, repositories
- Risk: **HIGH** — this is the integration point where DDD drift risks 1, 3, 4, 6, 7 all converge:
  - **Risk 1**: Must use `playerProfile.addXP()` — never `player.xp += 50`
  - **Risk 3**: Must go through aggregate methods — never mutate DB directly
  - **Risk 4**: `save()` must not also update leaderboard — separate calls
  - **Risk 6**: Condition context must pass event data, never access Session aggregate internals
  - **Risk 7**: Event types must reference canonical names

```typescript
async function processGamificationEvent(job: Job<GamificationEventJob>, deps: GamificationWorkerDeps): Promise<void> {
  const { eventType, eventId, userId, workspaceId, payload } = job.data;
  const log = logger.child({ eventType, eventId, userId });

  // 1. Deduplication — atomic INSERT ON CONFLICT in repository, not check-then-insert
  const claimed = await deps.processedEventRepo.tryClaim(eventId);
  if (!claimed) {
    log.debug('gamification_event_skipped_duplicate');
    return;
  }

  try {
    // 2. Calculate XP
    const xpAmount = XPCalculator.xpFor(eventType);
    if (xpAmount === 0) return;

    // 3. Load/create PlayerProfile with retry-on-conflict
    const result = await withOptimisticRetry(3, async () => {
      const p = await deps.playerProfileRepo.findOrCreate(userId);
      const expectedVersion = p.version;  // Capture BEFORE mutations (canonical pattern: SessionWorker line 127)

      const events = p.addXP(xpAmount, eventType.toLowerCase());
      const streakEvent = p.recordActivity(todayUTC());

      // 4. Persist (aggregate + achievements only — Rule 5)
      // WHERE version = expectedVersion, SET version = p.version (N+2)
      await deps.playerProfileRepo.saveWithLock(p, expectedVersion);

      return { player: p, events, streakEvent };
    });

    // 5. XP transaction log (separate from save() — Rule 5)
    await deps.xpTransactionRepo.insert({
      userId, amount: xpAmount, source: eventType.toLowerCase(),
      sourceId: eventId, workspaceId, seasonId: SeasonId.current().value,
    });

    // 6. Evaluate achievements (with pre-queried all-time stats for counters)
    const allTimeStats = await deps.gamificationStatsRepo.getStats(userId);
    const evaluator = new AchievementEvaluator(ALL_BADGES);
    const newAchievements = evaluator.evaluate(result.player, eventType, payload, allTimeStats);

    // Persist newly unlocked achievements through the aggregate
    if (newAchievements.length > 0) {
      await deps.playerProfileRepo.save(result.player);
    }

    // 7. Workspace challenge contribution
    await contributeToChallenges(deps, workspaceId, userId, eventType);

    // 8. Leaderboard update (separate from save() — Rule 5)
    await deps.leaderboardRepo.incrementXP(userId, workspaceId, xpAmount, SeasonId.current().value);

    // 9. Publish gamification events (for SSE/quota)
    for (const e of result.events) { /* SSE publish */ }
    if (result.streakEvent) { /* SSE publish */ }
    for (const achievement of newAchievements) { /* SSE publish + AchievementUnlocked → Quota */ }

    log.info({ xpAwarded: xpAmount, newTotal: result.player.xpTotal, level: result.player.level, badgesUnlocked: newAchievements.length }, 'gamification_event_processed');
  } catch (err) {
    if (err instanceof ConcurrencyError) throw err; // rethrow for BullMQ retry
    log.error({ err }, 'gamification_event_failed');
    throw err;
  }
}
```

**22. Create dedicated sub-repositories** (Files: `apps/backend/src/infrastructure/` or `packages/infra-db/src/repositories/`)

- Action: `ProcessedEventRepository`, `XPTransactionRepository`, `LeaderboardProjectionRepository`, `GamificationStatsRepository` — all separate from aggregate repositories per Rule 5
- Why: Rule 5 — `save()` must not side-effect into cross-cutting tables. Each has its own dedicated repository.
- **`ProcessedEventRepository.tryClaim(eventId)`**: atomic `INSERT INTO gamification_processed_events ... ON CONFLICT DO NOTHING`. Returns `true` if the row was inserted (first claim), `false` if it already existed (duplicate). This avoids the TOCTOU race between `hasProcessed` check and `markProcessed`.
- **`GamificationStatsRepository.getStats(userId)`**: queries `sessions`, `conversations`/`messages`, `workspace_memberships` tables for all-time counters needed by the `AchievementEvaluator`. Returns `AllTimeStats`.
- Dependencies: Step 14 (migration)
- Risk: Medium

**23. Create use cases** (Files: `apps/backend/src/application/gamification/`)

- Action: Application-layer use cases for API endpoints
- Why: Pattern 12 — application layer orchestrates, domain enforces rules
- Dependencies: Steps 5, 16, 17
- Risk: Low

| Use Case | Purpose | Dependencies |
|----------|---------|-------------|
| `GetPlayerProfileUseCase` | Fetch XP, level, streak, badges for authenticated user | `PlayerProfileRepository.findByUserId()` |
| `GetWorkspaceLeaderboardUseCase` | Compute leaderboard projection for workspace + season | `LeaderboardProjectionRepository` |
| `GetWorkspaceHealthUseCase` | Compute 5-component health score on-read | Read models: session stats, member count, conversation count |
| `GetWorkspaceChallengesUseCase` | List active + past weekly challenges | `WorkspaceChallengeRepository.findAllForWorkspace()` |

---

### Phase 13f — Wiring & Integration (4 files)

**24. Wire gamification event publisher into session worker** (Modify: `apps/backend/src/generation/worker/session-worker.ts`)

- Action: After session completes successfully (`state.value === 'done'`), call `gamificationEventPublisher.publishSessionCompleted()`
- Why: `SessionCompleted` is the primary XP source (50 XP). The worker knows the final state.
- Dependencies: Step 20 (GamificationEventPublisher)
- Risk: Low — one line addition in the `processSessionJob` completion path

```typescript
// After actor completes (line 156 in current session-worker.ts):
if (state.status === 'done') {
  await deps.gamificationEventPublisher.publishSessionCompleted(
    sessionId, session.workspaceId, session.userId, session.toolKey.value
  );
}
```

**25. Wire gamification event publisher into send-message use case** (Modify: `apps/backend/src/application/agent-chat/send-message.usecase.ts`)

- Action: After `conversation.addMessage(message)` returns `MessageAdded`, call `gamificationEventPublisher.publishMessageAdded()`
- Why: Agent chat interaction = 10 XP
- Dependencies: Step 20
- Risk: Low

**26. Wire gamification event publisher into accept-invitation use case** (Modify: `apps/backend/src/application/workspace/accept-invitation.usecase.ts`)

- Action: After `workspace.acceptInvitation(userId)` succeeds, extract the inviter from the membership (`membership.invitedBy`) and call `gamificationEventPublisher.publishMemberJoined()` with the inviter's userId — NOT the joiner's. Per [[Gamification#Event-Driven Flow]], 75 XP goes to the person who invited the new member.
- Why: New workspace member = 75 XP for the inviter
- Dependencies: Step 20
- Risk: Medium — must read `workspace.memberships` after accept to find `invitedBy`

```typescript
// In accept-invitation.usecase.ts, after workspace.acceptInvitation(cmd.userId):
const membership = workspace.memberships.find((m) => m.userId === cmd.userId);
if (membership?.invitedBy) {
  await this.gamificationEventPublisher.publishMemberJoined(cmd.workspaceId, membership.invitedBy);
}
```

**27. Register gamification routes in app.ts** (Modify: `apps/backend/src/app.ts`)

- Action: Register the gamification routes module
- Why: API endpoints need to be mounted
- Dependencies: Step 28
- Risk: Low

---

### Phase 13g — API Routes (1 file)

**28. Create gamification API routes** (File: `apps/backend/src/api/gamification/gamification-routes.ts`)

- Action: 5 endpoints per [[Gamification#API Routes]] and [[gamification-proposal#API]]
- Why: Read-only endpoints for player profile, leaderboard, health, challenges, seasons
- Dependencies: Steps 23 (use cases), 27 (app.ts registration)
- Risk: Low

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/me/profile` | ✅ | XP total, level, streak, badges, season info |
| `GET` | `/api/workspaces/:id/leaderboard` | member | Ranked leaderboard (relative XP, current season) |
| `GET` | `/api/workspaces/:id/health` | member | 5-component health score + breakdown |
| `GET` | `/api/workspaces/:id/challenges` | member | Active + past challenges with progress |
| `GET` | `/api/seasons/current` | ✅ | Season ID, name, dates, exclusive badge keys |

---

### Phase 13h — Barrel Exports (1 file)

**29. Create gamification index.ts** (File: `packages/domain/src/gamification/index.ts`)

- Action: Clean barrel export per Pattern 11 — no consumer imports from internal paths
- Why: Package boundary — `@flow-app/domain/gamification` must export everything needed
- Dependencies: All domain files
- Risk: Low

```typescript
// Entities
export { PlayerProfile } from './entities/PlayerProfile';
export { Achievement } from './entities/Achievement';
export { WorkspaceChallenge } from './entities/WorkspaceChallenge';

// Value Objects
export { XP } from './value-objects/XP';
export { Level } from './value-objects/Level';
export { Streak } from './value-objects/Streak';
export { BadgeKey } from './value-objects/BadgeKey';
export { BadgeTier } from './value-objects/BadgeTier';
export { ChallengeStatus } from './value-objects/ChallengeStatus';
export { ChallengeKey } from './value-objects/ChallengeKey';
export { SeasonId } from './value-objects/SeasonId';
export { AchievementId } from './value-objects/AchievementId';

// Domain Services
export { XPCalculator } from './domain-services/XPCalculator';
export { AchievementEvaluator } from './domain-services/AchievementEvaluator';
export { SeasonService } from './domain-services/SeasonService';

// Domain Events
export { XPEarned } from './domain-events/XPEarned';
export { LevelUp } from './domain-events/LevelUp';
export { AchievementUnlocked } from './domain-events/AchievementUnlocked';
export { StreakUpdated } from './domain-events/StreakUpdated';
export { ChallengeCompleted } from './domain-events/ChallengeCompleted';

// Badges
export { type BadgeDefinition, type BadgeConditionContext, ALL_BADGES } from './badges/badge-catalog';
export { ALL_CHALLENGES } from './badges/challenge-catalog';

// Repositories
export type { PlayerProfileRepository } from './repositories/PlayerProfileRepository';
export type { WorkspaceChallengeRepository } from './repositories/WorkspaceChallengeRepository';

// Errors
export { MaxLevelReachedError, BadgeAlreadyUnlockedError, InvalidXPValueError, ... } from './errors';
```

**Update root domain index** (Modify: `packages/domain/src/index.ts`)

- Action: Add `export * from './gamification'` to root barrel
- Why: Consumers import from `@flow-app/domain`
- Risk: Low

---

## Testing Strategy

### Domain Tests (priority: HIGH)

| Test file | What to test |
|-----------|-------------|
| `PlayerProfile.test.ts` | `create()`, `addXP()` (positive + zero + negative), level-up detection at each threshold, `recordActivity()` streak continuity/break, `unlockBadge()` + duplicate throw, streak bonus at days 3/7/30, `get level()` derived from XP, `get achievements()` is `ReadonlyArray` |
| `WorkspaceChallenge.test.ts` | `create()`, `contribute()` partial, `contribute()` reaching target → `ChallengeCompleted`, `contribute()` on completed challenge → null |
| `Achievement.test.ts` | `create()` sets `awardedAt`, `badgeKey` equality |
| `XP.test.ts` | `of(0)` throws, `of(50)` succeeds, `add()`, `equals()` |
| `Level.test.ts` | `fromXP(0)` → 1, `fromXP(199)` → 1, `fromXP(200)` → 2, `fromXP(10000)` → 7, `fromXP(99999)` → 7 (max) |
| `Streak.test.ts` | `of(0)`, `of(5)`, `increment()`, `equals()` |
| `BadgeKey.test.ts` | `from('first-session')`, invalid key throws, `equals()` |
| `BadgeTier.test.ts` | `Common/Rare/Epic/Legendary`, `creditReward()` returns correct values, `from()` |
| `ChallengeStatus.test.ts` | `Active/Completed`, `isActive/isCompleted` |
| `ChallengeKey.test.ts` | All 5 constants, `from()`, `equals()` |
| `SeasonId.test.ts` | `current()` returns correct season for date, `startDate()`, `endDate()`, `label()` |
| `AchievementId.test.ts` | `generate()` produces UUID, `equals()` |
| `XPCalculator.test.ts` | `xpFor('SessionCompleted')` → 50, `xpFor('MessageAdded')` → 10, unknown → 0 |
| `AchievementEvaluator.test.ts` | `first-session` unlocked after 1 session, `sessions-100` NOT unlocked at 99, duplicate badge not re-evaluated |
| `SeasonService.test.ts` | Current season detection, boundary dates |

### Repository Integration Tests (priority: MEDIUM)

| Test file | What to test |
|-----------|-------------|
| `player-profile-repository.integration.test.ts` | `findOrCreate` creates on first call + returns on second, `saveWithLock` throws `ConcurrencyError` on version mismatch, achievements synced inside `save()` |
| `workspace-challenge-repository.integration.test.ts` | `findOrCreate` idempotent, `findActiveForWorkspace` filters by weekStart |
| `gamification-processed-events.integration.test.ts` | `hasProcessed` returns false for new event, `markProcessed` + second `hasProcessed` returns true |

### Worker Integration Tests (priority: MEDIUM)

| Test file | What to test |
|-----------|-------------|
| `gamification-worker.test.ts` | `SessionCompleted` → XP awarded + streak updated + achievements evaluated; duplicate event skipped; `ConcurrencyError` retried with backoff; leaderboard updated asynchronously |

### API Smoke Tests (priority: LOW)

| Endpoint | What to test |
|----------|-------------|
| `GET /api/me/profile` | Returns XP, level, streak, badges for authenticated user |
| `GET /api/workspaces/:id/leaderboard` | Returns ranked members, rank visible, absolute XP hidden for others |
| `GET /api/workspaces/:id/health` | Returns 5-component score + breakdown |
| `GET /api/workspaces/:id/challenges` | Returns active + past challenges |
| `GET /api/seasons/current` | Returns current season info |

## Risks & Mitigations

- **Risk 1 (DDD)**: 9 VOs created as type aliases instead of classes
  - Mitigation: Pre-commit checklist on every file. CI should type-check `expect(XP instanceof XP).toBe(true)` patterns in tests — aliases would fail.
  - Probability: High

- **Risk 2 (DDD)**: Event handler mutates DB directly bypassing aggregate
  - Mitigation: `player.addXP()` is the ONLY method that changes XP. Worker code review must verify no `player.xpTotal +=` anywhere.
  - Probability: High

- **Risk 3 (DDD)**: `PlayerProfileRepository.save()` has leaderboard/challenge side-effects
  - Mitigation: Separate repository interfaces — `LeaderboardProjectionRepository`, `XPTransactionRepository`, `ProcessedEventRepository` are all distinct from `PlayerProfileRepository`. CI test: `save()` call should only touch `player_profiles` + `achievements` tables.
  - Probability: High

- **Risk 4 (Concurrency)**: Two `SessionCompleted` events arrive simultaneously for the same user
  - Mitigation: Optimistic locking in `saveWithLock()`. Worker retries with exponential backoff (already implemented: `withOptimisticRetry(3, ...)`).
  - Probability: Medium

- **Risk 5 (Idempotency)**: Same event delivered twice (BullMQ at-least-once)
  - Mitigation: `gamification_processed_events` table. Atomic INSERT check. Worker skips on duplicate.
  - Probability: Medium

- **Risk 6 (Integration)**: Wire point in session worker breaks on refactor
  - Mitigation: The wire point is at the very end of `processSessionJob` — after actor completion, before returning. If the session worker refactors, the gamification hook is visible and obvious.
  - Probability: Low

- **Risk 7 (Performance)**: `AchievementEvaluator` checks all 22 badges on every event
  - Mitigation: 22 `O(1)` checks (most are simple comparisons). Skipped badges are early-outed. Total overhead ≈ microseconds. If it ever becomes a problem, partition badges by event type (`SessionCompleted` badges, `MessageAdded` badges, etc.).
  - Probability: Low

- **Risk 8 (Data Growth)**: `xp_transactions` + `gamification_processed_events` grow unbounded
  - Mitigation: Cleanup job deletes `gamification_processed_events` rows where `expires_at < NOW()` (90-day retention). `xp_transactions` is an append-only audit log — acceptable for years with indexing. Can be archived quarterly if needed.
  - Probability: Low

## Success Criteria

- [ ] `SessionCompleted` awards 50 XP and updates player profile
- [ ] `MessageAdded` awards 10 XP and updates streak
- [ ] `MemberJoined` awards 75 XP to the inviter (not the new member)
- [ ] 7 levels unlock at correct XP thresholds
- [ ] Streak tracks UTC calendar days correctly (continuity + break + reset)
- [ ] Streak bonuses awarded at days 3, 7, 30
- [ ] All 22 badges evaluate correctly (no false positives, no double-unlock)
- [ ] Badge unlock grants credit reward via `AchievementUnlocked` event
- [ ] Duplicate events are deduplicated (no double XP)
- [ ] Concurrent events for same user don't lose XP (optimistic locking + retry)
- [ ] Leaderboard shows relative ranking without exposing absolute XP of others
- [ ] Workspace challenges progress on `SessionCompleted` and `MessageAdded`
- [ ] Workspace health score computes correctly from real data
- [ ] `GET /api/me/profile` returns complete player state
- [ ] `GET /api/workspaces/:id/leaderboard` returns ranked members
- [ ] All domain tests pass
- [ ] All repository integration tests pass
- [ ] Gamification worker tests pass (including dedup + concurrency)
- [ ] Zero DDD rule violations (pre-commit checklist passes on every file)
- [ ] Zero `as any` in `packages/domain/src/gamification/`
- [ ] Zero `throw new Error()` in `packages/domain/src/gamification/`
- [ ] Zero bare type aliases for domain VOs

## Sources

- [[Gamification]] — Authoritative domain design
- [[gamification-proposal]] — Architecture proposal with file inventory + DB schema
- [[PlayerProfile]] — Aggregate root definition
- [[Achievements & Badges]] — Badge catalog + credit reward flow
- [[DDD Domain Design Rules]] — All 14 patterns / 6 rules enforced
- [[implementation-roadmap-2026-08-01]] — Phase 12 risk register + tasks
