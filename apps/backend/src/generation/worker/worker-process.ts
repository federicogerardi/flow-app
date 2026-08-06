import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');

dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local'), override: true });

import { validateConfig } from '../../config.js';
import { logger } from '../../infrastructure/logger.js';
import { createDatabase } from '@flow-app/infra-db';
import { KyselySessionRepository, KyselyQuotaRepository } from '@flow-app/infra-db';
import { JobEventBridge } from '../../infrastructure/job-event-bridge.js';
import { createSessionWorker } from './session-worker.js';
import { LlmGateway } from '../../infrastructure/llm-gateway.js';
import { FilesystemPromptTemplateRepository } from '../../infrastructure/prompt-template-repository.js';
import { PromptComponentRegistry, PromptComposer, getDefaultComponents } from '@flow-app/domain';
import { GamificationEventPublisher } from '../../application/gamification/gamification-event-publisher.js';
import { getGamificationQueue } from '../jobs/gamification-queue.js';
import { ConsumeCreditsUseCase } from '../../application/usage/consume-credits.usecase.js';

const config = validateConfig();
const log = logger.child({ component: 'worker-process' });

const db = createDatabase(config.DATABASE_URL);
const sessionRepo = new KyselySessionRepository(db);
const eventBridge = new JobEventBridge(config.REDIS_URL);

const llmGateway = new LlmGateway({
  apiKey: config.OPENROUTER_API_KEY,
  baseUrl: config.OPENROUTER_BASE_URL,
  appName: config.OPENROUTER_APP_NAME,
  defaultTimeoutMs: config.LLM_DEFAULT_TIMEOUT_MS,
});

const componentRegistry = new PromptComponentRegistry();
for (const component of getDefaultComponents()) {
  componentRegistry.register(component);
}
const promptComposer = new PromptComposer(componentRegistry);

const promptTemplateBasePath = path.resolve(root, 'src', 'prompts');
const promptTemplateRepo = new FilesystemPromptTemplateRepository(promptTemplateBasePath);

const gamificationQueue = getGamificationQueue(config.REDIS_URL);
const gamificationEventPublisher = new GamificationEventPublisher(gamificationQueue);

const quotaRepo = new KyselyQuotaRepository(db);
const consumeCreditsUC = new ConsumeCreditsUseCase(quotaRepo);

const worker = createSessionWorker({ sessionRepo, eventBridge, llmGateway, promptComposer, promptTemplateRepo, gamificationEventPublisher, consumeCreditsUC });

log.info('Worker started');

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  log.info({ signal }, 'graceful_shutdown_started');
  const shutdownStart = Date.now();

  try {
    await worker.pause();

    const timeout = 30_000;
    const deadline = Date.now() + timeout;

    while (worker.isRunning() && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
    }

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
