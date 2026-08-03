import { describe, it, expect } from 'vitest';
import { PromptComponentType, InvalidPromptComponentTypeError } from '../prompting/PromptComponent';

describe('PromptComponentType', () => {
  describe('static instances', () => {
    it('should expose SystemRule', () => {
      expect(PromptComponentType.SystemRule.value).toBe('system_rule');
    });

    it('should expose FormatConstraint', () => {
      expect(PromptComponentType.FormatConstraint.value).toBe('format_constraint');
    });

    it('should expose SafetyGuard', () => {
      expect(PromptComponentType.SafetyGuard.value).toBe('safety_guard');
    });

    it('should expose StyleGuide', () => {
      expect(PromptComponentType.StyleGuide.value).toBe('style_guide');
    });

    it('should expose DomainKnowledge', () => {
      expect(PromptComponentType.DomainKnowledge.value).toBe('domain_knowledge');
    });
  });

  describe('from', () => {
    it('should return SystemRule for "system_rule"', () => {
      expect(PromptComponentType.from('system_rule')).toBe(PromptComponentType.SystemRule);
    });

    it('should return FormatConstraint for "format_constraint"', () => {
      expect(PromptComponentType.from('format_constraint')).toBe(PromptComponentType.FormatConstraint);
    });

    it('should return SafetyGuard for "safety_guard"', () => {
      expect(PromptComponentType.from('safety_guard')).toBe(PromptComponentType.SafetyGuard);
    });

    it('should return StyleGuide for "style_guide"', () => {
      expect(PromptComponentType.from('style_guide')).toBe(PromptComponentType.StyleGuide);
    });

    it('should return DomainKnowledge for "domain_knowledge"', () => {
      expect(PromptComponentType.from('domain_knowledge')).toBe(PromptComponentType.DomainKnowledge);
    });

    it('should throw InvalidPromptComponentTypeError for invalid value', () => {
      expect(() => PromptComponentType.from('invalid')).toThrow(InvalidPromptComponentTypeError);
    });
  });

  describe('getters', () => {
    it('isSystemRule should return true for SystemRule, false for others', () => {
      expect(PromptComponentType.SystemRule.isSystemRule).toBe(true);
      expect(PromptComponentType.FormatConstraint.isSystemRule).toBe(false);
      expect(PromptComponentType.SafetyGuard.isSystemRule).toBe(false);
      expect(PromptComponentType.StyleGuide.isSystemRule).toBe(false);
      expect(PromptComponentType.DomainKnowledge.isSystemRule).toBe(false);
    });

    it('isFormatConstraint should return true for FormatConstraint, false for others', () => {
      expect(PromptComponentType.FormatConstraint.isFormatConstraint).toBe(true);
      expect(PromptComponentType.SystemRule.isFormatConstraint).toBe(false);
      expect(PromptComponentType.SafetyGuard.isFormatConstraint).toBe(false);
      expect(PromptComponentType.StyleGuide.isFormatConstraint).toBe(false);
      expect(PromptComponentType.DomainKnowledge.isFormatConstraint).toBe(false);
    });

    it('isSafetyGuard should return true for SafetyGuard, false for others', () => {
      expect(PromptComponentType.SafetyGuard.isSafetyGuard).toBe(true);
      expect(PromptComponentType.SystemRule.isSafetyGuard).toBe(false);
      expect(PromptComponentType.FormatConstraint.isSafetyGuard).toBe(false);
      expect(PromptComponentType.StyleGuide.isSafetyGuard).toBe(false);
      expect(PromptComponentType.DomainKnowledge.isSafetyGuard).toBe(false);
    });

    it('isStyleGuide should return true for StyleGuide, false for others', () => {
      expect(PromptComponentType.StyleGuide.isStyleGuide).toBe(true);
      expect(PromptComponentType.SystemRule.isStyleGuide).toBe(false);
      expect(PromptComponentType.FormatConstraint.isStyleGuide).toBe(false);
      expect(PromptComponentType.SafetyGuard.isStyleGuide).toBe(false);
      expect(PromptComponentType.DomainKnowledge.isStyleGuide).toBe(false);
    });

    it('isDomainKnowledge should return true for DomainKnowledge, false for others', () => {
      expect(PromptComponentType.DomainKnowledge.isDomainKnowledge).toBe(true);
      expect(PromptComponentType.SystemRule.isDomainKnowledge).toBe(false);
      expect(PromptComponentType.FormatConstraint.isDomainKnowledge).toBe(false);
      expect(PromptComponentType.SafetyGuard.isDomainKnowledge).toBe(false);
      expect(PromptComponentType.StyleGuide.isDomainKnowledge).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same type', () => {
      expect(PromptComponentType.SystemRule.equals(PromptComponentType.SystemRule)).toBe(true);
    });

    it('should return false for different types', () => {
      expect(PromptComponentType.SystemRule.equals(PromptComponentType.FormatConstraint)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the raw value', () => {
      expect(PromptComponentType.SystemRule.toString()).toBe('system_rule');
      expect(PromptComponentType.DomainKnowledge.toString()).toBe('domain_knowledge');
    });
  });
});
