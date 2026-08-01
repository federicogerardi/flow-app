import type { DomainEvent } from '../../shared/domain-event';

export class SessionCompleted implements DomainEvent {
  readonly eventType = 'SessionCompleted';
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: string,
    readonly sessionId: string,
    readonly workspaceId: string,
    readonly userId: string,
    readonly toolKey: string,
    readonly finalArtifactId: string,
  ) {}
}
