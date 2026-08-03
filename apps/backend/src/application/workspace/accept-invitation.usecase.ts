import type { WorkspaceRepository } from '@flow-app/domain';
import { WorkspaceNotFoundError } from '@flow-app/domain';
import type { GamificationEventPublisher } from '../gamification/gamification-event-publisher.js';

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
  constructor(
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly gamificationEventPublisher: GamificationEventPublisher,
  ) {}

  async execute(cmd: AcceptInvitationCommand): Promise<AcceptInvitationResult> {
    const workspace = await this.workspaceRepo.findById(cmd.workspaceId);
    if (!workspace) throw new WorkspaceNotFoundError(cmd.workspaceId);

    workspace.acceptInvitation(cmd.userId);
    await this.workspaceRepo.save(workspace);

    // Gamification: award 75 XP to the inviter (not the joiner)
    const membership = workspace.memberships.find((m) => m.userId === cmd.userId);
    if (membership?.invitedBy) {
      this.gamificationEventPublisher.publishMemberJoined(cmd.workspaceId, membership.invitedBy)
        .catch(() => { /* fire-and-forget */ });
    }

    return {
      workspaceId: cmd.workspaceId,
      userId: cmd.userId,
      status: 'active',
    };
  }
}
