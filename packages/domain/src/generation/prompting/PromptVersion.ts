import { DomainError } from '../../shared/domain-error';

export class PromptVersion {
  private constructor(readonly value: string) {}

  static readonly LATEST = new PromptVersion('latest');

  static from(version: string): PromptVersion {
    if (version === 'latest') return PromptVersion.LATEST;
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      throw new InvalidPromptVersionError(version);
    }
    return new PromptVersion(version);
  }

  get isLatest(): boolean {
    return this.value === 'latest';
  }

  get isPinned(): boolean {
    return !this.isLatest;
  }

  equals(other: PromptVersion): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export class InvalidPromptVersionError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid version: ${value}. Must be semver or "latest".`);
  }
}
