---
type: concept
tags:
  - wiki/concept
  - wiki/gamification
  - wiki/workspace
date_updated: 2026-08-01
source_count: 6
confidence: high
---

# Workspace Gamification

> Team-level gamification: workspace level, health score, leaderboard, weekly challenges  
> **Read models** (Leaderboard, Health Score) vs **Aggregate** (WorkspaceChallenge)

## Definition

**Workspace Gamification** extends the [[Gamification]] overlay to the [[Workspace]] level. It distinguishes between:

| Category | Concept | Nature | Persistence |
|----------|---------|--------|-------------|
| **Aggregate** | `WorkspaceChallenge` | Domain entity with lifecycle, invariants, identity | `workspace_challenges` table |
| **Read model** | `Leaderboard` | Projection derived from player XP data | `workspace_leaderboard` table (projection) |
| **Read model** | `Workspace Health Score` | Computed on-read from multiple sources | No dedicated table (pure computation) |

## Aggregate: WorkspaceChallenge

A `WorkspaceChallenge` is a team goal scoped to one workspace and one week. It has identity, lifecycle, and invariants.

```typescript
// packages/domain/src/gamification/entities/WorkspaceChallenge.ts

class WorkspaceChallenge {
  private constructor(
    readonly challengeId: ChallengeId,
    readonly workspaceId: WorkspaceId,
    readonly challengeKey: string,
    private _progress: number,
    readonly target: number,
    private _status: ChallengeStatus,    // 'active' | 'completed'
    readonly weekStart: Date,
    readonly createdAt: DateTime,
    private _completedAt: DateTime | null,
  ) {}

  static start(workspaceId, challengeKey, target, weekStart): WorkspaceChallenge {
    return new WorkspaceChallenge(
      ChallengeId.generate(), workspaceId, challengeKey,
      0, target, ChallengeStatus.Active, weekStart, DateTime.now(), null,
    );
  }

  /** Record progress from a member's action. Returns event if challenge completed. */
  contribute(amount: number = 1): ChallengeCompleted | null {
    if (this._status !== ChallengeStatus.Active) return null;
    this._progress = Math.min(this._progress + amount, this.target);

    if (this._progress >= this.target) {
      this._status = ChallengeStatus.Completed;
      this._completedAt = DateTime.now();
      return new ChallengeCompleted(this.challengeId, this.workspaceId, this.challengeKey);
    }
    return null;
  }

  get progress(): number { return this._progress; }
  get status(): ChallengeStatus { return this._status; }
  get isComplete(): boolean { return this._status === ChallengeStatus.Completed; }
}
```

### Challenge Catalog

| Challenge | Key | Metric | Target | XP Reward | Badge |
|-----------|-----|--------|--------|-----------|-------|
| Content Sprint | `content-sprint` | sessions | 5 | 200 XP | Sprint Master |
| Asset Builder | `asset-builder` | promotions | 3 | 150 XP | — |
| AI Dialogue | `ai-dialogue` | agent_messages | 20 | 200 XP | AI Team Sync |
| Full Coverage | `full-coverage` | assets (all types) | 5 | 300 XP | Full House |
| Power Week | `power-week` | sessions | 10 | 400 XP | Marathon |

### Challenge Completion — XP Distribution

When `contribute()` triggers `ChallengeCompleted`, a handler distributes XP to all contributors:

```typescript
async onChallengeCompleted(event: ChallengeCompleted): Promise<void> {
  const challenge = await this.challengeRepo.findById(event.challengeId);
  const contributors = await this.challengeRepo.findContributors(event.challengeId);

  // Award challenge XP to each contributor
  for (const contributor of contributors) {
    const player = await this.playerRepo.findOrCreate(contributor.userId);
    player.addXP(challenge.reward.xp);
    await this.playerRepo.save(player);
    eventBus.publish(new XPEarned(contributor.userId, challenge.reward.xp, 'challenge_reward'));
  }

  // Award badge if defined
  if (challenge.reward.badge) {
    for (const contributor of contributors) {
      const player = await this.playerRepo.findOrCreate(contributor.userId);
      if (!player.hasBadge(challenge.reward.badge)) {
        player.unlockBadge(challenge.reward.badge);
        await this.playerRepo.save(player);
        eventBus.publish(new AchievementUnlocked(
          contributor.userId, challenge.reward.badge, 'rare', 25, DateTime.now()
        ));
      }
    }
  }
}
```

```sql
-- Tracks who contributed to each challenge
CREATE TABLE challenge_contributions (
    challenge_id UUID    NOT NULL REFERENCES workspace_challenges(id),
    user_id      UUID    NOT NULL REFERENCES users(id),
    amount       INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (challenge_id, user_id)
);
```

## Workspace Level

The workspace itself has a level, progressing through team activity:

```
Workspace XP sources (aggregated from all members):
├── Session completed by any member:       +50 XP
├── Artifact promoted by any member:       +100 XP
├── Asset created by any member:           +30 XP
├── Agent message exchanged by any member: +10 XP
└── New member joined:                     +75 XP

Workspace Levels:
├── L1 — Startup         0 XP
├── L2 — Growing       500 XP
├── L3 — Established  2000 XP
├── L4 — Thriving     5000 XP
└── L5 — Powerhouse  10000 XP
```

Workspace level is **cosmetic prestige** — it appears in the workspace header and sidebar. It does not affect credits, XP multipliers, or tool behavior. It signals to members and visitors that this workspace is active and mature.

## Workspace Health Score

A composite 0-100 metric recalculated after every relevant event:

