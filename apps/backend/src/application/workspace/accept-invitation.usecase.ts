import type { WorkspaceRepository } from '@flow-app/domain';

export interface AcceptInvitationCommand {
  workspaceId: string;
  userId: string;
}

export interface AcceptInvitationResult {
  workspaceId: string;
  userId: string;
  status: 'active';
}

export class AcceptInvitationUseCase {
  constructor(private readonly workspaceRepo: WorkspaceRepository) {}

  async execute(cmd: AcceptInvitationCommand): Promise<AcceptInvitationResult> {
    const workspace = await this.workspaceRepo.findById(cmd.workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    workspace.acceptInvitation(cmd.userId);
    await this.workspaceRepo.save(workspace);

    return {
      workspaceId: cmd.workspaceId,
      userId: cmd.userId,
      status: 'active',
    };
  }
}
