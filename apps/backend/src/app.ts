import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { Queue } from 'bullmq';
import type { Kysely } from 'kysely';
import type { DB } from '@flow-app/infra-db';
import { httpLogger, logger } from './infrastructure/logger.js';
import { errorHandler } from './infrastructure/error-handler.js';
import { createGenerationRoutes } from './api/generation.js';
import { createAdminRoutes } from './api/admin.js';
import { createWorkspaceRoutes } from './api/workspaces.js';
import { createAgentChatRoutes } from './api/agent-chat.js';
import { createAuthRoutes } from './api/auth/auth-routes.js';
import { createUsageRoutes } from './api/usage/usage-routes.js';
import { createGamificationRoutes } from './api/gamification/gamification-routes.js';
import { createAssetRoutes } from './api/assets.js';
import { devAuthMiddleware } from './middleware/dev-auth.js';
import { authenticate, authenticateOrDev } from './middleware/authenticate.js';
import { requireWorkspaceRole } from './middleware/workspace-role.js';
import { type SessionRepository, type WorkspaceRepository, type ConversationRepository, type QuotaRepository, type AssetRepository, type PromptComposer, type PromptTemplateRepository, MembershipRole, type PlayerProfileRepository, type WorkspaceChallengeRepository } from '@flow-app/domain';
import type { JobEventBridge } from './infrastructure/job-event-bridge.js';
import type { LlmGateway } from './infrastructure/llm-gateway.js';
import type { TokenService } from './infrastructure/token-service.js';
import type { AuthService } from './api/auth/auth-service.js';
import './middleware/auth-types.js';

export interface AppDeps {
  sessionRepo: SessionRepository;
  workspaceRepo: WorkspaceRepository;
  conversationRepo: ConversationRepository;
  quotaRepo: QuotaRepository;
  assetRepo: AssetRepository;
  playerProfileRepo: PlayerProfileRepository;
  workspaceChallengeRepo: WorkspaceChallengeRepository;
  eventBridge: JobEventBridge;
  queue: Queue;
  llmGateway: LlmGateway;
  promptComposer: PromptComposer;
  promptTemplateRepo: PromptTemplateRepository;
  db: Kysely<DB>;
  tokenService: TokenService;
  authService: AuthService;
  authRateLimitWindowMs: number;
  authRateLimitMaxAttempts: number;
}

