import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SessionWorkerDeps } from '../worker/session-worker.js';

vi.mock('bullmq', () => ({
  Worker: vi.fn(function (
    _queueName: string,
    processor: (job: unknown) => Promise<void>,
    _opts: unknown,
  ) {
    return {
      processor: vi.fn(processor),
      close: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn().mockResolvedValue(undefined),
      isRunning: vi.fn().mockReturnValue(false),
      on: vi.fn(),
    };
  }),
}));

vi.mock('@flow-app/domain', async () => {
  const actual = await vi.importActual('@flow-app/domain');
  return {
    ...actual,
    getTool: vi.fn((key: { value?: string } | string) => {
      const k = typeof key === 'string' ? key : key.value;
      if (k === 'blog-post') {
        return {
          toolKey: k,
          name: 'Blog Post',
          steps: [
            { label: 'Draft', prompt: { model: 'test-model', templateId: null }, execution: { timeoutMs: 30000 } },
            { label: 'Review', prompt: { model: 'test-model', templateId: null }, execution: { timeoutMs: 30000 } },
          ],
        };
      }
      return null;
    }),
    ContextEnricher: class {
      enrich(info: Record<string, unknown>) { return JSON.stringify(info); }
    },
    Artifact: {
      create: vi.fn((sessionId: string, stepNum: number, content: string) => ({
        artifactId: `a-${sessionId}-${stepNum}`,
        content,
        stepNumber: stepNum,
        sessionId,
        status: 'completed',
        createdAt: new Date(),
      })),
    },
    DEFAULT_COMPONENTS: {},
    PromptTemplateId: {
      fromString: vi.fn((id: string) => ({ toString: () => id })),
    },
    PromptVersion: {
      from: vi.fn((v: string) => ({ toString: () => v })),
      LATEST: { toString: () => 'latest' },
    },
    SessionNotFoundError: class extends Error {
      code = 'SESSION_NOT_FOUND';
      retryable = false;
      constructor(id: string) { super(`Session ${id} not found`); }
    },
    ToolNotFoundError: class extends Error {
      code = 'TOOL_NOT_FOUND';
      retryable = false;
      constructor(key: string) { super(`Tool ${key} not found`); }
    },
    DomainError: class extends Error {
      code = 'DOMAIN_ERROR';
      retryable = false;
      constructor(message: string) { super(message); }
    },
    StepNotFoundError: class extends Error {
      code = 'STEP_NOT_FOUND';
      retryable = false;
      constructor(stepIndex: number, toolKey: string) { super(`Step ${stepIndex} not found in tool ${toolKey}`); }
    },
    InfrastructureError: class extends Error {
      code = 'INFRASTRUCTURE_UNAVAILABLE';
      retryable = true;
      constructor(message: string) { super(message); }
    },
  };
});

vi.mock('../../infrastructure/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(() => ({
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      })),
    })),
  },
}));

// ── Mock session factory ───────────────────────────────────────────────────

function createMockSession(overrides: {
  status?: string;
  isTerminal?: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
} = {}) {
  const self = {
    sessionId: 's-1',
    toolKey: { value: 'blog-post', toString: () => 'blog-post' },
    workspaceId: 'ws-1',
    userId: 'user-1',
    status: {
      toString: () => overrides.status ?? 'queued',
      isTerminal: () => overrides.isTerminal ?? false,
    },
    currentStepIndex: 0,
    startedAt: new Date(),
    completedAt: null as Date | null,
    errorCode: overrides.errorCode ?? null,
    errorMessage: overrides.errorMessage ?? null,
    artifacts: [] as Array<{ artifactId: string; stepNumber: number; content: string; status: string; createdAt: Date; sessionId: string }>,
    version: 1,
    apply: vi.fn(function (this: typeof self, event: { type: string; artifact?: typeof self.artifacts[number]; isLast?: boolean }) {
      if (event.type === 'ADD_ARTIFACT' && event.artifact) {
        this.artifacts.push(event.artifact);
      }
      if (event.type === 'COMPLETE') {
        this.completedAt = new Date();
      }
    }),
  };
  return self;
}

