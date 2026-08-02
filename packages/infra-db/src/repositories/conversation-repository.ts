import type { Kysely } from 'kysely';
import type { DB } from '../types';
import { Conversation, Message, AgentKey, type ConversationRepository, type Pagination, type ConversationStatus, type MessageRole } from '@flow-app/domain';

export class KyselyConversationRepository implements ConversationRepository {
  constructor(private readonly db: Kysely<DB>) {}

  async findById(id: string): Promise<Conversation | null> {
    const row = await this.db
      .selectFrom('conversations')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();

    if (!row) return null;

    const messages = await this.db
      .selectFrom('messages')
      .where('conversation_id', '=', id)
      .selectAll()
      .orderBy('created_at', 'asc')
      .execute();

    return Conversation.reconstitute(
      row.id,
      row.workspace_id,
      row.user_id,
      AgentKey.from(row.agent_key),
      row.created_at,
      row.updated_at ?? row.created_at,
      row.status as ConversationStatus,
      row.title,
      messages.map((m) =>
        Message.reconstitute(
          m.id,
          m.conversation_id,
          m.role as MessageRole,
          m.content,
          m.tokens_used,
          m.model_used,
          m.created_at,
        ),
      ),
    );
  }

  async findByUserAndWorkspace(
    userId: string,
    workspaceId: string,
    options?: Pagination,
  ): Promise<Conversation[]> {
    let query = this.db
      .selectFrom('conversations')
      .where('user_id', '=', userId)
      .where('workspace_id', '=', workspaceId)
      .selectAll()
      .orderBy('updated_at', 'desc');

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }

    const rows = await query.execute();
    const conversations: Conversation[] = [];

    for (const row of rows) {
      const messages = await this.db
        .selectFrom('messages')
        .where('conversation_id', '=', row.id)
        .selectAll()
        .orderBy('created_at', 'asc')
        .execute();

      conversations.push(
        Conversation.reconstitute(
          row.id,
          row.workspace_id,
          row.user_id,
          AgentKey.from(row.agent_key),
          row.created_at,
          row.updated_at ?? row.created_at,
          row.status as ConversationStatus,
          row.title,
          messages.map((m) =>
            Message.reconstitute(
              m.id,
              m.conversation_id,
              m.role as MessageRole,
              m.content,
              m.tokens_used,
              m.model_used,
              m.created_at,
            ),
          ),
        ),
      );
    }

    return conversations;
  }

  async save(conversation: Conversation): Promise<void> {
    await this.db
      .insertInto('conversations')
      .values({
        id: conversation.conversationId,
        workspace_id: conversation.workspaceId,
        user_id: conversation.userId,
        agent_key: conversation.agentKey.value,
        title: conversation.title,
        status: conversation.status,
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          title: conversation.title,
          status: conversation.status,
          updated_at: new Date(),
        }),
      )
      .execute();

    // Save new messages
    for (const message of conversation.messages) {
      await this.db
        .insertInto('messages')
        .values({
          id: message.messageId,
          conversation_id: message.conversationId,
          role: message.role,
          content: message.content,
          tokens_used: message.tokensUsed,
          model_used: message.modelUsed,
        })
        .onConflict((oc) => oc.column('id').doNothing())
        .execute();
    }
  }
}
