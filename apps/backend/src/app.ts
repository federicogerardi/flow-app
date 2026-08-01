import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { httpLogger, logger } from './infrastructure/logger.js';
import { errorHandler } from './infrastructure/error-handler.js';
import { createGenerationRoutes } from './api/generation.js';
import type { SessionRepository } from '@flow-app/domain';
import type { JobEventBridge } from './infrastructure/job-event-bridge.js';

export interface AppDeps {
  sessionRepo: SessionRepository;
  eventBridge: JobEventBridge;
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

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api', (_req, res) => {
    res.json({ message: 'Flow App API', version: '0.0.1' });
  });

  const generationRoutes = createGenerationRoutes(deps.sessionRepo);
  app.post('/api/tools/:toolKey/sessions', generationRoutes.startSession);
  app.get('/api/sessions/:id', generationRoutes.getSession);
  app.get('/api/sessions/:id/events', generationRoutes.getEvents);

  app.use(errorHandler);

  return app;
}
