import { Worker, type Job } from 'bullmq';
import {
  XPCalculator,
  AchievementEvaluator,
  ConcurrencyError,
  ALL_BADGES,
  ALL_CHALLENGES,
  ChallengeKey,
  InfrastructureError,
} from '@flow-app/domain';
import type { PlayerProfileRepository } from '@flow-app/domain';
import type { WorkspaceChallengeRepository } from '@flow-app/domain';
import type { GamificationEventJob } from './gamification-event-publisher';
import type { ProcessedEventRepository } from '../../infrastructure/processed-event-repository';
import type { XPTransactionRepository } from '../../infrastructure/xp-transaction-repository';
import type { LeaderboardProjectionRepository } from '../../infrastructure/leaderboard-projection-repository';
import type { GamificationStatsRepository } from '../../infrastructure/gamification-stats-repository';
import { logger } from '../../infrastructure/logger';
import { SeasonId } from '@flow-app/domain';

export interface GamificationWorkerDeps {
  playerProfileRepo: PlayerProfileRepository;
  workspaceChallengeRepo: WorkspaceChallengeRepository;
  processedEventRepo: ProcessedEventRepository;
  xpTransactionRepo: XPTransactionRepository;
  leaderboardRepo: LeaderboardProjectionRepository;
  gamificationStatsRepo: GamificationStatsRepository;
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Retry an operation on ConcurrencyError with exponential backoff. */
async function withOptimisticRetry<T>(maxAttempts: number, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof ConcurrencyError) {
        lastError = err;
        await sleep(100 * Math.pow(2, attempt));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createGamificationWorker(deps: GamificationWorkerDeps): Worker<GamificationEventJob> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new InfrastructureError('REDIS_URL not set');

  return new Worker<GamificationEventJob>(
    'gamification-events',
    async (job: Job<GamificationEventJob>) => {
      await processGamificationEvent(job, deps);
    },
    {
      connection: { url: redisUrl },
      concurrency: 3,
      limiter: { max: 5, duration: 1000 },
      lockDuration: 120_000,
      stalledInterval: 30_000,
      maxStalledCount: 2,
    },
  );
}

async function processGamificationEvent(
  job: Job<GamificationEventJob>,
  deps: GamificationWorkerDeps,
): Promise<void> {
  const { eventType, eventId, userId, workspaceId, payload } = job.data;
  const log = logger.child({ eventType, eventId, userId, jobId: job.id });

  // 1. Deduplication — atomic INSERT ON CONFLICT DO NOTHING
  const claimed = await deps.processedEventRepo.tryClaim(eventId);
  if (!claimed) {
    log.debug('gamification_event_skipped_duplicate');
    return;
  }

  try {
    // 2. Calculate XP
    const xpAmount = XPCalculator.xpFor(eventType);
    if (xpAmount === 0) return;

    // 3. Load/create PlayerProfile with retry-on-conflict
    const result = await withOptimisticRetry(3, async () => {
      const p = await deps.playerProfileRepo.findOrCreate(userId);
      const expectedVersion = p.version;  // Capture BEFORE mutations

      const events = p.addXP(xpAmount, eventType.toLowerCase());
      const streakEvent = p.recordActivity(todayUTC());

      // 4. Persist (aggregate + achievements only — Rule 5)
      // WHERE version = expectedVersion, SET version = p.version
      await deps.playerProfileRepo.saveWithLock(p, expectedVersion);

      return { player: p, events, streakEvent };
    });

    // 5. XP transaction log (separate from save() — Rule 5)
    await deps.xpTransactionRepo.insert({
      userId,
      amount: xpAmount,
      source: eventType.toLowerCase(),
      sourceId: eventId,
      workspaceId,
      seasonId: SeasonId.current().value,
    });

    // 6. Evaluate achievements (with pre-queried all-time stats for counters)
    const allTimeStats = await deps.gamificationStatsRepo.getStats(userId);
    const evaluator = new AchievementEvaluator(ALL_BADGES);
    const newAchievements = evaluator.evaluate(
      result.player,
      eventType,
      payload as Record<string, unknown>,
      allTimeStats,
    );

    // Persist newly unlocked achievements through the aggregate
    if (newAchievements.length > 0) {
      await deps.playerProfileRepo.save(result.player);
    }

    // 7. Workspace challenge contribution
    if (workspaceId) {
      await contributeToChallenges(deps, workspaceId, userId, eventType);
    }

    // 8. Leaderboard update (separate from save() — Rule 5)
    await deps.leaderboardRepo.incrementXP(
      userId,
      workspaceId,
      xpAmount,
      SeasonId.current().value,
    );

    log.info(
      {
        xpAwarded: xpAmount,
        newTotal: result.player.xpTotal,
        level: result.player.level.value,
        badgesUnlocked: newAchievements.length,
      },
      'gamification_event_processed',
    );
  } catch (err) {
    if (err instanceof ConcurrencyError) {
      log.warn({ err }, 'gamification_concurrency_retry');
      throw err; // rethrow for BullMQ retry
    }
    log.error({ err }, 'gamification_event_failed');
    throw err;
  }
}

async function contributeToChallenges(
  deps: GamificationWorkerDeps,
  workspaceId: string,
  _userId: string,
  eventType: string,
): Promise<void> {
  // Only session completions contribute to challenges
  if (eventType !== 'SessionCompleted') return;

  const weekStart = getMondayUTC();
  const challenges = ALL_CHALLENGES.filter(
    (c) => c.metric === 'sessions',
  );

  for (const ch of challenges) {
    try {
      const challenge = await deps.workspaceChallengeRepo.findOrCreate(
        workspaceId,
        ChallengeKey.from(ch.key.value),
        ch.target,
        weekStart,
      );

      challenge.contribute(1);
      await deps.workspaceChallengeRepo.save(challenge);
    } catch {
      // Challenge contribution failure should not block gamification processing
    }
  }
}

function getMondayUTC(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  return d.toISOString().slice(0, 10);
}
