import type { Request, Response, NextFunction } from 'express';
import { setAuthUser, getAuthUser } from './auth-types.js';

export function devAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!getAuthUser(req)) {
    const seedUserId = process.env.SEED_USER_ID ?? '00000000-0000-0000-0000-000000000001';
    setAuthUser(req, { sub: seedUserId, email: 'dev@flow-app.local', role: 'member' });
  }
  next();
}
