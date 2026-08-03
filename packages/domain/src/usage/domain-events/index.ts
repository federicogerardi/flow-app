import type { DomainEvent } from '../../shared/domain-event';

export interface CreditConsumedEvent extends DomainEvent {
  eventType: 'CreditConsumed';
  aggregateId: string;
  userId: string;
  amount: number;
  sessionId: string;
  remainingCredits: number;
}

export interface QuotaExceededEvent extends DomainEvent {
  eventType: 'QuotaExceeded';
  aggregateId: string;
  userId: string;
  limit: number;
  attempted: number;
}

export interface ArtifactGateExceededEvent extends DomainEvent {
  eventType: 'ArtifactGateExceeded';
  aggregateId: string;
  userId: string;
  artifactLimit: number;
  artifactCount: number;
}
