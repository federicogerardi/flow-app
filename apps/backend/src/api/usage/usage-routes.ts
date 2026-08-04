import { Router } from 'express';
import type { QuotaRepository } from '@flow-app/domain';
import { getAuthUser } from '../../middleware/auth-types.js';

export function createUsageRoutes(quotaRepo: QuotaRepository) {
  const router = Router();

  router.get('/credits', async (req, res, next) => {
    try {
      const userId = getAuthUser(req)!.sub;
      const quota = await quotaRepo.findCurrent(userId);

      if (!quota) {
        return res.json({
          credits: { used: 0, limit: 250, remaining: 250, percent: 0 },
          artifacts: { used: 0, limit: 1000, remaining: 1000 },
          plan: 'free',
        });
      }

      res.json({
        credits: {
          used: quota.creditConsumed,
          limit: quota.plan.creditLimit,
          remaining: quota.remainingCredits,
          percent: quota.creditUsagePercent,
        },
        artifacts: {
          used: quota.artifactCount,
          limit: quota.plan.artifactLimit,
          remaining: quota.remainingArtifacts,
        },
        plan: quota.plan.type.toString(),
        period: quota.period.toString(),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
