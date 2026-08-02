import { DomainError } from '../../shared/domain-error';

export class PromptTemplateId {
  private constructor(
    readonly toolKey: string,
    readonly stepLabel: string,
  ) {}

  static from(toolKey: string, stepLabel: string): PromptTemplateId {
    if (!/^[a-z][a-z0-9-]*$/.test(toolKey)) {
      throw new InvalidPromptTemplateKeyError(toolKey);
    }
    if (!/^[a-z][a-z0-9-]*$/.test(stepLabel)) {
      throw new InvalidPromptTemplateKeyError(stepLabel);
    }
    return new PromptTemplateId(toolKey, stepLabel);
  }

  static fromString(value: string): PromptTemplateId {
    const parts = value.split('/');
    if (parts.length !== 2) {
      throw new InvalidPromptTemplateIdFormatError(value);
    }
    return PromptTemplateId.from(parts[0], parts[1]);
  }

  toString(): string {
    return `${this.toolKey}/${this.stepLabel}`;
  }

  equals(other: PromptTemplateId): boolean {
    return this.toolKey === other.toolKey && this.stepLabel === other.stepLabel;
  }
}

export class InvalidPromptTemplateKeyError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid prompt template key: ${value}`);
  }
}

export class InvalidPromptTemplateIdFormatError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid template ID format: ${value}. Expected "{toolKey}/{stepLabel}"`);
  }
}
