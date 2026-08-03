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
import { KyselySessionRepository, KyselyWorkspaceRepository, KyselyConversationRepository, KyselyUserRepository, KyselyQuotaRepository } from '@flow-app/infra-db';
import { JobEventBridge } from './infrastructure/job-event-bridge.js';
import { getSessionQueue } from './generation/jobs/enqueue-session.job.js';
import { CleanupJob } from './infrastructure/cleanup-job.js';
import { LlmGateway } from './infrastructure/llm-gateway.js';
import { FilesystemPromptTemplateRepository } from './infrastructure/prompt-template-repository.js';
import { PromptComponentRegistry, PromptComposer, getDefaultComponents } from '@flow-app/domain';
import { BcryptPasswordHasher } from './infrastructure/bcrypt-hasher.js';
import { TokenService } from './infrastructure/token-service.js';
import { AuthService } from './api/auth/auth-service.js';

const config = validateConfig();

const db = createDatabase(config.DATABASE_URL);
const sessionRepo = new KyselySessionRepository(db);
const workspaceRepo = new KyselyWorkspaceRepository(db);
const conversationRepo = new KyselyConversationRepository(db);
const userRepo = new KyselyUserRepository(db);
const quotaRepo = new KyselyQuotaRepository(db);
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

const cleanupJob = new CleanupJob(db);
cleanupJob.start();

const app = createApp({
  sessionRepo,
  workspaceRepo,
  conversationRepo,
  quotaRepo,
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

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  cleanupJob.stop();
  await queue.close();
  await eventBridge.close();
  await db.destroy();
  process.exit(0);
});
