import type { Workspace, MembershipRole } from '@flow-app/domain';
import type { Request } from 'express';

export interface AuthUser {
  sub: string;
  email: string;
  role: string;
}

export function getAuthUser(req: Request): AuthUser | undefined {
  return (req as Request & { user?: AuthUser }).user;
}

export function setAuthUser(req: Request, user: AuthUser): void {
  (req as Request & { user?: AuthUser }).user = user;
}

declare global {
  namespace Express {
    interface Request {
      workspaceRole?: MembershipRole;
      workspace?: Workspace;
    }
  }
}
