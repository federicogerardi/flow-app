import 'dotenv/config';
import { validateConfig } from './config.js';
import { createApp } from './app.js';
import { logger } from './infrastructure/logger.js';
import { createDatabase } from '@flow-app/infra-db';
import { KyselySessionRepository } from '@flow-app/infra-db';
import { JobEventBridge } from './infrastructure/job-event-bridge.js';

const config = validateConfig();

const db = createDatabase(config.DATABASE_URL);
const sessionRepo = new KyselySessionRepository(db);
const eventBridge = new JobEventBridge(config.REDIS_URL);

const app = createApp({ sessionRepo, eventBridge });

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, 'Server started');
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await eventBridge.close();
  await db.destroy();
  process.exit(0);
});
