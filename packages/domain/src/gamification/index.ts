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
export type { BadgeTierValue } from './value-objects/BadgeTier';
export { ChallengeStatus } from './value-objects/ChallengeStatus';
export type { ChallengeStatusValue } from './value-objects/ChallengeStatus';
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
export type { BadgeDefinition, BadgeConditionContext, AllTimeStats } from './badges/badge-definition';
export { ALL_BADGES } from './badges/badge-catalog';
export { ALL_CHALLENGES } from './badges/challenge-catalog';
export type { ChallengeDefinition } from './badges/challenge-catalog';

// Repositories
export type { PlayerProfileRepository } from './repositories/PlayerProfileRepository';
export type { WorkspaceChallengeRepository } from './repositories/WorkspaceChallengeRepository';

// Errors
export {
  MaxLevelReachedError,
  BadgeAlreadyUnlockedError,
  InvalidXPValueError,
  ChallengeAlreadyActiveError,
  ChallengeNotActiveError,
  InvalidSeasonError,
  InvalidBadgeTierError,
  InvalidChallengeKeyError,
} from './errors';
