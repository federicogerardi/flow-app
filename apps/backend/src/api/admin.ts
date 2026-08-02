import type { Request, Response, NextFunction } from 'express';
import type { Queue } from 'bullmq';
import { QueueHealthMonitor } from '../generation/worker/health-monitor.js';

export function createAdminRoutes(queue: Queue) {
  const healthMonitor = new QueueHealthMonitor(queue);
  let workerStartTime = Date.now();

  return {
    getJobs: async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
        ]);

        const recentJobs = await queue.getJobs(['active', 'waiting', 'delayed'], 0, 10);
        const recentFormatted = recentJobs.map((job) => ({
          id: job.id,
          sessionId: job.data.sessionId,
          status: job.finishedOn ? (job.failedReason ? 'failed' : 'completed') : 'active',
          progress: job.progress,
          attempts: job.attemptsMade,
          startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
        }));

        const metrics = await healthMonitor.collectMetrics();

        res.json({
          queue: { waiting, active, completed, failed, delayed },
          worker: {
            status: 'running',
            uptimeSeconds: Math.floor((Date.now() - workerStartTime) / 1000),
            jobsProcessed: completed + failed,
          },
          recent: recentFormatted,
          stability: {
            failureRate24h: metrics.failureRate24h,
            avgDurationMs: metrics.p95DurationMs, // approximate
            p95DurationMs: metrics.p95DurationMs,
            stalledJobs: metrics.stalledJobs,
            queueDepth: metrics.queueDepth,
          },
        });
      } catch (err) {
        next(err);
      }
    },

    getHealth: async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const alerts = await healthMonitor.checkHealth();
        const criticals = alerts.filter((a) => a.level === 'critical');

        res.json({
          status: criticals.length > 0 ? 'degraded' : 'healthy',
          alerts: alerts.map((a) => ({
            level: a.level,
            message: a.message,
            data: a.data,
            timestamp: a.timestamp.toISOString(),
          })),
        });
      } catch (err) {
        next(err);
      }
    },

    setWorkerStartTime: (time: number) => {
      workerStartTime = time;
    },
  };
}
