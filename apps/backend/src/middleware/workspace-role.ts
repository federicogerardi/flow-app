import type { Request, Response, NextFunction } from 'express';
import type { WorkspaceRepository, MembershipRole } from '@flow-app/domain';
import { logger } from '../infrastructure/logger.js';

export function requireWorkspaceRole(
  workspaceRepo: WorkspaceRepository,
  ...roles: MembershipRole[]
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.sub;
      if (!userId) {
        res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required', retryable: false },
        });
        return;
      }

      const workspaceId = (req.params.workspaceId || req.params.id) as string;
      if (!workspaceId) {
        res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Workspace ID required', retryable: false },
        });
        return;
      }

      const workspace = await workspaceRepo.findById(workspaceId);
      if (!workspace) {
        res.status(404).json({
          error: { code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found', retryable: false },
        });
        return;
      }

      const memberRole = workspace.getMemberRole(userId);
      if (!memberRole || !roles.includes(memberRole)) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Requires workspace role: [${roles.join(', ')}]. Your role: ${memberRole ?? 'none'}.`,
            retryable: false,
          },
        });
        return;
      }

      (req as any).workspaceRole = memberRole;
      (req as any).workspace = workspace;
      next();
    } catch (err) {
      logger.error({ err }, 'workspace_role_check_error');
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to check workspace permissions', retryable: true },
      });
    }
  };
}
