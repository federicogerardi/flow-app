import Redis from 'ioredis';

export interface SSEPayload {
  event: string;
  data: Record<string, unknown>;
}

export class JobEventBridge {
  private pub: Redis;
  private sub: Redis;

  constructor(redisUrl: string) {
    this.pub = new Redis(redisUrl);
    this.sub = new Redis(redisUrl);
  }

  publish(sessionId: string, payload: SSEPayload): void {
    this.pub.publish(`session:${sessionId}:events`, JSON.stringify(payload));
  }

  subscribe(sessionId: string, onEvent: (payload: SSEPayload) => void): () => void {
    const channel = `session:${sessionId}:events`;

    const messageHandler = (ch: string, message: string) => {
      if (ch === channel) {
        onEvent(JSON.parse(message));
      }
    };

    this.sub.subscribe(channel);
    this.sub.on('message', messageHandler);

    return () => {
      this.sub.unsubscribe(channel);
      this.sub.off('message', messageHandler);
    };
  }

  async close(): Promise<void> {
    await this.pub.quit();
    await this.sub.quit();
  }
}
