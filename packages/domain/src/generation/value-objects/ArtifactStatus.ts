import { DomainError } from '../../shared/domain-error';

export class InvalidArtifactStatusError extends DomainError {
  readonly code = 'INVALID_ARTIFACT_STATUS';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid ArtifactStatus: "${value}". Expected "pending", "generating", "completed", or "failed".`);
  }
}

export class InvalidArtifactTransitionError extends DomainError {
  readonly code = 'INVALID_ARTIFACT_TRANSITION';
  readonly retryable = false;
  constructor(from: string, to: string) {
    super(`Cannot transition artifact from "${from}" to "${to}"`);
  }
}

const VALID_TRANSITIONS: Record<string, Set<string>> = {
  pending: new Set(['generating']),
  generating: new Set(['completed', 'failed']),
  completed: new Set(),
  failed: new Set(),
};

export class ArtifactStatus {
  private static readonly VALID = new Set<string>(['pending', 'generating', 'completed', 'failed']);

  private constructor(private readonly _value: 'pending' | 'generating' | 'completed' | 'failed') {}

  static readonly Pending = new ArtifactStatus('pending');
  static readonly Generating = new ArtifactStatus('generating');
  static readonly Completed = new ArtifactStatus('completed');
  static readonly Failed = new ArtifactStatus('failed');

  static from(value: string): ArtifactStatus {
    if (!ArtifactStatus.VALID.has(value)) {
      throw new InvalidArtifactStatusError(value);
    }
    switch (value) {
      case 'pending': return ArtifactStatus.Pending;
      case 'generating': return ArtifactStatus.Generating;
      case 'completed': return ArtifactStatus.Completed;
      case 'failed': return ArtifactStatus.Failed;
      default: throw new InvalidArtifactStatusError(value);
    }
  }

  get value(): string {
    return this._value;
  }

  get isPending(): boolean {
    return this._value === 'pending';
  }

  get isGenerating(): boolean {
    return this._value === 'generating';
  }

  get isCompleted(): boolean {
    return this._value === 'completed';
  }

  get isFailed(): boolean {
    return this._value === 'failed';
  }

  get isTerminal(): boolean {
    return this._value === 'completed' || this._value === 'failed';
  }

  canTransitionTo(target: ArtifactStatus): boolean {
    return VALID_TRANSITIONS[this._value]?.has(target._value) ?? false;
  }

  apply(target: ArtifactStatus): ArtifactStatus {
    if (!this.canTransitionTo(target)) {
      throw new InvalidArtifactTransitionError(this._value, target._value);
    }
    return target;
  }

  equals(other: ArtifactStatus): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

export type ArtifactStatusValue = 'pending' | 'generating' | 'completed' | 'failed';
