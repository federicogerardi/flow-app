import { DomainError } from '../../shared/domain-error';

export type SessionStatusValue = 'draft' | 'ready' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export class SessionStatus {
  private constructor(private readonly _value: SessionStatusValue) {}

  static readonly Draft = new SessionStatus('draft');
  static readonly Ready = new SessionStatus('ready');
  static readonly Queued = new SessionStatus('queued');
  static readonly Running = new SessionStatus('running');
  static readonly Completed = new SessionStatus('completed');
  static readonly Failed = new SessionStatus('failed');
  static readonly Cancelled = new SessionStatus('cancelled');

  static from(value: string): SessionStatus {
    switch (value) {
      case 'draft': return SessionStatus.Draft;
      case 'ready': return SessionStatus.Ready;
      case 'queued': return SessionStatus.Queued;
      case 'running': return SessionStatus.Running;
      case 'completed': return SessionStatus.Completed;
      case 'failed': return SessionStatus.Failed;
      case 'cancelled': return SessionStatus.Cancelled;
      default:
        throw new InvalidSessionStatusError(value);
    }
  }

  isTerminal(): boolean {
    return this._value === 'completed' || this._value === 'failed' || this._value === 'cancelled';
  }

  equals(other: SessionStatus): boolean {
    return this._value === other._value;
  }

  toString(): SessionStatusValue {
    return this._value;
  }

  get value(): SessionStatusValue {
    return this._value;
  }
}

export class InvalidSessionStatusError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid SessionStatus: ${value}`);
  }
}
