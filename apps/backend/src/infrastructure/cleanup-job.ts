import type { Kysely } from 'kysely';
import type { DB } from '@flow-app/infra-db';
import { logger } from '../infrastructure/logger.js';

const log = logger.child({ component: 'cleanup-job' });

/**
 * Retention periods:
 * - Expired idempotency keys: deleted immediately (expires_at < now)
 * - Old session snapshots: keep 7 days
 * - Completed/failed sessions: keep 30 days (future — needs cascade on artifacts)
 */
export class CleanupJob {
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly db: Kysely<DB>) {}

  start(intervalMs: number = 3600_000): void {
    if (this.interval) return;

    // Run immediately on start
    this.run();

    this.interval = setInterval(() => {
      this.run();
    }, intervalMs);

    log.info({ intervalMs }, 'cleanup_job_started');
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      log.info('cleanup_job_stopped');
    }
  }

  async run(): Promise<void> {
    const start = Date.now();
    log.info('cleanup_started');

    try {
      const [expiredKeys, oldSnapshots] = await Promise.all([
        this.cleanupExpiredIdempotencyKeys(),
        this.cleanupOldSnapshots(),
      ]);

      log.info(
        {
          durationMs: Date.now() - start,
          expiredKeysDeleted: expiredKeys,
          oldSnapshotsDeleted: oldSnapshots,
        },
        'cleanup_completed',
      );
    } catch (err) {
      log.error({ err, durationMs: Date.now() - start }, 'cleanup_error');
    }
  }

  private async cleanupExpiredIdempotencyKeys(): Promise<number> {
    const result = await this.db
      .deleteFrom('idempotency_keys')
      .where('expires_at', '<', new Date())
      .executeTakeFirst();

    return Number(result.numDeletedRows);
  }

  private async cleanupOldSnapshots(): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await this.db
      .deleteFrom('session_snapshots')
      .where('created_at', '<', sevenDaysAgo)
      .executeTakeFirst();

    return Number(result.numDeletedRows);
  }
}
