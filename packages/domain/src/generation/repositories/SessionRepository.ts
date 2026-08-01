import type { Session } from '../entities/Session';

export interface SessionFilters {
  workspaceId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface SessionRepository {
  findById(id: string): Promise<Session | null>;
  findByIdempotencyKeyHash(hash: string): Promise<Session | null>;
  findByWorkspace(workspaceId: string, filters?: SessionFilters): Promise<Session[]>;
  save(session: Session): Promise<void>;
  /**
   * Save with optimistic locking. Throws ConcurrencyError if version doesn't match.
   * @param session - The session to update
   * @param expectedVersion - The version expected before update (conditional WHERE version = ?)
   */
  saveWithLock(session: Session, expectedVersion: number): Promise<void>;
  saveSnapshot(sessionId: string, snapshot: string): Promise<void>;
  loadSnapshot(sessionId: string): Promise<string | null>;
}
