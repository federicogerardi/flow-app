import type { PlayerProfile } from '../entities/PlayerProfile';
import type { BadgeKey } from '../value-objects/BadgeKey';
import type { BadgeTier } from '../value-objects/BadgeTier';
import type { SeasonId } from '../value-objects/SeasonId';

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
  allTimeStats?: AllTimeStats;
}

export interface BadgeDefinition {
  key: BadgeKey;
  name: string;
  description: string;
  tier: BadgeTier;
  icon: string;
  condition: (ctx: BadgeConditionContext) => boolean;
  seasonal?: SeasonId;
}
