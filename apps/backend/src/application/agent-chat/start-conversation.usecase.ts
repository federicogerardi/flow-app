import { Conversation, getAgent, type ConversationRepository, type AgentKey } from '@flow-app/domain';

export interface StartConversationCommand {
  workspaceId: string;
  userId: string;
  agentKey: AgentKey;
}

export interface StartConversationResult {
  conversationId: string;
  agentKey: AgentKey;
  agentName: string;
}

export class StartConversationUseCase {
  constructor(private readonly conversationRepo: ConversationRepository) {}

  async execute(cmd: StartConversationCommand): Promise<StartConversationResult> {
    const agent = getAgent(cmd.agentKey);
    const conversation = Conversation.start(cmd.workspaceId, cmd.userId, cmd.agentKey);

    await this.conversationRepo.save(conversation);

    return {
      conversationId: conversation.conversationId,
      agentKey: cmd.agentKey,
      agentName: agent.name,
    };
  }
}
