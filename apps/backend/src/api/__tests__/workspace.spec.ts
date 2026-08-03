import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWorkspaceRoutes } from '../workspaces.js';
import type { Request, Response } from 'express';

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    params: {},
    query: {},
    body: {},
    user: { sub: 'user-1', email: 'test@test.com', role: 'member' },
    log: { info: vi.fn(), error: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })) },
    workspace: null,
    ...overrides,
  } as unknown as Request;
}

function mockRes() {
  const res: Record<string, unknown> = {};
  res.json = vi.fn().mockReturnValue(res);
  res.status = vi.fn(() => res) as unknown as Response['status'];
  return res as unknown as Response;
}

function createMockWorkspaceRepo() {
  const workspaces = new Map();
  return {
    workspaces,
    findById: vi.fn(async (id: string) => workspaces.get(id) ?? null),
    findByMember: vi.fn(async (_userId: string) => Array.from(workspaces.values())),
    findPendingInvitations: vi.fn(async (_userId: string) => Array.from(workspaces.values())),
    save: vi.fn(async (w: Record<string, unknown>) => { workspaces.set(w.workspaceId, w); }),
  };
}

vi.mock('@flow-app/domain', async () => {
  const actual = await vi.importActual('@flow-app/domain');

  const membership = {
    userId: 'user-1',
    role: { toString: () => 'owner' },
    status: { toString: () => 'active' },
    joinedAt: new Date('2025-01-01'),
    invitedAt: new Date('2025-01-01'),
  };

  return {
    ...actual,
    Workspace: {
      create: vi.fn(() => {
        const now = new Date();
        return {
          workspaceId: 'w-new',
          name: 'Test Workspace',
          createdBy: 'user-1',
          createdAt: now,
          updatedAt: now,
          memberships: [membership],
          getMemberRole: vi.fn(() => ({ toString: () => 'owner' })),
          removeMember: vi.fn(),
          changeMemberRole: vi.fn(),
        };
      }),
    },
    MembershipRole: {
      Owner: { toString: () => 'owner' },
      Editor: { toString: () => 'editor' },
      Viewer: { toString: () => 'viewer' },
    },
    DomainError: class extends Error {
      code = 'DOMAIN_ERROR';
      retryable = false;
      constructor(message: string) { super(message); }
    },
  };
});

describe('Workspace Routes', () => {
  let routes: ReturnType<typeof createWorkspaceRoutes>;
  let workspaceRepo: ReturnType<typeof createMockWorkspaceRepo>;

  beforeEach(() => {
    vi.clearAllMocks();
    workspaceRepo = createMockWorkspaceRepo();
    routes = createWorkspaceRoutes(workspaceRepo);
  });

  describe('createWorkspace', () => {
    it('should return 201 with workspace data', async () => {
      const req = mockReq({ body: { name: 'My Workspace' } });
      const res = mockRes();
      const next = vi.fn();

      await routes.createWorkspace(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'w-new',
          name: 'Test Workspace',
        }),
      );
    });

    it('should return 422 when name is missing', async () => {
      const req = mockReq({ body: {} });
      const res = mockRes();
      const next = vi.fn();

      await routes.createWorkspace(req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
        }),
      );
    });
  });

  describe('listWorkspaces', () => {
    it("should return user's workspaces", async () => {
      workspaceRepo.workspaces.set('w-1', {
        workspaceId: 'w-1',
        name: 'Workspace 1',
        createdAt: new Date('2025-01-01'),
        getMemberRole: vi.fn(() => ({ toString: () => 'owner' })),
      });

      const req = mockReq();
      const res = mockRes();
      const next = vi.fn();

      await routes.listWorkspaces(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaces: expect.any(Array),
        }),
      );
    });
  });

  describe('getWorkspace', () => {
    it('should return workspace detail when req.workspace is set', async () => {
      const workspace = {
        workspaceId: 'w-1',
        name: 'My Workspace',
        createdBy: 'user-1',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
        memberships: [
          {
            userId: 'user-1',
            role: { toString: () => 'owner' },
            status: { toString: () => 'active' },
            joinedAt: new Date('2025-01-01'),
          },
        ],
      };

      const req = mockReq({ workspace });
      const res = mockRes();
      const next = vi.fn();

      await routes.getWorkspace(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'w-1',
          name: 'My Workspace',
          members: expect.any(Array),
        }),
      );
    });
  });

  describe('inviteMember', () => {
    it('should return 201', async () => {
      const req = mockReq({
        params: { id: 'w-1' },
        body: { userId: 'invited-1', role: 'editor' },
      });
      const res = mockRes();
      const next = vi.fn();

      workspaceRepo.workspaces.set('w-1', {
        workspaceId: 'w-1',
        name: 'Workspace',
        createdBy: 'user-1',
        memberships: [
          {
            userId: 'user-1',
            role: { toString: () => 'owner' },
            status: { toString: () => 'active' },
            joinedAt: new Date(),
          },
        ],
        inviteMember: vi.fn(),
      });

      await routes.inviteMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('acceptInvitation', () => {
    it('should return 200', async () => {
      workspaceRepo.workspaces.set('w-1', {
        workspaceId: 'w-1',
        name: 'Workspace',
        createdBy: 'owner-1',
        memberships: [
          {
            userId: 'user-1',
            role: { toString: () => 'editor' },
            status: { toString: () => 'pending' },
            joinedAt: null,
            invitedAt: new Date(),
          },
        ],
        acceptInvitation: vi.fn(),
      });

      const req = mockReq({ params: { id: 'w-1' }, user: { sub: 'user-1', email: 'invited@test.com', role: 'member' } });
      const res = mockRes();
      const next = vi.fn();

      await routes.acceptInvitation(req, res, next);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('listPendingInvitations', () => {
    it('should return pending invitations', async () => {
      workspaceRepo.workspaces.set('w-1', {
        workspaceId: 'w-1',
        name: 'Workspace 1',
        memberships: [
          {
            userId: 'user-1',
            role: { toString: () => 'editor' },
            status: { toString: () => 'pending' },
            invitedAt: new Date('2025-01-01'),
          },
        ],
      });

      const req = mockReq();
      const res = mockRes();
      const next = vi.fn();

      await routes.listPendingInvitations(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          invitations: expect.any(Array),
        }),
      );
    });
  });

  describe('removeMember', () => {
    it('should call workspace.removeMember', async () => {
      const workspace = {
        workspaceId: 'w-1',
        createdBy: 'user-1',
        removeMember: vi.fn(),
      };
      workspaceRepo.workspaces.set('w-1', workspace);

      const req = mockReq({
        params: { id: 'w-1', userId: 'member-1' },
      });
      const res = mockRes();
      const next = vi.fn();

      await routes.removeMember(req, res, next);

      expect(workspace.removeMember).toHaveBeenCalledWith('member-1', 'user-1');
      expect(res.json).toHaveBeenCalledWith({ message: 'Member removed' });
    });
  });
});
