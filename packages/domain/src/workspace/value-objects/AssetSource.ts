import { DomainError } from '../../shared/domain-error';

export class InvalidAssetSourceError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid asset source: "${value}". Valid sources: generated, uploaded, manual`);
  }
}

export type AssetSourceValue = 'generated' | 'uploaded' | 'manual';

export class AssetSource {
  private constructor(private readonly _value: AssetSourceValue) {}

  static readonly Generated = new AssetSource('generated');
  static readonly Uploaded = new AssetSource('uploaded');
  static readonly Manual = new AssetSource('manual');

  static from(value: string): AssetSource {
    switch (value) {
      case 'generated': return AssetSource.Generated;
      case 'uploaded': return AssetSource.Uploaded;
      case 'manual': return AssetSource.Manual;
      default: throw new InvalidAssetSourceError(value);
    }
  }

  equals(other: AssetSource): boolean { return this._value === other._value; }
  toString(): string { return this._value; }
  get value(): AssetSourceValue { return this._value; }
}
