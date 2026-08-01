import type { DomainEvent } from '../../shared/domain-event';

export class SessionFailed implements DomainEvent {
  readonly eventType = 'SessionFailed';
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: string,
    readonly sessionId: string,
    readonly failedAtStep: number,
    readonly errorCode: string,
    readonly errorMessage: string,
  ) {}
}
