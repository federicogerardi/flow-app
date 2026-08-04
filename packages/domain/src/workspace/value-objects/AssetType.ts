import { DomainError } from '../../shared/domain-error';

export class InvalidAssetTypeError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid asset type: "${value}". Valid types: brief, brand-voice, persona, angle, ad-copy`);
  }
}

export type AssetTypeValue = 'brief' | 'brand-voice' | 'persona' | 'angle' | 'ad-copy';

export class AssetType {
  private constructor(private readonly _value: AssetTypeValue) {}

  static readonly Brief = new AssetType('brief');
  static readonly BrandVoice = new AssetType('brand-voice');
  static readonly Persona = new AssetType('persona');
  static readonly Angle = new AssetType('angle');
  static readonly AdCopy = new AssetType('ad-copy');

  static from(value: string): AssetType {
    switch (value) {
      case 'brief': return AssetType.Brief;
      case 'brand-voice': return AssetType.BrandVoice;
      case 'persona': return AssetType.Persona;
      case 'angle': return AssetType.Angle;
      case 'ad-copy': return AssetType.AdCopy;
      default: throw new InvalidAssetTypeError(value);
    }
  }

  equals(other: AssetType): boolean { return this._value === other._value; }
  toString(): string { return this._value; }
  get value(): AssetTypeValue { return this._value; }
}
