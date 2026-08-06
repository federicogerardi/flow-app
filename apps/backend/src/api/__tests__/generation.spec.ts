import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGenerationRoutes } from '../generation.js';
import type { Request, Response } from 'express';

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    params: {},
    query: {},
    body: {},
    user: { sub: 'user-1', email: 'test@test.com', role: 'member' },
    log: { info: vi.fn(), error: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })) },
    app: { locals: { eventBridge: { subscribe: vi.fn(() => vi.fn()) } } },
    on: vi.fn(),
    ...overrides,
  } as unknown as Request;
}

function mockRes() {
  const res: Record<string, unknown> = {
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
    writeHead: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
  };
  res.json = vi.fn().mockReturnValue(res);
  res.status = vi.fn(() => res) as unknown as Response['status'];
  return res as unknown as Response;
}

function createMockSessionRepo() {
  const sessions = new Map();
  return {
    sessions,
    findById: vi.fn(async (id: string) => sessions.get(id) ?? null),
    findByArtifactId: vi.fn(async (_artifactId: string) => null),
    findAll: vi.fn(async ({ status, limit }: { status?: string; limit?: number } = {}) => {
      const all = Array.from(sessions.values());
      let filtered = all;
      if (status) filtered = filtered.filter((s: Record<string, unknown>) => s.status?.toString() === status);
      return filtered.slice(0, limit ?? 50);
    }),
    findByWorkspace: vi.fn(async (workspaceId: string, { status, limit }: { status?: string; limit?: number } = {}) => {
      const all = Array.from(sessions.values());
      let filtered = all.filter((s: Record<string, unknown>) => s.workspaceId === workspaceId);
      if (status) filtered = filtered.filter((s: Record<string, unknown>) => s.status?.toString() === status);
      return filtered.slice(0, limit ?? 50);
    }),
    findByIdempotencyKeyHash: vi.fn(async (_hash: string) => null),
    save: vi.fn(async (session: Record<string, unknown>) => { sessions.set(session.sessionId, session); }),
    saveIdempotencyKey: vi.fn(async () => {}),
    saveSnapshot: vi.fn(async () => {}),
    loadSnapshot: vi.fn(async () => null),
    saveWithLock: vi.fn(async () => {}),
  };
}

function mockDb() {
  return {
    selectFrom: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue([]),
  };
}

function createMockWorkspaceRepo() {
  return {
    findById: vi.fn(async () => ({
      workspaceId: 'ws-1',
      isMember: vi.fn(() => true),
      assets: [],
      getAssetsByType: vi.fn(() => []),
    })),
    findByMember: vi.fn(async () => []),
    save: vi.fn(async () => {}),
    saveWithLock: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    findMembership: vi.fn(async () => null),
    findPendingInvitations: vi.fn(async () => []),
  };
}

function createMockAssetRepo() {
  return {
    findByWorkspace: vi.fn(async () => []),
    findById: vi.fn(async () => null),
    findByWorkspaceAndType: vi.fn(async () => []),
    save: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
  };
}

vi.mock('../../generation/jobs/enqueue-session.job.js', () => ({
  enqueueSession: vi.fn().mockResolvedValue(undefined),
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
          acquisition: {},
          steps: [{ label: 'Draft', prompt: { model: 'test-model' }, execution: { timeoutMs: 30000 } }],
        };
      }
      return null;
    }),
    ToolKey: {
      from: vi.fn((v: string) => ({ value: v, toString: () => v, equals: () => false })),
    },
    ReadinessPolicy: {
      from: vi.fn(() => ({ evaluate: vi.fn(() => ({ isReady: true, missing: [] })) })),
    },
    Session: {
      create: vi.fn((_toolKey: unknown, _workspaceId: string, _userId: string, _hash: string) => ({
        sessionId: 's-new',
        toolKey: { value: 'blog-post', toString: () => 'blog-post' },
        workspaceId: _workspaceId,
        status: { toString: () => 'draft' },
        currentStepIndex: 0,
        startedAt: new Date(),
        completedAt: null,
        apply: vi.fn(),
      })),
    },
    DomainError: class DomainError extends Error {
      code = 'DOMAIN_ERROR';
      retryable = false;
      constructor(message: string) { super(message); }
    },
  };
});

