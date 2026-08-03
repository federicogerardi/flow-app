import { describe, it, expect } from 'vitest';
import { PromptVersion, InvalidPromptVersionError } from '../prompting/PromptVersion';

describe('PromptVersion', () => {
  describe('LATEST', () => {
    it('should have value "latest"', () => {
      expect(PromptVersion.LATEST.value).toBe('latest');
    });
  });

  describe('from', () => {
    it('should return LATEST for "latest"', () => {
      expect(PromptVersion.from('latest')).toBe(PromptVersion.LATEST);
    });

    it('should create from valid semver', () => {
      const version = PromptVersion.from('1.0.0');

      expect(version.value).toBe('1.0.0');
    });

    it('should create from multi-digit semver', () => {
      const version = PromptVersion.from('12.34.56');

      expect(version.value).toBe('12.34.56');
    });

    it('should throw InvalidPromptVersionError for invalid version', () => {
      expect(() => PromptVersion.from('invalid')).toThrow(InvalidPromptVersionError);
    });

    it('should throw InvalidPromptVersionError for partial semver', () => {
      expect(() => PromptVersion.from('1.0')).toThrow(InvalidPromptVersionError);
    });

    it('should throw InvalidPromptVersionError for semver with prefix', () => {
      expect(() => PromptVersion.from('v1.0.0')).toThrow(InvalidPromptVersionError);
    });
  });

  describe('isLatest', () => {
    it('should return true for LATEST', () => {
      expect(PromptVersion.LATEST.isLatest).toBe(true);
    });

    it('should return false for semver', () => {
      expect(PromptVersion.from('1.0.0').isLatest).toBe(false);
    });
  });

  describe('isPinned', () => {
    it('should return false for LATEST', () => {
      expect(PromptVersion.LATEST.isPinned).toBe(false);
    });

    it('should return true for semver', () => {
      expect(PromptVersion.from('1.0.0').isPinned).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for same version', () => {
      expect(PromptVersion.from('1.0.0').equals(PromptVersion.from('1.0.0'))).toBe(true);
    });

    it('should return true for LATEST instances', () => {
      expect(PromptVersion.from('latest').equals(PromptVersion.LATEST)).toBe(true);
    });

    it('should return false for different versions', () => {
      expect(PromptVersion.from('1.0.0').equals(PromptVersion.from('2.0.0'))).toBe(false);
    });

    it('should return false for semver vs LATEST', () => {
      expect(PromptVersion.from('1.0.0').equals(PromptVersion.LATEST)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the version string', () => {
      expect(PromptVersion.from('1.0.0').toString()).toBe('1.0.0');
    });

    it('should return "latest" for LATEST', () => {
      expect(PromptVersion.LATEST.toString()).toBe('latest');
    });
  });
});
