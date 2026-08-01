---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
  - wiki/backend
date_updated: 2026-08-01
source_count: 5
confidence: high
---

# BullMQ Worker Wiring

> Async job execution for the [[Session Machine (XState v5)|XState session machine]]  
> `apps/backend/src/infrastructure/worker.ts`  
> Monitoring: see [[Job Queue - Monitoring and Stability]]

## Architecture

The HTTP handler creates a Session and enqueues a BullMQ job. The worker process picks up the job, creates an XState actor, and drives the Session through all steps. The HTTP process stays available for API calls; the worker handles heavy LLM work asynchronously.

```
┌────────────────────┐          ┌──────────────────────┐
│  HTTP Process       │          │  Worker Process       │
│                     │  Redis   │                       │
│  POST /sessions ────┼──queue──▶│  BullMQ Worker        │
│                     │          │    └── XState Actor   │
│  GET /events (SSE) ◀┼──pub/sub─│    └── ProcessStep    │
│                     │          │    └── LLM Gateway    │
└────────────────────┘          └──────────────────────┘
```

## Deployment Modes

Flow App supports two deployment modes:

1. **Single service (default for early stage)**: one Railway service runs both HTTP and worker processes.
2. **Split services (recommended for scale)**: one `api` service and one `worker` service, both connected to the same PostgreSQL and Redis.

The wiring documented here is compatible with both modes. Redis queue + pub/sub are kept as the canonical transport so the topology can evolve without code changes.

---

## Job Enqueue — HTTP Side

```typescript
// apps/backend/src/generation/jobs/enqueue-session.job.ts

import { Queue } from 'bullmq';

const sessionQueue = new Queue('session-workflow', {
  connection: { url: process.env.REDIS_URL },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600 * 24 },   // keep 24h
    removeOnFail: { age: 3600 * 24 * 7 },    // keep 7 days
  },
});

interface SessionJobData {
  sessionId: string;
}

export async function enqueueSession(sessionId: string): Promise<void> {
  await sessionQueue.add(
    `session:${sessionId}`,
    { sessionId } satisfies SessionJobData,
    {
      jobId: sessionId,           // deduplication: same sessionId → same job
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    }
  );
}
```

**Called by**: HTTP handler after `StartSessionUseCase` returns.

```typescript
// apps/backend/src/routes/generation.ts (HTTP route)

router.post('/api/tools/:toolKey/sessions', async (req, res) => {
  const result = await startSessionUseCase.execute({
    userId: req.user.id,
    workspaceId: req.body.workspaceId,
    toolKey: req.params.toolKey,
    inputs: req.body.inputs,
  });

  // Enqueue for async execution — worker picks this up
  await enqueueSession(result.session.sessionId);

  res.status(201).json({ session: toSessionDTO(result.session) });
});
```

---

## Worker — Job Processing

```typescript
// apps/backend/src/generation/worker/session-worker.ts

import { Worker, type Job } from 'bullmq';
import { createActor } from 'xstate';
import type { Session, ToolDefinition, AcquisitionData } from '@flow-app/domain';

export function createSessionWorker(
  deps: SessionWorkerDependencies
): Worker<SessionJobData> {

  return new Worker<SessionJobData>(
    'session-workflow',
    async (job: Job<SessionJobData>) => {
      await processSessionJob(job, deps);
    },
    {
      connection: { url: process.env.REDIS_URL },
      concurrency: 5,                         // 5 parallel sessions max
      limiter: {
        max: 3,                               // max 3 jobs per
        duration: 1000,                       // second (rate limit)
      },
    }
  );
}

interface SessionWorkerDependencies {
  sessionRepo:      SessionRepository;
  processStepUC:    ProcessStepUseCase;
  toolRegistry:     ToolRegistry;
  eventBridge:      JobEventBridge;
  buildMachine:     (deps: MachineDeps) => typeof sessionMachine;
}
```

### Job Processing Flow

