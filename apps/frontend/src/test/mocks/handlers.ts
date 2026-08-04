import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const API_BASE = 'http://localhost:3000';

export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE}/api/auth/register`, () => {
    return HttpResponse.json({
      user: { id: 'user-1', email: 'test@example.com', role: 'member', status: 'active' },
      accessToken: 'mock-access-token',
    });
  }),

  http.post(`${API_BASE}/api/auth/login`, () => {
    return HttpResponse.json({
      user: { id: 'user-1', email: 'test@example.com', role: 'member', status: 'active' },
      accessToken: 'mock-access-token',
    });
  }),

  http.post(`${API_BASE}/api/auth/refresh`, () => {
    return HttpResponse.json({ accessToken: 'new-mock-access-token' });
  }),

  http.post(`${API_BASE}/api/auth/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.get(`${API_BASE}/api/auth/me`, () => {
    return HttpResponse.json({
      id: 'user-1',
      email: 'test@example.com',
      role: 'member',
      status: 'active',
    });
  }),

  // Generation endpoints
  http.post(`${API_BASE}/api/tools/:toolKey/sessions`, () => {
    return HttpResponse.json({
      sessionId: 'session-1',
      toolKey: 'blog-post',
      status: 'draft',
      workspaceId: 'ws-1',
      userId: 'user-1',
    });
  }),

  http.get(`${API_BASE}/api/sessions`, () => {
    return HttpResponse.json({
      sessions: [],
      total: 0,
    });
  }),

  http.get(`${API_BASE}/api/sessions/:id`, () => {
    return HttpResponse.json({
      sessionId: 'session-1',
      toolKey: 'blog-post',
      status: 'completed',
      artifacts: [],
    });
  }),

  http.get(`${API_BASE}/api/artifacts/:id`, () => {
    return HttpResponse.json({
      artifactId: 'artifact-1',
      content: 'Test content',
      stepNumber: 1,
    });
  }),

  // Workspace endpoints
  http.post(`${API_BASE}/api/workspaces`, () => {
    return HttpResponse.json({
      workspaceId: 'ws-1',
      name: 'Test Workspace',
      createdBy: 'user-1',
    });
  }),

  http.get(`${API_BASE}/api/workspaces`, () => {
    return HttpResponse.json({
      workspaces: [],
    });
  }),

  http.get(`${API_BASE}/api/workspaces/:id`, () => {
    return HttpResponse.json({
      workspaceId: 'ws-1',
      name: 'Test Workspace',
      memberships: [],
    });
  }),

  // Agent Chat endpoints
  http.get(`${API_BASE}/api/workspaces/:workspaceId/agents`, () => {
    return HttpResponse.json({
      agents: [
        { key: 'strategist', name: 'Strategist', description: 'Marketing strategist' },
        { key: 'copywriter', name: 'Copywriter', description: 'Content writer' },
      ],
    });
  }),

  http.get(`${API_BASE}/api/workspaces/:workspaceId/conversations`, () => {
    return HttpResponse.json({
      conversations: [],
    });
  }),

  http.post(`${API_BASE}/api/workspaces/:workspaceId/conversations`, () => {
    return HttpResponse.json({
      conversationId: 'conv-1',
      workspaceId: 'ws-1',
      userId: 'user-1',
      agentKey: 'strategist',
      status: 'active',
    });
  }),

  http.get(`${API_BASE}/api/conversations/:id`, () => {
    return HttpResponse.json({
      conversationId: 'conv-1',
      messages: [],
      status: 'active',
    });
  }),

  http.post(`${API_BASE}/api/conversations/:id/messages`, () => {
    return HttpResponse.json({
      userMessage: { messageId: 'msg-1', role: 'user', content: 'Hello' },
      agentMessage: { messageId: 'msg-2', role: 'agent', content: 'Hi there!' },
    });
  }),

  http.post(`${API_BASE}/api/conversations/:id/archive`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Usage / Quota
  http.get(`${API_BASE}/api/usage/credits`, () => {
    return HttpResponse.json({
      credits: { used: 0, limit: 250, remaining: 250, percent: 0 },
      artifacts: { used: 0, limit: 1000, remaining: 1000 },
      plan: 'free',
      period: '2026-08',
    });
  }),

  // Gamification
  http.get(`${API_BASE}/api/me/profile`, () => {
    return HttpResponse.json({
      xpTotal: 150,
      level: 1,
      levelLabel: 'Novice',
      levelProgress: 75,
      nextLevelXP: 200,
      currentStreak: 3,
      longestStreak: 5,
      badges: [],
      season: '2026-Q3',
    });
  }),

  // Assets
  http.get(`${API_BASE}/api/workspaces/:id/assets`, () => {
    return HttpResponse.json({ assets: [] });
  }),
];

export const server = setupServer(...handlers);
