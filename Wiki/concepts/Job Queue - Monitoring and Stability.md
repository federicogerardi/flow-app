---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
  - wiki/backend
date_updated: 2026-07-30
source_count: 0
confidence: high
---

# Job Queue — Monitoring & Stability

> Observability, alerting, and operational criteria for the BullMQ worker  
> Extends [[BullMQ Worker Wiring]]

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌─────────────────┐
│ HTTP (Express)│────▶│ BullMQ Queue │────▶│ Worker × N      │
│ enqueue job  │     │ (Redis)      │     │ (XState actors) │
└──────────────┘     └──────┬───────┘     └────────┬────────┘
                            │                       │
                            ▼                       ▼
                     ┌──────────────┐     ┌─────────────────┐
                     │ Queue Metrics│     │ Job Lifecycle    │
                     │ (prometheus) │     │ Events (Pino)    │
                     └──────────────┘     └─────────────────┘
```

---

## Queue Configuration

```typescript
const sessionQueue = new Queue('session-workflow', {
  connection: { host: process.env.REDIS_HOST!, port: 6379 },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600 * 24 },
    removeOnFail:    { age: 3600 * 24 * 7 },
  },
});

const worker = new Worker('session-workflow', processSessionJob, {
  connection:  { host: process.env.REDIS_HOST!, port: 6379 },
  concurrency: 5,                        // Max 5 sessions in parallel
  limiter: {
    max:      3,                         // Max 3 jobs per second
    duration: 1000,
  },
  lockDuration:     120_000,            // 2 minutes — max time per step
  stalledInterval:   30_000,            // Check stall every 30s
  maxStalledCount:   2,                 // Max 2 stalls before fail
});
```

### Sizing Criteria

| Parameter | Value | Rationale |
|-----------|--------|-------------|
| `concurrency: 5` | 5 parallel sessions | Limits load on LLM gateway (OpenRouter rate limit) |
| `limiter: 3/sec` | Max 3 jobs/sec | Avoids bursts of simultaneous LLM calls |
| `lockDuration: 120s` | 2 minutes per step | LLM step timeout with margin |
| `stalledInterval: 30s` | Check every 30s | Detect blocked workers quickly |
| `maxStalledCount: 2` | 2 stalls → fail | Avoids infinite loops on problematic steps |

---

## Progressive Dispatch (Fair Queue)

Jobs are processed in **FIFO** order (first-in, first-out). No prioritization between users or tools — all jobs have equal weight. This ensures fairness: a user who submitted 10 jobs does not block another user with 1 job.

### Why not priority queue?

- All free users have the same plan — no differentiated priority
- Jobs are CPU/IO-bound (LLM wait) — throughput is limited by the gateway, not the queue
- With `concurrency: 5`, even a queue of 20 jobs is cleared in ~2-3 minutes (assuming 30s per step)

**Future (pro plan)**: separate priority queue for premium users.

```typescript
// Future: dual-queue setup
const standardQueue = new Queue('session-workflow-standard', ...);
const priorityQueue = new Queue('session-workflow-priority', ...);

// Worker picks from priority first, then standard
```

---

## Structured Logging (Pino)

Each job emits structured logs with correlation ID:

```typescript
// apps/backend/src/generation/worker/session-worker.ts

import pino from 'pino';
const logger = pino({ name: 'session-worker' });

async function processSessionJob(job: Job<SessionJobData>, deps: SessionWorkerDependencies): Promise<void> {
  const startTime = Date.now();
  const sessionId = job.data.sessionId;

  logger.info({ sessionId, attempt: job.attemptsMade + 1 }, 'job_started');

  try {
    await executeSessionWorkflow(job, deps);

    logger.info({
      sessionId,
      durationMs: Date.now() - startTime,
      attempts: job.attemptsMade + 1,
    }, 'job_completed');

  } catch (error) {
    logger.error({
      sessionId,
      durationMs: Date.now() - startTime,
      attempts: job.attemptsMade + 1,
      error: error instanceof Error ? error.message : 'unknown',
      stack: error instanceof Error ? error.stack : undefined,
    }, 'job_failed');

    throw error; // BullMQ retries
  }
}
```

### Log Schema

```typescript
type JobStartedLog = {
  sessionId: string;
  attempt: number;
};

type JobCompletedLog = {
  sessionId: string;
  durationMs: number;
  attempts: number;
  stepCount: number;
  toolKey: string;
  llmLatencyMs: number;
  tokensUsed: number;
};

