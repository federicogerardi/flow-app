import type { Request, Response, NextFunction } from 'express';

const SEED_USER_ID = process.env.SEED_USER_ID ?? '00000000-0000-0000-0000-000000000001';

export function devAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!(req as any).user) {
    (req as any).user = { sub: SEED_USER_ID };
  }
  next();
}
