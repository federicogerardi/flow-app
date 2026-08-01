import type { DomainEvent } from '../../shared/domain-event';

export class StepCompleted implements DomainEvent {
  readonly eventType = 'StepCompleted';
  readonly occurredAt = new Date();

  constructor(
    readonly aggregateId: string,
    readonly sessionId: string,
    readonly stepNumber: number,
    readonly stepLabel: string,
    readonly progress: { current: number; total: number },
  ) {}
}
