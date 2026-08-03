import { describe, it, expect } from 'vitest';
import {
  PromptTemplateId,
  InvalidPromptTemplateKeyError,
  InvalidPromptTemplateIdFormatError,
} from '../prompting/PromptTemplateId';

describe('PromptTemplateId', () => {
  describe('from', () => {
    it('should create from valid toolKey and stepLabel', () => {
      const id = PromptTemplateId.from('blog-post', 'seo-structure');

      expect(id.toolKey).toBe('blog-post');
      expect(id.stepLabel).toBe('seo-structure');
    });

    it('should throw InvalidPromptTemplateKeyError for uppercase toolKey', () => {
      expect(() => PromptTemplateId.from('INVALID', 'key')).toThrow(InvalidPromptTemplateKeyError);
    });

    it('should throw InvalidPromptTemplateKeyError for uppercase stepLabel', () => {
      expect(() => PromptTemplateId.from('blog-post', 'INVALID')).toThrow(InvalidPromptTemplateKeyError);
    });

    it('should throw InvalidPromptTemplateKeyError for toolKey starting with number', () => {
      expect(() => PromptTemplateId.from('1blog', 'key')).toThrow(InvalidPromptTemplateKeyError);
    });

    it('should accept hyphenated keys', () => {
      const id = PromptTemplateId.from('my-tool', 'my-step');

      expect(id.toolKey).toBe('my-tool');
      expect(id.stepLabel).toBe('my-step');
    });

    it('should accept keys with digits after first char', () => {
      const id = PromptTemplateId.from('tool2', 'step3');

      expect(id.toolKey).toBe('tool2');
      expect(id.stepLabel).toBe('step3');
    });
  });

  describe('fromString', () => {
    it('should parse a valid template ID string', () => {
      const id = PromptTemplateId.fromString('blog-post/seo-structure');

      expect(id.toolKey).toBe('blog-post');
      expect(id.stepLabel).toBe('seo-structure');
    });

    it('should throw InvalidPromptTemplateIdFormatError for missing separator', () => {
      expect(() => PromptTemplateId.fromString('invalid')).toThrow(InvalidPromptTemplateIdFormatError);
    });

    it('should throw InvalidPromptTemplateIdFormatError for too many parts', () => {
      expect(() => PromptTemplateId.fromString('a/b/c')).toThrow(InvalidPromptTemplateIdFormatError);
    });

    it('should throw InvalidPromptTemplateKeyError for invalid key within valid format', () => {
      expect(() => PromptTemplateId.fromString('INVALID/key')).toThrow(InvalidPromptTemplateKeyError);
    });
  });

  describe('equals', () => {
    it('should return true for identical IDs', () => {
      const a = PromptTemplateId.from('blog-post', 'seo-structure');
      const b = PromptTemplateId.from('blog-post', 'seo-structure');

      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different IDs', () => {
      const a = PromptTemplateId.from('blog-post', 'seo-structure');
      const b = PromptTemplateId.from('blog-post', 'intro');

      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return toolKey/stepLabel', () => {
      const id = PromptTemplateId.from('blog-post', 'seo-structure');

      expect(id.toString()).toBe('blog-post/seo-structure');
    });
  });
});
