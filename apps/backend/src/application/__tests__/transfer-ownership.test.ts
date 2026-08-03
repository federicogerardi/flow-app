import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkspaceNotFoundError, type WorkspaceRepository } from '@flow-app/domain';
import { TransferOwnershipUseCase } from '../workspace/transfer-ownership.usecase';

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
    transferOwnership: vi.fn(),
    ...overrides,
  };
}

describe('TransferOwnershipUseCase', () => {
  let workspaceRepo: WorkspaceRepository;
  let useCase: TransferOwnershipUseCase;

  beforeEach(() => {
    workspaceRepo = createWorkspaceRepo();
    useCase = new TransferOwnershipUseCase(workspaceRepo);
  });

  const validCmd = {
    workspaceId: 'ws-1',
    fromUserId: 'user-1',
    toUserId: 'user-2',
  };

  it('valid transfer swaps roles', async () => {
    const workspace = createWorkspace();
    vi.mocked(workspaceRepo.findById).mockResolvedValue(workspace as any);

    const result = await useCase.execute(validCmd);

    expect(workspaceRepo.findById).toHaveBeenCalledWith('ws-1');
    expect(workspace.transferOwnership).toHaveBeenCalledWith('user-1', 'user-2');
    expect(workspaceRepo.save).toHaveBeenCalledWith(workspace);
    expect(result).toEqual({
      workspaceId: 'ws-1',
      previousOwner: 'user-1',
      newOwner: 'user-2',
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
