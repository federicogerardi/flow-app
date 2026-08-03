import { describe, it, expect } from 'vitest';
import {
  Conversation,
  ConversationArchivedError,
  ConversationAlreadyArchivedError,
} from '../entities/Conversation';
import { Message } from '../entities/Message';
import { AgentKey } from '../value-objects/AgentKey';
import { ConversationStatus } from '../value-objects/ConversationStatus';

describe('Conversation', () => {
  const workspaceId = 'ws-1';
  const userId = 'user-1';

  function createConversation(): Conversation {
    return Conversation.create(workspaceId, userId, AgentKey.Strategist);
  }

  describe('create', () => {
    it('should return an active conversation with no title', () => {
      const conversation = createConversation();

      expect(conversation.status.equals(ConversationStatus.Active)).toBe(true);
      expect(conversation.title).toBeNull();
      expect(conversation.messages).toHaveLength(0);
    });
  });

  describe('addMessage', () => {
    it('should append a message', () => {
      const conversation = createConversation();
      const message = Message.user(conversation.conversationId, 'Hello');
      conversation.addMessage(message);

      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0]).toBe(message);
    });

    it('should auto-title from first user message (80 chars + ...)', () => {
      const conversation = createConversation();
      const longContent = 'A'.repeat(100);
      const message = Message.user(conversation.conversationId, longContent);
      conversation.addMessage(message);

      expect(conversation.title).toBe('A'.repeat(80) + '...');
    });

    it('should not truncate title if content is 80 chars or less', () => {
      const conversation = createConversation();
      const shortContent = 'A'.repeat(80);
      const message = Message.user(conversation.conversationId, shortContent);
      conversation.addMessage(message);

      expect(conversation.title).toBe('A'.repeat(80));
    });

    it('should not set title from agent messages', () => {
      const conversation = createConversation();
      const message = Message.agent(conversation.conversationId, 'Response', 100, 'gpt-4o');
      conversation.addMessage(message);

      expect(conversation.title).toBeNull();
    });

    it('should not overwrite existing title', () => {
      const conversation = createConversation();
      const firstMessage = Message.user(conversation.conversationId, 'First message');
      conversation.addMessage(firstMessage);

      const secondMessage = Message.user(conversation.conversationId, 'Second message');
      conversation.addMessage(secondMessage);

      expect(conversation.title).toBe('First message');
    });

    it('should throw ConversationArchivedError when archived', () => {
      const conversation = createConversation();
      conversation.archive();

      const message = Message.user(conversation.conversationId, 'Hello');
      expect(() => conversation.addMessage(message)).toThrow(ConversationArchivedError);
    });
  });

  describe('archive', () => {
    it('should transition to archived', () => {
      const conversation = createConversation();
      const event = conversation.archive();

      expect(conversation.status.equals(ConversationStatus.Archived)).toBe(true);
      expect(event.eventType).toBe('ConversationArchived');
    });

    it('should throw ConversationAlreadyArchivedError when already archived', () => {
      const conversation = createConversation();
      conversation.archive();

      expect(() => conversation.archive()).toThrow(ConversationAlreadyArchivedError);
    });
  });

  describe('recentMessages', () => {
    it('should return last N messages', () => {
      const conversation = createConversation();
      for (let i = 0; i < 30; i++) {
        conversation.addMessage(Message.user(conversation.conversationId, `msg-${i}`));
      }

      const recent = conversation.recentMessages(5);
      expect(recent).toHaveLength(5);
      expect(recent[0].content).toBe('msg-25');
      expect(recent[4].content).toBe('msg-29');
    });

    it('should default to 20 messages', () => {
      const conversation = createConversation();
      for (let i = 0; i < 25; i++) {
        conversation.addMessage(Message.user(conversation.conversationId, `msg-${i}`));
      }

      const recent = conversation.recentMessages();
      expect(recent).toHaveLength(20);
    });
  });

  describe('messages', () => {
    it('should return ReadonlyArray', () => {
      const conversation = createConversation();
      conversation.addMessage(Message.user(conversation.conversationId, 'Hello'));

      const messages = conversation.messages;
      expect(messages).toHaveLength(1);
    });
  });
});
