import { describe, it, expect } from 'vitest';
import {
  ArtifactStatus,
  InvalidArtifactStatusError,
  InvalidArtifactTransitionError,
} from '../value-objects/ArtifactStatus';

describe('ArtifactStatus', () => {
  describe('static instances', () => {
    it('should expose Pending', () => {
      expect(ArtifactStatus.Pending.value).toBe('pending');
    });

    it('should expose Generating', () => {
      expect(ArtifactStatus.Generating.value).toBe('generating');
    });

    it('should expose Completed', () => {
      expect(ArtifactStatus.Completed.value).toBe('completed');
    });

    it('should expose Failed', () => {
      expect(ArtifactStatus.Failed.value).toBe('failed');
    });
  });

  describe('from', () => {
    it('should return Pending for "pending"', () => {
      expect(ArtifactStatus.from('pending')).toBe(ArtifactStatus.Pending);
    });

    it('should return Generating for "generating"', () => {
      expect(ArtifactStatus.from('generating')).toBe(ArtifactStatus.Generating);
    });

    it('should return Completed for "completed"', () => {
      expect(ArtifactStatus.from('completed')).toBe(ArtifactStatus.Completed);
    });

    it('should return Failed for "failed"', () => {
      expect(ArtifactStatus.from('failed')).toBe(ArtifactStatus.Failed);
    });

    it('should throw InvalidArtifactStatusError for invalid value', () => {
      expect(() => ArtifactStatus.from('invalid')).toThrow(InvalidArtifactStatusError);
    });
  });

  describe('canTransitionTo', () => {
    it('should allow pending to generating', () => {
      expect(ArtifactStatus.Pending.canTransitionTo(ArtifactStatus.Generating)).toBe(true);
    });

    it('should allow generating to completed', () => {
      expect(ArtifactStatus.Generating.canTransitionTo(ArtifactStatus.Completed)).toBe(true);
    });

    it('should allow generating to failed', () => {
      expect(ArtifactStatus.Generating.canTransitionTo(ArtifactStatus.Failed)).toBe(true);
    });

    it('should not allow completed to anything', () => {
      expect(ArtifactStatus.Completed.canTransitionTo(ArtifactStatus.Pending)).toBe(false);
      expect(ArtifactStatus.Completed.canTransitionTo(ArtifactStatus.Generating)).toBe(false);
      expect(ArtifactStatus.Completed.canTransitionTo(ArtifactStatus.Failed)).toBe(false);
    });

    it('should not allow pending to completed', () => {
      expect(ArtifactStatus.Pending.canTransitionTo(ArtifactStatus.Completed)).toBe(false);
    });
  });

  describe('apply', () => {
    it('should return target on valid transition', () => {
      const result = ArtifactStatus.Pending.apply(ArtifactStatus.Generating);
      expect(result).toBe(ArtifactStatus.Generating);
    });

    it('should throw InvalidArtifactTransitionError on invalid transition', () => {
      expect(() => ArtifactStatus.Completed.apply(ArtifactStatus.Pending)).toThrow(
        InvalidArtifactTransitionError,
      );
    });
  });

  describe('isTerminal', () => {
    it('should return true for completed', () => {
      expect(ArtifactStatus.Completed.isTerminal).toBe(true);
    });

    it('should return true for failed', () => {
      expect(ArtifactStatus.Failed.isTerminal).toBe(true);
    });

    it('should return false for pending', () => {
      expect(ArtifactStatus.Pending.isTerminal).toBe(false);
    });

    it('should return false for generating', () => {
      expect(ArtifactStatus.Generating.isTerminal).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      expect(ArtifactStatus.Pending.equals(ArtifactStatus.Pending)).toBe(true);
    });

    it('should return false for different values', () => {
      expect(ArtifactStatus.Pending.equals(ArtifactStatus.Completed)).toBe(false);
    });
  });
});
