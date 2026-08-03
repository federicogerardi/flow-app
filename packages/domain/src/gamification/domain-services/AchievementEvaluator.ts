import type { PlayerProfile } from '../entities/PlayerProfile';
import { Achievement } from '../entities/Achievement';
import type { BadgeDefinition, BadgeConditionContext, AllTimeStats } from '../badges/badge-definition';

/**
 * Pure function — evaluates all badges against a player profile and event context.
 * Returns newly unlocked achievements. The caller (worker) queries AllTimeStats
 * from the DB and passes them in — the evaluator itself has zero I/O.
 */
export class AchievementEvaluator {
  constructor(private badges: BadgeDefinition[]) {}

  evaluate(
    player: PlayerProfile,
    eventType: string,
    eventPayload: Record<string, unknown>,
    allTimeStats?: AllTimeStats,
  ): Achievement[] {
    const unlocked: Achievement[] = [];

    for (const badge of this.badges) {
      if (player.hasBadge(badge.key)) continue;

      const ctx: BadgeConditionContext = {
        player,
        eventType,
        eventPayload,
        allTimeStats,
      };

      if (badge.condition(ctx)) {
        const achievement = player.unlockBadge(badge.key, badge.tier);
        unlocked.push(achievement);
      }
    }

    return unlocked;
  }
}
