import type { WorkspaceRepository, MembershipRole } from '@flow-app/domain';

export interface InviteMemberCommand {
  workspaceId: string;
  userId: string;
  role: MembershipRole;
  invitedBy: string;
}

export interface InviteMemberResult {
  workspaceId: string;
  userId: string;
  role: MembershipRole;
  status: 'invited';
}

export class InviteMemberUseCase {
  constructor(private readonly workspaceRepo: WorkspaceRepository) {}

  async execute(cmd: InviteMemberCommand): Promise<InviteMemberResult> {
    const workspace = await this.workspaceRepo.findById(cmd.workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    workspace.inviteMember(cmd.userId, cmd.role, cmd.invitedBy);
    await this.workspaceRepo.save(workspace);

    return {
      workspaceId: cmd.workspaceId,
      userId: cmd.userId,
      role: cmd.role,
      status: 'invited',
    };
  }
}
