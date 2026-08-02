import { DomainError } from '../../shared/domain-error';

export class InvalidMessageRoleError extends DomainError {
  readonly code = 'INVALID_MESSAGE_ROLE';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid MessageRole: "${value}". Expected "user", "agent", or "system".`);
  }
}

export class MessageRole {
  private static readonly VALID = new Set<string>(['user', 'agent', 'system']);

  private constructor(private readonly _value: 'user' | 'agent' | 'system') {}

  static readonly User = new MessageRole('user');
  static readonly Agent = new MessageRole('agent');
  static readonly System = new MessageRole('system');

  static from(value: string): MessageRole {
    if (!MessageRole.VALID.has(value)) {
      throw new InvalidMessageRoleError(value);
    }
    switch (value) {
      case 'user': return MessageRole.User;
      case 'agent': return MessageRole.Agent;
      case 'system': return MessageRole.System;
      default: throw new InvalidMessageRoleError(value);
    }
  }

  get value(): string {
    return this._value;
  }

  get isUser(): boolean {
    return this._value === 'user';
  }

  get isAgent(): boolean {
    return this._value === 'agent';
  }

  get isSystem(): boolean {
    return this._value === 'system';
  }

  equals(other: MessageRole): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

export type MessageRoleValue = 'user' | 'agent' | 'system';
