import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ConversationNotFoundError,
  NotConversationParticipantError,
  AgentKey,
  type ConversationRepository,
} from '@flow-app/domain';
import { SendMessageUseCase } from '../agent-chat/send-message.usecase';
import type { LlmGateway } from '../../infrastructure/llm-gateway';

function createConversationRepo() {
  return {
    findById: vi.fn(),
    findByUserAndWorkspace: vi.fn(),
    save: vi.fn(),
  } as unknown as ConversationRepository;
}

function createLlmGateway() {
  return {
    generate: vi.fn(),
  } as unknown as LlmGateway;
}

function createGamificationEventPublisher() {
  return {
    publishMessageAdded: vi.fn().mockResolvedValue(undefined),
    publishSessionCompleted: vi.fn().mockResolvedValue(undefined),
    publishMemberJoined: vi.fn().mockResolvedValue(undefined),
  };
}

function createConversation(overrides: Record<string, unknown> = {}) {
  return {
    conversationId: 'conv-1',
    workspaceId: 'ws-1',
    userId: 'user-1',
    agentKey: AgentKey.Strategist,
    addMessage: vi.fn(),
    recentMessages: vi.fn().mockReturnValue([]),
    ...overrides,
  };
}

describe('SendMessageUseCase', () => {
  let conversationRepo: ConversationRepository;
  let llmGateway: LlmGateway;
  let gamificationEventPublisher: ReturnType<typeof createGamificationEventPublisher>;
  let useCase: SendMessageUseCase;

  beforeEach(() => {
    conversationRepo = createConversationRepo();
    llmGateway = createLlmGateway();
    gamificationEventPublisher = createGamificationEventPublisher();
    useCase = new SendMessageUseCase(conversationRepo, llmGateway, gamificationEventPublisher as any);
  });

  const validCmd = {
    conversationId: 'conv-1',
    userId: 'user-1',
    content: 'Hello',
  };

  it('valid send creates user and agent messages, saves conversation', async () => {
    const conversation = createConversation();
    vi.mocked(conversationRepo.findById).mockResolvedValue(conversation as any);
    vi.mocked(llmGateway.generate).mockResolvedValue({
      content: 'Agent reply',
      model: 'mock',
      usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
      latencyMs: 100,
    });

    const result = await useCase.execute(validCmd);

    expect(conversationRepo.findById).toHaveBeenCalledWith('conv-1');
    expect(llmGateway.generate).toHaveBeenCalled();
    const generateCall = vi.mocked(llmGateway.generate).mock.calls[0][0];
    expect(generateCall.systemPrompt).toBeDefined();
    expect(generateCall.model).toBeDefined();
    expect(conversation.addMessage).toHaveBeenCalledTimes(2);
    expect(conversationRepo.save).toHaveBeenCalledWith(conversation);
    expect(result.userMessageId).toBeDefined();
    expect(result.agentMessageId).toBeDefined();
    expect(result.agentContent).toBe('Agent reply');
  });

  it('conversation not found throws ConversationNotFoundError', async () => {
    vi.mocked(conversationRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(validCmd)).rejects.toThrow(ConversationNotFoundError);
    await expect(useCase.execute(validCmd)).rejects.toMatchObject({
      code: 'CONVERSATION_NOT_FOUND',
    });
  });

  it('not participant throws NotConversationParticipantError', async () => {
    const conversation = createConversation({ userId: 'other-user' });
    vi.mocked(conversationRepo.findById).mockResolvedValue(conversation as any);

    await expect(useCase.execute(validCmd)).rejects.toThrow(NotConversationParticipantError);
    await expect(useCase.execute(validCmd)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(llmGateway.generate).not.toHaveBeenCalled();
  });

  it('LLM failure returns graceful fallback', async () => {
    const conversation = createConversation();
    vi.mocked(conversationRepo.findById).mockResolvedValue(conversation as any);
    vi.mocked(llmGateway.generate).mockRejectedValue(new Error('Service unavailable'));

    const result = await useCase.execute(validCmd);

    expect(llmGateway.generate).toHaveBeenCalled();
    expect(conversation.addMessage).toHaveBeenCalledTimes(2);
    expect(conversationRepo.save).toHaveBeenCalled();
    expect(result.agentContent).toBe(
      "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
    );
    expect(result.agentMessageId).toBeDefined();
  });
});
