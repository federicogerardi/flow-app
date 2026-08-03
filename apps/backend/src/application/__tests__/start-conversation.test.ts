import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentKey, type ConversationRepository } from '@flow-app/domain';
import { StartConversationUseCase } from '../agent-chat/start-conversation.usecase';

function createConversationRepo() {
  return {
    findById: vi.fn(),
    findByUserAndWorkspace: vi.fn(),
    save: vi.fn(),
  } as unknown as ConversationRepository;
}

describe('StartConversationUseCase', () => {
  let conversationRepo: ConversationRepository;
  let useCase: StartConversationUseCase;

  beforeEach(() => {
    conversationRepo = createConversationRepo();
    useCase = new StartConversationUseCase(conversationRepo);
  });

  const validCmd = {
    workspaceId: 'ws-1',
    userId: 'user-1',
    agentKey: AgentKey.Strategist,
  };

  it('valid start creates conversation', async () => {
    const result = await useCase.execute(validCmd);

    expect(conversationRepo.save).toHaveBeenCalled();
    const savedConversation = vi.mocked(conversationRepo.save).mock.calls[0][0];
    expect(savedConversation.workspaceId).toBe('ws-1');
    expect(savedConversation.userId).toBe('user-1');
    expect(savedConversation.agentKey.equals(AgentKey.Strategist)).toBe(true);
    expect(result.conversationId).toBeDefined();
    expect(result.agentKey).toBe(AgentKey.Strategist);
    expect(result.agentName).toBe('Marketing Strategist');
  });

  it('conversation is saved via conversationRepo.save', async () => {
    await useCase.execute(validCmd);

    expect(conversationRepo.save).toHaveBeenCalledTimes(1);
  });
});
