import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAgentChatRoutes } from '../agent-chat.js';
import type { Request, Response, NextFunction } from 'express';

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    params: {},
    query: {},
    body: {},
    user: { sub: 'user-1', email: 'test@test.com', role: 'member' },
    log: { info: vi.fn(), error: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })) },
    ...overrides,
  } as unknown as Request;
}

function mockRes() {
  const res: Record<string, unknown> = {};
  res.json = vi.fn().mockReturnValue(res);
  res.status = vi.fn(() => res) as unknown as Response['status'];
  return res as unknown as Response;
}

function createMockConversationRepo() {
  const conversations = new Map();
  return {
    conversations,
    findById: vi.fn(async (id: string) => conversations.get(id) ?? null),
    findByUserAndWorkspace: vi.fn(async (_userId: string, _workspaceId: string) => Array.from(conversations.values())),
    save: vi.fn(async (c: Record<string, unknown>) => { conversations.set(c.conversationId, c); }),
  };
}

function createMockLlmGateway() {
  return {
    generate: vi.fn().mockResolvedValue({
      content: 'Mock LLM response',
      model: 'mock-model',
      usage: { totalTokens: 100 },
      latencyMs: 500,
    }),
  };
}

function createMessageMock(messageId: string, role: string, content: string) {
  return {
    messageId,
    role: { isUser: role === 'user', isAgent: role === 'agent', isSystem: role === 'system' },
    content,
    tokensUsed: role === 'agent' ? 100 : 0,
    modelUsed: role === 'agent' ? 'test-model' : '',
    createdAt: new Date(),
  };
}

vi.mock('@flow-app/domain', async () => {
  const actual = await vi.importActual('@flow-app/domain');

  return {
    ...actual,
    listAgents: vi.fn(() => [
      { key: 'strategist', name: 'Strategist', role: 'Marketing strategist', essence: 'Helps with strategy', capabilities: ['planning'] },
      { key: 'writer', name: 'Writer', role: 'Content writer', essence: 'Writes content', capabilities: ['writing'] },
    ]),
    getAgent: vi.fn((key: string) => {
      if (key === 'strategist') return {
        key: 'strategist', name: 'Strategist', role: 'Marketing strategist',
        systemPrompt: 'You are a strategist.',
        essence: 'Helps with strategy', capabilities: ['planning'],
      };
      if (key === 'writer') return {
        key: 'writer', name: 'Writer', role: 'Content writer',
        systemPrompt: 'You are a writer.',
        essence: 'Writes content', capabilities: ['writing'],
      };
      throw new Error(`Unknown agent: ${key}`);
    }),
    Message: {
      user: vi.fn(() => createMessageMock('msg-user', 'user', 'Help me plan')),
      agent: vi.fn(() => createMessageMock('msg-agent', 'agent', 'Mock LLM response')),
    },
    DomainError: class extends Error {
      code = 'DOMAIN_ERROR';
      retryable = false;
      constructor(message: string) { super(message); }
    },
    ConversationNotFoundError: class extends Error {
      code = 'CONVERSATION_NOT_FOUND';
      retryable = false;
      constructor(id: string) { super(`Conversation ${id} not found`); }
    },
    NotConversationParticipantError: class extends Error {
      code = 'NOT_PARTICIPANT';
      retryable = false;
      constructor(userId: string, conversationId: string) {
        super(`User ${userId} is not participant of ${conversationId}`);
      }
    },
    ModelTier: { Balanced: 'balanced' },
  };
});