describe('Generation Routes', () => {
  let routes: ReturnType<typeof createGenerationRoutes>;
  let sessionRepo: ReturnType<typeof createMockSessionRepo>;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionRepo = createMockSessionRepo();
    const db = mockDb() as unknown as ReturnType<typeof mockDb>;
    routes = createGenerationRoutes(sessionRepo, createMockWorkspaceRepo(), createMockAssetRepo(), db as never);
  });

  describe('listSessions', () => {
    it('should return sessions array', async () => {
      sessionRepo.sessions.set('s-1', {
        sessionId: 's-1',
        toolKey: { toString: () => 'blog-post' },
        workspaceId: 'ws-1',
        status: { toString: () => 'completed' },
        startedAt: new Date('2025-01-01'),
      });

      const req = mockReq();
      const res = mockRes();
      const next = vi.fn();

      await routes.listSessions(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.any(Array),
          total: expect.any(Number),
        }),
      );
    });
  });

  describe('getSession', () => {
    it('should return session detail', async () => {
      sessionRepo.sessions.set('s-1', {
        sessionId: 's-1',
        toolKey: { toString: () => 'blog-post' },
        workspaceId: 'ws-1',
        status: { toString: () => 'completed' },
        currentStepIndex: 1,
        startedAt: new Date('2025-01-01'),
        completedAt: new Date('2025-01-01'),
      });

      const req = mockReq({ params: { id: 's-1' } });
      const res = mockRes();
      const next = vi.fn();

      await routes.getSession(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 's-1',
          toolKey: 'blog-post',
          status: 'completed',
        }),
      );
    });

    it('should return 404 when session not found', async () => {
      const req = mockReq({ params: { id: 'nonexistent' } });
      const res = mockRes();
      const next = vi.fn();

      await routes.getSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'SESSION_NOT_FOUND' }),
        }),
      );
    });
  });

  describe('startSession', () => {
    it('should return 201 with session data on valid inputs', async () => {
      sessionRepo.findByIdempotencyKeyHash.mockResolvedValue(null);

      const req = mockReq({
        params: { toolKey: 'blog-post' },
        body: { workspaceId: 'ws-1', inputs: { text: { topic: 'test' } } },
      });
      const res = mockRes();
      const next = vi.fn();

      await routes.startSession(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          session: expect.objectContaining({ id: 's-new' }),
          replayed: false,
        }),
      );
    });

    it('should return 200 on idempotent replay', async () => {
      const existingSession = {
        sessionId: 's-existing',
        toolKey: { value: 'blog-post' },
        workspaceId: 'ws-1',
        status: { toString: () => 'completed' },
      };
      sessionRepo.findByIdempotencyKeyHash.mockResolvedValue(existingSession);

      const req = mockReq({
        params: { toolKey: 'blog-post' },
        body: { workspaceId: 'ws-1', inputs: {} },
      });
      const res = mockRes();
      const next = vi.fn();

      await routes.startSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ replayed: true }),
      );
    });
  });

  describe('getArtifact', () => {
    it('should return artifact when found', async () => {
      const db = mockDb();
      db.executeTakeFirst.mockResolvedValueOnce({
        id: 'a-1',
        session_id: 's-1',
        step_number: 1,
        content: 'Generated content',
        status: 'completed',
        created_at: '2025-01-01T00:00:00.000Z',
      });

      const routesWithArtifact = createGenerationRoutes(sessionRepo, createMockWorkspaceRepo(), createMockAssetRepo(), db as never);

      const req = mockReq({ params: { id: 'a-1' } });
      const res = mockRes();
      const next = vi.fn();

      await routesWithArtifact.getArtifact(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'a-1',
          content: 'Generated content',
        }),
      );
    });

    it('should return 404 when artifact not found', async () => {
      const db = mockDb();
      db.executeTakeFirst.mockResolvedValueOnce(null);

      const routesWithArtifact = createGenerationRoutes(sessionRepo, createMockWorkspaceRepo(), createMockAssetRepo(), db as never);

      const req = mockReq({ params: { id: 'nonexistent' } });
      const res = mockRes();
      const next = vi.fn();

      await routesWithArtifact.getArtifact(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