type JobFailedLog = {
  sessionId: string;
  durationMs: number;
  attempts: number;
  error: string;
  stack?: string;
  failedAtStep?: number;
};
```

---

## Queue Health Dashboard

`GET /admin/jobs` returns the current state:

```json
{
  "queue": {
    "waiting":    2,
    "active":     3,
    "completed":  142,
    "failed":     1,
    "delayed":    0
  },
  "worker": {
    "status": "running",
    "uptimeSeconds": 86400,
    "jobsProcessed": 145
  },
  "recent": [
    {
      "id": "job-uuid",
      "sessionId": "session-uuid",
      "toolKey": "blog-post",
      "status": "active",
      "progress": 66,
      "attempts": 1,
      "startedAt": "2026-07-30T10:00:00Z"
    }
  ],
  "stability": {
    "failureRate24h": 0.02,
    "avgDurationMs": 45000,
    "p95DurationMs": 120000,
    "stalledJobs": 0,
    "queueDepth": 2
  }
}
```

---

## Stability Criteria

### Healthy thresholds

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| **Failure rate** (24h) | < 2% | 2–5% | > 5% |
| **Queue depth** (waiting) | 0–10 | 10–50 | > 50 |
| **Avg job duration** | < 60s | 60–120s | > 120s |
| **P95 job duration** | < 120s | 120–180s | > 180s |
| **Stalled jobs** | 0 | 1–2 | > 2 |
| **Worker memory** | < 512MB | 512MB–1GB | > 1GB |

### Automatic actions

| Condition | Action |
|-----------|--------|
| Failure rate > 5% | Alert admin, pause new jobs, investigate LLM gateway |
| Queue depth > 50 | Alert admin, scale worker (future: auto-scale) |
| Stalled jobs > 2 | Kill stalled workers, restart, notify admin |
| Worker memory > 1GB | Graceful restart of worker process |

---

## Alerting

```typescript
// apps/backend/src/generation/worker/health-monitor.ts

class QueueHealthMonitor {
  private checkInterval: NodeJS.Timer;

  start(intervalMs: number = 60_000): void {
    this.checkInterval = setInterval(async () => {
      await this.checkHealth();
    }, intervalMs);
  }

  private async checkHealth(): Promise<void> {
    const metrics = await this.collectMetrics();

    // Failure rate
    if (metrics.failureRate24h > 0.05) {
      this.alert('critical', 'High failure rate', {
        rate: metrics.failureRate24h,
        threshold: 0.05,
      });
    }

    // Queue depth
    if (metrics.queueDepth > 50) {
      this.alert('warning', 'Queue depth high', {
        depth: metrics.queueDepth,
        threshold: 50,
      });
    }

    // Stalled jobs
    if (metrics.stalledJobs > 2) {
      this.alert('critical', 'Stalled jobs detected', {
        count: metrics.stalledJobs,
        threshold: 2,
      });
    }

    // P95 latency
    if (metrics.p95DurationMs > 180_000) {
      this.alert('warning', 'High P95 latency', {
        p95: metrics.p95DurationMs,
        threshold: 180_000,
      });
    }
  }

  private alert(level: 'warning' | 'critical', message: string, data: Record<string, unknown>): void {
    logger.warn({ level, ...data }, `[ALERT] ${message}`);

    // Future: send to Slack, email, PagerDuty
    // if (level === 'critical') {
    //   await slackClient.send({ channel: '#alerts', text: message });
    // }
  }

  private async collectMetrics(): Promise<QueueMetrics> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      sessionQueue.getWaitingCount(),
      sessionQueue.getActiveCount(),
      sessionQueue.getCompletedCount(),
      sessionQueue.getFailedCount(),
      sessionQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      queueDepth: waiting,
      failureRate24h: failed / (completed + failed || 1),
      p95DurationMs: await this.computeP95(),
      stalledJobs: await this.countStalled(),
    };
  }
}
```

---

## Job Lifecycle Visibility

```typescript
// Job state transitions logged at each stage
// Logged via Pino, queryable in Railway / Grafana

job lifecycle:
  waiting ──▶ active ──▶ completed
                │
                ├── stalled ──▶ active (retry) or failed
                └── failed ──▶ waiting (retry) or failed (terminal)
```

| Transition | Log Level | Fields |
|-----------|-----------|--------|
| `waiting → active` | `info` | sessionId, attempt, queueDepth |
| `active → completed` | `info` | sessionId, durationMs, steps, llmLatencyMs, tokens |
| `active → failed` | `error` | sessionId, error, failedAtStep, stack |
| `stalled → retry` | `warn` | sessionId, stallCount, attempt |
| `failed (terminal)` | `error` | sessionId, totalAttempts, finalError |

---

## Graceful Shutdown & Crash Recovery

Already documented in [[BullMQ Worker Wiring]], summary:

1. **SIGTERM**: worker.pause() → finish active jobs (30s timeout) → worker.close()
2. **Crash**: XState snapshot persisted at each step → retry resumes from the snapshot
3. **Stalled**: BullMQ detects stall (30s), retry with new worker (max 2)

---

## Sources

- [[BullMQ Worker Wiring]] — worker implementation
- [[API Routes]] — GET /admin/jobs endpoint
- [[Database Schema]] — session_snapshots for crash recovery
- [[sources/PRD]] — NFR-O01 to NFR-O03 (observability requirements)