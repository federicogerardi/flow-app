import { randomUUID } from 'node:crypto';
import { MessageRole } from '../value-objects/MessageRole';

export class Message {
  private constructor(
    readonly messageId: string,
    readonly conversationId: string,
    readonly role: MessageRole,
    readonly content: string,
    readonly tokensUsed: number | null,
    readonly modelUsed: string | null,
    readonly createdAt: Date,
  ) {}

  static user(conversationId: string, content: string): Message {
    return new Message(
      randomUUID(),
      conversationId,
      MessageRole.User,
      content,
      null,
      null,
      new Date(),
    );
  }

  static agent(
    conversationId: string,
    content: string,
    tokensUsed: number,
    modelUsed: string,
  ): Message {
    return new Message(
      randomUUID(),
      conversationId,
      MessageRole.Agent,
      content,
      tokensUsed,
      modelUsed,
      new Date(),
    );
  }

  static system(conversationId: string, content: string): Message {
    return new Message(
      randomUUID(),
      conversationId,
      MessageRole.System,
      content,
      null,
      null,
      new Date(),
    );
  }

  static reconstitute(
    messageId: string,
    conversationId: string,
    role: MessageRole,
    content: string,
    tokensUsed: number | null,
    modelUsed: string | null,
    createdAt: Date,
  ): Message {
    return new Message(messageId, conversationId, role, content, tokensUsed, modelUsed, createdAt);
  }
}
