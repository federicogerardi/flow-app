import type { Session } from '../entities/Session';

export interface SessionRepository {
  findById(id: string): Promise<Session | null>;
  findByIdempotencyKeyHash(hash: string): Promise<Session | null>;
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
