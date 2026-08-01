import type { DomainEvent } from '../../shared/domain-event';

export class SessionCancelled implements DomainEvent {
  readonly eventType = 'SessionCancelled';
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: string,
    readonly sessionId: string,
  ) {}
}
