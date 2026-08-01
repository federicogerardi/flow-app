import type { Request, Response, NextFunction } from 'express';
import type { ConversationRepository } from '@flow-app/domain';
import { listAgents, getAgent } from '@flow-app/domain';
import { StartConversationUseCase } from '../application/agent-chat/start-conversation.usecase.js';
import { SendMessageUseCase } from '../application/agent-chat/send-message.usecase.js';
import type { LlmGateway } from '../infrastructure/llm-gateway.js';

export function createAgentChatRoutes(conversationRepo: ConversationRepository, llmGateway: LlmGateway) {
  const startConversationUC = new StartConversationUseCase(conversationRepo);
  const sendMessageUC = new SendMessageUseCase(conversationRepo, llmGateway);

  return {
    listAgents: async (_req: Request, res: Response) => {
      const agents = listAgents();
      res.json({
        agents: agents.map((a) => ({
          key: a.key,
          name: a.name,
          role: a.role,
          essence: a.essence,
          capabilities: a.capabilities,
        })),
      });
    },

    listConversations: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = (req as any).user.sub as string;
        const workspaceId = req.params.workspaceId as string;
        const conversations = await conversationRepo.findByUserAndWorkspace(userId, workspaceId);

        res.json({
          conversations: conversations.map((c) => ({
            id: c.conversationId,
            agentKey: c.agentKey,
            agentName: getAgent(c.agentKey).name,
            title: c.title,
            status: c.status,
            messageCount: c.messages.length,
            lastMessage: c.messages.length > 0
              ? {
                  content: c.messages[c.messages.length - 1].content.slice(0, 100),
                  role: c.messages[c.messages.length - 1].role,
                  createdAt: c.messages[c.messages.length - 1].createdAt.toISOString(),
                }
              : null,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
          })),
        });
      } catch (error) {
        next(error);
      }
    },

    startConversation: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = (req as any).user.sub as string;
        const workspaceId = req.params.workspaceId as string;
        const { agentKey } = req.body;

        const result = await startConversationUC.execute({
          workspaceId,
          userId,
          agentKey,
        });

        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    },

    getConversation: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = (req as any).user.sub as string;
        const conversationId = req.params.id as string;

        const conversation = await conversationRepo.findById(conversationId);
        if (!conversation) {
          return res.status(404).json({
            error: { code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found', retryable: false },
          });
        }

        if (conversation.userId !== userId) {
          return res.status(403).json({
            error: { code: 'FORBIDDEN', message: 'Not authorized to view this conversation', retryable: false },
          });
        }

        const agent = getAgent(conversation.agentKey);

        res.json({
          id: conversation.conversationId,
          workspaceId: conversation.workspaceId,
          agentKey: conversation.agentKey,
          agentName: agent.name,
          title: conversation.title,
          status: conversation.status,
          messages: conversation.messages.map((m) => ({
            id: m.messageId,
            role: m.role,
            content: m.content,
            tokensUsed: m.tokensUsed,
            modelUsed: m.modelUsed,
            createdAt: m.createdAt.toISOString(),
          })),
          createdAt: conversation.createdAt.toISOString(),
          updatedAt: conversation.updatedAt.toISOString(),
        });
      } catch (error) {
        next(error);
      }
    },

    sendMessage: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = (req as any).user.sub as string;
        const conversationId = req.params.id as string;
        const { content } = req.body;

        const result = await sendMessageUC.execute({
          conversationId,
          userId,
          content,
        });

        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    },

    archiveConversation: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = (req as any).user.sub as string;
        const conversationId = req.params.id as string;

        const conversation = await conversationRepo.findById(conversationId);
        if (!conversation) {
          return res.status(404).json({
            error: { code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found', retryable: false },
          });
        }

        if (conversation.userId !== userId) {
          return res.status(403).json({
            error: { code: 'FORBIDDEN', message: 'Not authorized to archive this conversation', retryable: false },
          });
        }

        conversation.archive();
        await conversationRepo.save(conversation);

        res.json({ message: 'Conversation archived' });
      } catch (error) {
        next(error);
      }
    },
  };
}
