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
];

export const server = setupServer(...handlers);
