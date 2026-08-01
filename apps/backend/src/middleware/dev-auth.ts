import type { Request, Response, NextFunction } from 'express';

export function devAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!(req as any).user) {
    const seedUserId = process.env.SEED_USER_ID ?? '00000000-0000-0000-0000-000000000001';
    (req as any).user = { sub: seedUserId };
  }
  next();
}