```typescript
async function processSessionJob(
  job: Job<SessionJobData>,
  deps: SessionWorkerDependencies
): Promise<void> {
  const { sessionId } = job.data;

  // 1. Load Session aggregate
  const session = await deps.sessionRepo.findById(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  // 2. Load tool definition
  const tool = deps.toolRegistry.get(session.toolKey);
  if (!tool) throw new Error(`Tool ${session.toolKey} not found`);

  // 3. Try to resume from persisted snapshot
  const snapshot = await deps.sessionRepo.loadSnapshot(sessionId);

  // 4. Build machine with injected dependencies
  const machine = deps.buildMachine({
    processStepUC: deps.processStepUC,
    sessionRepo: deps.sessionRepo,
  });

  // 5. Create actor (with snapshot for resume, fresh for new)
  const actor = snapshot
    ? createActor(machine, { snapshot: JSON.parse(snapshot) })
    : createActor(machine, { input: { session, tool } });

  // 6. Bridge XState events to SSE (via Redis pub/sub)
  actor.subscribe((state) => {
    deps.eventBridge.publish(sessionId, {
      value: state.value,
      context: state.context,
      event: state.event,
    });
    job.updateProgress(computeProgress(state));
  });

  // 7. Start actor
  actor.start();

  // 8. If fresh session: configure + queue + worker pickup
  if (!snapshot) {
    const acquisitionData = await loadAcquisitionData(session, tool, deps);
    actor.send({ type: 'CONFIGURE', acquisitionData });
    actor.send({ type: 'QUEUE' });
    actor.send({ type: 'WORKER_PICKUP' });
  }
  // If resuming: actor picks up from persisted snapshot automatically

  // 9. Wait for actor to reach a final state
  await waitForFinalState(actor);

  // 10. Actor reached completed/failed/cancelled → job done
}
```

---

## Snapshot Persistence

After every state transition, the XState actor's snapshot is persisted to `session_snapshots`. This enables crash recovery — if the worker dies mid-step, the next retry resumes exactly where it left off.

```typescript
// Inside createSessionWorker — per-step persistence

actor.subscribe(async (state) => {
  // Persist snapshot on every state change
  await deps.sessionRepo.saveSnapshot(sessionId, JSON.stringify(state));

  // Bridge to SSE
  deps.eventBridge.publish(sessionId, toSSEPayload(state));
});
```

**Crash recovery flow**:
```
1. Worker processing step 3/4 → crashes
2. BullMQ retries job (attempt 2)
3. Worker loads Session + snapshot from DB
4. Actor resumes from step 3, not step 1
5. No duplicate work, no lost progress
```

---

## Event Bridge — Worker → SSE

The worker communicates progress to the HTTP process via Redis pub/sub. The HTTP process forwards to SSE connections.

```typescript
// apps/backend/src/infrastructure/job-event-bridge.ts

import Redis from 'ioredis';

class JobEventBridge {
  private pub: Redis;
  private sub: Redis;

  constructor() {
    this.pub = new Redis(process.env.REDIS_URL!);
    this.sub = new Redis(process.env.REDIS_URL!);
  }

  // Worker side: publish progress
  publish(sessionId: string, payload: SSEPayload): void {
    this.pub.publish(`session:${sessionId}:events`, JSON.stringify(payload));
  }

  // HTTP side: subscribe and forward to SSE connections
  subscribe(sessionId: string, onEvent: (payload: SSEPayload) => void): () => void {
    const channel = `session:${sessionId}:events`;
    this.sub.subscribe(channel);
    this.sub.on('message', (ch, message) => {
      if (ch === channel) onEvent(JSON.parse(message));
    });
    return () => this.sub.unsubscribe(channel); // cleanup
  }
}

type SSEPayload = {
  event: string;        // 'session_started' | 'step_completed' | 'session_completed' | 'session_failed'
  data: Record<string, unknown>;
};
```

### SSE Route — HTTP Side

```typescript
// apps/backend/src/routes/generation.ts

router.get('/api/sessions/:id/events', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const unsubscribe = eventBridge.subscribe(req.params.id, (payload) => {
    res.write(`event: ${payload.event}\ndata: ${JSON.stringify(payload.data)}\n\n`);

    if (payload.event === 'session_completed' || payload.event === 'session_failed') {
      res.end();
      unsubscribe();
    }
  });

  req.on('close', () => unsubscribe());
});
```

---

## Progress Computation

```typescript
function computeProgress(state: Snapshot): number {
  if (state.value === 'completed') return 100;
  if (state.value === 'draft' || state.value === 'ready') return 0;

  const ctx = state.context as SessionContext;
  const total = ctx.tool.steps.length;
  const current = ctx.currentStepIndex;
  return Math.round((current / total) * 100);
}
```

---

## Graceful Shutdown

```typescript
// apps/backend/src/server.ts

async function shutdown(worker: Worker, queue: Queue): Promise<void> {
  console.log('Shutting down...');

  // 1. Stop accepting new jobs
  await worker.pause();

  // 2. Wait for active jobs to finish (with timeout)
  await Promise.race([
    worker.close(),
    new Promise(resolve => setTimeout(resolve, 30000)), // 30s max
  ]);

  // 3. Close queue
  await queue.close();

  process.exit(0);
}

process.on('SIGTERM', () => shutdown(worker, queue));
process.on('SIGINT',  () => shutdown(worker, queue));
```