function createMockDeps(overrides: Partial<SessionWorkerDeps> = {}): SessionWorkerDeps {
  return {
    sessionRepo: {
      findById: vi.fn().mockResolvedValue(createMockSession()),
      save: vi.fn().mockResolvedValue(undefined),
      saveWithLock: vi.fn().mockResolvedValue(undefined),
      saveIdempotencyKey: vi.fn().mockResolvedValue(undefined),
      findByIdempotencyKeyHash: vi.fn().mockResolvedValue(null),
      findAll: vi.fn().mockResolvedValue([]),
      findByWorkspace: vi.fn().mockResolvedValue([]),
      saveSnapshot: vi.fn().mockResolvedValue(undefined),
      loadSnapshot: vi.fn().mockResolvedValue(null),
    },
    eventBridge: {
      publish: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
      close: vi.fn().mockResolvedValue(undefined),
    },
    llmGateway: {
      generate: vi.fn().mockResolvedValue({
        content: 'Generated step content',
        model: 'test-model',
        usage: { totalTokens: 100 },
        latencyMs: 500,
        fallbackUsed: false,
      }),
    },
    promptComposer: {
      compose: vi.fn(() => ({
        system: 'System prompt',
        user: 'User prompt',
      })),
    },
    promptTemplateRepo: {
      findById: vi.fn().mockResolvedValue(null),
      findAll: vi.fn().mockResolvedValue([]),
    },
    gamificationEventPublisher: {
      publishSessionCompleted: vi.fn().mockResolvedValue(undefined),
      publishMessageAdded: vi.fn().mockResolvedValue(undefined),
      publishMemberJoined: vi.fn().mockResolvedValue(undefined),
    },
    consumeCreditsUC: {
      execute: vi.fn().mockResolvedValue({
        consumed: 1,
        remainingCredits: 249,
        quota: {},
      }),
    },
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('SessionWorker', () => {
  let deps: SessionWorkerDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REDIS_URL = 'redis://localhost:6379';
    deps = createMockDeps();
  });

  // ── Existing tests ──────────────────────────────────────────────────────

  it('should create a worker with correct queue name', async () => {
    const { createSessionWorker } = await import('../worker/session-worker.js');
    const worker = createSessionWorker(deps);

    expect(worker).toBeDefined();
  });

  it('should process a job and return artifact (happy path)', async () => {
    const { createSessionWorker } = await import('../worker/session-worker.js');
    const { Worker } = await import('bullmq');

    createSessionWorker(deps);

    const mockWorker = vi.mocked(Worker).mock.results[0]?.value as { processor?: { mock?: { calls?: Array<[unknown]> } } };
    if (!mockWorker?.processor) return;

    const processorFn = mockWorker.processor;

    await processorFn({
      data: { sessionId: 's-1' },
      id: 'job-1',
      attemptsMade: 0,
    });

    expect(deps.llmGateway.generate).toHaveBeenCalled();
    expect(deps.eventBridge.publish).toHaveBeenCalled();
  });

  it('should throw SessionNotFoundError when session does not exist', async () => {
    deps.sessionRepo.findById = vi.fn().mockResolvedValue(null);

    const { createSessionWorker } = await import('../worker/session-worker.js');
    const { Worker } = await import('bullmq');

    createSessionWorker(deps);

    const mockWorker = vi.mocked(Worker).mock.results[0]?.value as { processor?: { mock?: { calls?: Array<[unknown]> } } };
    if (!mockWorker?.processor) return;

    const processorFn = mockWorker.processor;

    await expect(
      processorFn({
        data: { sessionId: 's-nonexistent' },
        id: 'job-2',
        attemptsMade: 0,
      }),
    ).rejects.toThrow(/Session .* not found/);
  });

  it('should throw when REDIS_URL is not set', async () => {
    delete process.env.REDIS_URL;

    const { createSessionWorker } = await import('../worker/session-worker.js');

    expect(() => createSessionWorker(deps)).toThrow('REDIS_URL not set');
  });

  // ── New tests: Terminal state guard ──────────────────────────────────────

  it('[T1] skips processing for already-completed session', async () => {
    deps.sessionRepo.findById = vi.fn().mockResolvedValue(
      createMockSession({ status: 'completed', isTerminal: true }),
    );

    const { createSessionWorker } = await import('../worker/session-worker.js');
    const { Worker } = await import('bullmq');

    createSessionWorker(deps);

    const mockWorker = vi.mocked(Worker).mock.results[0]?.value as { processor?: { mock?: { calls?: Array<[unknown]> } } };
    if (!mockWorker?.processor) return;

    const processorFn = mockWorker.processor;

    await processorFn({
      data: { sessionId: 's-completed' },
      id: 'job-t1',
      attemptsMade: 0,
    });

    // No LLM calls, no events published
    expect(deps.llmGateway.generate).not.toHaveBeenCalled();
    expect(deps.eventBridge.publish).not.toHaveBeenCalled();
    expect(deps.consumeCreditsUC.execute).not.toHaveBeenCalled();
  });

  it('[T2] skips processing for already-cancelled session', async () => {
    deps.sessionRepo.findById = vi.fn().mockResolvedValue(
      createMockSession({ status: 'cancelled', isTerminal: true }),
    );

    const { createSessionWorker } = await import('../worker/session-worker.js');
    const { Worker } = await import('bullmq');

    createSessionWorker(deps);

    const mockWorker = vi.mocked(Worker).mock.results[0]?.value as { processor?: { mock?: { calls?: Array<[unknown]> } } };
    if (!mockWorker?.processor) return;

    const processorFn = mockWorker.processor;

    await processorFn({
      data: { sessionId: 's-cancelled' },
      id: 'job-t2',
      attemptsMade: 0,
    });

    // No side effects — worker returns cleanly
    expect(deps.llmGateway.generate).not.toHaveBeenCalled();
    expect(deps.consumeCreditsUC.execute).not.toHaveBeenCalled();
  });

  it('[T3] skips processing for already-failed session', async () => {
    deps.sessionRepo.findById = vi.fn().mockResolvedValue(
      createMockSession({ status: 'failed', isTerminal: true }),
    );

    const { createSessionWorker } = await import('../worker/session-worker.js');
    const { Worker } = await import('bullmq');

    createSessionWorker(deps);

    const mockWorker = vi.mocked(Worker).mock.results[0]?.value as { processor?: { mock?: { calls?: Array<[unknown]> } } };
    if (!mockWorker?.processor) return;

    const processorFn = mockWorker.processor;

    await processorFn({
      data: { sessionId: 's-failed' },
      id: 'job-t3',
      attemptsMade: 0,
    });

    expect(deps.llmGateway.generate).not.toHaveBeenCalled();
    expect(deps.consumeCreditsUC.execute).not.toHaveBeenCalled();
  });

  // ── New tests: Gamification + SSE conditional ────────────────────────────

  it('[T4] happy path: credits consumed + XP awarded for completed session', async () => {
    const { createSessionWorker } = await import('../worker/session-worker.js');
    const { Worker } = await import('bullmq');

    createSessionWorker(deps);

    const mockWorker = vi.mocked(Worker).mock.results[0]?.value as { processor?: { mock?: { calls?: Array<[unknown]> } } };
    if (!mockWorker?.processor) return;

    const processorFn = mockWorker.processor;

    await processorFn({
      data: { sessionId: 's-1' },
      id: 'job-t4',
      attemptsMade: 0,
    });

    expect(deps.consumeCreditsUC.execute).toHaveBeenCalled();
    expect(deps.gamificationEventPublisher.publishSessionCompleted).toHaveBeenCalledWith(
      's-1', 'ws-1', 'user-1', 'blog-post',
    );
  });

  it('[T5] happy path: session_completed SSE published for completed session', async () => {
    const { createSessionWorker } = await import('../worker/session-worker.js');
    const { Worker } = await import('bullmq');

    createSessionWorker(deps);

    const mockWorker = vi.mocked(Worker).mock.results[0]?.value as { processor?: { mock?: { calls?: Array<[unknown]> } } };
    if (!mockWorker?.processor) return;

    const processorFn = mockWorker.processor;

    await processorFn({
      data: { sessionId: 's-1' },
      id: 'job-t5',
      attemptsMade: 0,
    });

    // Verify session_completed was published
    const publishCalls = vi.mocked(deps.eventBridge.publish).mock.calls;
    const completedCall = publishCalls.find(
      ([_id, payload]: [unknown, { event: string }]) => (payload as { event: string }).event === 'session_completed',
    );
    expect(completedCall).toBeDefined();
  });

  it('[T6] credits NOT consumed + session_failed SSE for failed session', async () => {
    // Simulate a session where the LLM gateway throws, causing the machine
    // to transition to 'failed' via onError (not an uncaught exception).
    // The machine reaches done with snapshot.value === 'failed'.
    deps.llmGateway.generate = vi.fn().mockRejectedValue(new Error('LLM timeout'));

    const { createSessionWorker } = await import('../worker/session-worker.js');
    const { Worker } = await import('bullmq');

    createSessionWorker(deps);

    const mockWorker = vi.mocked(Worker).mock.results[0]?.value as { processor?: { mock?: { calls?: Array<[unknown]> } } };
    if (!mockWorker?.processor) return;

    const processorFn = mockWorker.processor;

    await processorFn({
      data: { sessionId: 's-1' },
      id: 'job-t6',
      attemptsMade: 0,
    });

    // Credits NOT consumed (machine reached 'failed', not 'completed')
    expect(deps.consumeCreditsUC.execute).not.toHaveBeenCalled();
    expect(deps.gamificationEventPublisher.publishSessionCompleted).not.toHaveBeenCalled();

    // session_failed SSE published
    const publishCalls = vi.mocked(deps.eventBridge.publish).mock.calls;
    const failedCall = publishCalls.find(
      ([_id, payload]: [unknown, { event: string }]) => (payload as { event: string }).event === 'session_failed',
    );
    expect(failedCall).toBeDefined();
  });

  it('[T7] no credits consumed + no session_completed for cancelled state', async () => {
    // For cancelled state, the worker is reached via the terminal guard
    // (T2 already tests that). This test validates that if somehow a session
    // reaches cancelled through the machine (CANCEL event), no credits/XP
    // are awarded. The terminal guard at the start covers this case in practice.
    deps.sessionRepo.findById = vi.fn().mockResolvedValue(
      createMockSession({ status: 'cancelled', isTerminal: true }),
    );

    const { createSessionWorker } = await import('../worker/session-worker.js');
    const { Worker } = await import('bullmq');

    createSessionWorker(deps);

    const mockWorker = vi.mocked(Worker).mock.results[0]?.value as { processor?: { mock?: { calls?: Array<[unknown]> } } };
    if (!mockWorker?.processor) return;

    const processorFn = mockWorker.processor;

    await processorFn({
      data: { sessionId: 's-cancelled' },
      id: 'job-t7',
      attemptsMade: 0,
    });

    expect(deps.consumeCreditsUC.execute).not.toHaveBeenCalled();
    expect(deps.gamificationEventPublisher.publishSessionCompleted).not.toHaveBeenCalled();
  });
});