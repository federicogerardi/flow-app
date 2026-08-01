---
type: concept
tags:
  - wiki/concept
  - wiki/gamification
date_updated: 2026-08-01
source_count: 4
confidence: high
---

# Achievements & Badges

> Badge catalog, credit rewards, and seasonal exclusives — `packages/domain/src/gamification/`

## Definition

**Achievements** are badges awarded to a player when they meet a specific condition. Each badge is unlocked exactly once and remains permanently. Badges grant a one-time **credit bonus** added to the player's [[Usage & Quota|quota]].

## Achievement Entity

See [[Achievement]] for the full entity definition.

```typescript
// packages/domain/src/gamification/entities/Achievement.ts

class Achievement {
  constructor(
    readonly achievementId: AchievementId,
    readonly userId: UserId,
    readonly badgeKey: string,
    readonly awardedAt: DateTime,
  ) {}
}
```

## Badge Catalog

### Common — +10 credits

| Badge | Key | Condition | Icon |
|-------|-----|-----------|------|
| First Light | `first-session` | Complete your first session | ⭐ |
| Getting Started | `first-asset` | Create or promote your first asset | 🏗️ |

### Rare — +25 credits

| Badge | Key | Condition | Icon |
|-------|-----|-----------|------|
| Weekly Warrior | `streak-7` | Maintain a 7-day streak | 🔥 |
| Tool Explorer | `tools-5` | Use 5 different tools | 🧭 |
| AI Apprentice | `agent-10` | Exchange 10 messages with agents | 🤖 |
| Brand Ready | `assets-full` | All 5 asset types populated in a workspace | 🎯 |
| Team Player | `team-join` | Join a shared workspace as a member | 🤝 |

### Epic — +50 credits

| Badge | Key | Condition | Icon |
|-------|-----|-----------|------|
| Tool Master | `tools-all` | Use all 11 tools at least once | 👑 |
| AI Team Builder | `agents-all` | Chat with all 7 agents | 👥 |
| Unstoppable | `streak-30` | Maintain a 30-day streak | 💎 |
| Asset Machine | `promotions-25` | Promote 25 artifacts to assets | ⚙️ |
| Synergy | `team-same-day` | 2+ workspace members complete sessions same day | 🌟 |
| Workspace Champion | `leaderboard-1` | Top the workspace leaderboard at season end | 🏆 |

### Legendary — +100 credits

| Badge | Key | Condition | Icon |
|-------|-----|-----------|------|
| Power User | `sessions-100` | Complete 100 sessions | ⚡ |
| Century | `total-sessions-1000` | Complete 1000 sessions (all-time) | 💯 |
| Perfect Workspace | `health-100` | Workspace health score reaches 100 | 🥇 |

## Seasonal Badges

Each season offers 2-3 exclusive badges available only during that quarter:

| Season | Badge | Key | Condition |
|--------|-------|-----|-----------|
| Q1 Winter Sprint | Frostbite | `s1-frostbite` | Complete 50 sessions during Q1 |
| Q1 Winter Sprint | Snowball | `s1-snowball` | Maintain 14-day streak during Q1 |
| Q2 Spring Growth | Bloom | `s2-bloom` | Promote 20 artifacts during Q2 |
| Q2 Spring Growth | Pollinator | `s2-pollinator` | Chat with 5+ agents during Q2 |
| Q3 Summer Scale | Heatwave | `s3-heatwave` | Top 3 workspace leaderboard at Q3 end |
| Q4 Fall Mastery | Harvest | `s4-harvest` | Complete all 11 tools at least once during Q4 |

Seasonal badges are **permanently visible** on the player profile with the season tag (e.g., "❄️ Frostbite · Q1 2026").

## Achievement Evaluation

The `AchievementEvaluator` domain service checks conditions after every event:

```typescript
// packages/domain/src/gamification/domain-services/AchievementEvaluator.ts

class AchievementEvaluator {
  constructor(private badges: BadgeDefinition[]) {}

  evaluate(player: PlayerProfile, event: DomainEvent): Achievement[] {
    const unlocked: Achievement[] = [];

    for (const badge of this.badges) {
      // Skip already unlocked
      if (player.hasBadge(badge.key)) continue;

      // Check condition
      if (badge.condition(player, event)) {
        const achievement = Achievement.unlock(player.userId, badge.key);
        unlocked.push(achievement);
      }
    }

    return unlocked;
  }
}
```

## Credit Reward Flow

Credits are awarded via **domain events**, not direct cross-context calls:

```
Gamification Context                  Usage & Quota Context
───────────────────                   ─────────────────────
AchievementEvaluator.check()
  → player.unlockBadge(badgeKey)
  → AchievementUnlocked event ─────▶  CreditRewardHandler
      { userId, badgeKey,                  │
        badgeTier, creditReward }          ▼
                                      Quota.addCredits(userId, amount, 'achievement_reward')
```

`AchievementUnlocked` carries the credit reward amount in its payload:

```typescript
class AchievementUnlocked {
  constructor(
    readonly userId: UserId,
    readonly badgeKey: string,
    readonly badgeTier: BadgeTier,    // 'common' | 'rare' | 'epic' | 'legendary'
    readonly creditReward: number,     // 10 | 25 | 50 | 100
    readonly awardedAt: DateTime,
  ) {}
}
```

The `Usage & Quota` context listens for `AchievementUnlocked` and adds credits via `Quota.addCredits()`. Gamification never imports or calls Quota directly — the event bus mediates the interaction.

Credits are added as `CreditTransaction` with `reason = 'achievement_reward'` and `session_id = null`.

## Key Properties

| Property | Meaning |
|----------|---------|
| **Once per player** | Badges are unlocked once, never revoked |
| **Credit reward on unlock** | One-time credit bonus per badge, tiered by rarity |
| **Seasonal exclusives** | Some badges only available during specific quarters |
| **Permanent display** | All badges visible on player profile with unlock date |
| **Event-driven evaluation** | AchievementEvaluator checks after every relevant domain event |

## Sources

- [[Gamification]] — Parent bounded context
- [[PlayerProfile]] — Aggregate root tracking unlocked badges
- [[Achievement]] — Entity
- [[Workspace Gamification]] — Workspace-level achievements