import { ChallengeKey } from '../value-objects/ChallengeKey';

export interface ChallengeDefinition {
  key: ChallengeKey;
  name: string;
  metric: string;
  description: string;
  target: number;
  xpReward: number;
  badgeKey?: string;
}

export const ALL_CHALLENGES: ChallengeDefinition[] = [
  {
    key: ChallengeKey.ContentSprint,
    name: 'Content Sprint',
    metric: 'sessions',
    description: 'Complete 5 sessions this week',
    target: 5,
    xpReward: 200,
    badgeKey: 'sprint-master',
  },
  {
    key: ChallengeKey.AssetBuilder,
    name: 'Asset Builder',
    metric: 'promotions',
    description: 'Promote 3 artifacts to assets this week',
    target: 3,
    xpReward: 150,
  },
  {
    key: ChallengeKey.AiDialogue,
    name: 'AI Dialogue',
    metric: 'agent_messages',
    description: 'Exchange 20 agent messages this week',
    target: 20,
    xpReward: 200,
    badgeKey: 'ai-team-sync',
  },
  {
    key: ChallengeKey.FullCoverage,
    name: 'Full Coverage',
    metric: 'assets',
    description: 'Create 5 assets of any type this week',
    target: 5,
    xpReward: 300,
    badgeKey: 'full-house',
  },
  {
    key: ChallengeKey.PowerWeek,
    name: 'Power Week',
    metric: 'sessions',
    description: 'Complete 10 sessions this week',
    target: 10,
    xpReward: 400,
    badgeKey: 'marathon',
  },
];
