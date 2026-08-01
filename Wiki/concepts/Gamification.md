---
type: concept
tags:
  - wiki/concept
  - wiki/gamification
date_updated: 2026-08-01
source_count: 7
confidence: high
---

# Gamification

> New Supporting Bounded Context — overlay on the operational layer. `packages/domain/src/gamification/`

## Definition

**Gamification** is an event-driven overlay on Flow App's operational layer. It listens to domain events from [[Content Generation]], [[Agent Chat]], and [[Workspace Sharing]], and produces XP, levels, achievements, badges, streaks, and leaderboards. It is the most decoupled bounded context — the only outbound interaction is the `AchievementUnlocked` domain event consumed by [[Usage & Quota]] for credit rewards.

## Design Principles

| Principle | Application |
|-----------|-------------|
| **Positive-only reinforcement** | No penalties. Failed sessions don't deduct XP. Lost streaks don't remove badges. |
| **XP is private** | Each user sees only their own XP. Workspace leaderboard shows comparative ranking without absolute XP of others. |
| **Credit rewards via achievements** | Badges award credit bonuses (e.g., +50 credits for "Power User"). Streak does NOT multiply credits (rejected). |
| **Seasonal badges** | Quarterly seasons with exclusive badges. Leaderboard resets each season. Badges are permanent. |
| **Team-first competition** | Leaderboards are workspace-scoped. Team challenges. Workspace has its own level. |
| **Notifications in-app only** | No push. Gamification feedback appears as toast notifications and in the sidebar. |

## Aggregate Roots

| Aggregate | Scope | Responsibility |
|-----------|-------|---------------|
| **[[PlayerProfile]]** | User | XP, level, streak, badges (per-player state) |
| **`WorkspaceChallenge`** | Workspace | Weekly team challenges (per-workspace state) |

### Read Models (not aggregates)

| Read Model | Scope | Nature |
|-----------|-------|--------|
| **Leaderboard** | Workspace | Projection computed from `workspace_leaderboard` table. Relative rank + XP bar — no absolute XP exposed. |
| **Workspace Health Score** | Workspace | Computed on-read from asset count, session stats, member count, conversation count. No dedicated aggregate.

## Core Mechanics

### XP & Levels

```
XP sources:
├── Session completed:              +50 XP
├── Artifact promoted to asset:     +100 XP (bonus 2x)
├── Asset created (manual/upload):  +30 XP
├── Agent message exchanged:        +10 XP
└── Team member joined workspace:   +75 XP

Levels (XP thresholds):
├── L1 — Novice               0 XP
├── L2 — Explorer           200 XP
├── L3 — Practitioner       500 XP
├── L4 — Specialist        1000 XP
├── L5 — Expert            2500 XP
├── L6 — Master            5000 XP
└── L7 — Guru             10000 XP

Level-up → LevelUp event → in-app toast "🎉 Level 5: Expert!"
```

### Streak

```
Active day = at least 1 session completed OR 1 agent message exchanged

Day 1:    🔥 Streak started
Day 3:    🔥🔥 +15 XP bonus
Day 7:    🔥🔥🔥 +35 XP bonus, badge "Weekly Warrior"
Day 30:   💎 +150 XP bonus, badge "Unstoppable"

Streak loss = reset to 0 (badges remain permanently)
Streak is per-user, not per-workspace
```

### Achievements & Badges

See [[Achievements & Badges]] for the full catalog. Badges award **credit bonuses**:

| Badge Tier | Credit Reward |
|-----------|---------------|
| Common (e.g., "First Light") | +10 credits |
| Rare (e.g., "Weekly Warrior") | +25 credits |
| Epic (e.g., "Tool Master") | +50 credits |
| Legendary (e.g., "Unstoppable") | +100 credits |

Credits are awarded once — when the badge is first unlocked.

### Workspace Gamification

See [[Workspace Gamification]] for full details. Key features:

- **Workspace Level**: progresses with team activity. Higher level = cosmetic prestige.
- **Workspace Health Score**: composite 0-100 metric (asset coverage, success rate, promotion rate, team activity, agent engagement).
- **Team Challenges**: weekly challenges per workspace (e.g., "Complete 5 sessions this week").
- **Workspace Leaderboard**: internal ranking of members by weekly XP.

### Seasons

```
Season structure:
├── Q1: Jan-Mar — "Winter Sprint"
├── Q2: Apr-Jun — "Spring Growth"
├── Q3: Jul-Sep — "Summer Scale"
└── Q4: Oct-Dec — "Fall Mastery"

Each season:
├── Leaderboard resets (XP preserved in all-time profile)
├── 2-3 exclusive seasonal badges
├── Season-end recap: "You earned X XP, unlocked Y badges, reached Level Z"
└── Seasonal badge unlocked if XP > threshold that season
```

## Architecture — Event-Driven Overlay

