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
