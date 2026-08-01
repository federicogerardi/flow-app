---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/gamification
  - wiki/architecture
date_updated: 2026-08-01
---

# Gamification — Architecture Proposal

> Synthesis of the gamification overlay design. Pure event-driven Supporting context, zero changes to existing domains.

## Summary

Gamification is an event-driven overlay on Flow App's operational layer. It listens to domain events from [[Content Generation]], [[Agent Chat]], and [[Workspace Sharing]], and produces XP, levels, streaks, achievements, and leaderboards. It is the most decoupled bounded context — it can be removed without breaking any core feature.

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| **XP is private** | Each user sees only their own XP. Leaderboard shows relative rank + progress bar, not absolute XP of others |
| **Credit rewards via badges** | Badges grant one-time credit bonuses (10/25/50/100 by tier). No streak credit multiplier (rejected) |
| **Seasonal badges** | Quarterly seasons with exclusive badges. Leaderboard resets each quarter |
| **Workspace has its own level** | Team-level prestige based on aggregated activity. Cosmetic only |
| **Notifications in-app only** | No push. Toast notifications for XP, level-up, badge unlock |

## What's New

### Domain (`packages/domain/src/gamification/`)

```
gamification/
├── entities/
│   ├── PlayerProfile.ts              # Aggregate Root (user-scoped)
│   ├── Achievement.ts                # Entity (owned by PlayerProfile)
│   └── WorkspaceChallenge.ts         # Aggregate Root (workspace-scoped)
├── read-models/
│   ├── Leaderboard.ts                # Read model (projection)
│   └── WorkspaceHealthScore.ts       # Read model (computed on-read)
├── value-objects/
│   ├── PlayerId.ts                   # = UserId
│   ├── XP.ts
│   ├── Level.ts                      # 1-7
│   ├── Streak.ts
│   ├── BadgeKey.ts
│   ├── AchievementId.ts
│   ├── ChallengeId.ts
│   ├── ChallengeStatus.ts
│   └── SeasonId.ts
├── domain-services/
│   ├── XPCalculator.ts               # Quantifies XP per event type
│   └── AchievementEvaluator.ts       # Checks badge conditions
├── domain-events/
│   ├── XPEarned.ts
│   ├── LevelUp.ts
│   ├── AchievementUnlocked.ts        # Carries creditReward for Quota context
│   ├── StreakUpdated.ts
│   └── ChallengeCompleted.ts
├── badges/
│   ├── badge-definition.ts
│   ├── badge-catalog.ts
│   └── seasonal-badges.ts
├── repositories/
│   ├── PlayerProfileRepository.ts
│   └── WorkspaceChallengeRepository.ts
└── index.ts
```

**Total**: ~25 new files. All in `packages/domain`. Zero new infrastructure dependencies.

### Database (`packages/infra-db`)

```sql
-- Migration 009: gamification
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

CREATE TABLE xp_transactions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users(id),
    amount       INTEGER      NOT NULL,
    source       VARCHAR(50)  NOT NULL,    -- 'session_completed', 'artifact_promoted', 'achievement_reward'
    source_id    VARCHAR(120),             -- eventId for deduplication
    workspace_id UUID,                     -- for workspace-level aggregation
    season_id    VARCHAR(10)  NOT NULL,    -- '2026-Q3' (enables query-based seasonal XP)
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xp_user_season ON xp_transactions(user_id, season_id);
CREATE INDEX idx_xp_workspace_season ON xp_transactions(workspace_id, season_id);

CREATE TABLE gamification_processed_events (
    event_id     VARCHAR(120) PRIMARY KEY,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL       -- cleanup after 90 days
);

CREATE INDEX idx_processed_expires ON gamification_processed_events(expires_at);

CREATE TABLE achievements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id),
    badge_key   VARCHAR(50)  NOT NULL,
    awarded_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, badge_key)
);

CREATE TABLE workspace_leaderboard (
    user_id      UUID  NOT NULL REFERENCES users(id),
    workspace_id UUID  NOT NULL REFERENCES workspaces(id),
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

### API (`apps/backend`)

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/me/profile` | ✅ |
| `GET` | `/api/workspaces/:id/leaderboard` | member |
| `GET` | `/api/workspaces/:id/health` | member |
| `GET` | `/api/workspaces/:id/challenges` | member |
| `GET` | `/api/workspaces/:id/level` | member |

## Event-Driven Flow

