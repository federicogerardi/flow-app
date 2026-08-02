import { DomainError } from '../../shared/domain-error';

export type ToolKeyValue =
  | 'landing-funnel'
  | 'landing-page'
  | 'video-script-long-form'
  | 'video-description'
  | 'blog-post'
  | 'ad-copy'
  | 'brief'
  | 'brand-voice'
  | 'buyer-persona'
  | 'marketing-angle'
  | 'ai-overview-analysis';

export class ToolKey {
  private constructor(private readonly _value: ToolKeyValue) {}

  static readonly LandingFunnel = new ToolKey('landing-funnel');
  static readonly LandingPage = new ToolKey('landing-page');
  static readonly VideoScriptLongForm = new ToolKey('video-script-long-form');
  static readonly VideoDescription = new ToolKey('video-description');
  static readonly BlogPost = new ToolKey('blog-post');
  static readonly AdCopy = new ToolKey('ad-copy');
  static readonly Brief = new ToolKey('brief');
  static readonly BrandVoice = new ToolKey('brand-voice');
  static readonly BuyerPersona = new ToolKey('buyer-persona');
  static readonly MarketingAngle = new ToolKey('marketing-angle');
  static readonly AiOverviewAnalysis = new ToolKey('ai-overview-analysis');

  static from(value: string): ToolKey {
    switch (value) {
      case 'landing-funnel': return ToolKey.LandingFunnel;
      case 'landing-page': return ToolKey.LandingPage;
      case 'video-script-long-form': return ToolKey.VideoScriptLongForm;
      case 'video-description': return ToolKey.VideoDescription;
      case 'blog-post': return ToolKey.BlogPost;
      case 'ad-copy': return ToolKey.AdCopy;
      case 'brief': return ToolKey.Brief;
      case 'brand-voice': return ToolKey.BrandVoice;
      case 'buyer-persona': return ToolKey.BuyerPersona;
      case 'marketing-angle': return ToolKey.MarketingAngle;
      case 'ai-overview-analysis': return ToolKey.AiOverviewAnalysis;
      default:
        throw new InvalidToolKeyError(value);
    }
  }

  equals(other: ToolKey): boolean {
    return this._value === other._value;
  }

  toString(): ToolKeyValue {
    return this._value;
  }

  get value(): ToolKeyValue {
    return this._value;
  }
}

export class InvalidToolKeyError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid ToolKey: ${value}`);
  }
}
