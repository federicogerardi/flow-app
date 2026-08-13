import { Worker, type Job } from 'bullmq';
import { createActor, fromPromise } from 'xstate';
import { sessionMachine, type SessionContext } from '../machines/session-machine.js';
import type { SessionRepository, Artifact, PromptComposer, PromptTemplateRepository, Session } from '@flow-app/domain';
import { getTool, Artifact as ArtifactEntity, ContextEnricher, DEFAULT_COMPONENTS, SessionNotFoundError, StepNotFoundError, ToolNotFoundError, PromptTemplateId, PromptVersion, InfrastructureError } from '@flow-app/domain';
import type { JobEventBridge } from '../../infrastructure/job-event-bridge.js';
import type { LlmGateway } from '../../infrastructure/llm-gateway.js';
import type { GamificationEventPublisher } from '../../application/gamification/gamification-event-publisher.js';
import type { ConsumeCreditsUseCase } from '../../application/usage/consume-credits.usecase.js';
import { logger } from '../../infrastructure/logger.js';

export interface SessionJobData {
  sessionId: string;
  acquisitionData: {
    userInputs: Record<string, string>;
    fileContents: Record<string, string>;
    apiResponses: Array<{ source: string; data: unknown }>;
    resolvedAssets: Record<string, string[]>;
  };
}

export interface SessionWorkerDeps {
  sessionRepo: SessionRepository;
  eventBridge: JobEventBridge;
  llmGateway: LlmGateway;
  promptComposer: PromptComposer;
  promptTemplateRepo: PromptTemplateRepository;
  gamificationEventPublisher: GamificationEventPublisher;
  consumeCreditsUC: ConsumeCreditsUseCase;
}

export function createSessionWorker(deps: SessionWorkerDeps): Worker<SessionJobData> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new InfrastructureError('REDIS_URL not set');

  return new Worker<SessionJobData>(
    'session-workflow',
    async (job: Job<SessionJobData>) => {
      await processSessionJob(job, deps);
    },
    {
      connection: { url: redisUrl },
      concurrency: 5,
      limiter: { max: 3, duration: 1000 },
      lockDuration: 120_000,
      stalledInterval: 30_000,
      maxStalledCount: 2,
    },
  );
}

