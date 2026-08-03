import { describe, it, expect } from 'vitest';
import { AgentKey, InvalidAgentKeyError } from '../value-objects/AgentKey';

describe('AgentKey', () => {
  describe('static instances', () => {
    it('should expose Strategist', () => {
      expect(AgentKey.Strategist.value).toBe('strategist');
    });

    it('should expose Copywriter', () => {
      expect(AgentKey.Copywriter.value).toBe('copywriter');
    });

    it('should expose SeoSpecialist', () => {
      expect(AgentKey.SeoSpecialist.value).toBe('seo-specialist');
    });

    it('should expose AdsSpecialist', () => {
      expect(AgentKey.AdsSpecialist.value).toBe('ads-specialist');
    });

    it('should expose Analyst', () => {
      expect(AgentKey.Analyst.value).toBe('analyst');
    });

    it('should expose CreativeDirector', () => {
      expect(AgentKey.CreativeDirector.value).toBe('creative-director');
    });

    it('should expose EmailMarketer', () => {
      expect(AgentKey.EmailMarketer.value).toBe('email-marketer');
    });
  });

  describe('from', () => {
    it('should return Strategist for "strategist"', () => {
      expect(AgentKey.from('strategist')).toBe(AgentKey.Strategist);
    });

    it('should return Copywriter for "copywriter"', () => {
      expect(AgentKey.from('copywriter')).toBe(AgentKey.Copywriter);
    });

    it('should return SeoSpecialist for "seo-specialist"', () => {
      expect(AgentKey.from('seo-specialist')).toBe(AgentKey.SeoSpecialist);
    });

    it('should return AdsSpecialist for "ads-specialist"', () => {
      expect(AgentKey.from('ads-specialist')).toBe(AgentKey.AdsSpecialist);
    });

    it('should return Analyst for "analyst"', () => {
      expect(AgentKey.from('analyst')).toBe(AgentKey.Analyst);
    });

    it('should return CreativeDirector for "creative-director"', () => {
      expect(AgentKey.from('creative-director')).toBe(AgentKey.CreativeDirector);
    });

    it('should return EmailMarketer for "email-marketer"', () => {
      expect(AgentKey.from('email-marketer')).toBe(AgentKey.EmailMarketer);
    });

    it('should throw InvalidAgentKeyError for invalid value', () => {
      expect(() => AgentKey.from('invalid')).toThrow(InvalidAgentKeyError);
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      expect(AgentKey.Strategist.equals(AgentKey.Strategist)).toBe(true);
    });

    it('should return false for different values', () => {
      expect(AgentKey.Strategist.equals(AgentKey.Copywriter)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the raw value', () => {
      expect(AgentKey.Strategist.toString()).toBe('strategist');
    });
  });
});
