import type { DomainEvent } from '../../shared/domain-event';

export class AchievementUnlocked implements DomainEvent {
  readonly eventType = 'AchievementUnlocked';
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly badgeKey: string,
    readonly badgeTier: string,
    readonly creditReward: number,
    readonly awardedAt: Date,
  ) {}
}
