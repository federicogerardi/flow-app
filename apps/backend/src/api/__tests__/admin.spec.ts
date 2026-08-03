import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAdminRoutes } from '../admin.js';
import type { Request, Response } from 'express';

function mockRes() {
  const res: Record<string, unknown> = {};
  res.json = vi.fn().mockReturnValue(res);
  res.status = vi.fn(() => res) as unknown as Response['status'];
  return res as unknown as Response;
}

function createMockQueue() {
  return {
    getWaitingCount: vi.fn().mockResolvedValue(3),
    getActiveCount: vi.fn().mockResolvedValue(2),
    getCompletedCount: vi.fn().mockResolvedValue(150),
    getFailedCount: vi.fn().mockResolvedValue(5),
    getDelayedCount: vi.fn().mockResolvedValue(0),
    getJobs: vi.fn().mockResolvedValue([
      {
        id: 'job-1',
        data: { sessionId: 's-1' },
        finishedOn: null,
        failedReason: null,
        progress: 50,
        attemptsMade: 0,
        processedOn: Date.now(),
      },
      {
        id: 'job-2',
        data: { sessionId: 's-2' },
        finishedOn: Date.now(),
        failedReason: 'test failure',
        progress: 100,
        attemptsMade: 2,
        processedOn: Date.now() - 10000,
      },
    ]),
    getCompleted: vi.fn().mockResolvedValue([]),
  };
}

vi.mock('../../infrastructure/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    })),
  },
}));

describe('Admin Routes', () => {
  let routes: ReturnType<typeof createAdminRoutes>;
  let queue: ReturnType<typeof createMockQueue>;

  beforeEach(() => {
    vi.clearAllMocks();
    queue = createMockQueue();
    routes = createAdminRoutes(queue as never);
  });

  describe('getJobs', () => {
    it('should return queue stats', async () => {
      const req = {} as Request;
      const res = mockRes();
      const next = vi.fn();

      await routes.getJobs(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          queue: expect.objectContaining({
            waiting: 3,
            active: 2,
            completed: 150,
            failed: 5,
            delayed: 0,
          }),
          worker: expect.objectContaining({
            status: 'running',
          }),
          recent: expect.any(Array),
          stability: expect.objectContaining({
            queueDepth: expect.any(Number),
            failureRate24h: expect.any(Number),
          }),
        }),
      );
    });
  });

  describe('getHealth', () => {
    it('should return { status: healthy, alerts: [] } when no issues', async () => {
      const req = {} as Request;
      const res = mockRes();
      const next = vi.fn();

      await routes.getHealth(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          alerts: expect.any(Array),
        }),
      );
    });
  });
});
