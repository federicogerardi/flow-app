import type { DomainEvent } from '../../shared/domain-event';

export interface ConversationStartedEvent extends DomainEvent {
  eventType: 'ConversationStarted';
  aggregateId: string;
  occurredAt: Date;
}

export interface MessageAddedEvent extends DomainEvent {
  eventType: 'MessageAdded';
  aggregateId: string;
  occurredAt: Date;
}

export interface ConversationArchivedEvent extends DomainEvent {
  eventType: 'ConversationArchived';
  aggregateId: string;
  occurredAt: Date;
}
