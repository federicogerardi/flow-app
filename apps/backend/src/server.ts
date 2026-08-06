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
import { KyselySessionRepository, KyselyWorkspaceRepository, KyselyConversationRepository, KyselyUserRepository, KyselyQuotaRepository, KyselyPlayerProfileRepository, KyselyWorkspaceChallengeRepository, KyselyAssetRepository } from '@flow-app/infra-db';
import { JobEventBridge } from './infrastructure/job-event-bridge.js';
import { getSessionQueue } from './generation/jobs/enqueue-session.job.js';
import { CleanupJob } from './infrastructure/cleanup-job.js';
import { LlmGateway } from './infrastructure/llm-gateway.js';
import { FilesystemPromptTemplateRepository } from './infrastructure/prompt-template-repository.js';
import { PromptComponentRegistry, PromptComposer, getDefaultComponents } from '@flow-app/domain';
import { BcryptPasswordHasher } from './infrastructure/bcrypt-hasher.js';
import { TokenService } from './infrastructure/token-service.js';
import { AuthService } from './api/auth/auth-service.js';
import { createSessionWorker } from './generation/worker/session-worker.js';
import { GamificationEventPublisher } from './application/gamification/gamification-event-publisher.js';
import { getGamificationQueue } from './generation/jobs/gamification-queue.js';
import { ConsumeCreditsUseCase } from './application/usage/consume-credits.usecase.js';

const config = validateConfig();

const db = createDatabase(config.DATABASE_URL);
const sessionRepo = new KyselySessionRepository(db);
const workspaceRepo = new KyselyWorkspaceRepository(db);
const conversationRepo = new KyselyConversationRepository(db);
const userRepo = new KyselyUserRepository(db);
const quotaRepo = new KyselyQuotaRepository(db);
const playerProfileRepo = new KyselyPlayerProfileRepository(db);
const workspaceChallengeRepo = new KyselyWorkspaceChallengeRepository(db);
const assetRepo = new KyselyAssetRepository(db);
const eventBridge = new JobEventBridge(config.REDIS_URL);
const queue = getSessionQueue(config.REDIS_URL);

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

const hasher = new BcryptPasswordHasher();
const tokenService = new TokenService(
  config.JWT_SECRET,
  config.JWT_EXPIRES_IN,
  config.REFRESH_TOKEN_EXPIRES_IN_SECONDS,
);
const authService = new AuthService(userRepo, hasher, tokenService);

const gamificationQueue = getGamificationQueue(config.REDIS_URL);
const gamificationEventPublisher = new GamificationEventPublisher(gamificationQueue);

const consumeCreditsUC = new ConsumeCreditsUseCase(quotaRepo);

const cleanupJob = new CleanupJob(db);
cleanupJob.start();

const app = createApp({
  sessionRepo,
  workspaceRepo,
  conversationRepo,
  quotaRepo,
  assetRepo,
  playerProfileRepo,
  workspaceChallengeRepo,
  eventBridge,
  queue,
  llmGateway,
  promptComposer,
  promptTemplateRepo,
  db,
  tokenService,
  authService,
  authRateLimitWindowMs: config.AUTH_RATE_LIMIT_WINDOW_MS,
  authRateLimitMaxAttempts: config.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
});

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, 'Server started');
});

// ── Worker (runs in same process as server) ───────────────────────────────────
const worker = createSessionWorker({
  sessionRepo,
  eventBridge,
  llmGateway,
  promptComposer,
  promptTemplateRepo,
  gamificationEventPublisher,
  consumeCreditsUC,
});
logger.info('Worker started');

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
let isShuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, 'graceful_shutdown_started');

  try {
    await worker.pause();
    const timeout = 30_000;
    const deadline = Date.now() + timeout;
    while (worker.isRunning() && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
    }
    await worker.close();
    cleanupJob.stop();
    await queue.close();
    await gamificationQueue.close();
    await eventBridge.close();
    await db.destroy();
    logger.info('graceful_shutdown_completed');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'graceful_shutdown_error');
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
