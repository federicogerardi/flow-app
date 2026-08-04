import {
  type QuotaRepository,
  QuotaPeriod,
  Plan,
  Quota,
  ConcurrencyError,
  getTool,
  ToolKey,
} from '@flow-app/domain';
import { logger } from '../../infrastructure/logger.js';

export interface ConsumeCreditsCommand {
  userId: string;
  sessionId: string;
  toolKey: string;
}

export interface ConsumeCreditsResult {
  consumed: number;
  remainingCredits: number;
  quota: Quota;
}

async function withOptimisticRetry<T>(maxAttempts: number, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof ConcurrencyError && attempt < maxAttempts) {
        logger.warn({ attempt, maxAttempts }, 'consume_credits_retry');
        continue;
      }
      throw error;
    }
  }
  throw new Error('Unreachable: max retry attempts exceeded');
}

export class ConsumeCreditsUseCase {
  constructor(private readonly quotaRepo: QuotaRepository) {}

  async execute(cmd: ConsumeCreditsCommand): Promise<ConsumeCreditsResult> {
    const tool = getTool(ToolKey.from(cmd.toolKey));
    const creditCost = tool?.creditCost ?? 1;

    return withOptimisticRetry(3, async () => {
      let quota = await this.quotaRepo.findCurrent(cmd.userId);

      if (!quota) {
        // Auto-create quota on first use in the current period
        quota = Quota.create(cmd.userId, QuotaPeriod.current(), Plan.free());
        await this.quotaRepo.save(quota);
      }

      const expectedVersion = quota.version;

      quota.consumeCredits(creditCost, cmd.sessionId);
      await this.quotaRepo.saveWithLock(quota, expectedVersion);

      logger.info(
        {
          userId: cmd.userId,
          sessionId: cmd.sessionId,
          creditCost,
          remainingCredits: quota.remainingCredits,
          creditUsagePercent: quota.creditUsagePercent,
        },
        'credits_consumed',
      );

      return {
        consumed: creditCost,
        remainingCredits: quota.remainingCredits,
        quota,
      };
    });
  }
}
