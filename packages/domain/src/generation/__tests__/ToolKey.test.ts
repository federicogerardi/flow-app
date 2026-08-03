import { describe, it, expect } from 'vitest';
import { ToolKey, InvalidToolKeyError } from '../value-objects/ToolKey';

describe('ToolKey', () => {
  describe('static instances', () => {
    it('should expose LandingFunnel', () => {
      expect(ToolKey.LandingFunnel.value).toBe('landing-funnel');
    });

    it('should expose LandingPage', () => {
      expect(ToolKey.LandingPage.value).toBe('landing-page');
    });

    it('should expose VideoScriptLongForm', () => {
      expect(ToolKey.VideoScriptLongForm.value).toBe('video-script-long-form');
    });

    it('should expose VideoDescription', () => {
      expect(ToolKey.VideoDescription.value).toBe('video-description');
    });

    it('should expose BlogPost', () => {
      expect(ToolKey.BlogPost.value).toBe('blog-post');
    });

    it('should expose AdCopy', () => {
      expect(ToolKey.AdCopy.value).toBe('ad-copy');
    });

    it('should expose Brief', () => {
      expect(ToolKey.Brief.value).toBe('brief');
    });

    it('should expose BrandVoice', () => {
      expect(ToolKey.BrandVoice.value).toBe('brand-voice');
    });

    it('should expose BuyerPersona', () => {
      expect(ToolKey.BuyerPersona.value).toBe('buyer-persona');
    });

    it('should expose MarketingAngle', () => {
      expect(ToolKey.MarketingAngle.value).toBe('marketing-angle');
    });

    it('should expose AiOverviewAnalysis', () => {
      expect(ToolKey.AiOverviewAnalysis.value).toBe('ai-overview-analysis');
    });
  });

  describe('from', () => {
    it('should return BlogPost for "blog-post"', () => {
      expect(ToolKey.from('blog-post')).toBe(ToolKey.BlogPost);
    });

    it('should throw InvalidToolKeyError for invalid value', () => {
      expect(() => ToolKey.from('invalid')).toThrow(InvalidToolKeyError);
    });
  });

  describe('equals', () => {
    it('should return true for same values', () => {
      expect(ToolKey.BlogPost.equals(ToolKey.BlogPost)).toBe(true);
    });

    it('should return false for different values', () => {
      expect(ToolKey.BlogPost.equals(ToolKey.AdCopy)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the raw value', () => {
      expect(ToolKey.BlogPost.toString()).toBe('blog-post');
    });
  });
});
