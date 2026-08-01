import type { DomainEvent } from '../../shared/domain-event';

export class SessionStarted implements DomainEvent {
  readonly eventType = 'SessionStarted';
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: string,
    readonly sessionId: string,
    readonly toolKey: string,
  ) {}
}
