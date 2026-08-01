import type { Conversation } from '../entities/Conversation';

export interface Pagination {
  limit?: number;
  offset?: number;
}

export interface ConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  findByUserAndWorkspace(userId: string, workspaceId: string, options?: Pagination): Promise<Conversation[]>;
  save(conversation: Conversation): Promise<void>;
}
