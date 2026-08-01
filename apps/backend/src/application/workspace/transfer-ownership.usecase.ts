import type { WorkspaceRepository } from '@flow-app/domain';

export interface TransferOwnershipCommand {
  workspaceId: string;
  fromUserId: string;
  toUserId: string;
}

export interface TransferOwnershipResult {
  workspaceId: string;
  previousOwner: string;
  newOwner: string;
}

export class TransferOwnershipUseCase {
  constructor(private readonly workspaceRepo: WorkspaceRepository) {}

  async execute(cmd: TransferOwnershipCommand): Promise<TransferOwnershipResult> {
    const workspace = await this.workspaceRepo.findById(cmd.workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    workspace.transferOwnership(cmd.fromUserId, cmd.toUserId);
    await this.workspaceRepo.save(workspace);

    return {
      workspaceId: cmd.workspaceId,
      previousOwner: cmd.fromUserId,
      newOwner: cmd.toUserId,
    };
  }
}
