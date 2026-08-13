import type { ApiError, SessionDetailDTO, SessionStatusDTO, ArtifactDTO as ContractArtifactDTO, WorkspaceDTO, MessageDTO, ConversationDTO, ConversationListItemDTO, AgentDTO, PlayerProfileDTO, LeaderboardEntryDTO, WorkspaceHealthDTO, ChallengeDTO, SeasonDTO, AssetDTO, SessionListItemDTO } from '@flow-app/contracts';
import { getAccessToken, attemptTokenRefresh } from '../auth/AuthContext';

// ── DTOs (match API response shapes) ─────────────────────────────────────────
//
// Session & Artifact DTOs derive from @flow-app/contracts (canonical source)
// with local extensions where the API response shape diverges from the contract.
// Workspace, Message, Conversation, Agent, Gamification, Asset DTOs are now
// imported from @flow-app/contracts.

export interface SessionDTO extends Omit<SessionDetailDTO, 'status' | 'artifacts'> {
  status: SessionStatusDTO;
  artifacts?: ArtifactDTO[];
}

/** Artifact DTO — canonical contract type, no local extensions. */
export type ArtifactDTO = ContractArtifactDTO;

export interface SessionListResponse {
  data: SessionListItemDTO[];
  total: number;
}

export interface ToolListItemDTO {
  toolKey: string;
  name: string;
  description: string;
  stepCount: number;
  creditCost: number;
  produces?: string;
  outputCategory: 'asset' | 'content';
  acquisition: {
    userText: Array<{ key: string; label: string; required: boolean; type?: string; placeholder?: string; options?: string[] }>;
    files: Array<{ key: string; label: string; accept: string[]; required: boolean; description?: string; maxSizeMb?: number }>;
    assets: Array<{ assetType: string; required: boolean; multiple: boolean }>;
  };
}

export type { WorkspaceDTO, MessageDTO, ConversationDTO, ConversationListItemDTO, AgentDTO, PlayerProfileDTO, LeaderboardEntryDTO, WorkspaceHealthDTO, ChallengeDTO, SeasonDTO, AssetDTO };

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

  async listTools() {
    return this.request<{ tools: ToolListItemDTO[] }>('GET', '/api/tools');
  }

  async listSessions(params?: { workspaceId?: string; status?: string; limit?: number }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request<SessionListResponse>('GET', `/api/sessions?${query}`);
  }

  async cancelSession(sessionId: string) {
    return this.request<void>('POST', `/api/sessions/${sessionId}/cancel`);
  }

  async downloadArtifact(artifactId: string, format: 'md' | 'txt' = 'md') {
    return this.request<Blob>('GET', `/api/artifacts/${artifactId}/download?format=${format}`);
  }

  async promoteArtifact(artifactId: string, workspaceId: string, name?: string) {
    return this.request<{ artifactId: string; assetType: string; assetId: string; name: string | null; promoted: boolean }>(
      'POST',
      `/api/artifacts/${artifactId}/promote`,
      { workspaceId, name: name?.trim() || undefined },
    );
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

  async createWorkspace(name: string, accentColor?: string) {
    return this.request<WorkspaceDTO>('POST', '/api/workspaces', { name, accentColor });
  }

  async getWorkspace(workspaceId: string) {
    return this.request<WorkspaceDTO>('GET', `/api/workspaces/${workspaceId}`);
  }

  async listWorkspaceMembers(workspaceId: string) {
    const res = await this.request<{ members: { userId: string; role: string; status: string; joinedAt: string | null }[] }>(
      'GET',
      `/api/workspaces/${workspaceId}/members`,
    );
    return res.members ?? [];
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

  async renameWorkspace(workspaceId: string, name: string) {
    return this.request<{ id: string; name: string; updatedAt: string }>('PUT', `/api/workspaces/${workspaceId}`, { name });
  }

  async updateWorkspace(workspaceId: string, updates: { name?: string; accentColor?: string }) {
    return this.request<{ id: string; name: string; accentColor: string; updatedAt: string }>('PUT', `/api/workspaces/${workspaceId}`, updates);
  }

  async deleteWorkspace(workspaceId: string) {
    return this.request<void>('DELETE', `/api/workspaces/${workspaceId}`);
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
    return this.request<AssetDTO>('GET', `/api/workspaces/${workspaceId}/assets/${assetId}`);
  }

  async updateAsset(workspaceId: string, assetId: string, updates: { content?: string; name?: string | null }) {
    return this.request<{ id: string; updatedAt: string }>('PUT', `/api/workspaces/${workspaceId}/assets/${assetId}`, updates);
  }

  async deleteAsset(workspaceId: string, assetId: string) {
    return this.request<void>('DELETE', `/api/workspaces/${workspaceId}/assets/${assetId}`);
  }

  // ── Workspace Activity & Challenges ────────────────────────────────────────

  async getWorkspaceActivity(workspaceId: string) {
    return this.request<{ activeUsers: Array<{ name: string; lastAction: string; actionType: string }> }>(
      'GET',
      `/api/workspaces/${workspaceId}/activity`,
    );
  }

  async voteChallenge(workspaceId: string, challengeId: string, vote: string) {
    return this.request<{ voted: boolean }>(
      'POST',
      `/api/workspaces/${workspaceId}/challenges/vote`,
      { challengeId, vote },
    );
  }
}

export const api = new ApiClient();
