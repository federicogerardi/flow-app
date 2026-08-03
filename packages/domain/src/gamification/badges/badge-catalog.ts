import type { BadgeDefinition } from './badge-definition';
import { BadgeKey } from '../value-objects/BadgeKey';
import { BadgeTier } from '../value-objects/BadgeTier';
import { SeasonId } from '../value-objects/SeasonId';

// Seasonal badge keys (not in BadgeKey constants — seasonal-only)
const S1Frostbite = BadgeKey.from('s1-frostbite');
const S1Snowball = BadgeKey.from('s1-snowball');
const S2Bloom = BadgeKey.from('s2-bloom');
const S2Pollinator = BadgeKey.from('s2-pollinator');
const S3Heatwave = BadgeKey.from('s3-heatwave');
const S4Harvest = BadgeKey.from('s4-harvest');

export const ALL_BADGES: BadgeDefinition[] = [
  // ── Common (+10 credits) ──
  {
    key: BadgeKey.FirstSession,
    name: 'First Light',
    description: 'Complete your first session',
    tier: BadgeTier.Common,
    icon: '⭐',
    condition: (ctx) => ctx.eventType === 'SessionCompleted',
  },
  {
    key: BadgeKey.FirstAsset,
    name: 'Getting Started',
    description: 'Create or promote your first asset',
    tier: BadgeTier.Common,
    icon: '🏗️',
    condition: (ctx) =>
      ctx.eventType === 'SessionCompleted' ||
      (ctx.allTimeStats !== undefined && ctx.allTimeStats.totalPromotions >= 1),
  },

  // ── Rare (+25 credits) ──
  {
    key: BadgeKey.Streak7,
    name: 'Weekly Warrior',
    description: 'Maintain a 7-day streak',
    tier: BadgeTier.Rare,
    icon: '🔥',
    condition: (ctx) => ctx.player.currentStreak >= 7,
  },
  {
    key: BadgeKey.Tools5,
    name: 'Tool Explorer',
    description: 'Use 5 different tools',
    tier: BadgeTier.Rare,
    icon: '🧭',
    condition: (ctx) =>
      (ctx.allTimeStats?.distinctToolsUsed ?? 0) >= 5,
  },
  {
    key: BadgeKey.Agent10,
    name: 'AI Apprentice',
    description: 'Exchange 10 messages with agents',
    tier: BadgeTier.Rare,
    icon: '🤖',
    condition: (ctx) =>
      (ctx.allTimeStats?.totalAgentMessages ?? 0) >= 10,
  },
  {
    key: BadgeKey.AssetsFull,
    name: 'Brand Ready',
    description: 'All 5 asset types populated in a workspace',
    tier: BadgeTier.Rare,
    icon: '🎯',
    condition: (ctx) => {
      const assetTypes = ctx.eventPayload.assetTypes as string[] | undefined;
      return (assetTypes?.length ?? 0) >= 5;
    },
  },
  {
    key: BadgeKey.TeamJoin,
    name: 'Team Player',
    description: 'Join a shared workspace as a member',
    tier: BadgeTier.Rare,
    icon: '🤝',
    condition: (ctx) =>
      (ctx.allTimeStats?.workspacesJoined ?? 0) >= 1,
  },

  // ── Epic (+50 credits) ──
  {
    key: BadgeKey.ToolsAll,
    name: 'Tool Master',
    description: 'Use all 11 tools at least once',
    tier: BadgeTier.Epic,
    icon: '👑',
    condition: (ctx) =>
      (ctx.allTimeStats?.distinctToolsUsed ?? 0) >= 11,
  },
  {
    key: BadgeKey.AgentsAll,
    name: 'AI Team Builder',
    description: 'Chat with all 7 agents',
    tier: BadgeTier.Epic,
    icon: '👥',
    condition: (ctx) =>
      (ctx.allTimeStats?.distinctAgentsUsed ?? 0) >= 7,
  },
  {
    key: BadgeKey.Streak30,
    name: 'Unstoppable',
    description: 'Maintain a 30-day streak',
    tier: BadgeTier.Epic,
    icon: '💎',
    condition: (ctx) => ctx.player.currentStreak >= 30,
  },
  {
    key: BadgeKey.Promotions25,
    name: 'Asset Machine',
    description: 'Promote 25 artifacts to assets',
    tier: BadgeTier.Epic,
    icon: '⚙️',
    condition: (ctx) =>
      (ctx.allTimeStats?.totalPromotions ?? 0) >= 25,
  },
  {
    key: BadgeKey.TeamSameDay,
    name: 'Synergy',
    description: '2+ workspace members complete sessions same day',
    tier: BadgeTier.Epic,
    icon: '🌟',
    condition: (ctx) => {
      const sameDayCount = ctx.eventPayload.sameDayCount as number | undefined;
      return (sameDayCount ?? 0) >= 2;
    },
  },
  {
    key: BadgeKey.Leaderboard1,
    name: 'Workspace Champion',
    description: 'Top the workspace leaderboard at season end',
    tier: BadgeTier.Epic,
    icon: '🏆',
    condition: (ctx) => {
      const rank = ctx.eventPayload.rank as number | undefined;
      return rank === 1;
    },
  },

  // ── Legendary (+100 credits) ──
  {
    key: BadgeKey.Sessions100,
    name: 'Power User',
    description: 'Complete 100 sessions',
    tier: BadgeTier.Legendary,
    icon: '⚡',
    condition: (ctx) =>
      (ctx.allTimeStats?.totalSessions ?? 0) >= 100,
  },
  {
    key: BadgeKey.TotalSessions1000,
    name: 'Century',
    description: 'Complete 1000 sessions (all-time)',
    tier: BadgeTier.Legendary,
    icon: '💯',
    condition: (ctx) =>
      (ctx.allTimeStats?.totalSessions ?? 0) >= 1000,
  },
  {
    key: BadgeKey.Health100,
    name: 'Perfect Workspace',
    description: 'Workspace health score reaches 100',
    tier: BadgeTier.Legendary,
    icon: '🥇',
    condition: (ctx) => {
      const healthScore = ctx.eventPayload.healthScore as number | undefined;
      return (healthScore ?? 0) >= 100;
    },
  },

  // ── Seasonal badges (available only during their quarter) ──
  {
    key: S1Frostbite,
    name: 'Frostbite',
    description: 'Complete 50 sessions during Q1',
    tier: BadgeTier.Epic,
    icon: '❄️',
    seasonal: SeasonId.from('2025-Q1'),  // Q1 of any year
    condition: (ctx) =>
      ctx.eventType === 'SessionCompleted' &&
      (ctx.allTimeStats?.totalSessions ?? 0) >= 50,
  },
  {
    key: S1Snowball,
    name: 'Snowball',
    description: 'Maintain 14-day streak during Q1',
    tier: BadgeTier.Rare,
    icon: '☃️',
    seasonal: SeasonId.from('2025-Q1'),
    condition: (ctx) => ctx.player.currentStreak >= 14,
  },
  {
    key: S2Bloom,
    name: 'Bloom',
    description: 'Promote 20 artifacts during Q2',
    tier: BadgeTier.Epic,
    icon: '🌸',
    seasonal: SeasonId.from('2025-Q2'),
    condition: (ctx) =>
      (ctx.allTimeStats?.totalPromotions ?? 0) >= 20,
  },
  {
    key: S2Pollinator,
    name: 'Pollinator',
    description: 'Chat with 5+ agents during Q2',
    tier: BadgeTier.Rare,
    icon: '🐝',
    seasonal: SeasonId.from('2025-Q2'),
    condition: (ctx) =>
      (ctx.allTimeStats?.distinctAgentsUsed ?? 0) >= 5,
  },
  {
    key: S3Heatwave,
    name: 'Heatwave',
    description: 'Top 3 workspace leaderboard at Q3 end',
    tier: BadgeTier.Epic,
    icon: '🌡️',
    seasonal: SeasonId.from('2025-Q3'),
    condition: (ctx) => {
      const rank = ctx.eventPayload.rank as number | undefined;
      return rank !== undefined && rank <= 3;
    },
  },
  {
    key: S4Harvest,
    name: 'Harvest',
    description: 'Complete all 11 tools at least once during Q4',
    tier: BadgeTier.Legendary,
    icon: '🌾',
    seasonal: SeasonId.from('2025-Q4'),
    condition: (ctx) =>
      (ctx.allTimeStats?.distinctToolsUsed ?? 0) >= 11,
  },
];
