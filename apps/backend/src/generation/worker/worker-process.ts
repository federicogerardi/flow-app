import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local'), override: true });

import { validateConfig } from '../../config.js';
import { logger } from '../../infrastructure/logger.js';
import { createDatabase } from '@flow-app/infra-db';
import { KyselySessionRepository } from '@flow-app/infra-db';
import { JobEventBridge } from '../../infrastructure/job-event-bridge.js';
import { createSessionWorker } from './session-worker.js';

const config = validateConfig();
const log = logger.child({ component: 'worker-process' });

const db = createDatabase(config.DATABASE_URL);
const sessionRepo = new KyselySessionRepository(db);
const eventBridge = new JobEventBridge(config.REDIS_URL);

const worker = createSessionWorker({ sessionRepo, eventBridge });

log.info('Worker started');

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  log.info({ signal }, 'graceful_shutdown_started');
  const shutdownStart = Date.now();

  try {
    // Pause worker — finish active jobs but accept no new ones
    await worker.pause();

    // Wait for active jobs to finish (30s timeout)
    const timeout = 30_000;
    const deadline = Date.now() + timeout;

    while (worker.isRunning() && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
    }

    // Close worker connection
    await worker.close();
    await eventBridge.close();
    await db.destroy();

    log.info(
      { durationMs: Date.now() - shutdownStart },
      'graceful_shutdown_completed',
    );

    process.exit(0);
  } catch (err) {
    log.error({ err, durationMs: Date.now() - shutdownStart }, 'graceful_shutdown_error');
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
