import { DomainError } from '../../shared/domain-error';

export type AgentKeyValue =
  | 'strategist'
  | 'copywriter'
  | 'seo-specialist'
  | 'ads-specialist'
  | 'analyst'
  | 'creative-director'
  | 'email-marketer';

export class AgentKey {
  private constructor(private readonly _value: AgentKeyValue) {}

  static readonly Strategist = new AgentKey('strategist');
  static readonly Copywriter = new AgentKey('copywriter');
  static readonly SeoSpecialist = new AgentKey('seo-specialist');
  static readonly AdsSpecialist = new AgentKey('ads-specialist');
  static readonly Analyst = new AgentKey('analyst');
  static readonly CreativeDirector = new AgentKey('creative-director');
  static readonly EmailMarketer = new AgentKey('email-marketer');

  static from(value: string): AgentKey {
    switch (value) {
      case 'strategist': return AgentKey.Strategist;
      case 'copywriter': return AgentKey.Copywriter;
      case 'seo-specialist': return AgentKey.SeoSpecialist;
      case 'ads-specialist': return AgentKey.AdsSpecialist;
      case 'analyst': return AgentKey.Analyst;
      case 'creative-director': return AgentKey.CreativeDirector;
      case 'email-marketer': return AgentKey.EmailMarketer;
      default:
        throw new InvalidAgentKeyError(value);
    }
  }

  equals(other: AgentKey): boolean {
    return this._value === other._value;
  }

  toString(): AgentKeyValue {
    return this._value;
  }

  get value(): AgentKeyValue {
    return this._value;
  }
}

export class InvalidAgentKeyError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid AgentKey: ${value}`);
  }
}
