import type { ApiError } from '@flow-app/contracts';

// ── DTOs (match API response shapes) ─────────────────────────────────────────

export interface SessionDTO {
  id: string;
  toolKey: string;
  workspaceId: string;
  status: string;
  currentStepIndex?: number;
  startedAt?: string | null;
  completedAt?: string | null;
  stepCount?: number;
  createdAt: string;
}

export interface SessionListResponse {
  data: SessionDTO[];
  total: number;
}

export interface ArtifactDTO {
  id: string;
  sessionId: string;
  stepNumber: number;
  content: string;
  status: string;
  createdAt: string | null;
}

export interface WorkspaceDTO {
  id: string;
  name: string;
  role?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MessageDTO {
  id: string;
  role: string;
  content: string;
  tokensUsed: number;
  modelUsed: string | null;
  createdAt: string;
}

export interface ConversationDTO {
  id: string;
  workspaceId: string;
  agentKey: string;
  agentName: string;
  title: string | null;
  status: string;
  messages: MessageDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListItemDTO {
  id: string;
  agentKey: string;
  agentName: string;
  title: string | null;
  status: string;
  messageCount: number;
  lastMessage: { content: string; role: string; createdAt: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentDTO {
  key: string;
  name: string;
  role: string;
  essence: string;
  capabilities: string[];
}

// ── API Client ────────────────────────────────────────────────────────────────

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

  // ── Sessions ─────────────────────────────────────────────────────────────────

  async startSession(toolKey: string, body: { workspaceId: string; inputs: Record<string, unknown> }) {
    return this.request<{ session: SessionDTO; replayed: boolean }>('POST', `/api/tools/${toolKey}/sessions`, body);
  }

  async getSession(sessionId: string) {
    return this.request<SessionDTO>('GET', `/api/sessions/${sessionId}`);
  }

  async listSessions(params?: { workspaceId?: string; status?: string; limit?: number }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request<SessionListResponse>('GET', `/api/sessions?${query}`);
  }

  async cancelSession(sessionId: string) {
    return this.request<void>('POST', `/api/sessions/${sessionId}/cancel`);
  }

  // ── Artifacts ────────────────────────────────────────────────────────────────

  async getArtifact(artifactId: string) {
    return this.request<ArtifactDTO>('GET', `/api/artifacts/${artifactId}`);
  }

  // ── Workspaces ───────────────────────────────────────────────────────────────

  async listWorkspaces() {
    const res = await this.request<{ workspaces: WorkspaceDTO[] }>('GET', '/api/workspaces');
    return res.workspaces ?? [];
  }

  async createWorkspace(name: string) {
    return this.request<WorkspaceDTO>('POST', '/api/workspaces', { name });
  }

  async getWorkspace(workspaceId: string) {
    return this.request<WorkspaceDTO>('GET', `/api/workspaces/${workspaceId}`);
  }

  async listWorkspaceMembers(workspaceId: string) {
    return this.request<{ userId: string; role: string; status: string; joinedAt: string | null }[]>(
      'GET',
      `/api/workspaces/${workspaceId}/members`,
    );
  }

  // ── Agent Chat ───────────────────────────────────────────────────────────────

  async listAgents(_workspaceId: string) {
    return this.request<{ agents: AgentDTO[] }>('GET', `/api/workspaces/${_workspaceId}/agents`);
  }

  async listConversations(workspaceId: string) {
    return this.request<{ conversations: ConversationListItemDTO[] }>(
      'GET',
      `/api/workspaces/${workspaceId}/conversations`,
    );
  }

  async startConversation(workspaceId: string, agentKey: string) {
    return this.request<ConversationDTO>('POST', `/api/workspaces/${workspaceId}/conversations`, { agentKey });
  }

  async getConversation(conversationId: string) {
    return this.request<ConversationDTO>('GET', `/api/conversations/${conversationId}`);
  }

  async sendMessage(conversationId: string, content: string) {
    return this.request<MessageDTO>('POST', `/api/conversations/${conversationId}/messages`, { content });
  }

  async archiveConversation(conversationId: string) {
    return this.request<void>('POST', `/api/conversations/${conversationId}/archive`);
  }
}

export const api = new ApiClient();
