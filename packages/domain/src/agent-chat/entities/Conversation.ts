import { randomUUID } from 'node:crypto';
import { AgentKey } from '../value-objects/AgentKey';
import { ConversationStatus } from '../value-objects/ConversationStatus';
import type { DomainEvent } from '../../shared/domain-event';
import { DomainError } from '../../shared/domain-error';
import { Message } from './Message';

export class ConversationArchivedError extends DomainError {
  readonly code = 'INVALID_STATE';
  readonly retryable = false;
  constructor(conversationId: string) {
    super(`Conversation ${conversationId} is archived and cannot receive new messages`);
  }
}

export class ConversationAlreadyArchivedError extends DomainError {
  readonly code = 'INVALID_STATE';
  readonly retryable = false;
  constructor(conversationId: string) {
    super(`Conversation ${conversationId} is already archived`);
  }
}

export class ConversationNotFoundError extends DomainError {
  readonly code = 'CONVERSATION_NOT_FOUND';
  readonly retryable = false;
  constructor(id: string) {
    super(`Conversation ${id} not found`);
  }
}

export class NotConversationParticipantError extends DomainError {
  readonly code = 'FORBIDDEN';
  readonly retryable = false;
  constructor(userId: string, conversationId: string) {
    super(`User ${userId} is not authorized to access conversation ${conversationId}`);
  }
}

export class Conversation {
  private _messages: Message[];
  private _status: ConversationStatus;
  private _title: string | null;
  private _updatedAt: Date;

  private constructor(
    readonly conversationId: string,
    readonly workspaceId: string,
    readonly userId: string,
    readonly agentKey: AgentKey,
    readonly createdAt: Date,
    updatedAt: Date,
    status: ConversationStatus,
    title: string | null,
    messages: Message[],
  ) {
    this._updatedAt = updatedAt;
    this._status = status;
    this._title = title;
    this._messages = messages;
  }

  static start(workspaceId: string, userId: string, agentKey: AgentKey): Conversation {
    const now = new Date();
    return new Conversation(
      randomUUID(),
      workspaceId,
      userId,
      agentKey,
      now,
      now,
      ConversationStatus.Active,
      null,
      [],
    );
  }

  static reconstitute(
    conversationId: string,
    workspaceId: string,
    userId: string,
    agentKey: AgentKey,
    createdAt: Date,
    updatedAt: Date,
    status: ConversationStatus,
    title: string | null,
    messages: Message[],
  ): Conversation {
    return new Conversation(
      conversationId,
      workspaceId,
      userId,
      agentKey,
      createdAt,
      updatedAt,
      status,
      title,
      messages,
    );
  }

  addMessage(message: Message): DomainEvent {
    if (this._status.isArchived) {
      throw new ConversationArchivedError(this.conversationId);
    }
    this._messages.push(message);
    this._updatedAt = new Date();

    // Auto-title from first user message
    if (!this._title && message.role.isUser) {
      this._title = message.content.slice(0, 80) + (message.content.length > 80 ? '...' : '');
    }

    return {
      eventType: 'MessageAdded',
      occurredAt: new Date(),
      aggregateId: this.conversationId,
    };
  }

  archive(): DomainEvent {
    if (!this._status.isActive) {
      throw new ConversationAlreadyArchivedError(this.conversationId);
    }
    this._status = ConversationStatus.Archived;
    this._updatedAt = new Date();

    return {
      eventType: 'ConversationArchived',
      occurredAt: new Date(),
      aggregateId: this.conversationId,
    };
  }

  recentMessages(n: number = 20): Message[] {
    return this._messages.slice(-n);
  }

  get status(): ConversationStatus {
    return this._status;
  }

  get messages(): ReadonlyArray<Message> {
    return this._messages;
  }

  get title(): string | null {
    return this._title;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get isActive(): boolean {
    return this._status.isActive;
  }
}
