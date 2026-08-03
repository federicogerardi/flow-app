import type { DomainEvent } from '../../shared/domain-event';

export class StreakUpdated implements DomainEvent {
  readonly eventType = 'StreakUpdated';
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly currentStreak: number,
    readonly longestStreak: number,
  ) {}
}
