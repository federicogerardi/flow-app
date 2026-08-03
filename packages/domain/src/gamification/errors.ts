import { DomainError } from '../shared/domain-error';

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

export class ChallengeAlreadyActiveError extends DomainError {
  readonly code = 'CHALLENGE_ALREADY_ACTIVE';
  readonly retryable = false;
  constructor(challengeId: string) {
    super(`Challenge ${challengeId} is already active`);
  }
}

export class ChallengeNotActiveError extends DomainError {
  readonly code = 'CHALLENGE_NOT_ACTIVE';
  readonly retryable = false;
  constructor(challengeId: string) {
    super(`Challenge ${challengeId} is not active`);
  }
}

export class InvalidSeasonError extends DomainError {
  readonly code = 'INVALID_SEASON';
  readonly retryable = false;
  constructor(seasonId: string) {
    super(`Invalid season identifier: ${seasonId}`);
  }
}

export class InvalidBadgeTierError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid badge tier: "${value}"`);
  }
}

export class InvalidChallengeKeyError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid challenge key: "${value}"`);
  }
}
