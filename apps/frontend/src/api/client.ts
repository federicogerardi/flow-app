import type { ApiError, SessionDetailDTO, SessionStatusDTO, ArtifactDTO as ContractArtifactDTO } from '@flow-app/contracts';
import { getAccessToken, attemptTokenRefresh } from '../auth/AuthContext';

// ── DTOs (match API response shapes) ─────────────────────────────────────────
//
// Session & Artifact DTOs derive from @flow-app/contracts (canonical source)
// with local extensions where the API response shape diverges from the contract.

export interface SessionDTO extends Omit<SessionDetailDTO, 'status' | 'artifacts'> {
  status: SessionStatusDTO;
  artifacts?: ArtifactDTO[];
}

export interface ArtifactDTO extends ContractArtifactDTO {
  artifactId?: string;
}

export interface SessionListResponse {
  data: SessionDTO[];
  total: number;
}

// TODO: migrate to @flow-app/contracts once WorkspaceDTO is defined there
export interface WorkspaceDTO {
  id: string;
  name: string;
  role?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// TODO: migrate to @flow-app/contracts once MessageDTO is defined there
export interface MessageDTO {
  id: string;
  role: string;
  content: string;
  tokensUsed: number;
  modelUsed: string | null;
  createdAt: string;
}

// TODO: migrate to @flow-app/contracts once ConversationDTO is defined there
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

// TODO: migrate to @flow-app/contracts once ConversationListItemDTO is defined there
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

// TODO: migrate to @flow-app/contracts once AgentDTO is defined there
export interface AgentDTO {
  key: string;
  name: string;
  role: string;
  essence: string;
  capabilities: string[];
}

// ── Asset DTO ──────────────────────────────────────────────────────────────────

export interface AssetDTO {
  id: string;
  workspaceId: string;
  assetType: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

// ── Gamification DTOs ─────────────────────────────────────────────────────────

export interface PlayerProfileDTO {
  xpTotal: number;
  level: number;
  levelLabel: string;
  levelProgress: number;
  nextLevelXP: number;
  currentStreak: number;
  longestStreak: number;
  badges: { badgeKey: string; awardedAt: string }[];
  season: string;
}

export interface LeaderboardEntryDTO {
  rank: number;
  userId: string;
  xp?: number;
  xpPercent: number;
  isSelf: boolean;
}

export interface WorkspaceHealthDTO {
  score: number;
  label: string;
  color: string;
}

export interface ChallengeDTO {
  id: string;
  key: string;
  progress: number;
  target: number;
  status: string;
  weekStart: string;
  completedAt: string | null;
}

export interface SeasonDTO {
  seasonId: string;
  label: string;
  quarter: number;
  year: number;
  startDate: string;
  endDate: string;
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

  constructor(baseUrl: string = (import.meta.env.VITE_API_URL as string | undefined) ?? '') {
    this.baseUrl = baseUrl;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Inject access token from auth store (memory, never localStorage)
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    // On 401, attempt token refresh via httpOnly cookie and retry once
    if (response.status === 401 && token) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        // Retry with new token
        const newToken = getAccessToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
        }
        response = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          credentials: 'include',
        });
      } else {
        // Refresh failed — redirect to login
        window.location.href = '/login';
        throw new ApiClientError('SESSION_EXPIRED', 'Session expired. Please log in again.', 401);
      }
    }

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: { code: 'UNKNOWN', message: 'Request failed' },
      }));
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

  async inviteMember(workspaceId: string, email: string, role: string) {
    return this.request<{ invitationId: string }>('POST', `/api/workspaces/${workspaceId}/invitations`, { email, role });
  }

  async removeMember(workspaceId: string, userId: string) {
    return this.request<void>('DELETE', `/api/workspaces/${workspaceId}/members/${userId}`);
  }

  async changeMemberRole(workspaceId: string, userId: string, role: string) {
    return this.request<void>('PUT', `/api/workspaces/${workspaceId}/members/${userId}/role`, { role });
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

  // ── Gamification ─────────────────────────────────────────────────────────────

  async getPlayerProfile() {
    return this.request<PlayerProfileDTO>('GET', '/api/me/profile');
  }

  async getLeaderboard(workspaceId: string) {
    return this.request<{ leaderboard: LeaderboardEntryDTO[]; season: string }>('GET', `/api/workspaces/${workspaceId}/leaderboard`);
  }

  async getWorkspaceHealth(workspaceId: string) {
    return this.request<WorkspaceHealthDTO>('GET', `/api/workspaces/${workspaceId}/health`);
  }

  async getChallenges(workspaceId: string) {
    return this.request<{ challenges: ChallengeDTO[] }>('GET', `/api/workspaces/${workspaceId}/challenges`);
  }

  async getCurrentSeason() {
    return this.request<SeasonDTO>('GET', '/api/seasons/current');
  }

  // ── Assets ───────────────────────────────────────────────────────────────────

  async listAssets(workspaceId: string) {
    return this.request<{ assets: AssetDTO[] }>('GET', `/api/workspaces/${workspaceId}/assets`);
  }

  async createAsset(workspaceId: string, assetType: string, content: string, source?: string) {
    return this.request<AssetDTO>('POST', `/api/workspaces/${workspaceId}/assets`, { assetType, content, source });
  }

  async getAsset(workspaceId: string, assetId: string) {
    return this.request<AssetDTO & { content: string }>('GET', `/api/workspaces/${workspaceId}/assets/${assetId}`);
  }

  async updateAsset(workspaceId: string, assetId: string, content: string) {
    return this.request<{ id: string; updatedAt: string }>('PUT', `/api/workspaces/${workspaceId}/assets/${assetId}`, { content });
  }

  async deleteAsset(workspaceId: string, assetId: string) {
    return this.request<void>('DELETE', `/api/workspaces/${workspaceId}/assets/${assetId}`);
  }
}

export const api = new ApiClient();
