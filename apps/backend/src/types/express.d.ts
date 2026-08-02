import type { Workspace } from '@flow-app/domain';

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
      };
      workspace?: Workspace;
    }
  }
}

export {};