```
Domain Events (existing contexts)       Gamification Handlers           Quota Context
─────────────────────────────────       ────────────────────           ─────────────
SessionCompleted ──────────────────▶    onSessionCompleted()
  → XPCalculator → PlayerProfile.addXP(50)
  → PlayerProfile.recordActivity(today)
  → AchievementEvaluator.check(player, event)
  → LeaderboardProjector.increment()    (read model projection)
  → WorkspaceChallenge.contribute(1)    (aggregate)

ArtifactPromoted ──────────────────▶    onArtifactPromoted()
  → XPCalculator → PlayerProfile.addXP(100)
  → AchievementEvaluator.check(player, event)
  → WorkspaceChallenge.contribute(1)

MemberJoined ──────────────────────▶    onMemberJoined()
  → PlayerProfile.addXP(75) — inviter

MessageAdded (agent) ──────────────▶    onAgentMessage()
  → PlayerProfile.addXP(10)
  → WorkspaceChallenge.contribute(1)

                                        AchievementUnlocked ──────────▶  CreditRewardHandler
                                        (event carries creditReward)        │
                                                                            ▼
                                                                        Quota.addCredits()
```

## Impact on Other Contexts

| Context | Impact | Mechanism |
|---------|--------|-----------|
| [[Content Generation]] | None | Events already emitted |
| [[Agent Chat]] | None | Events already emitted |
| [[Workspace Sharing]] | None | Events already emitted |
| [[Usage & Quota]] | Minor | Listens for `AchievementUnlocked` event → adds credits. No direct call from Gamification |
| [[Identity & Access]] | None | Shared UserId |

## Key Properties

| Property | Meaning |
|----------|---------|
| **Event-mediated cross-context** | Only outbound: `AchievementUnlocked` consumed by Quota via event bus. No direct method calls |
| **Read models for derived data** | Leaderboard and Health Score are read models, not aggregates |
| **Two aggregates** | PlayerProfile (user-scoped) + WorkspaceChallenge (workspace-scoped) |
| **Removable** | Can be disabled without breaking any core feature |
| **No new infrastructure** | Existing PostgreSQL + SSE infrastructure |
| **Positive-only** | No penalties, no XP deductions, no badge revocations |

## DDD Governance Risks (2026-08-02 assessment)

Phase 11 is the highest DDD drift risk in the roadmap. Pre-commit verification against the 6 CLAUDE.md Domain Design Rules is recommended for every file under `packages/domain/src/gamification/`.

### High-Probability Risks

| Risk | Rule | Mitigation |
|------|------|------------|
| 9 new VOs as `type` aliases (e.g. `type ChallengeStatus = 'active' \| 'completed'`) | Rule 4 | All VOs must be classes with `private constructor`, `static from()`, `equals()` |
| Event handler mutates DB directly (`xp += 50` in worker) instead of calling `playerProfile.addXP()` | Rule 1 | All gamification mutations flow through aggregate methods |
| `PlayerProfileRepository.save()` has side-effects (leaderboard, notifications) | Rule 5 | `save()` persists only aggregate + owned entities; projections are separate |

### Medium-Probability Risks

| Risk | Rule | Mitigation |
|------|------|------------|
| `XPCalculator` / `AchievementEvaluator` throw bare `Error` | Rule 3 | Game logic errors extend `DomainError` |
| Factory naming: `PlayerProfile.init()`, `Achievement.unlock()` | Rule 6 | Aggregate roots use `create()`; child entities use role-specific factories |
| `AchievementEvaluator` accesses `(session as any)._status` for cross-context checks | Rule 1 | Cross-context access via public API only |
| Event types as bare strings: `'SessionCompleted'` instead of importing from source context | — | Reference event types from origin bounded context |

### Guardrail

Checklist per ogni nuovo file `packages/domain/src/gamification/`:
- [ ] Rule 1: No `as any` su campi privati (propri o di altri aggregate)
- [ ] Rule 2: Zero import da `zod`, `yup`, o librerie di validazione
- [ ] Rule 3: Ogni errore estende `DomainError` con `code` + `retryable`
- [ ] Rule 4: Ogni VO con dominio finito è una classe, non un type alias
- [ ] Rule 5: `save()` tocca solo le tabelle dell'aggregate + owned entities
- [ ] Rule 6: `static create()` per aggregate root, `static reconstitute()` per hydration

## Sources

- [[Gamification]] — Feature overview
- [[Achievements & Badges]] — Badge catalog + credit rewards
- [[Workspace Gamification]] — Team-level features
- [[PlayerProfile]] — Aggregate root
- [[Achievement]] — Entity
- [[Content Generation]] — SessionCompleted event source
- [[Agent Chat]] — MessageAdded event source
- [[Workspace Sharing]] — MemberJoined event source