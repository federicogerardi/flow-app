import type { DomainEvent } from '../../shared/domain-event';

export class LevelUp implements DomainEvent {
  readonly eventType = 'LevelUp';
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly oldLevel: number,
    readonly newLevel: number,
  ) {}
}
