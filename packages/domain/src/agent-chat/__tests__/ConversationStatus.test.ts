import { describe, it, expect } from 'vitest';
import { ConversationStatus, InvalidConversationStatusError } from '../value-objects/ConversationStatus';

describe('ConversationStatus', () => {
  describe('static instances', () => {
    it('should expose Active', () => {
      expect(ConversationStatus.Active.value).toBe('active');
    });

    it('should expose Archived', () => {
      expect(ConversationStatus.Archived.value).toBe('archived');
    });
  });

  describe('from', () => {
    it('should return Active for "active"', () => {
      expect(ConversationStatus.from('active')).toBe(ConversationStatus.Active);
    });

    it('should return Archived for "archived"', () => {
      expect(ConversationStatus.from('archived')).toBe(ConversationStatus.Archived);
    });

    it('should throw InvalidConversationStatusError for invalid value', () => {
      expect(() => ConversationStatus.from('invalid')).toThrow(InvalidConversationStatusError);
    });
  });

  describe('isActive', () => {
    it('should return true for Active', () => {
      expect(ConversationStatus.Active.isActive).toBe(true);
    });

    it('should return false for Archived', () => {
      expect(ConversationStatus.Archived.isActive).toBe(false);
    });
  });

  describe('isArchived', () => {
    it('should return true for Archived', () => {
      expect(ConversationStatus.Archived.isArchived).toBe(true);
    });

    it('should return false for Active', () => {
      expect(ConversationStatus.Active.isArchived).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      expect(ConversationStatus.Active.equals(ConversationStatus.Active)).toBe(true);
    });

    it('should return false for different values', () => {
      expect(ConversationStatus.Active.equals(ConversationStatus.Archived)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the raw value', () => {
      expect(ConversationStatus.Active.toString()).toBe('active');
    });
  });
});
