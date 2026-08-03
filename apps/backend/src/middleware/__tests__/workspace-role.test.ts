import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { MembershipRole, type WorkspaceRepository } from '@flow-app/domain';
import { requireWorkspaceRole } from '../workspace-role.js';

function createMocks() {
  const req = {
    params: {} as Record<string, string>,
    user: undefined as unknown,
    workspaceRole: undefined as unknown,
    workspace: undefined as unknown,
  } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

function createWorkspaceRepo() {
  return {
    findById: vi.fn(),
    findByMember: vi.fn(),
    save: vi.fn(),
    saveWithLock: vi.fn(),
    findMembership: vi.fn(),
    findPendingInvitations: vi.fn(),
  } as unknown as WorkspaceRepository;
}

function createWorkspace(getMemberRole: (userId: string) => MembershipRole | null) {
  return {
    id: 'ws-1',
    getMemberRole,
  };
}

describe('requireWorkspaceRole', () => {
  let workspaceRepo: WorkspaceRepository;
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    workspaceRepo = createWorkspaceRepo();
    const mocks = createMocks();
    req = mocks.req;
    res = mocks.res;
    next = mocks.next;
  });

  it('returns 401 when there is no auth user', async () => {
    (req as Record<string, unknown>).user = undefined;
    const middleware = requireWorkspaceRole(workspaceRepo, MembershipRole.Editor);

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required', retryable: false },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when workspaceId is not in params', async () => {
    (req as Record<string, unknown>).user = { sub: 'user-1', email: 'u@test.com', role: 'member' };
    const middleware = requireWorkspaceRole(workspaceRepo, MembershipRole.Editor);

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_ERROR', message: 'Workspace ID required', retryable: false },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 404 when workspace is not found', async () => {
    (req as Record<string, unknown>).user = { sub: 'user-1', email: 'u@test.com', role: 'member' };
    req.params = { workspaceId: 'ws-999' };
    vi.mocked(workspaceRepo.findById).mockResolvedValue(null);
    const middleware = requireWorkspaceRole(workspaceRepo, MembershipRole.Editor);

    await middleware(req, res, next);

    expect(workspaceRepo.findById).toHaveBeenCalledWith('ws-999');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found', retryable: false },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 with descriptive message when role is insufficient', async () => {
    (req as Record<string, unknown>).user = { sub: 'user-1', email: 'u@test.com', role: 'member' };
    req.params = { workspaceId: 'ws-1' };

    const workspace = createWorkspace((_userId) => MembershipRole.Viewer);
    vi.mocked(workspaceRepo.findById).mockResolvedValue(workspace as unknown as Parameters<typeof workspaceRepo.findById>[0] extends string ? ReturnType<typeof workspaceRepo.findById> : never);
    const middleware = requireWorkspaceRole(workspaceRepo, MembershipRole.Editor);

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'FORBIDDEN',
        message: 'Requires workspace role: [editor]. Your role: viewer.',
        retryable: false,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and sets req.workspaceRole + req.workspace when role is sufficient', async () => {
    (req as Record<string, unknown>).user = { sub: 'user-1', email: 'u@test.com', role: 'member' };
    req.params = { workspaceId: 'ws-1' };

    const workspace = createWorkspace((_userId) => MembershipRole.Editor);
    vi.mocked(workspaceRepo.findById).mockResolvedValue(workspace as unknown as Parameters<typeof workspaceRepo.findById>[0] extends string ? ReturnType<typeof workspaceRepo.findById> : never);
    const middleware = requireWorkspaceRole(workspaceRepo, MembershipRole.Editor);

    await middleware(req, res, next);

    expect(workspaceRepo.findById).toHaveBeenCalledWith('ws-1');
    expect(req.workspaceRole).toBe(MembershipRole.Editor);
    expect(req.workspace).toBe(workspace);
    expect(next).toHaveBeenCalled();
  });

  it('grants owner access when role matches', async () => {
    (req as Record<string, unknown>).user = { sub: 'user-1', email: 'u@test.com', role: 'member' };
    req.params = { workspaceId: 'ws-1' };

    const workspace = createWorkspace((_userId) => MembershipRole.Owner);
    vi.mocked(workspaceRepo.findById).mockResolvedValue(workspace as unknown as Parameters<typeof workspaceRepo.findById>[0] extends string ? ReturnType<typeof workspaceRepo.findById> : never);
    const middleware = requireWorkspaceRole(workspaceRepo, MembershipRole.Owner);

    await middleware(req, res, next);

    expect(req.workspaceRole).toBe(MembershipRole.Owner);
    expect(next).toHaveBeenCalled();
  });

  it('extracts workspaceId from req.params.id as fallback', async () => {
    (req as Record<string, unknown>).user = { sub: 'user-1', email: 'u@test.com', role: 'member' };
    req.params = { id: 'ws-from-id' };

    const workspace = createWorkspace((_userId) => MembershipRole.Editor);
    vi.mocked(workspaceRepo.findById).mockResolvedValue(workspace as unknown as Parameters<typeof workspaceRepo.findById>[0] extends string ? ReturnType<typeof workspaceRepo.findById> : never);
    const middleware = requireWorkspaceRole(workspaceRepo, MembershipRole.Editor);

    await middleware(req, res, next);

    expect(workspaceRepo.findById).toHaveBeenCalledWith('ws-from-id');
    expect(next).toHaveBeenCalled();
  });

  it('handles unexpected errors with 500', async () => {
    (req as Record<string, unknown>).user = { sub: 'user-1', email: 'u@test.com', role: 'member' };
    req.params = { workspaceId: 'ws-1' };
    vi.mocked(workspaceRepo.findById).mockRejectedValue(new Error('DB connection lost'));

    const middleware = requireWorkspaceRole(workspaceRepo, MembershipRole.Editor);

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to check workspace permissions', retryable: true },
    });
    expect(next).not.toHaveBeenCalled();
  });
});
