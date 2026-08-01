import Redis from 'ioredis';
import { logger } from './logger.js';

export interface SSEPayload {
  event: string;
  data: Record<string, unknown>;
}

export class JobEventBridge {
  private pub: Redis | null = null;
  private sub: Redis | null = null;
  private connected = false;

  constructor(redisUrl: string) {
    const isDev = process.env.NODE_ENV === 'development';

    try {
      this.pub = new Redis(redisUrl, {
        maxRetriesPerRequest: isDev ? 0 : 3,
        retryStrategy: (times) => {
          if (isDev && times > 1) return null;
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      this.sub = new Redis(redisUrl, {
        maxRetriesPerRequest: isDev ? 0 : 3,
        retryStrategy: (times) => {
          if (isDev && times > 1) return null;
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      this.pub.on('error', (err) => {
        if (!this.connected) {
          logger.warn({ err: err.message }, 'Redis not available — SSE disabled');
        }
      });

      this.pub.connect().then(() => {
        this.connected = true;
        logger.info('Redis connected');
      }).catch(() => {
        if (isDev) {
          logger.warn('Redis not available — running without SSE support');
        }
      });
    } catch {
      if (isDev) {
        logger.warn('Redis not available — running without SSE support');
      }
    }
  }

  publish(sessionId: string, payload: SSEPayload): void {
    if (!this.connected || !this.pub) return;
    this.pub.publish(`session:${sessionId}:events`, JSON.stringify(payload));
  }

  subscribe(sessionId: string, onEvent: (payload: SSEPayload) => void): () => void {
    if (!this.connected || !this.sub) {
      return () => {};
    }

    const channel = `session:${sessionId}:events`;

    const messageHandler = (ch: string, message: string) => {
      if (ch === channel) {
        onEvent(JSON.parse(message));
      }
    };

    this.sub.subscribe(channel);
    this.sub.on('message', messageHandler);

    return () => {
      this.sub?.unsubscribe(channel);
      this.sub?.off('message', messageHandler);
    };
  }

  async close(): Promise<void> {
    await this.pub?.quit().catch(() => {});
    await this.sub?.quit().catch(() => {});
  }
}
