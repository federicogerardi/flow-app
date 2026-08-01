import type { DomainEvent } from '../../shared/domain-event';

export interface MemberInvitedEvent extends DomainEvent {
  eventType: 'MemberInvited';
  aggregateId: string;
  occurredAt: Date;
}

export interface MemberJoinedEvent extends DomainEvent {
  eventType: 'MemberJoined';
  aggregateId: string;
  occurredAt: Date;
}

export interface MemberRemovedEvent extends DomainEvent {
  eventType: 'MemberRemoved';
  aggregateId: string;
  occurredAt: Date;
}

export interface OwnershipTransferredEvent extends DomainEvent {
  eventType: 'OwnershipTransferred';
  aggregateId: string;
  occurredAt: Date;
}