Gamification is the most decoupled bounded context. It listens to events, calculates rewards, and updates its own state. The only outbound interaction is `AchievementUnlocked` events consumed by `[[Usage & Quota]]` for credit rewards — mediated through the event bus, never a direct method call.

```
Other Contexts                    Gamification Context              Quota Context
──────────────                    ───────────────────              ─────────────
SessionCompleted ──────────────▶  XPCalculator → PlayerProfile.addXP()
ArtifactPromoted ──────────────▶  AchievementEvaluator.check()
MemberJoined     ──────────────▶  LeaderboardProjector.update()       (read model)
MessageAdded     ──────────────▶  Challenge.contribute()
                                      │
                                      ▼
                                  XPEarned, LevelUp events (internal)
                                  AchievementUnlocked ──────────────▶  CreditRewardHandler
                                                                         │
                                                                         ▼
                                                                     Quota.addCredits()
```

## Event Idempotency

Domain events from other contexts use at-least-once delivery. The Gamification event handler must **deduplicate** to prevent double XP awards:

```
SessionCompleted(id=S1) delivered ──▶ hasProcessed('S1')? → No  → addXP(50) → markProcessed('S1')
SessionCompleted(id=S1) redelivered ▶ hasProcessed('S1')? → Yes → skip
```

```typescript
class GamificationEventHandler {
  constructor(
    private dedupeStore: EventDeduplicationStore,
  ) {}

  async onSessionCompleted(event: SessionCompleted): Promise<void> {
    if (await this.dedupeStore.hasProcessed(event.eventId)) return;

    // ... process event ...

    await this.dedupeStore.markProcessed(event.eventId);
  }
}
```

```sql
CREATE TABLE gamification_processed_events (
    event_id     VARCHAR(120) PRIMARY KEY,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL  -- cleanup after 90 days
);

CREATE INDEX idx_processed_expires ON gamification_processed_events(expires_at);
```

## Concurrency Control

Two events for the same player can arrive simultaneously. `PlayerProfile` uses **optimistic locking** to prevent lost XP:

```sql
-- Added to player_profiles table
ALTER TABLE player_profiles ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
```

```typescript
// Repository: save with optimistic lock
async save(profile: PlayerProfile): Promise<void> {
  const result = await db
    .updateTable('player_profiles')
    .set({ xp_total: profile.xpTotal, version: profile.version + 1, ... })
    .where('user_id', '=', profile.userId)
    .where('version', '=', profile.version)
    .executeTakeFirst();

  if (result.numUpdatedRows === 0) {
    throw new ConcurrencyError('PlayerProfile modified concurrently. Retry.');
  }
}

// Handler: retry on conflict
async processEvent(event: SessionCompleted): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const player = await this.playerRepo.findOrCreate(event.userId);
      player.addXP(50);
      await this.playerRepo.save(player);
      return;
    } catch (e) {
      if (e instanceof ConcurrencyError) {
        await sleep(100 * Math.pow(2, attempt)); // exponential backoff
        continue;
      }
      throw e;
    }
  }
}
```

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/me/profile` | ✅ | Player's XP, level, streak, badges |
| `GET` | `/api/workspaces/:id/leaderboard` | member | Workspace leaderboard (current season) |
| `GET` | `/api/workspaces/:id/health` | member | Workspace health score + breakdown |
| `GET` | `/api/workspaces/:id/challenges` | member | Active + past weekly challenges |
| `GET` | `/api/seasons/current` | ✅ | Current season info |

## Key Properties

| Property | Meaning |
|----------|---------|
| **Pure overlay** | Zero modifications to existing bounded contexts |
| **Event-driven** | Listens to domain events, never calls other contexts |
| **Event-mediated credit rewards** | `AchievementUnlocked` event consumed by Quota context via event bus. No direct cross-context method calls |
| **XP private** | Each user sees only their own XP |
| **Read models for derived data** | Leaderboard and Health Score are read models, not aggregates |
| **Event deduplication** | `gamification_processed_events` table prevents double XP from redelivered events |
| **Optimistic locking** | `version` column on `player_profiles` prevents lost XP from concurrent writes |
| **Credit rewards via badges** | Badges grant one-time credit bonuses |
| **Seasonal** | Quarterly seasons with exclusive badges |
| **No push** | In-app toast notifications only |
| **Removable** | Can be disabled without breaking any feature |

## Sources

- [[PlayerProfile]] — Aggregate root
- [[Achievements & Badges]] — Badge catalog + credit rewards
- [[Workspace Gamification]] — Team challenges, leaderboard, health score
- [[Content Generation]] — SessionCompleted event source
- [[Agent Chat]] — MessageAdded event source
- [[Workspace Sharing]] — MemberJoined event source
- [[Gamification UX]] — Psychological triggers, sidebar integration, notification cadence
