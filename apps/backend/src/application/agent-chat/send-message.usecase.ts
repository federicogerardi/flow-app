import { Message, ConversationNotFoundError, NotConversationParticipantError, ModelTier, type ConversationRepository, getAgent } from '@flow-app/domain';
import type { LlmGateway } from '../../infrastructure/llm-gateway.js';
import type { GamificationEventPublisher } from '../gamification/gamification-event-publisher.js';
import { logger } from '../../infrastructure/logger.js';

export interface SendMessageCommand {
  conversationId: string;
  userId: string;
  content: string;
}

export interface SendMessageResult {
  userMessageId: string;
  agentMessageId: string | null;
  agentContent: string | null;
}

export class SendMessageUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly llmGateway: LlmGateway,
    private readonly gamificationEventPublisher: GamificationEventPublisher,
  ) {}

  async execute(cmd: SendMessageCommand): Promise<SendMessageResult> {
    const conversation = await this.conversationRepo.findById(cmd.conversationId);
    if (!conversation) throw new ConversationNotFoundError(cmd.conversationId);

    if (conversation.userId !== cmd.userId) {
      throw new NotConversationParticipantError(cmd.userId, cmd.conversationId);
    }

    const userMessage = Message.user(cmd.conversationId, cmd.content);
    conversation.addMessage(userMessage);

    const agent = getAgent(conversation.agentKey);
    const recentMessages = conversation.recentMessages(20);

    const historyLines = recentMessages.map((m) => {
      const role = m.role.isUser ? 'User' : m.role.isAgent ? agent.name : 'System';
      return `[${role}]: ${m.content}`;
    });

    const userPrompt = historyLines.join('\n\n');

    const log = logger.child({
      conversationId: cmd.conversationId,
      agentKey: conversation.agentKey,
    });

    let agentMessage: Message | null = null;
    let agentContent: string | null = null;

    try {
      log.info('agent_chat_llm_call_start');
      const result = await this.llmGateway.generate({
        model: ModelTier.Balanced,
        systemPrompt: agent.systemPrompt,
        userPrompt,
      });

      agentContent = result.content;
      agentMessage = Message.agent(
        cmd.conversationId,
        result.content,
        result.usage.totalTokens,
        result.model,
      );
      conversation.addMessage(agentMessage);

      log.info({
        model: result.model,
        latencyMs: result.latencyMs,
        tokensUsed: result.usage.totalTokens,
      }, 'agent_chat_llm_call_complete');
    } catch (error) {
      log.error({
        error: error instanceof Error ? error.message : 'unknown',
      }, 'agent_chat_llm_call_failed');

      agentMessage = Message.agent(
        cmd.conversationId,
        "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        0,
        'fallback',
      );
      conversation.addMessage(agentMessage);
      agentContent = agentMessage.content;
    }

    await this.conversationRepo.save(conversation);

    // Gamification: award XP for agent message exchange (async — don't block response)
    if (agentMessage) {
      this.gamificationEventPublisher.publishMessageAdded(
        agentMessage.messageId,
        conversation.workspaceId,
        cmd.userId,
        cmd.conversationId,
      ).catch(() => { /* fire-and-forget */ });
    }

    return {
      userMessageId: userMessage.messageId,
      agentMessageId: agentMessage?.messageId ?? null,
      agentContent,
    };
  }
}
