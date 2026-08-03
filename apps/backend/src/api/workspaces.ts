import type { Request, Response, NextFunction } from 'express';
import type { WorkspaceRepository } from '@flow-app/domain';
import { Workspace } from '@flow-app/domain';
import { InviteMemberUseCase } from '../application/workspace/invite-member.usecase.js';
import { AcceptInvitationUseCase } from '../application/workspace/accept-invitation.usecase.js';
import { TransferOwnershipUseCase } from '../application/workspace/transfer-ownership.usecase.js';
import { GamificationEventPublisher } from '../application/gamification/gamification-event-publisher.js';
import { getGamificationQueue } from '../generation/jobs/gamification-queue.js';

export function createWorkspaceRoutes(workspaceRepo: WorkspaceRepository, redisUrl: string) {
  const gamificationQueue = getGamificationQueue(redisUrl);
  const gamificationEventPublisher = new GamificationEventPublisher(gamificationQueue);
  const inviteMemberUC = new InviteMemberUseCase(workspaceRepo);
  const acceptInvitationUC = new AcceptInvitationUseCase(workspaceRepo, gamificationEventPublisher);
  const transferOwnershipUC = new TransferOwnershipUseCase(workspaceRepo);

  return {
    createWorkspace: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.user!.sub;
        const { name } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
          res.status(422).json({
            error: { code: 'VALIDATION_ERROR', message: 'Workspace name is required', retryable: false },
          });
          return;
        }

        const workspace = Workspace.create(name.trim(), userId);
        await workspaceRepo.save(workspace);

        res.status(201).json({
          id: workspace.workspaceId,
          name: workspace.name,
          createdBy: workspace.createdBy,
          createdAt: workspace.createdAt.toISOString(),
        });
      } catch (error) {
        next(error);
      }
    },

    listWorkspaces: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.user!.sub as string;
        const workspaces = await workspaceRepo.findByMember(userId);
        res.json({
          workspaces: workspaces.map((w) => ({
            id: w.workspaceId,
            name: w.name,
            role: w.getMemberRole(userId)?.toString(),
            createdAt: w.createdAt.toISOString(),
          })),
        });
      } catch (error) {
        next(error);
      }
    },

    getWorkspace: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const workspace = req.workspace!;
        res.json({
          id: workspace.workspaceId,
          name: workspace.name,
          createdBy: workspace.createdBy,
          createdAt: workspace.createdAt.toISOString(),
          updatedAt: workspace.updatedAt.toISOString(),
          members: workspace.memberships.map((m) => ({
            userId: m.userId,
            role: m.role.toString(),
            status: m.status.toString(),
            joinedAt: m.joinedAt?.toISOString() ?? null,
          })),
        });
      } catch (error) {
        next(error);
      }
    },

    inviteMember: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { userId, role } = req.body;
        const workspaceId = req.params.id as string;
        const invitedBy = req.user!.sub as string;

        const result = await inviteMemberUC.execute({
          workspaceId,
          userId,
          role,
          invitedBy,
        });

        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    },

    acceptInvitation: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const workspaceId = req.params.id as string;
        const userId = req.user!.sub as string;

        const result = await acceptInvitationUC.execute({ workspaceId, userId });
        res.json(result);
      } catch (error) {
        next(error);
      }
    },

    declineInvitation: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const workspaceId = req.params.id as string;
        const userId = req.user!.sub as string;

        const workspace = await workspaceRepo.findById(workspaceId);
        if (!workspace) {
          return res.status(404).json({
            error: { code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found', retryable: false },
          });
        }

        workspace.removeMember(userId, workspace.createdBy);
        await workspaceRepo.save(workspace);

        res.json({ message: 'Invitation declined' });
      } catch (error) {
        next(error);
      }
    },

    listMembers: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const workspace = req.workspace!;
        res.json({
          members: workspace.memberships.map((m) => ({
            userId: m.userId,
            role: m.role.toString(),
            status: m.status.toString(),
            invitedAt: m.invitedAt?.toISOString() ?? null,
            joinedAt: m.joinedAt?.toISOString() ?? null,
          })),
        });
      } catch (error) {
        next(error);
      }
    },

    removeMember: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const workspaceId = req.params.id as string;
        const memberUserId = req.params.userId as string;
        const removedBy = req.user!.sub as string;

        const workspace = await workspaceRepo.findById(workspaceId);
        if (!workspace) {
          return res.status(404).json({
            error: { code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found', retryable: false },
          });
        }

        workspace.removeMember(memberUserId, removedBy);
        await workspaceRepo.save(workspace);

        res.json({ message: 'Member removed' });
      } catch (error) {
        next(error);
      }
    },

    changeMemberRole: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const workspaceId = req.params.id as string;
        const memberUserId = req.params.userId as string;
        const { role } = req.body;
        const changedBy = req.user!.sub as string;

        const workspace = await workspaceRepo.findById(workspaceId);
        if (!workspace) {
          return res.status(404).json({
            error: { code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found', retryable: false },
          });
        }

        workspace.changeMemberRole(memberUserId, role, changedBy);
        await workspaceRepo.save(workspace);

        res.json({ message: 'Role updated' });
      } catch (error) {
        next(error);
      }
    },

    transferOwnership: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const workspaceId = req.params.id as string;
        const { toUserId } = req.body;
        const fromUserId = req.user!.sub as string;

        const result = await transferOwnershipUC.execute({
          workspaceId,
          fromUserId,
          toUserId,
        });

        res.json(result);
      } catch (error) {
        next(error);
      }
    },

    listPendingInvitations: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.user!.sub as string;
        const workspaces = await workspaceRepo.findPendingInvitations(userId);
        res.json({
          invitations: workspaces.map((w) => ({
            workspaceId: w.workspaceId,
            workspaceName: w.name,
            role: w.memberships.find((m) => m.userId === userId)?.role?.toString(),
            invitedAt: w.memberships.find((m) => m.userId === userId)?.invitedAt?.toISOString(),
          })),
        });
      } catch (error) {
        next(error);
      }
    },
  };
}
