import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MembershipRole,
  WorkspaceNotFoundError,
  NotWorkspaceOwnerError,
  type WorkspaceRepository,
} from '@flow-app/domain';
import { InviteMemberUseCase } from '../workspace/invite-member.usecase';

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

function createWorkspace(overrides: Record<string, unknown> = {}) {
  return {
    workspaceId: 'ws-1',
    inviteMember: vi.fn(),
    save: vi.fn(),
    ...overrides,
  };
}

describe('InviteMemberUseCase', () => {
  let workspaceRepo: WorkspaceRepository;
  let useCase: InviteMemberUseCase;

  beforeEach(() => {
    workspaceRepo = createWorkspaceRepo();
    useCase = new InviteMemberUseCase(workspaceRepo);
  });

  const validCmd = {
    workspaceId: 'ws-1',
    userId: 'user-2',
    role: MembershipRole.Editor,
    invitedBy: 'user-1',
  };

  it('valid invite creates membership by calling workspace.inviteMember', async () => {
    const workspace = createWorkspace();
    vi.mocked(workspaceRepo.findById).mockResolvedValue(workspace as any);

    const result = await useCase.execute(validCmd);

    expect(workspaceRepo.findById).toHaveBeenCalledWith('ws-1');
    expect(workspace.inviteMember).toHaveBeenCalledWith('user-2', MembershipRole.Editor, 'user-1');
    expect(workspaceRepo.save).toHaveBeenCalledWith(workspace);
    expect(result).toEqual({
      workspaceId: 'ws-1',
      userId: 'user-2',
      role: MembershipRole.Editor,
      status: 'invited',
    });
  });

  it('workspace not found throws WorkspaceNotFoundError', async () => {
    vi.mocked(workspaceRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(validCmd)).rejects.toThrow(WorkspaceNotFoundError);
    await expect(useCase.execute(validCmd)).rejects.toMatchObject({
      code: 'WORKSPACE_NOT_FOUND',
    });
  });

  it('non-owner caller throws NotWorkspaceOwnerError (propagated from domain)', async () => {
    const workspace = createWorkspace({
      inviteMember: vi.fn().mockImplementation(() => {
        throw new NotWorkspaceOwnerError('user-1', 'ws-1');
      }),
    });
    vi.mocked(workspaceRepo.findById).mockResolvedValue(workspace as any);

    await expect(useCase.execute(validCmd)).rejects.toThrow(NotWorkspaceOwnerError);
    await expect(useCase.execute(validCmd)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(workspaceRepo.save).not.toHaveBeenCalled();
  });
});
