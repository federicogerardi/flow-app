import type { DomainEvent } from '../../shared/domain-event';

export class ChallengeCompleted implements DomainEvent {
  readonly eventType = 'ChallengeCompleted';
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: string,
    readonly challengeId: string,
    readonly workspaceId: string,
    readonly challengeKey: string,
  ) {}
}
