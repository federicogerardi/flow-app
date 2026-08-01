export type SSEEventType = 'session_started' | 'step_completed' | 'session_completed' | 'session_failed';

export interface SSEEvent {
  event: SSEEventType;
  data: Record<string, unknown>;
}

export class SSEClient {
  private sources = new Map<string, EventSource>();

  connect(
    sessionId: string,
    handlers: {
      onStarted?: (data: Record<string, unknown>) => void;
      onStep?: (data: Record<string, unknown>) => void;
      onCompleted?: (data: Record<string, unknown>) => void;
      onFailed?: (data: Record<string, unknown>) => void;
      onError?: (error: Event) => void;
    },
  ): () => void {
    this.disconnect(sessionId);

    const source = new EventSource(`/api/sessions/${sessionId}/events`, {
      withCredentials: true,
    });

    source.addEventListener('session_started', (e: MessageEvent) => {
      handlers.onStarted?.(JSON.parse(e.data));
    });

    source.addEventListener('step_completed', (e: MessageEvent) => {
      handlers.onStep?.(JSON.parse(e.data));
    });

    source.addEventListener('session_completed', (e: MessageEvent) => {
      handlers.onCompleted?.(JSON.parse(e.data));
      source.close();
      this.sources.delete(sessionId);
    });

    source.addEventListener('session_failed', (e: MessageEvent) => {
      handlers.onFailed?.(JSON.parse(e.data));
      source.close();
      this.sources.delete(sessionId);
    });

    source.onerror = (e) => {
      handlers.onError?.(e);
      source.close();
      this.sources.delete(sessionId);
    };

    this.sources.set(sessionId, source);
    return () => this.disconnect(sessionId);
  }

  disconnect(sessionId?: string): void {
    if (sessionId) {
      const source = this.sources.get(sessionId);
      source?.close();
      this.sources.delete(sessionId);
      return;
    }

    for (const source of this.sources.values()) {
      source.close();
    }
    this.sources.clear();
  }
}

export const sseClient = new SSEClient();
