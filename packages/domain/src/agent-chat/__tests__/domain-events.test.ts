import { describe, it, expect } from 'vitest';
import { Conversation } from '../entities/Conversation';
import { Message } from '../entities/Message';
import { AgentKey } from '../value-objects/AgentKey';
import type { DomainEvent } from '../../shared/domain-event';

describe('Conversation domain events', () => {
  const workspaceId = 'ws-1';
  const userId = 'user-1';

  function createConversation(): Conversation {
    return Conversation.create(workspaceId, userId, AgentKey.Strategist);
  }

  function isValidDomainEvent(event: DomainEvent): boolean {
    return (
      typeof event.eventType === 'string' &&
      event.occurredAt instanceof Date &&
      typeof event.aggregateId === 'string'
    );
  }

  describe('addMessage', () => {
    it('should return MessageAdded event conforming to DomainEvent', () => {
      const conversation = createConversation();
      const message = Message.user(conversation.conversationId, 'Hello');
      const event = conversation.addMessage(message);

      expect(isValidDomainEvent(event)).toBe(true);
      expect(event.eventType).toBe('MessageAdded');
      expect(event.aggregateId).toBe(conversation.conversationId);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });
  });

  describe('archive', () => {
    it('should return ConversationArchived event conforming to DomainEvent', () => {
      const conversation = createConversation();
      const event = conversation.archive();

      expect(isValidDomainEvent(event)).toBe(true);
      expect(event.eventType).toBe('ConversationArchived');
      expect(event.aggregateId).toBe(conversation.conversationId);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });
  });
});
