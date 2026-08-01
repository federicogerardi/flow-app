import type { ApiError } from '@flow-app/contracts';

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new ApiClientError(
        error.error?.code ?? 'UNKNOWN',
        error.error?.message ?? 'Request failed',
        response.status,
        error.error?.details,
      );
    }

    if (response.status === 204) return undefined as T;

    return response.json();
  }

  async startSession(toolKey: string, body: { workspaceId: string; inputs: Record<string, unknown> }) {
    return this.request<{ session: any; replayed: boolean }>('POST', `/api/tools/${toolKey}/sessions`, body);
  }

  async getSession(sessionId: string) {
    return this.request<any>('GET', `/api/sessions/${sessionId}`);
  }

  async listSessions(params?: { workspaceId?: string; status?: string; limit?: number }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request<{ data: any[]; total: number }>('GET', `/api/sessions?${query}`);
  }

  async cancelSession(sessionId: string) {
    return this.request<void>('POST', `/api/sessions/${sessionId}/cancel`);
  }
}

export const api = new ApiClient();
