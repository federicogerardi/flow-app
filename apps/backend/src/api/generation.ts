import type { Request, Response, NextFunction } from 'express';
import type { Kysely } from 'kysely';
import { StartSessionUseCase } from '../application/generation/start-session.usecase.js';
import { PromoteToAssetUseCase } from '../application/workspace/promote-to-asset.usecase.js';
import { getAuthUser } from '../middleware/auth-types.js';
import { enqueueSession } from '../generation/jobs/enqueue-session.job.js';
import type { SessionRepository, WorkspaceRepository, AssetRepository } from '@flow-app/domain';
import { AssetResolver, toolRegistry } from '@flow-app/domain';
import type { DB } from '@flow-app/infra-db';
import type { SSEPayload } from '../infrastructure/job-event-bridge.js';

export function createGenerationRoutes(
  sessionRepo: SessionRepository,
  workspaceRepo: WorkspaceRepository,
  assetRepo: AssetRepository,
  db: Kysely<DB>,
) {
  const assetResolver = new AssetResolver(workspaceRepo);
  const startSessionUC = new StartSessionUseCase(sessionRepo, assetResolver);
  const promoteToAssetUC = new PromoteToAssetUseCase(sessionRepo, workspaceRepo, assetRepo);

  return {
    listTools: async (_req: Request, res: Response) => {
      const tools = Object.entries(toolRegistry).map(([key, tool]) => ({
        toolKey: key,
        name: tool.name,
        description: tool.description,
        stepCount: tool.steps.length,
        creditCost: tool.creditCost ?? 1,
        acquisition: {
          userText: tool.acquisition.userText?.map((f) => ({
            key: f.key,
            label: f.label,
            required: f.required ?? false,
            type: f.type ?? 'short',
            placeholder: f.placeholder,
            options: f.options,
          })) ?? [],
          files: tool.acquisition.files?.map((f) => ({
            key: f.key,
            label: f.label,
            accept: f.accept,
            required: f.required,
            description: f.description,
            maxSizeMb: f.maxSizeMb,
          })) ?? [],
          assets: tool.acquisition.assets?.map((a) => ({
            assetType: a.assetType,
            required: a.required,
            multiple: a.multiple ?? false,
          })) ?? [],
        },
        produces: tool.produces,
        outputCategory: tool.outputCategory.toString(),
      }));

      res.json({ tools });
    },

    listSessions: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const workspaceId = req.query.workspaceId as string | undefined;
        const status = req.query.status as string | undefined;
        const limit = Number(req.query.limit) || 50;

        const sessions = workspaceId
          ? await sessionRepo.findByWorkspace(workspaceId, { status, limit })
          : await sessionRepo.findAll({ status, limit });

        // Batch load tool definitions for stepCount + isPromotable (Steps 2, 5)
        const toolDefs = Object.values(toolRegistry);
        const toolDefMap = new Map(toolDefs.map(t => [t.toolKey, t]));

        // Batch load last artifacts for preview (Step 4)
        const sessionIds = sessions.map(s => s.sessionId);
        const lastArtifactMap = await sessionRepo.findLastArtifactsBySessionIds(sessionIds);

        return res.json({
          data: sessions.map((s) => {
            const tool = toolDefMap.get(s.toolKey.toString());
            const status = s.status.toString();
            const lastArtifact = lastArtifactMap.get(s.sessionId);
            const isRunning = status === 'running';
            const isFailed = status === 'failed';
            const isCompleted = status === 'completed' || status === 'cancelled';

            return {
              id: s.sessionId,
              toolKey: s.toolKey.toString(),
              workspaceId: s.workspaceId,
              status,
              stepCount: tool?.steps?.length ?? 1,
              // Step 3: status-dependent fields
              currentStepIndex: isRunning ? s.currentStepIndex : undefined,
              completedAt: s.completedAt?.toISOString() ?? undefined,
              errorMessage: isFailed ? (s.errorMessage ?? undefined) : undefined,
              errorCode: isFailed ? (s.errorCode ?? undefined) : undefined,
              failedAtStep: isFailed ? s.currentStepIndex : undefined,
              // Step 4: artifact preview
              lastArtifactId: lastArtifact?.artifactId,
              lastArtifactPreview: lastArtifact?.content?.slice(0, 150),
              // Step 6: timing
              elapsedSeconds: isRunning && s.startedAt
                ? Math.floor((Date.now() - s.startedAt.getTime()) / 1000)
                : undefined,
              durationSeconds: isCompleted && s.startedAt && s.completedAt
                ? Math.floor((s.completedAt.getTime() - s.startedAt.getTime()) / 1000)
                : undefined,
              // Step 5: promote action
              isPromotable: !!(tool?.produces),
              createdAt: s.createdAt.toISOString(),
            };
          }),
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

    promoteArtifact: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const artifactId = req.params.id as string;
        const { workspaceId, name } = req.body as { workspaceId: string; name?: string };

        const user = getAuthUser(req);
        if (!user) {
          return res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const result = await promoteToAssetUC.execute({
          userId: user.sub,
          workspaceId,
          artifactId,
          name,
        });

        res.status(201).json({
          artifactId,
          assetType: result.assetType,
          assetId: result.assetId,
          name: result.name,
          promoted: true,
        });
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

        // Enqueue worker job for fresh sessions and non-terminal replayed sessions
        // (Replayed sessions stuck in ready/queued/running need a fresh worker job)
        if (!result.replayed || !result.session.status.isTerminal()) {
          // Convert Map<string, string[]> to Record for BullMQ serialization
          const resolvedAssetsRecord: Record<string, string[]> = {};
          for (const [type, contents] of result.resolvedAssets.entries()) {
            resolvedAssetsRecord[type] = contents;
          }

          // Build serializable acquisition data for the worker job
          const acquisitionData = {
            userInputs: inputs?.text ?? {},
            fileContents: Object.fromEntries(
              (inputs?.files as Array<{ key: string; content: string }> | undefined ?? [])
                .map((f) => [f.key, f.content]),
            ),
            apiResponses: [],
            resolvedAssets: resolvedAssetsRecord,
          };

          await enqueueSession(result.session.sessionId, acquisitionData);
        }

        const statusCode = result.replayed ? 200 : 201;
        res.status(statusCode).json({
          session: {
            id: result.session.sessionId,
            toolKey: result.toolKey,
            workspaceId: result.session.workspaceId,
            status: result.session.status.toString(),
            stepCount: result.stepCount,
            createdAt: result.session.createdAt.toISOString(),
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

        // Fetch artifacts for this session
        const artifactRows = await db
          .selectFrom('artifacts')
          .where('session_id', '=', session.sessionId)
          .selectAll()
          .orderBy('step_number', 'asc')
          .execute();

        // Fetch promoted assets for this session's artifacts (for persistent "Promoted" state)
        const artifactIds = artifactRows.map((a) => a.id);
        const promotedAssets = artifactIds.length > 0
          ? await db
              .selectFrom('assets')
              .where('source', '=', 'generated')
              .where('source_ref', 'in', artifactIds)
              .select(['id', 'source_ref'])
              .execute()
          : [];

        const promotedMap = new Map<string, string>();
        for (const pa of promotedAssets) {
          if (pa.source_ref) promotedMap.set(pa.source_ref, pa.id);
        }

        const tool = toolRegistry[session.toolKey.value];

        res.json({
          id: session.sessionId,
          toolKey: session.toolKey.toString(),
          workspaceId: session.workspaceId,
          status: session.status.toString(),
          stepCount: tool?.steps.length ?? 0,
          produces: tool?.produces ?? undefined,
          currentStepIndex: session.currentStepIndex,
          startedAt: session.startedAt?.toISOString() ?? null,
          completedAt: session.completedAt?.toISOString() ?? null,
          createdAt: session.createdAt.toISOString(),
          errorMessage: session.status.toString() === 'failed' ? (session.errorMessage ?? undefined) : undefined,
          errorCode: session.status.toString() === 'failed' ? (session.errorCode ?? undefined) : undefined,
          failedAtStep: session.status.toString() === 'failed' ? session.currentStepIndex : undefined,
          artifacts: artifactRows.map((a) => ({
            id: a.id,
            stepNumber: a.step_number,
            content: a.content,
            status: a.status,
            createdAt: a.created_at?.toISOString?.() ?? null,
            promotedAssetId: promotedMap.get(a.id) ?? null,
          })),
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
