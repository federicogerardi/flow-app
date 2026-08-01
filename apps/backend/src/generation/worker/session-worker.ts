import { Worker, type Job } from 'bullmq';
import { createActor, fromPromise } from 'xstate';
import { sessionMachine } from '../machines/session-machine.js';
import type { SessionRepository, ToolKey, Artifact } from '@flow-app/domain';
import { getTool, Artifact as ArtifactEntity } from '@flow-app/domain';
import type { JobEventBridge } from '../../infrastructure/job-event-bridge.js';
import { logger } from '../../infrastructure/logger.js';

export interface SessionJobData {
  sessionId: string;
}

export interface SessionWorkerDeps {
  sessionRepo: SessionRepository;
  eventBridge: JobEventBridge;
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
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const tool = getTool(session.toolKey as ToolKey);
    if (!tool) throw new Error(`Tool ${session.toolKey} not found`);

    const machine = sessionMachine.provide({
      actors: {
        executeStep: fromPromise<Artifact, any>(async () => {
          return ArtifactEntity.create(sessionId, 1, 'Mock generated content');
        }),
        persistSession: fromPromise<void, any>(async ({ input }) => {
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
        toolKey: session.toolKey,
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
