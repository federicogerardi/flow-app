import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { Queue } from 'bullmq';
import { httpLogger, logger } from './infrastructure/logger.js';
import { errorHandler } from './infrastructure/error-handler.js';
import { createGenerationRoutes } from './api/generation.js';
import { createAdminRoutes } from './api/admin.js';
import { createWorkspaceRoutes } from './api/workspaces.js';
import { createAgentChatRoutes } from './api/agent-chat.js';
import { devAuthMiddleware } from './middleware/dev-auth.js';
import { requireWorkspaceRole } from './middleware/workspace-role.js';
import type { SessionRepository, WorkspaceRepository, ConversationRepository } from '@flow-app/domain';
import type { JobEventBridge } from './infrastructure/job-event-bridge.js';

export interface AppDeps {
  sessionRepo: SessionRepository;
  workspaceRepo: WorkspaceRepository;
  conversationRepo: ConversationRepository;
  eventBridge: JobEventBridge;
  queue: Queue;
}

export function createApp(deps: AppDeps) {
  const app = express();

  app.locals.eventBridge = deps.eventBridge;

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(httpLogger);
  app.use((req, _res, next) => {
    (req as any).log = logger.child({ reqId: req.id });
    next();
  });

  if (process.env.NODE_ENV !== 'production') {
    app.use(devAuthMiddleware);
  }

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api', (_req, res) => {
    res.json({ message: 'Flow App API', version: '0.0.1' });
  });

  // Generation routes
  const generationRoutes = createGenerationRoutes(deps.sessionRepo);
  app.post('/api/tools/:toolKey/sessions', generationRoutes.startSession);
  app.get('/api/sessions/:id', generationRoutes.getSession);
  app.get('/api/sessions/:id/events', generationRoutes.getEvents);

  // Workspace routes
  const workspaceRoutes = createWorkspaceRoutes(deps.workspaceRepo);
  app.get('/api/workspaces', workspaceRoutes.listWorkspaces);
  app.get('/api/workspaces/:id', requireWorkspaceRole(deps.workspaceRepo, 'owner', 'editor', 'viewer'), workspaceRoutes.getWorkspace);
  app.post('/api/workspaces/:id/invitations', requireWorkspaceRole(deps.workspaceRepo, 'owner'), workspaceRoutes.inviteMember);
  app.get('/api/workspaces/:id/members', requireWorkspaceRole(deps.workspaceRepo, 'owner', 'editor', 'viewer'), workspaceRoutes.listMembers);
  app.delete('/api/workspaces/:id/members/:userId', requireWorkspaceRole(deps.workspaceRepo, 'owner'), workspaceRoutes.removeMember);
  app.put('/api/workspaces/:id/members/:userId/role', requireWorkspaceRole(deps.workspaceRepo, 'owner'), workspaceRoutes.changeMemberRole);
  app.post('/api/workspaces/:id/transfer-ownership', requireWorkspaceRole(deps.workspaceRepo, 'owner'), workspaceRoutes.transferOwnership);
  app.get('/api/invitations', workspaceRoutes.listPendingInvitations);
  app.post('/api/invitations/:id/accept', workspaceRoutes.acceptInvitation);
  app.post('/api/invitations/:id/decline', workspaceRoutes.declineInvitation);

  // Agent Chat routes
  const agentChatRoutes = createAgentChatRoutes(deps.conversationRepo);
  app.get('/api/workspaces/:workspaceId/agents', requireWorkspaceRole(deps.workspaceRepo, 'owner', 'editor', 'viewer'), agentChatRoutes.listAgents);
  app.get('/api/workspaces/:workspaceId/conversations', requireWorkspaceRole(deps.workspaceRepo, 'owner', 'editor', 'viewer'), agentChatRoutes.listConversations);
  app.post('/api/workspaces/:workspaceId/conversations', requireWorkspaceRole(deps.workspaceRepo, 'owner', 'editor'), agentChatRoutes.startConversation);
  app.get('/api/conversations/:id', agentChatRoutes.getConversation);
  app.post('/api/conversations/:id/messages', agentChatRoutes.sendMessage);
  app.post('/api/conversations/:id/archive', agentChatRoutes.archiveConversation);

  // Admin routes
  const adminRoutes = createAdminRoutes(deps.queue);
  app.get('/admin/jobs', adminRoutes.getJobs);
  app.get('/admin/health', adminRoutes.getHealth);

  app.use(errorHandler);

  return app;
}
