import { describe, it, expect } from 'vitest';
import { PromptComponent, EmptyComponentContentError } from '../prompting/PromptComponent';
import { PromptVersion } from '../prompting/PromptVersion';

describe('PromptComponent', () => {
  const version = PromptVersion.from('1.0.0');

  describe('create', () => {
    it('should create a component with all fields', () => {
      const component = PromptComponent.create(
        'rules-1',
        'system_rule',
        'You are a helpful assistant.',
        version,
        'Base system rule',
      );

      expect(component.componentKey).toBe('rules-1');
      expect(component.type).toBe('system_rule');
      expect(component.content).toBe('You are a helpful assistant.');
      expect(component.version).toBe(version);
      expect(component.description).toBe('Base system rule');
    });

    it('should throw EmptyComponentContentError for empty content', () => {
      expect(() =>
        PromptComponent.create('rules-1', 'system_rule', '', version, 'desc'),
      ).toThrow(EmptyComponentContentError);
    });

    it('should throw EmptyComponentContentError for whitespace-only content', () => {
      expect(() =>
        PromptComponent.create('rules-1', 'system_rule', '   ', version, 'desc'),
      ).toThrow(EmptyComponentContentError);
    });
  });

  describe('fromFile', () => {
    it('should bypass validation and allow empty content', () => {
      const component = PromptComponent.fromFile(
        'rules-1',
        'system_rule',
        '',
        version,
        'desc',
      );

      expect(component.content).toBe('');
    });

    it('should create a component with valid content', () => {
      const component = PromptComponent.fromFile(
        'fmt-1',
        'format_constraint',
        'Use markdown.',
        version,
        'Format rule',
      );

      expect(component.componentKey).toBe('fmt-1');
      expect(component.type).toBe('format_constraint');
      expect(component.content).toBe('Use markdown.');
    });
  });

  describe('field access', () => {
    it('should expose all fields', () => {
      const component = PromptComponent.create(
        'safety-1',
        'safety_guard',
        'Do not generate harmful content.',
        PromptVersion.LATEST,
        'Safety guard',
      );

      expect(component.componentKey).toBe('safety-1');
      expect(component.type).toBe('safety_guard');
      expect(component.content).toBe('Do not generate harmful content.');
      expect(component.version).toBe(PromptVersion.LATEST);
      expect(component.description).toBe('Safety guard');
    });
  });
});
