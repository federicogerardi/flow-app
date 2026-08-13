export type SSEEventType = 'session_started' | 'step_completed' | 'session_completed' | 'session_failed';

export interface SSEEvent {
  event: SSEEventType;
  data: Record<string, unknown>;
}

type SSECallbacks = {
  onStarted?: (data: Record<string, unknown>) => void;
  onStep?: (data: Record<string, unknown>) => void;
  onCompleted?: (data: Record<string, unknown>) => void;
  onFailed?: (data: Record<string, unknown>) => void;
  onError?: (error: Event) => void;
  /** Fired when the connection gave up after MAX_RETRIES — no further reconnect attempts. */
  onGiveUp?: () => void;
};

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;

export class SSEClient {
  private sources = new Map<string, EventSource>();
  private callbacks = new Map<string, SSECallbacks>();
  private retryCount = new Map<string, number>();
  private retryTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private connectSource(sessionId: string, handlers: SSECallbacks): EventSource {
    const source = new EventSource(`/api/sessions/${sessionId}/events`, {
      withCredentials: true,
    });

    source.addEventListener('session_started', (e: MessageEvent) => {
      this.retryCount.set(sessionId, 0);
      handlers.onStarted?.(JSON.parse(e.data));
    });

    source.addEventListener('step_completed', (e: MessageEvent) => {
      handlers.onStep?.(JSON.parse(e.data));
    });

    source.addEventListener('session_completed', (e: MessageEvent) => {
      handlers.onCompleted?.(JSON.parse(e.data));
      this.cleanup(sessionId);
    });

    source.addEventListener('session_failed', (e: MessageEvent) => {
      handlers.onFailed?.(JSON.parse(e.data));
      this.cleanup(sessionId);
    });

    source.onerror = (e) => {
      this.handleReconnect(sessionId);
      handlers.onError?.(e);
    };

    this.sources.set(sessionId, source);
    this.callbacks.set(sessionId, handlers);
    return source;
  }

  private handleReconnect(sessionId: string): void {
    const count = (this.retryCount.get(sessionId) ?? 0) + 1;
    if (count > MAX_RETRIES) {
      this.callbacks.get(sessionId)?.onGiveUp?.();
      this.cleanup(sessionId);
      return;
    }

    const delay = Math.min(BASE_DELAY_MS * Math.pow(2, count - 1), MAX_DELAY_MS);
    this.retryCount.set(sessionId, count);

    // Close existing source
    const existing = this.sources.get(sessionId);
    existing?.close();

    // Retry after backoff
    const timer = setTimeout(() => {
      const handlers = this.callbacks.get(sessionId);
      if (handlers) {
        this.connectSource(sessionId, handlers);
      }
    }, delay);

    this.retryTimers.set(sessionId, timer);
  }

  private cleanup(sessionId: string): void {
    const source = this.sources.get(sessionId);
    source?.close();
    const timer = this.retryTimers.get(sessionId);
    if (timer) clearTimeout(timer);
    this.sources.delete(sessionId);
    this.callbacks.delete(sessionId);
    this.retryCount.delete(sessionId);
    this.retryTimers.delete(sessionId);
  }

  connect(
    sessionId: string,
    handlers: SSECallbacks,
  ): () => void {
    this.cleanup(sessionId);
    this.retryCount.set(sessionId, 0);
    this.connectSource(sessionId, handlers);
    return () => this.cleanup(sessionId);
  }

  disconnect(sessionId?: string): void {
    if (sessionId) {
      this.cleanup(sessionId);
      return;
    }

    for (const id of this.sources.keys()) {
      this.cleanup(id);
    }
  }
}

export const sseClient = new SSEClient();
