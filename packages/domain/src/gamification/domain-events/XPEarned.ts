import type { DomainEvent } from '../../shared/domain-event';

export class XPEarned implements DomainEvent {
  readonly eventType = 'XPEarned';
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly amount: number,
    readonly newTotal: number,
    readonly source: string,
  ) {}
}
