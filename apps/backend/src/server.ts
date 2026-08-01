import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local'), override: true });
import { validateConfig } from './config.js';
import { createApp } from './app.js';
import { logger } from './infrastructure/logger.js';
import { createDatabase } from '@flow-app/infra-db';
import { KyselySessionRepository, KyselyWorkspaceRepository } from '@flow-app/infra-db';
import { JobEventBridge } from './infrastructure/job-event-bridge.js';
import { getSessionQueue } from './generation/jobs/enqueue-session.job.js';
import { CleanupJob } from './infrastructure/cleanup-job.js';

const config = validateConfig();

const db = createDatabase(config.DATABASE_URL);
const sessionRepo = new KyselySessionRepository(db);
const workspaceRepo = new KyselyWorkspaceRepository(db);
const eventBridge = new JobEventBridge(config.REDIS_URL);
const queue = getSessionQueue(config.REDIS_URL);

const cleanupJob = new CleanupJob(db);
cleanupJob.start();

const app = createApp({ sessionRepo, workspaceRepo, eventBridge, queue });

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, 'Server started');
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  cleanupJob.stop();
  await queue.close();
  await eventBridge.close();
  await db.destroy();
  process.exit(0);
});
