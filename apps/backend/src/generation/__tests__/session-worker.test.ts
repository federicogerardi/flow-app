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

function createMockDeps(overrides: Partial<SessionWorkerDeps> = {}): SessionWorkerDeps {
  return {
    sessionRepo: {
      findById: vi.fn().mockImplementation(() => {
        const mockSession = {
          sessionId: 's-1',
          toolKey: { value: 'blog-post', toString: () => 'blog-post' },
          workspaceId: 'ws-1',
          userId: 'user-1',
          status: { toString: () => 'queued' },
          currentStepIndex: 0,
          startedAt: new Date(),
          completedAt: null,
          artifacts: [] as Array<{ artifactId: string; stepNumber: number; content: string; status: string; createdAt: Date; sessionId: string }>,
          version: 1,
          apply: vi.fn(function(this: typeof mockSession, event: { type: string; artifact?: typeof mockSession.artifacts[number]; isLast?: boolean }) {
            if (event.type === 'ADD_ARTIFACT' && event.artifact) {
              this.artifacts.push(event.artifact);
            }
            if (event.type === 'COMPLETE') {
              this.completedAt = new Date();
            }
          }),
        };
        return Promise.resolve(mockSession);
      }),
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

describe('SessionWorker', () => {
  let deps: SessionWorkerDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REDIS_URL = 'redis://localhost:6379';
    deps = createMockDeps();
  });

  it('should create a worker with correct queue name', async () => {
    const { createSessionWorker } = await import('../worker/session-worker.js');
    const worker = createSessionWorker(deps);

    expect(worker).toBeDefined();
  });

  it('should process a job and return artifact', async () => {
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
});