```typescript
WorkspaceHealth = 
  (AssetCoverage × 0.30) +
  (SessionSuccessRate × 0.25) +
  (PromotionRate × 0.20) +
  (TeamActivity × 0.15) +
  (AgentEngagement × 0.10)
```

| Component | Formula | Weight |
|-----------|---------|--------|
| **Asset Coverage** | `(filledAssetTypes / 5) × 100` | 30% |
| **Session Success Rate** | `(completed / (completed + failed)) × 100` (last 30 days) | 25% |
| **Promotion Rate** | `(promoted / completed) × 100` (last 30 days) | 20% |
| **Team Activity** | `min(activeMembersThisWeek / 3, 1.0) × 100` | 15% |
| **Agent Engagement** | `min(totalConversations / 10, 1.0) × 100` | 10% |

| Score Range | Color | Label |
|-------------|-------|-------|
| 70-100 | 🟢 Green | Healthy |
| 40-69 | 🟡 Yellow | Needs Attention |
| 0-39 | 🔴 Red | At Risk |

Displayed as a bar in the Workspace Dashboard and the sidebar:

```
│  Q3 Campaign             │
│  🟢 Health 76/100 · L3    │
│  ──────────────────────── │
```

## Read Model: Workspace Leaderboard

The leaderboard is a **read model** — a projection computed from the `workspace_leaderboard` table, not a domain aggregate. It has no identity, no lifecycle, and no invariants. Its sole purpose is to display ranked data.

Because **XP is private**, the leaderboard shows relative position without revealing absolute XP of others:

```
┌─ 🏆 Q3 Campaign — Classifica Stagionale ──────────────────────┐
│                                                                │
│  #1  👤 Anna V.      ████████████████████  (+2 ↑)             │
│  #2  👤 Tu           ████████████████      (+1 ↑)             │
│  #3  👤 Marco R.     ████████████          (-)                │
│  #4  👤 Lucia B.     ████████              (-1 ↓)             │
│                                                                │
│  Stagione: Summer Scale · Reset: 01/10/2026                   │
└────────────────────────────────────────────────────────────────┘
```

- Rank number visible to all members
- Progress bar proportional to XP relative to #1 (100% bar for #1)
- Movement indicator (`↑`, `↓`, `-`) since last update
- Season name + reset date in footer
- Updated asynchronously by `LeaderboardProjector` in the application layer — not by a domain aggregate

```typescript
// packages/domain/src/gamification/read-models/Leaderboard.ts

class Leaderboard {
  constructor(readonly entries: LeaderboardEntry[], readonly seasonId: SeasonId) {}

  static async forWorkspace(
    workspaceId: WorkspaceId,
    seasonId: SeasonId,
    repo: LeaderboardReadRepository,
  ): Promise<Leaderboard> {
    const rows = await repo.findByWorkspaceAndSeason(workspaceId, seasonId);
    rows.sort((a, b) => b.xp - a.xp);
    const maxXp = rows[0]?.xp ?? 1;
    return new Leaderboard(
      rows.map((row, i) => ({
        rank: i + 1,
        userId: row.userId,
        xpPercent: Math.round((row.xp / maxXp) * 100),
      })),
      seasonId,
    );
  }
}
```

## Read Model: Workspace Health Score

The health score is **computed on-read** from existing data across multiple repositories. It has no dedicated table and no aggregate:

```typescript
class WorkspaceHealthScore {
  static async compute(
    workspaceId: WorkspaceId,
    assetRepo: WorkspaceRepository,
    sessionRepo: SessionRepository,
    conversationRepo: ConversationRepository,
  ): Promise<WorkspaceHealthScore> {
    const assets = await assetRepo.countByWorkspace(workspaceId);
    const sessions = await sessionRepo.stats(workspaceId, 30);
    const members = await workspaceRepo.countActiveMembers(workspaceId);
    const conversations = await conversationRepo.countByWorkspace(workspaceId, 30);

    const score =
      (Math.min(assets / 5, 1) * 100) * 0.30 +
      (sessions.completed / (sessions.completed + sessions.failed || 1)) * 100 * 0.25 +
      (sessions.promoted / (sessions.completed || 1)) * 100 * 0.20 +
      Math.min(members / 3, 1) * 100 * 0.15 +
      Math.min(conversations / 10, 1) * 100 * 0.10;

    return new WorkspaceHealthScore(Math.round(score));
  }
}
```

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/workspaces/:id/leaderboard` | member | Read model: season leaderboard (projection) |
| `GET` | `/api/workspaces/:id/health` | member | Read model: health score (computed on-read) |
| `GET` | `/api/workspaces/:id/challenges` | member | Aggregate: active + past challenges |
| `GET` | `/api/workspaces/:id/level` | member | Derived: workspace level + XP progress |

## Key Properties

| Property | Meaning |
|----------|---------|
| **Workspace level = cosmetic** | Level affects only display, never mechanics |
| **Health score = read model** | Computed on-read from existing data. No dedicated aggregate or table |
| **Leaderboard = read model** | Projection table updated by event handler. Relative rank only, no absolute XP |
| **WorkspaceChallenge = aggregate** | Team goal with identity, lifecycle, invariants. One per workspace per week |
| **Seasonal reset** | Leaderboard projection resets each quarter. All-time XP preserved in PlayerProfile |

## Sources

- [[Gamification]] — Parent bounded context
- [[PlayerProfile]] — Individual XP that feeds leaderboard projection
- [[Achievements & Badges]] — Challenge completion badges
- [[Workspace Sharing]] — Multi-member workspaces enable team gamification
- [[UX Wireframes]] — Workspace Dashboard where health + challenges display
- [[Agent Chat]] — Agent messages count toward health score