import { Worker, type Job } from 'bullmq';
import { createActor, fromPromise } from 'xstate';
import { sessionMachine, type SessionContext } from '../machines/session-machine.js';
import type { SessionRepository, Artifact, PromptComposer, PromptTemplateRepository, Session } from '@flow-app/domain';
import { getTool, Artifact as ArtifactEntity, ContextEnricher, DEFAULT_COMPONENTS, SessionNotFoundError, ToolNotFoundError } from '@flow-app/domain';
import type { JobEventBridge } from '../../infrastructure/job-event-bridge.js';
import type { LlmGateway } from '../../infrastructure/llm-gateway.js';
import { logger } from '../../infrastructure/logger.js';

export interface SessionJobData {
  sessionId: string;
}

export interface SessionWorkerDeps {
  sessionRepo: SessionRepository;
  eventBridge: JobEventBridge;
  llmGateway: LlmGateway;
  promptComposer: PromptComposer;
  promptTemplateRepo: PromptTemplateRepository;
}

export function createSessionWorker(deps: SessionWorkerDeps): Worker<SessionJobData> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error('REDIS_URL not set');

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

    const tool = getTool(session.toolKey);
    if (!tool) throw new ToolNotFoundError(session.toolKey.value);

    const enricher = new ContextEnricher();

    const machine = sessionMachine.provide({
      actors: {
        executeStep: fromPromise<Artifact, SessionContext>(async ({ input }) => {
          const stepIndex = input.currentStepIndex;
          const step = tool.steps[stepIndex];
          if (!step) throw new Error(`Step ${stepIndex} not found in tool ${tool.toolKey}`);

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
            const { PromptTemplateId, PromptVersion } = await import('@flow-app/domain');
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
          const expectedVersion = session.version;
          await deps.sessionRepo.saveWithLock(input.session, expectedVersion);
        }),
      },
    });

    const actor = createActor(machine, { input: { session, tool } });

    actor.subscribe((state) => {
      deps.eventBridge.publish(sessionId, {
        event: state.value === 'completed' ? 'session_completed' : 'step_completed',
        data: {
          sessionId,
          status: state.value,
          stepNumber: state.context.currentStepIndex ?? 0,
        },
      });
    });

    actor.start();

    actor.send({ type: 'CONFIGURE', acquisitionData: { userInputs: {}, fileContents: {}, apiResponses: [], resolvedAssets: new Map() } });
    actor.send({ type: 'QUEUE' });
    actor.send({ type: 'WORKER_PICKUP' });

    await new Promise<void>((resolve) => {
      actor.subscribe((state) => {
        if (state.status === 'done') resolve();
      });
    });

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
    throw error;
  }
}