**Behavior**: worker finishes the current step, persists the snapshot, then exits. Incomplete jobs are retried on restart (BullMQ built-in behavior).

---

## Retry Policy

| Scenario | Behavior |
|----------|----------|
| LLM timeout | Job retries from persisted snapshot (same step, no duplicate work) |
| Worker crash | BullMQ retries with exponential backoff (5s → 10s → 20s) |
| Max attempts (3) reached | Job moved to failed queue; Session marked as `failed` |
| Persistent failure | Admin can manually retry from `/admin/jobs` |

---

## Full Lifecycle

```
┌─ HTTP ───────────────────────────────────────────────────────┐
│  POST /api/tools/:toolKey/sessions                            │
│    → StartSessionUseCase.execute()                            │
│    → sessionQueue.add({ sessionId })                          │
│    → 201 { session }                                          │
│                                                               │
│  GET /api/sessions/:id/events                                 │
│    → eventBridge.subscribe(sessionId)                         │
│    → SSE: wait for events from worker                         │
└───────────────────────────────────────────────────────────────┘
                              │ Redis
                              ▼
┌─ Worker ─────────────────────────────────────────────────────┐
│  Worker picks up job { sessionId }                            │
│    → Load Session from DB + snapshot (if resume)              │
│    → Build XState machine (with injected ProcessStepUseCase)  │
│    → createActor(machine, { snapshot? })                      │
│    → actor.subscribe(persistSnapshot + eventBridge.publish)   │
│    → actor.start()                                            │
│    → actor.send(CONFIGURE + QUEUE + WORKER_PICKUP) or resume  │
│                                                               │
│    executingStep:                                             │
│      invoke ProcessStepUseCase                                │
│        → ContextEnricher.enrich()                             │
│        → LLM Gateway (OpenAI / Anthropic)                     │
│        → Artifact.create()                                    │
│                                                               │
│    persistingStep:                                            │
│      invoke persistSession → sessionRepo.save()               │
│                                                               │
│    stepCompleted → loop or complete                           │
│                                                               │
│    completed:                                                 │
│      → Session.complete() → SessionCompleted event            │
│      → eventBus.publish(SessionCompleted)                     │
│        → PromoteToAssetUseCase (if tool.produces)             │
│        → ConsumeCreditsUseCase                                │
│      → eventBridge.publish(session_completed)                 │
│                                                               │
│    failed:                                                    │
│      → eventBridge.publish(session_failed)                    │
│      → BullMQ retry or move to failed queue                   │
└───────────────────────────────────────────────────────────────┘
```

---

## Dependency Injection — Worker Side

```typescript
// apps/backend/src/generation/worker/bootstrap.ts

export function bootstrapWorker(): Worker {
  const sessionRepo    = new KyselySessionRepository(db);
    const processStepUC  = new ProcessStepUseCase(
    new ContextEnricher(),
    new LlmGateway({
      apiKey: process.env.OPENROUTER_API_KEY!,
      baseUrl: process.env.OPENROUTER_BASE_URL!,
      appName: 'flow-app',
      defaultTimeoutMs: 60000,
    }),
    new PromptLoader('apps/backend/src/prompts/'),
  );
  const toolRegistry   = loadToolRegistry();  // from packages/domain
  const eventBridge    = new JobEventBridge();

  return createSessionWorker({
    sessionRepo,
    processStepUC,
    toolRegistry,
    eventBridge,
    buildMachine: (deps) =>
      sessionMachine.provide({
        actors: {
          executeStep: fromPromise(async ({ input: context }) => {
            const step = context.tool.steps[context.currentStepIndex];
            return deps.processStepUC.execute({
              session: context.session,
              step,
              previousResults: context.stepResults,
              acquisitionData: context.acquisitionData,
            });
          }),
          persistSession: fromPromise(async ({ input: { session } }) => {
            await deps.sessionRepo.save(session);
          }),
        },
      }),
  });
}
```

## Sources

- [[Session Machine (XState v5)]] — XState machine definition
- [[Application Services]] — ProcessStepUseCase, StartSessionUseCase
- [[Database Schema]] — session_snapshots table for crash recovery
- [[API Routes]] — SSE endpoint consuming events from bridge
- [[sources/APP-CONCEPT]] — BE-Driven workflow, JobEventBridge, JobProgressSerializer
