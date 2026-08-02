import { DomainError } from '../../shared/domain-error';

export class InvalidModelTierError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid model tier: "${value}". Expected premium, balanced, light, or search.`);
  }
}

export class ModelTier {
  private constructor(private readonly _value: string) {}

  static readonly Premium  = new ModelTier('premium');
  static readonly Balanced = new ModelTier('balanced');
  static readonly Light    = new ModelTier('light');
  static readonly Search   = new ModelTier('search');

  static from(value: string): ModelTier {
    switch (value) {
      case 'premium':  return ModelTier.Premium;
      case 'balanced': return ModelTier.Balanced;
      case 'light':    return ModelTier.Light;
      case 'search':   return ModelTier.Search;
      default: throw new InvalidModelTierError(value);
    }
  }

  equals(other: ModelTier): boolean { return this._value === other._value; }
  toString(): string { return this._value; }
  get value(): string { return this._value; }
}