async function processSessionJob(
  job: Job<SessionJobData>,
  deps: SessionWorkerDeps,
): Promise<void> {
  const { sessionId } = job.data;
  const startTime = Date.now();
  const log = logger.child({ sessionId, jobId: job.id });

  log.info({ attempt: job.attemptsMade + 1 }, 'job_started');

  try {
    const session = await deps.sessionRepo.findById(sessionId);
    if (!session) throw new SessionNotFoundError(sessionId);

    // Guard: skip processing if session is already in a terminal state.
    // Replayed sessions that were completed/failed/cancelled by a previous
    // worker run cannot accept QUEUE or WORKER_PICKUP events —
    // InvalidSessionStateError would be thrown.
    if (session.status.isTerminal()) {
      log.warn(
        { status: session.status.toString(), version: session.version },
        'job_skipped_terminal_session',
      );
      return;
    }

    // Advance session aggregate through queued→running before processing steps
    // The session was saved in "ready" state by StartSessionUseCase.
    // QUEUE and WORKER_PICKUP events are applied to the session aggregate,
    // not just the XState machine — otherwise ADD_ARTIFACT will fail with InvalidSessionStateError.
    session.apply({ type: 'QUEUE' });
    session.apply({ type: 'WORKER_PICKUP' });
    // Persist the version bump so persistSession's saveWithLock doesn't fail
    // with a version mismatch (DB has v1, we're now at v3 after QUEUE + WORKER_PICKUP).
    await deps.sessionRepo.save(session);

    const tool = getTool(session.toolKey);
    if (!tool) throw new ToolNotFoundError(session.toolKey.value);

    const enricher = new ContextEnricher();

    const machine = sessionMachine.provide({
      actors: {
        executeStep: fromPromise<Artifact, SessionContext>(async ({ input }) => {
          const stepIndex = input.currentStepIndex;
          const step = tool.steps[stepIndex];
          if (!step) throw new StepNotFoundError(stepIndex, session.toolKey.toString());

          const stepLog = log.child({ stepIndex, stepLabel: step.label, modelTier: step.prompt.model });

          const enrichedContext = enricher.enrich({
            step,
            previousResults: input.stepResults,
            acquisitionData: input.acquisitionData,
          });

          let systemPrompt: string;
          let userPrompt: string;

          const templateId = step.prompt.templateId ?? step.prompt.template;
          if (templateId) {
            const templateIdObj = PromptTemplateId.fromString(templateId);
            const versionObj = step.prompt.version
              ? PromptVersion.from(step.prompt.version)
              : PromptVersion.LATEST;
            const template = await deps.promptTemplateRepo.findById(templateIdObj, versionObj);

            if (template) {
              const componentKeys = step.prompt.components
                ?? DEFAULT_COMPONENTS[tool.toolKey]
                ?? ['anti-hallucination/v1'];
              const composed = deps.promptComposer.compose(template, componentKeys, {});
              systemPrompt = composed.system;
              userPrompt = `${composed.user}\n\n---\n\n${enrichedContext}`;
              stepLog.debug({ templateId, components: componentKeys }, 'prompt_composed');
            } else {
              systemPrompt = `You are executing step "${step.label}" for tool "${tool.toolKey}". Generate high-quality content.`;
              userPrompt = enrichedContext;
              stepLog.warn({ templateId }, 'prompt_template_not_found_fallback');
            }
          } else {
            systemPrompt = `You are executing step "${step.label}" for tool "${tool.toolKey}". Generate high-quality content.`;
            userPrompt = enrichedContext;
          }

          stepLog.info('step_llm_call_start');
          const result = await deps.llmGateway.generate({
            model: step.prompt.model,
            systemPrompt,
            userPrompt,
            timeout: step.execution.timeoutMs,
          });

          stepLog.info({
            model: result.model,
            latencyMs: result.latencyMs,
            tokensUsed: result.usage.totalTokens,
            fallbackUsed: result.fallbackUsed ?? false,
          }, 'step_llm_call_complete');

          return ArtifactEntity.create(
            sessionId,
            stepIndex + 1,
            result.content,
          );
        }),
        persistSession: fromPromise<void, { session: Session }>(async ({ input }) => {
          // input.session.version was incremented by callApply (ADD_ARTIFACT),
          // so the DB still has version-1. Use pre-mutation version for optimistic locking.
          const expectedVersion = input.session.version - 1;
          await deps.sessionRepo.saveWithLock(input.session, expectedVersion);
        }),
      },
    });

    // Publish session_started SSE event (Step 9)
    deps.eventBridge.publish(sessionId, {
      event: 'session_started',
      data: {
        sessionId,
        status: 'running',
        startedAt: session.startedAt!.toISOString(),
      },
    });

    const actor = createActor(machine, { input: { session, tool } });

    let lastPublishedArtifactCount = 0;

    actor.subscribe((state) => {
      if (state.value === 'completed' || state.value === 'failed') return;

      const artifactCount = state.context.stepResults.length;
      if (artifactCount <= lastPublishedArtifactCount) return;
      lastPublishedArtifactCount = artifactCount;

      const artifact = state.context.stepResults[artifactCount - 1];
      const stepDef = state.context.tool.steps[artifactCount - 1];

      deps.eventBridge.publish(sessionId, {
        event: 'step_completed',
        data: {
          sessionId,
          stepNumber: artifact.stepNumber,
          stepLabel: stepDef?.label ?? `Step ${artifact.stepNumber}`,
          progress: {
            completedCount: artifactCount,
            total: state.context.tool.steps.length,
          },
          artifact: {
            id: artifact.artifactId,
            stepNumber: artifact.stepNumber,
            status: artifact.status.toString(),
            createdAt: artifact.createdAt?.toISOString() ?? new Date().toISOString(),
            sessionId: artifact.sessionId,
            content: artifact.content,
          },
        },
      });
    });

    actor.start();

    // Pass acquisition data from the job payload
    actor.send({
      type: 'CONFIGURE',
      acquisitionData: {
        userInputs: job.data.acquisitionData?.userInputs ?? {},
        fileContents: job.data.acquisitionData?.fileContents ?? {},
        apiResponses: job.data.acquisitionData?.apiResponses ?? [],
        resolvedAssets: new Map(Object.entries(job.data.acquisitionData?.resolvedAssets ?? {})),
      },
    });
    actor.send({ type: 'QUEUE' });
    actor.send({ type: 'WORKER_PICKUP' });

    await new Promise<void>((resolve) => {
      actor.subscribe((state) => {
        if (state.status === 'done') resolve();
      });
    });

    // Persist final session state BEFORE publishing SSE events.
    // The machine's completeSession action applied COMPLETE in-memory,
    // but subscribers (SSE, FE polling) fetch from DB — which must already
    // reflect the final state.
    await deps.sessionRepo.save(session);
    log.info({ status: session.status.toString(), version: session.version }, 'session_persisted');

    // Publish correct SSE event based on the machine's actual final state.
    // Using snapshot.value (not session.status) because the machine
    // transitions to 'failed' without calling session.apply(FAIL) —
    // the session aggregate stays 'running' in that case.
    const finalMachineState = String(actor.getSnapshot().value);

    if (finalMachineState === 'completed') {
      const finalArtifact = session.artifacts[session.artifacts.length - 1];
      deps.eventBridge.publish(sessionId, {
        event: 'session_completed',
        data: {
          sessionId,
          status: 'completed',
          finalArtifact: finalArtifact ? {
            id: finalArtifact.artifactId,
            stepNumber: finalArtifact.stepNumber,
            status: finalArtifact.status.toString(),
            createdAt: finalArtifact.createdAt?.toISOString() ?? new Date().toISOString(),
            sessionId: finalArtifact.sessionId,
            content: finalArtifact.content,
          } : undefined,
          completedAt: session.completedAt?.toISOString(),
        },
      });
} else if (finalMachineState === 'failed') {
      deps.eventBridge.publish(sessionId, {
        event: 'session_failed',
        data: {
          sessionId,
          status: 'failed',
          failedAtStep: session.currentStepIndex,
          error: {
            code: session.errorCode ?? 'SESSION_FAILED',
            message: session.errorMessage ?? 'Session failed',
          },
        },
      });
    }
    // cancelled → no SSE event published (the cancel API handled it)

    // Gamification + credits: only for genuinely completed sessions.
    // The XState snapshot.status === 'done' is true for ALL final states
    // (completed, failed, cancelled). We must check snapshot.value explicitly.
    if (finalMachineState === 'completed') {
      // Credit consumption: synchronous with optimistic retry (reliable)
      try {
        await deps.consumeCreditsUC.execute({
          userId: session.userId,
          sessionId,
          toolKey: session.toolKey.value,
        });
      } catch (error) {
        log.error({ error, sessionId }, 'credits_consumption_failed');
        // Don't throw — session is complete, credit failure is logged and monitored
      }

      // Gamification: fire-and-forget
      deps.gamificationEventPublisher.publishSessionCompleted(
        sessionId,
        session.workspaceId,
        session.userId,
        session.toolKey.value,
      ).catch(() => { /* fire-and-forget */ });
    }

    log.info(
      {
        durationMs: Date.now() - startTime,
        attempts: job.attemptsMade + 1,
        toolKey: session.toolKey.value,
        stepCount: tool.steps.length,
      },
      'job_completed',
    );
  } catch (error) {
    log.error(
      {
        durationMs: Date.now() - startTime,
        attempts: job.attemptsMade + 1,
        error: error instanceof Error ? error.message : 'unknown',
        stack: error instanceof Error ? error.stack : undefined,
      },
      'job_failed',
    );

    // Publish session_failed via SSE (Step 9)
    const errorCode = (error as { code?: string })?.code ?? 'UNKNOWN';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    deps.eventBridge.publish(sessionId, {
      event: 'session_failed',
      data: {
        sessionId,
        status: 'failed',
        failedAtStep: 0,
        error: { code: errorCode, message: errorMessage },
      },
    });

    throw error;
  }
}
