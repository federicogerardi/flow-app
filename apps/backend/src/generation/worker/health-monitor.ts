import type { Queue } from 'bullmq';
import { logger } from '../../infrastructure/logger.js';

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  queueDepth: number;
  failureRate24h: number;
  p95DurationMs: number;
  stalledJobs: number;
}

export type AlertLevel = 'warning' | 'critical';

export interface HealthAlert {
  level: AlertLevel;
  message: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

const HEALTHY_THRESHOLDS = {
  failureRate: { warning: 0.02, critical: 0.05 },
  queueDepth: { warning: 10, critical: 50 },
  avgDurationMs: { warning: 60_000, critical: 120_000 },
  p95DurationMs: { warning: 120_000, critical: 180_000 },
  stalledJobs: { warning: 1, critical: 2 },
} as const;

export class QueueHealthMonitor {
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private readonly log = logger.child({ component: 'queue-health-monitor' });

  constructor(private readonly queue: Queue) {}

  start(intervalMs: number = 60_000): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (err) {
        this.log.error({ err }, 'health_check_error');
      }
    }, intervalMs);

    this.log.info({ intervalMs }, 'health_monitor_started');
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.log.info('health_monitor_stopped');
    }
  }

  async collectMetrics(): Promise<QueueMetrics> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      queueDepth: waiting + active + delayed,
      failureRate24h: failed / (completed + failed || 1),
      p95DurationMs: await this.computeP95(),
      stalledJobs: await this.countStalled(),
    };
  }

  async checkHealth(): Promise<HealthAlert[]> {
    const metrics = await this.collectMetrics();
    const alerts: HealthAlert[] = [];

    // Failure rate
    if (metrics.failureRate24h > HEALTHY_THRESHOLDS.failureRate.critical) {
      alerts.push(this.alert('critical', 'High failure rate', {
        rate: metrics.failureRate24h,
        threshold: HEALTHY_THRESHOLDS.failureRate.critical,
      }));
    } else if (metrics.failureRate24h > HEALTHY_THRESHOLDS.failureRate.warning) {
      alerts.push(this.alert('warning', 'Elevated failure rate', {
        rate: metrics.failureRate24h,
        threshold: HEALTHY_THRESHOLDS.failureRate.warning,
      }));
    }

    // Queue depth
    if (metrics.queueDepth > HEALTHY_THRESHOLDS.queueDepth.critical) {
      alerts.push(this.alert('critical', 'Queue depth critical', {
        depth: metrics.queueDepth,
        threshold: HEALTHY_THRESHOLDS.queueDepth.critical,
      }));
    } else if (metrics.queueDepth > HEALTHY_THRESHOLDS.queueDepth.warning) {
      alerts.push(this.alert('warning', 'Queue depth high', {
        depth: metrics.queueDepth,
        threshold: HEALTHY_THRESHOLDS.queueDepth.warning,
      }));
    }

    // Stalled jobs
    if (metrics.stalledJobs >= HEALTHY_THRESHOLDS.stalledJobs.critical) {
      alerts.push(this.alert('critical', 'Stalled jobs detected', {
        count: metrics.stalledJobs,
        threshold: HEALTHY_THRESHOLDS.stalledJobs.critical,
      }));
    } else if (metrics.stalledJobs >= HEALTHY_THRESHOLDS.stalledJobs.warning) {
      alerts.push(this.alert('warning', 'Stalled jobs detected', {
        count: metrics.stalledJobs,
        threshold: HEALTHY_THRESHOLDS.stalledJobs.warning,
      }));
    }

    // P95 latency
    if (metrics.p95DurationMs > HEALTHY_THRESHOLDS.p95DurationMs.critical) {
      alerts.push(this.alert('critical', 'High P95 latency', {
        p95: metrics.p95DurationMs,
        threshold: HEALTHY_THRESHOLDS.p95DurationMs.critical,
      }));
    } else if (metrics.p95DurationMs > HEALTHY_THRESHOLDS.p95DurationMs.warning) {
      alerts.push(this.alert('warning', 'High P95 latency', {
        p95: metrics.p95DurationMs,
        threshold: HEALTHY_THRESHOLDS.p95DurationMs.warning,
      }));
    }

    return alerts;
  }

  private alert(level: AlertLevel, message: string, data: Record<string, unknown>): HealthAlert {
    const alert: HealthAlert = { level, message, data, timestamp: new Date() };

    if (level === 'critical') {
      this.log.warn({ level, ...data }, `[ALERT] ${message}`);
    } else {
      this.log.info({ level, ...data }, `[ALERT] ${message}`);
    }

    return alert;
  }

  private async computeP95(): Promise<number> {
    // Approximate P95 from recent completed jobs
    const jobs = await this.queue.getCompleted(0, 99);
    if (jobs.length === 0) return 0;

    const durations = jobs
      .filter((j) => j.finishedOn && j.processedOn)
      .map((j) => j.finishedOn! - j.processedOn!)
      .sort((a, b) => a - b);

    if (durations.length === 0) return 0;

    const p95Index = Math.floor(durations.length * 0.95);
    return durations[p95Index] ?? durations[durations.length - 1] ?? 0;
  }

  private async countStalled(): Promise<number> {
    const waiting = await this.queue.getJobs(['waiting'], 0, 200);
    return waiting.filter((j) => j.attemptsMade > 0).length;
  }
}
