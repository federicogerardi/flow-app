import type { Kysely } from 'kysely';
import type { DB } from '../types';
import { Session, ConcurrencyError, type SessionRepository, type SessionFilters } from '@flow-app/domain';

export class KyselySessionRepository implements SessionRepository {
  constructor(private readonly db: Kysely<DB>) {}

  async findById(id: string): Promise<Session | null> {
    const row = await this.db
      .selectFrom('sessions')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();

    if (!row) return null;

    return Session.reconstitute(
      row.id,
      row.tool_key as any,
      row.workspace_id,
      row.user_id,
      row.idempotency_key_hash,
      row.status as any,
      row.current_step_index,
      row.started_at,
      row.completed_at,
      row.error_code,
      row.error_message,
      row.version,
    );
  }

  async findByIdempotencyKeyHash(hash: string): Promise<Session | null> {
    const row = await this.db
      .selectFrom('idempotency_keys')
      .innerJoin('sessions', 'sessions.id', 'idempotency_keys.session_id')
      .where('idempotency_keys.key_hash', '=', hash)
      .where('idempotency_keys.expires_at', '>', new Date())
      .selectAll('sessions')
      .executeTakeFirst();

    if (!row) return null;

    return Session.reconstitute(
      row.id,
      row.tool_key as any,
      row.workspace_id,
      row.user_id,
      row.idempotency_key_hash,
      row.status as any,
      row.current_step_index,
      row.started_at,
      row.completed_at,
      row.error_code,
      row.error_message,
      row.version,
    );
  }

  async findByWorkspace(workspaceId: string, filters?: SessionFilters): Promise<Session[]> {
    let query = this.db
      .selectFrom('sessions')
      .where('workspace_id', '=', workspaceId);

    if (filters?.status) {
      query = query.where('status', '=', filters.status as any);
    }

    const rows = await query
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(filters?.limit ?? 50)
      .offset(filters?.offset ?? 0)
      .execute();

    return rows.map((row) =>
      Session.reconstitute(
        row.id,
        row.tool_key as any,
        row.workspace_id,
        row.user_id,
        row.idempotency_key_hash,
        row.status as any,
        row.current_step_index,
        row.started_at,
        row.completed_at,
        row.error_code,
        row.error_message,
        row.version,
      ),
    );
  }

  async save(session: Session): Promise<void> {
    await this.db
      .insertInto('sessions')
      .values({
        id: session.sessionId,
        tool_key: session.toolKey,
        workspace_id: session.workspaceId,
        user_id: session.userId,
        idempotency_key_hash: session.idempotencyKeyHash,
        status: session.status as any,
        current_step_index: session.currentStepIndex,
        started_at: session.startedAt,
        completed_at: session.completedAt,
        error_code: session.errorCode,
        error_message: session.errorMessage,
        version: session.version,
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          status: session.status as any,
          current_step_index: session.currentStepIndex,
          started_at: session.startedAt,
          completed_at: session.completedAt,
          error_code: session.errorCode,
          error_message: session.errorMessage,
          version: session.version,
          updated_at: new Date(),
        }),
      )
      .execute();
  }

  async saveWithLock(session: Session, expectedVersion: number): Promise<void> {
    const result = await this.db
      .updateTable('sessions')
      .set({
        status: session.status as any,
        current_step_index: session.currentStepIndex,
        started_at: session.startedAt,
        completed_at: session.completedAt,
        error_code: session.errorCode,
        error_message: session.errorMessage,
        version: session.version,
        updated_at: new Date(),
      })
      .where('id', '=', session.sessionId)
      .where('version', '=', expectedVersion)
      .executeTakeFirst();

    if (result.numUpdatedRows === 0n) {
      // Version mismatch — fetch actual version for error details
      const current = await this.db
        .selectFrom('sessions')
        .where('id', '=', session.sessionId)
        .select('version')
        .executeTakeFirst();

      throw new ConcurrencyError(
        session.sessionId,
        expectedVersion,
        current?.version ?? -1,
      );
    }
  }

  async saveIdempotencyKey(hash: string, sessionId: string): Promise<void> {
    await this.db
      .insertInto('idempotency_keys')
      .values({
        key_hash: hash,
        session_id: sessionId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .onConflict((oc) => oc.column('key_hash').doNothing())
      .execute();
  }

  async saveSnapshot(sessionId: string, snapshot: string): Promise<void> {
    await this.db
      .insertInto('session_snapshots')
      .values({
        session_id: sessionId,
        snapshot: JSON.parse(snapshot),
      })
      .execute();
  }

  async loadSnapshot(sessionId: string): Promise<string | null> {
    const row = await this.db
      .selectFrom('session_snapshots')
      .where('session_id', '=', sessionId)
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(1)
      .executeTakeFirst();

    return row ? JSON.stringify(row.snapshot) : null;
  }
}
