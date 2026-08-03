import { describe, it, expect } from 'vitest';
import { SessionStatus, InvalidSessionStatusError } from '../value-objects/SessionStatus';

describe('SessionStatus', () => {
  describe('static instances', () => {
    it('should expose Draft', () => {
      expect(SessionStatus.Draft.value).toBe('draft');
    });

    it('should expose Ready', () => {
      expect(SessionStatus.Ready.value).toBe('ready');
    });

    it('should expose Queued', () => {
      expect(SessionStatus.Queued.value).toBe('queued');
    });

    it('should expose Running', () => {
      expect(SessionStatus.Running.value).toBe('running');
    });

    it('should expose Completed', () => {
      expect(SessionStatus.Completed.value).toBe('completed');
    });

    it('should expose Failed', () => {
      expect(SessionStatus.Failed.value).toBe('failed');
    });

    it('should expose Cancelled', () => {
      expect(SessionStatus.Cancelled.value).toBe('cancelled');
    });
  });

  describe('isTerminal', () => {
    it('should return true for Completed', () => {
      expect(SessionStatus.Completed.isTerminal()).toBe(true);
    });

    it('should return true for Failed', () => {
      expect(SessionStatus.Failed.isTerminal()).toBe(true);
    });

    it('should return true for Cancelled', () => {
      expect(SessionStatus.Cancelled.isTerminal()).toBe(true);
    });

    it('should return false for Draft', () => {
      expect(SessionStatus.Draft.isTerminal()).toBe(false);
    });

    it('should return false for Ready', () => {
      expect(SessionStatus.Ready.isTerminal()).toBe(false);
    });

    it('should return false for Queued', () => {
      expect(SessionStatus.Queued.isTerminal()).toBe(false);
    });

    it('should return false for Running', () => {
      expect(SessionStatus.Running.isTerminal()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      expect(SessionStatus.Draft.equals(SessionStatus.Draft)).toBe(true);
    });

    it('should return false for different values', () => {
      expect(SessionStatus.Draft.equals(SessionStatus.Ready)).toBe(false);
    });
  });

  describe('from', () => {
    it('should return Draft for "draft"', () => {
      expect(SessionStatus.from('draft')).toBe(SessionStatus.Draft);
    });

    it('should throw InvalidSessionStatusError for invalid value', () => {
      expect(() => SessionStatus.from('invalid')).toThrow(InvalidSessionStatusError);
    });
  });

  describe('toString', () => {
    it('should return the raw value', () => {
      expect(SessionStatus.Completed.toString()).toBe('completed');
    });
  });
});