describe('Agent Chat Routes', () => {
  let routes: ReturnType<typeof createAgentChatRoutes>;
  let conversationRepo: ReturnType<typeof createMockConversationRepo>;
  let llmGateway: ReturnType<typeof createMockLlmGateway>;

  beforeEach(() => {
    vi.clearAllMocks();
    conversationRepo = createMockConversationRepo();
    llmGateway = createMockLlmGateway();
    routes = createAgentChatRoutes(conversationRepo, llmGateway);
  });

  describe('listAgents', () => {
    it('should return agents array', async () => {
      const req = mockReq();
      const res = mockRes();

      await routes.listAgents(req, res, undefined as unknown as NextFunction);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          agents: expect.arrayContaining([
            expect.objectContaining({ key: 'strategist' }),
            expect.objectContaining({ key: 'writer' }),
          ]),
        }),
      );
    });
  });

  describe('listConversations', () => {
    it('should return conversations', async () => {
      const msg = {
        messageId: 'msg-1',
        role: 'user',
        content: 'Hello',
        tokensUsed: 10,
        modelUsed: 'test-model',
        createdAt: new Date('2025-01-01'),
      };

      conversationRepo.conversations.set('c-1', {
        conversationId: 'c-1',
        agentKey: 'strategist',
        title: 'Strategy session',
        status: { toString: () => 'active' },
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        messages: [msg],
      });

      const req = mockReq({ params: { workspaceId: 'ws-1' } });
      const res = mockRes();
      const next = vi.fn();

      await routes.listConversations(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          conversations: expect.arrayContaining([
            expect.objectContaining({ id: 'c-1', status: 'active' }),
          ]),
        }),
      );
    });
  });

  describe('startConversation', () => {
    it('should return 201 with conversation data', async () => {
      const req = mockReq({
        params: { workspaceId: 'ws-1' },
        body: { agentKey: 'strategist' },
      });
      const res = mockRes();
      const next = vi.fn();

      await routes.startConversation(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getConversation', () => {
    it('should return conversation with messages', async () => {
      const msg = {
        messageId: 'msg-1',
        role: 'user',
        content: 'Hello',
        tokensUsed: 10,
        modelUsed: 'test-model',
        createdAt: new Date('2025-01-01'),
      };

      const conversation = {
        conversationId: 'c-1',
        workspaceId: 'ws-1',
        agentKey: 'strategist',
        title: 'Strategy session',
        status: { toString: () => 'active' },
        userId: 'user-1',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        messages: [msg],
      };

      conversationRepo.conversations.set('c-1', conversation);

      const req = mockReq({ params: { id: 'c-1' } });
      const res = mockRes();
      const next = vi.fn();

      await routes.getConversation(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'c-1',
          agentKey: 'strategist',
          messages: expect.any(Array),
        }),
      );
    });

    it('should return 404 when conversation not found', async () => {
      const req = mockReq({ params: { id: 'nonexistent' } });
      const res = mockRes();
      const next = vi.fn();

      await routes.getConversation(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'CONVERSATION_NOT_FOUND' }),
        }),
      );
    });
  });

  describe('sendMessage', () => {
    it('should return 201 with user + agent message IDs', async () => {
      const conversation = {
        conversationId: 'c-1',
        workspaceId: 'ws-1',
        agentKey: 'strategist',
        userId: 'user-1',
        title: 'Strategy session',
        status: { toString: () => 'active' },
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        messages: [],
        addMessage: vi.fn(),
        recentMessages: vi.fn().mockReturnValue([]),
      };
      conversationRepo.conversations.set('c-1', conversation);

      const req = mockReq({
        params: { id: 'c-1' },
        body: { content: 'Help me plan' },
      });
      const res = mockRes();
      const next = vi.fn();

      await routes.sendMessage(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          userMessageId: 'msg-user',
          agentMessageId: 'msg-agent',
        }),
      );
    });
  });

  describe('archiveConversation', () => {
    it('should return 200', async () => {
      const conversation = {
        conversationId: 'c-1',
        workspaceId: 'ws-1',
        agentKey: 'strategist',
        userId: 'user-1',
        title: 'Strategy session',
        status: { toString: () => 'active' },
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
        archive: vi.fn(),
      };
      conversationRepo.conversations.set('c-1', conversation);

      const req = mockReq({ params: { id: 'c-1' } });
      const res = mockRes();
      const next = vi.fn();

      await routes.archiveConversation(req, res, next);

      expect(conversation.archive).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Conversation archived' });
    });
  });
});
