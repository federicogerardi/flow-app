import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkspaceNotFoundError, type WorkspaceRepository } from '@flow-app/domain';
import { AcceptInvitationUseCase } from '../workspace/accept-invitation.usecase';

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
    acceptInvitation: vi.fn(),
    ...overrides,
  };
}

describe('AcceptInvitationUseCase', () => {
  let workspaceRepo: WorkspaceRepository;
  let useCase: AcceptInvitationUseCase;

  beforeEach(() => {
    workspaceRepo = createWorkspaceRepo();
    useCase = new AcceptInvitationUseCase(workspaceRepo);
  });

  const validCmd = {
    workspaceId: 'ws-1',
    userId: 'user-2',
  };

  it('valid accept transitions to active', async () => {
    const workspace = createWorkspace();
    vi.mocked(workspaceRepo.findById).mockResolvedValue(workspace as any);

    const result = await useCase.execute(validCmd);

    expect(workspaceRepo.findById).toHaveBeenCalledWith('ws-1');
    expect(workspace.acceptInvitation).toHaveBeenCalledWith('user-2');
    expect(workspaceRepo.save).toHaveBeenCalledWith(workspace);
    expect(result).toEqual({
      workspaceId: 'ws-1',
      userId: 'user-2',
      status: 'active',
    });
  });

  it('workspace not found throws WorkspaceNotFoundError', async () => {
    vi.mocked(workspaceRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(validCmd)).rejects.toThrow(WorkspaceNotFoundError);
    await expect(useCase.execute(validCmd)).rejects.toMatchObject({
      code: 'WORKSPACE_NOT_FOUND',
    });
  });
});
