import { DomainError } from '../../shared/domain-error';

export type ToolOutputCategoryValue = 'asset' | 'content';

export class ToolOutputCategory {
  private constructor(private readonly _value: ToolOutputCategoryValue) {}

  static readonly AssetProducer = new ToolOutputCategory('asset');
  static readonly ContentProducer = new ToolOutputCategory('content');

  static from(value: string): ToolOutputCategory {
    switch (value) {
      case 'asset':   return ToolOutputCategory.AssetProducer;
      case 'content': return ToolOutputCategory.ContentProducer;
      default:
        throw new InvalidToolOutputCategoryError(value);
    }
  }

  equals(other: ToolOutputCategory): boolean {
    return this._value === other._value;
  }

  toString(): ToolOutputCategoryValue {
    return this._value;
  }

  get value(): ToolOutputCategoryValue {
    return this._value;
  }

  isAssetProducer(): boolean {
    return this._value === 'asset';
  }

  isContentProducer(): boolean {
    return this._value === 'content';
  }
}

export class InvalidToolOutputCategoryError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid ToolOutputCategory: ${value}. Expected 'asset' or 'content'.`);
  }
}