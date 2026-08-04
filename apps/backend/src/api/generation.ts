import type { Request, Response, NextFunction } from 'express';
import type { Kysely } from 'kysely';
import { StartSessionUseCase } from '../application/generation/start-session.usecase.js';
import { getAuthUser } from '../middleware/auth-types.js';
import { enqueueSession } from '../generation/jobs/enqueue-session.job.js';
import type { SessionRepository } from '@flow-app/domain';
import type { DB } from '@flow-app/infra-db';
import type { SSEPayload } from '../infrastructure/job-event-bridge.js';

export function createGenerationRoutes(sessionRepo: SessionRepository, db: Kysely<DB>) {
  const startSessionUC = new StartSessionUseCase(sessionRepo);

  return {
    listSessions: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const workspaceId = req.query.workspaceId as string | undefined;
        const status = req.query.status as string | undefined;
        const limit = Number(req.query.limit) || 50;

        const sessions = workspaceId
          ? await sessionRepo.findByWorkspace(workspaceId, { status, limit })
          : await sessionRepo.findAll({ status, limit });

        return res.json({
          data: sessions.map((s) => ({
            id: s.sessionId,
            toolKey: s.toolKey.toString(),
            workspaceId: s.workspaceId,
            status: s.status.toString(),
            createdAt: s.startedAt?.toISOString() ?? new Date().toISOString(),
          })),
          total: sessions.length,
        });
      } catch (error) {
        next(error);
      }
    },

    getArtifact: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const artifactId = req.params.id as string;
        const row = await db
          .selectFrom('artifacts')
          .where('id', '=', artifactId)
          .selectAll()
          .executeTakeFirst();

        if (!row) {
          return res.status(404).json({
            error: { code: 'ARTIFACT_NOT_FOUND', message: 'Artifact not found', retryable: false },
          });
        }

        return res.json({
          id: row.id,
          sessionId: row.session_id,
          stepNumber: row.step_number,
          content: row.content,
          status: row.status,
          createdAt: row.created_at?.toISOString?.() ?? null,
        });
      } catch (error) {
        next(error);
      }
    },

    downloadArtifact: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const artifactId = req.params.id as string;
        const format = (req.query.format as string) || 'md';

        const row = await db
          .selectFrom('artifacts')
          .where('id', '=', artifactId)
          .selectAll()
          .executeTakeFirst();

        if (!row) {
          return res.status(404).json({
            error: { code: 'ARTIFACT_NOT_FOUND', message: 'Artifact not found', retryable: false },
          });
        }

        const content = row.content;
        const filename = `artifact-${artifactId.slice(0, 8)}.${format}`;
        const mimeTypes: Record<string, string> = {
          md: 'text/markdown',
          txt: 'text/plain',
        };

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', mimeTypes[format] || 'text/plain');
        res.send(content);
      } catch (error) {
        next(error);
      }
    },

    cancelSession: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const sessionId = req.params.id as string;
        const session = await sessionRepo.findById(sessionId);
        if (!session) {
          return res.status(404).json({
            error: { code: 'SESSION_NOT_FOUND', message: 'Session not found', retryable: false },
          });
        }

        if (session.status.toString() !== 'running' && session.status.toString() !== 'queued') {
          return res.status(409).json({
            error: { code: 'INVALID_STATE', message: `Cannot cancel session in ${session.status.toString()} state`, retryable: false },
          });
        }

        session.apply({ type: 'CANCEL' });
        await sessionRepo.save(session);
        res.json({ id: sessionId, status: 'cancelled' });
      } catch (error) {
        next(error);
      }
    },

    startSession: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const toolKey = req.params.toolKey as string;
        const { workspaceId, inputs } = req.body;
        const userId = getAuthUser(req)?.sub ?? 'anonymous';

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
          toolKey: session.toolKey.toString(),
          workspaceId: session.workspaceId,
          status: session.status.toString(),
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
      const unsubscribe = eventBridge.subscribe(id, (payload: SSEPayload) => {
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
