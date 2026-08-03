import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { KyselyWorkspaceRepository } from '../repositories/workspace-repository.js';
import { Workspace, MembershipRole, MembershipStatus, ConcurrencyError } from '@flow-app/domain';
import { createTestDb } from '../../test/setup.js';
import type { Kysely } from 'kysely';
import type { DB } from '../types.js';

describe('KyselyWorkspaceRepository', () => {
  let db: Kysely<DB>;
  let repo: KyselyWorkspaceRepository;

  beforeAll(async () => {
    db = createTestDb();
    repo = new KyselyWorkspaceRepository(db);

    await db.insertInto('users').values({
      id: '20000000-0000-0000-0000-000000000001',
      email: 'owner@example.com',
    }).onConflict((oc) => oc.column('id').doNothing()).execute();

    await db.insertInto('users').values({
      id: '20000000-0000-0000-0000-000000000002',
      email: 'invited@example.com',
    }).onConflict((oc) => oc.column('id').doNothing()).execute();

    await db.insertInto('users').values({
      id: '20000000-0000-0000-0000-000000000003',
      email: 'nonmember@example.com',
    }).onConflict((oc) => oc.column('id').doNothing()).execute();

    await db.insertInto('users').values({
      id: '20000000-0000-0000-0000-000000000004',
      email: 'outsider@example.com',
    }).onConflict((oc) => oc.column('id').doNothing()).execute();
  });

  beforeEach(async () => {
    // Only clean memberships — workspaces are shared prerequisites across test files
    await db.deleteFrom('workspace_memberships').execute();
  });

  describe('save() and findById()', () => {
    it('should persist workspace with owner membership', async () => {
      const workspace = Workspace.create('TestWS', '20000000-0000-0000-0000-000000000001');
      await repo.save(workspace);

      const found = await repo.findById(workspace.workspaceId);
      expect(found).not.toBeNull();
      expect(found!.name).toBe('TestWS');
      expect(found!.isOwner('20000000-0000-0000-0000-000000000001')).toBe(true);
    });

    it('should retrieve workspace with populated memberships', async () => {
      const workspace = Workspace.create('TestWS', '20000000-0000-0000-0000-000000000001');
      await repo.save(workspace);

      const found = await repo.findById(workspace.workspaceId);
      expect(found!.memberships).toHaveLength(1);
      expect(found!.memberships[0].userId).toBe('20000000-0000-0000-0000-000000000001');
      expect(found!.memberships[0].role).toBe(MembershipRole.Owner);
      expect(found!.memberships[0].status).toBe(MembershipStatus.Active);
    });
  });

  describe('findByMember()', () => {
    it('should return workspaces the user belongs to', async () => {
      const workspace = Workspace.create('TestWS', '20000000-0000-0000-0000-000000000001');
      await repo.save(workspace);

      const workspaces = await repo.findByMember('20000000-0000-0000-0000-000000000001');
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].name).toBe('TestWS');
    });

    it('should return empty for non-member', async () => {
      const workspace = Workspace.create('TestWS', '20000000-0000-0000-0000-000000000001');
      await repo.save(workspace);

      const workspaces = await repo.findByMember('ffffffff-ffff-ffff-ffff-ffffffffffff');
      expect(workspaces).toHaveLength(0);
    });
  });

  describe('saveWithLock()', () => {
    it('should succeed with matching expected version', async () => {
      const workspace = Workspace.create('TestWS', '20000000-0000-0000-0000-000000000001');
      await repo.save(workspace);

      await expect(repo.saveWithLock(workspace, 1)).resolves.toBeUndefined();
    });

    it('should throw ConcurrencyError on stale version', async () => {
      const workspace = Workspace.create('TestWS', '20000000-0000-0000-0000-000000000001');
      await repo.save(workspace);

      await db
        .updateTable('workspaces')
        .set({ version: 5 })
        .where('id', '=', workspace.workspaceId)
        .execute();

      await expect(repo.saveWithLock(workspace, 1)).rejects.toThrow(ConcurrencyError);
    });
  });

  describe('findMembership()', () => {
    it('should return individual membership row', async () => {
      const workspace = Workspace.create('TestWS', '20000000-0000-0000-0000-000000000001');
      await repo.save(workspace);

      const membership = await repo.findMembership(workspace.workspaceId, '20000000-0000-0000-0000-000000000001');
      expect(membership).not.toBeNull();
      expect(membership!.role).toBe(MembershipRole.Owner);
      expect(membership!.status).toBe(MembershipStatus.Active);
    });

    it('should return null for non-member', async () => {
      const workspace = Workspace.create('TestWS', '20000000-0000-0000-0000-000000000001');
      await repo.save(workspace);

      const membership = await repo.findMembership(workspace.workspaceId, 'ffffffff-ffff-ffff-ffff-ffffffffffff');
      expect(membership).toBeNull();
    });
  });

  describe('findPendingInvitations()', () => {
    it('should return only invited memberships', async () => {
      const workspace = Workspace.create('TestWS', '20000000-0000-0000-0000-000000000001');
      workspace.inviteMember('20000000-0000-0000-0000-000000000003', MembershipRole.Editor, '20000000-0000-0000-0000-000000000001');
      await repo.save(workspace);

      const pending = await repo.findPendingInvitations('20000000-0000-0000-0000-000000000003');
      expect(pending).toHaveLength(1);
      expect(pending[0].name).toBe('TestWS');

      const active = await repo.findByMember('20000000-0000-0000-0000-000000000003');
      expect(active).toHaveLength(0);
    });
  });
});
