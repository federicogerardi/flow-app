import type { Request, Response, NextFunction } from 'express';
import { StartSessionUseCase } from '../application/generation/start-session.usecase.js';
import { enqueueSession } from '../generation/jobs/enqueue-session.job.js';
import type { SessionRepository } from '@flow-app/domain';

export function createGenerationRoutes(sessionRepo: SessionRepository) {
  const startSessionUC = new StartSessionUseCase(sessionRepo);

  return {
    startSession: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const toolKey = req.params.toolKey as string;
        const { workspaceId, inputs } = req.body;
        const userId = (req as any).user?.sub ?? 'anonymous';

        const result = await startSessionUC.execute({
          userId,
          workspaceId,
          toolKey,
          inputs: inputs ?? {},
        });

        await enqueueSession(result.session.sessionId);

        const statusCode = result.replayed ? 200 : 201;
        res.status(statusCode).json({
          session: {
            id: result.session.sessionId,
            toolKey: result.toolKey,
            workspaceId: result.session.workspaceId,
            status: 'queued',
            stepCount: result.stepCount,
            createdAt: new Date().toISOString(),
          },
          replayed: result.replayed,
        });
      } catch (error) {
        next(error);
      }
    },

    getSession: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const session = await sessionRepo.findById(req.params.id as string);
        if (!session) {
          return res.status(404).json({
            error: { code: 'SESSION_NOT_FOUND', message: 'Session not found', retryable: false },
          });
        }
        res.json({
          id: session.sessionId,
          toolKey: session.toolKey,
          workspaceId: session.workspaceId,
          status: session.status,
          currentStepIndex: session.currentStepIndex,
          startedAt: session.startedAt?.toISOString() ?? null,
          completedAt: session.completedAt?.toISOString() ?? null,
          createdAt: session.startedAt?.toISOString() ?? new Date().toISOString(),
        });
      } catch (error) {
        next(error);
      }
    },

    getEvents: async (req: Request, res: Response) => {
      const id = req.params.id as string;

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const { eventBridge } = req.app.locals;
      const unsubscribe = eventBridge.subscribe(id, (payload: any) => {
        res.write(`event: ${payload.event}\ndata: ${JSON.stringify(payload.data)}\n\n`);

        if (payload.event === 'session_completed' || payload.event === 'session_failed') {
          res.end();
          unsubscribe();
        }
      });

      req.on('close', () => unsubscribe());
    },
  };
}
