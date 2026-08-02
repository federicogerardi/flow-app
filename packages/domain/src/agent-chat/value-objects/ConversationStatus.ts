import { DomainError } from '../../shared/domain-error';

export class InvalidConversationStatusError extends DomainError {
  readonly code = 'INVALID_CONVERSATION_STATUS';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid ConversationStatus: "${value}". Expected "active" or "archived".`);
  }
}

export class ConversationStatus {
  private static readonly VALID = new Set<string>(['active', 'archived']);

  private constructor(private readonly _value: 'active' | 'archived') {}

  static readonly Active = new ConversationStatus('active');
  static readonly Archived = new ConversationStatus('archived');

  static from(value: string): ConversationStatus {
    if (!ConversationStatus.VALID.has(value)) {
      throw new InvalidConversationStatusError(value);
    }
    return value === 'active' ? ConversationStatus.Active : ConversationStatus.Archived;
  }

  get value(): string {
    return this._value;
  }

  get isActive(): boolean {
    return this._value === 'active';
  }

  get isArchived(): boolean {
    return this._value === 'archived';
  }

  equals(other: ConversationStatus): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

export type ConversationStatusValue = 'active' | 'archived';
