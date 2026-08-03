import { describe, it, expect } from 'vitest';
import { Message } from '../entities/Message';
import { MessageRole } from '../value-objects/MessageRole';

describe('Message', () => {
  const conversationId = 'conv-1';

  describe('user', () => {
    it('should create with User role', () => {
      const message = Message.user(conversationId, 'Hello');

      expect(message.role.equals(MessageRole.User)).toBe(true);
      expect(message.conversationId).toBe(conversationId);
      expect(message.content).toBe('Hello');
      expect(message.tokensUsed).toBeNull();
      expect(message.modelUsed).toBeNull();
      expect(message.messageId).toBeDefined();
      expect(message.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('agent', () => {
    it('should create with Agent role, storing tokensUsed and modelUsed', () => {
      const message = Message.agent(conversationId, 'Response', 150, 'gpt-4o');

      expect(message.role.equals(MessageRole.Agent)).toBe(true);
      expect(message.conversationId).toBe(conversationId);
      expect(message.content).toBe('Response');
      expect(message.tokensUsed).toBe(150);
      expect(message.modelUsed).toBe('gpt-4o');
      expect(message.messageId).toBeDefined();
      expect(message.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('system', () => {
    it('should create with System role', () => {
      const message = Message.system(conversationId, 'System prompt');

      expect(message.role.equals(MessageRole.System)).toBe(true);
      expect(message.conversationId).toBe(conversationId);
      expect(message.content).toBe('System prompt');
      expect(message.tokensUsed).toBeNull();
      expect(message.modelUsed).toBeNull();
      expect(message.messageId).toBeDefined();
      expect(message.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('reconstitute', () => {
    it('should pass through all fields', () => {
      const now = new Date();
      const message = Message.reconstitute(
        'msg-1',
        conversationId,
        MessageRole.Agent,
        'content',
        100,
        'model',
        now,
      );

      expect(message.messageId).toBe('msg-1');
      expect(message.conversationId).toBe(conversationId);
      expect(message.role.equals(MessageRole.Agent)).toBe(true);
      expect(message.content).toBe('content');
      expect(message.tokensUsed).toBe(100);
      expect(message.modelUsed).toBe('model');
      expect(message.createdAt).toBe(now);
    });
  });
});