export function createApp(deps: AppDeps) {
  const app = express();

  // Trust the Railway reverse proxy so express-rate-limit can read the real client IP
  // from the X-Forwarded-For header.
  app.set('trust proxy', 1);

  app.locals.eventBridge = deps.eventBridge;

  app.use(helmet());
  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    app.use(cors({ origin: corsOrigin, credentials: true }));
  }
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(httpLogger);
  app.use((req, _res, next) => {
    req.log = logger.child({ reqId: req.id });
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api', (_req, res) => {
    res.json({ message: 'Flow App API', version: '0.0.1' });
  });

  // Auth routes (public — before auth middleware)
  const authRoutes = createAuthRoutes(
    deps.authService,
    deps.tokenService,
    deps.authRateLimitWindowMs,
    deps.authRateLimitMaxAttempts,
  );
  app.use('/api/auth', authRoutes);

  // Auth middleware — everything below requires authentication
  if (process.env.NODE_ENV === 'production') {
    app.use(authenticate(deps.tokenService));
  } else {
    app.use(authenticateOrDev(deps.tokenService, devAuthMiddleware));
  }

  // Generation routes
  const generationRoutes = createGenerationRoutes(deps.sessionRepo, deps.workspaceRepo, deps.assetRepo, deps.db);
  app.get('/api/tools', generationRoutes.listTools);
  app.get('/api/sessions', generationRoutes.listSessions);
  app.post('/api/tools/:toolKey/sessions', generationRoutes.startSession);
  app.get('/api/sessions/:id', generationRoutes.getSession);
  app.get('/api/sessions/:id/events', generationRoutes.getEvents);
  app.post('/api/sessions/:id/cancel', generationRoutes.cancelSession);
  app.get('/api/artifacts/:id', generationRoutes.getArtifact);
  app.get('/api/artifacts/:id/download', generationRoutes.downloadArtifact);
  app.post('/api/artifacts/:id/promote', generationRoutes.promoteArtifact);

  // Workspace routes
  const workspaceRoutes = createWorkspaceRoutes(deps.workspaceRepo, process.env.REDIS_URL!);
  app.post('/api/workspaces', workspaceRoutes.createWorkspace);
  app.get('/api/workspaces', workspaceRoutes.listWorkspaces);
  app.get('/api/workspaces/:id', requireWorkspaceRole(deps.workspaceRepo, MembershipRole.Owner, MembershipRole.Editor, MembershipRole.Viewer), workspaceRoutes.getWorkspace);
  app.put('/api/workspaces/:id', requireWorkspaceRole(deps.workspaceRepo, MembershipRole.Owner), workspaceRoutes.updateWorkspace);
  app.delete('/api/workspaces/:id', requireWorkspaceRole(deps.workspaceRepo, MembershipRole.Owner), workspaceRoutes.deleteWorkspace);
  app.post('/api/workspaces/:id/invitations', requireWorkspaceRole(deps.workspaceRepo, MembershipRole.Owner), workspaceRoutes.inviteMember);
  app.get('/api/workspaces/:id/members', requireWorkspaceRole(deps.workspaceRepo, MembershipRole.Owner, MembershipRole.Editor, MembershipRole.Viewer), workspaceRoutes.listMembers);
  app.delete('/api/workspaces/:id/members/:userId', requireWorkspaceRole(deps.workspaceRepo, MembershipRole.Owner), workspaceRoutes.removeMember);
  app.put('/api/workspaces/:id/members/:userId/role', requireWorkspaceRole(deps.workspaceRepo, MembershipRole.Owner), workspaceRoutes.changeMemberRole);
  app.post('/api/workspaces/:id/transfer-ownership', requireWorkspaceRole(deps.workspaceRepo, MembershipRole.Owner), workspaceRoutes.transferOwnership);
  app.get('/api/invitations', workspaceRoutes.listPendingInvitations);
  app.post('/api/invitations/:id/accept', workspaceRoutes.acceptInvitation);
  app.post('/api/invitations/:id/decline', workspaceRoutes.declineInvitation);

  // Agent Chat routes
  const agentChatRoutes = createAgentChatRoutes(deps.conversationRepo, deps.llmGateway, process.env.REDIS_URL!);
  app.get('/api/workspaces/:workspaceId/agents', requireWorkspaceRole(deps.workspaceRepo, MembershipRole.Owner, MembershipRole.Editor, MembershipRole.Viewer), agentChatRoutes.listAgents);
  app.get('/api/workspaces/:workspaceId/conversations', requireWorkspaceRole(deps.workspaceRepo, MembershipRole.Owner, MembershipRole.Editor, MembershipRole.Viewer), agentChatRoutes.listConversations);
  app.post('/api/workspaces/:workspaceId/conversations', requireWorkspaceRole(deps.workspaceRepo, MembershipRole.Owner, MembershipRole.Editor), agentChatRoutes.startConversation);
  app.get('/api/conversations/:id', agentChatRoutes.getConversation);
  app.post('/api/conversations/:id/messages', agentChatRoutes.sendMessage);
  app.post('/api/conversations/:id/archive', agentChatRoutes.archiveConversation);

  // Admin routes
  const adminRoutes = createAdminRoutes(deps.queue);
  app.get('/admin/jobs', adminRoutes.getJobs);
  app.get('/admin/health', adminRoutes.getHealth);

  // Usage routes (quota + credits)
  const usageRoutes = createUsageRoutes(deps.quotaRepo);
  app.use('/api/usage', usageRoutes);

  // Gamification routes
  const gamificationRoutes = createGamificationRoutes(
    deps.db,
    deps.playerProfileRepo,
    deps.workspaceChallengeRepo,
    deps.workspaceRepo,
    deps.tokenService,
  );
  app.use(gamificationRoutes);

  // Asset routes
  const assetRoutes = createAssetRoutes(deps.assetRepo);
  app.use(assetRoutes);

  app.use(errorHandler);

  return app;
}
