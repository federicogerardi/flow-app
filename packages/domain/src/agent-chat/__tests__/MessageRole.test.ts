import { describe, it, expect } from 'vitest';
import { MessageRole, InvalidMessageRoleError } from '../value-objects/MessageRole';

describe('MessageRole', () => {
  describe('static instances', () => {
    it('should expose User', () => {
      expect(MessageRole.User.value).toBe('user');
    });

    it('should expose Agent', () => {
      expect(MessageRole.Agent.value).toBe('agent');
    });

    it('should expose System', () => {
      expect(MessageRole.System.value).toBe('system');
    });
  });

  describe('from', () => {
    it('should return User for "user"', () => {
      expect(MessageRole.from('user')).toBe(MessageRole.User);
    });

    it('should return Agent for "agent"', () => {
      expect(MessageRole.from('agent')).toBe(MessageRole.Agent);
    });

    it('should return System for "system"', () => {
      expect(MessageRole.from('system')).toBe(MessageRole.System);
    });

    it('should throw InvalidMessageRoleError for invalid value', () => {
      expect(() => MessageRole.from('invalid')).toThrow(InvalidMessageRoleError);
    });
  });

  describe('isUser', () => {
    it('should return true for User', () => {
      expect(MessageRole.User.isUser).toBe(true);
    });

    it('should return false for Agent', () => {
      expect(MessageRole.Agent.isUser).toBe(false);
    });

    it('should return false for System', () => {
      expect(MessageRole.System.isUser).toBe(false);
    });
  });

  describe('isAgent', () => {
    it('should return true for Agent', () => {
      expect(MessageRole.Agent.isAgent).toBe(true);
    });

    it('should return false for User', () => {
      expect(MessageRole.User.isAgent).toBe(false);
    });

    it('should return false for System', () => {
      expect(MessageRole.System.isAgent).toBe(false);
    });
  });

  describe('isSystem', () => {
    it('should return true for System', () => {
      expect(MessageRole.System.isSystem).toBe(true);
    });

    it('should return false for User', () => {
      expect(MessageRole.User.isSystem).toBe(false);
    });

    it('should return false for Agent', () => {
      expect(MessageRole.Agent.isSystem).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      expect(MessageRole.User.equals(MessageRole.User)).toBe(true);
    });

    it('should return false for different values', () => {
      expect(MessageRole.User.equals(MessageRole.Agent)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the raw value', () => {
      expect(MessageRole.User.toString()).toBe('user');
    });
  });
});
