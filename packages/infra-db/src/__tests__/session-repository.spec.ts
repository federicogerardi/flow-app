import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { KyselySessionRepository } from '../repositories/session-repository.js';
import { Session, ToolKey, SessionStatus, ConcurrencyError } from '@flow-app/domain';
import { createTestDb } from '../../test/setup.js';
import type { Kysely } from 'kysely';
import type { DB } from '../types.js';

describe('KyselySessionRepository', () => {
  let db: Kysely<DB>;
  let repo: KyselySessionRepository;

  beforeAll(async () => {
    db = createTestDb();
    repo = new KyselySessionRepository(db);

    await db.insertInto('users').values({
      id: '20000000-0000-0000-0000-000000000001',
      email: 'test@example.com',
    }).onConflict((oc) => oc.column('id').doNothing()).execute();

    await db.insertInto('users').values({
      id: '20000000-0000-0000-0000-000000000002',
      email: 'other@example.com',
    }).onConflict((oc) => oc.column('id').doNothing()).execute();

    await db.insertInto('workspaces').values({
      id: '10000000-0000-0000-0000-000000000001',
      created_by: '20000000-0000-0000-0000-000000000001',
      name: 'Test Workspace',
    }).onConflict((oc) => oc.column('id').doNothing()).execute();

    await db.insertInto('workspaces').values({
      id: '10000000-0000-0000-0000-000000000002',
      created_by: '20000000-0000-0000-0000-000000000002',
      name: 'Other Workspace',
    }).onConflict((oc) => oc.column('id').doNothing()).execute();
  });

  beforeEach(async () => {
    await db.deleteFrom('idempotency_keys').execute();
    await db.deleteFrom('artifacts').execute();
    await db.deleteFrom('session_snapshots').execute();
    await db.deleteFrom('sessions').execute();
    await db.deleteFrom('conversations').execute();
    await db.deleteFrom('workspace_memberships').execute();
  });

  describe('save() and findById()', () => {
    it('should insert and retrieve a session with all fields', async () => {
      const session = Session.create(ToolKey.BlogPost, '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001');
      await repo.save(session);

      const found = await repo.findById(session.sessionId);
      expect(found).not.toBeNull();
      expect(found!.sessionId).toBe(session.sessionId);
      expect(found!.toolKey).toBe(ToolKey.BlogPost);
      expect(found!.workspaceId).toBe('10000000-0000-0000-0000-000000000001');
      expect(found!.userId).toBe('20000000-0000-0000-0000-000000000001');
      expect(found!.idempotencyKeyHash).toBe('a0000000-0000-0000-0000-000000000001');
      expect(found!.status).toBe(SessionStatus.Draft);
      expect(found!.currentStepIndex).toBe(0);
      expect(found!.version).toBe(1);
      expect(found!.startedAt).toBeNull();
      expect(found!.completedAt).toBeNull();
      expect(found!.errorCode).toBeNull();
      expect(found!.errorMessage).toBeNull();
    });
  });

  describe('saveWithLock()', () => {
    it('should succeed with matching expected version', async () => {
      const session = Session.create(ToolKey.BlogPost, '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001');
      await repo.save(session);

      await expect(repo.saveWithLock(session, 1)).resolves.toBeUndefined();
    });

    it('should throw ConcurrencyError on stale version', async () => {
      const session = Session.create(ToolKey.BlogPost, '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001');
      await repo.save(session);

      await db
        .updateTable('sessions')
        .set({ version: 5 })
        .where('id', '=', session.sessionId)
        .execute();

      await expect(repo.saveWithLock(session, 1)).rejects.toThrow(ConcurrencyError);
    });
  });

  describe('findByIdempotencyKeyHash()', () => {
    it('should return session when found', async () => {
      const session = Session.create(ToolKey.BlogPost, '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001');
      await repo.save(session);
      await repo.saveIdempotencyKey('a0000000-0000-0000-0000-000000000001', session.sessionId);

      const found = await repo.findByIdempotencyKeyHash('a0000000-0000-0000-0000-000000000001');
      expect(found).not.toBeNull();
      expect(found!.sessionId).toBe(session.sessionId);
    });

    it('should return null when not found', async () => {
      const found = await repo.findByIdempotencyKeyHash('a0000000-0000-0000-0000-000000000099');
      expect(found).toBeNull();
    });
  });

  describe('findByWorkspace()', () => {
    it('should return sessions scoped to workspace', async () => {
      const session1 = Session.create(ToolKey.BlogPost, '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001');
      const session2 = Session.create(ToolKey.AdCopy, '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002');
      await repo.save(session1);
      await repo.save(session2);

      const ws1Sessions = await repo.findByWorkspace('10000000-0000-0000-0000-000000000001');
      expect(ws1Sessions).toHaveLength(1);
      expect(ws1Sessions[0].sessionId).toBe(session1.sessionId);

      const ws2Sessions = await repo.findByWorkspace('10000000-0000-0000-0000-000000000002');
      expect(ws2Sessions).toHaveLength(1);
      expect(ws2Sessions[0].sessionId).toBe(session2.sessionId);
    });
  });

  describe('findAll()', () => {
    it('should return all sessions', async () => {
      const session1 = Session.create(ToolKey.BlogPost, '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001');
      const session2 = Session.create(ToolKey.AdCopy, '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002');
      await repo.save(session1);
      await repo.save(session2);

      const all = await repo.findAll();
      expect(all).toHaveLength(2);
    });
  });

  describe('saveSnapshot() and loadSnapshot()', () => {
    it('should round-trip snapshot JSON', async () => {
      const session = Session.create(ToolKey.BlogPost, '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001');
      await repo.save(session);

      const snapshot = JSON.stringify({ state: 'running', step: 2 });
      await repo.saveSnapshot(session.sessionId, snapshot);

      const loaded = await repo.loadSnapshot(session.sessionId);
      expect(JSON.parse(loaded!)).toEqual({ state: 'running', step: 2 });
    });
  });

  describe('saveIdempotencyKey()', () => {
    it('should not throw on duplicate (ON CONFLICT DO NOTHING)', async () => {
      const session = Session.create(ToolKey.BlogPost, '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001');
      await repo.save(session);

      await repo.saveIdempotencyKey('a0000000-0000-0000-0000-000000000001', session.sessionId);
      await expect(
        repo.saveIdempotencyKey('a0000000-0000-0000-0000-000000000001', session.sessionId),
      ).resolves.toBeUndefined();
    });
  });
});
