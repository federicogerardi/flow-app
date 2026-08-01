import { Message, type ConversationRepository } from '@flow-app/domain';

export interface SendMessageCommand {
  conversationId: string;
  userId: string;
  content: string;
}

export interface SendMessageResult {
  messageId: string;
  role: 'user';
}

export class SendMessageUseCase {
  constructor(private readonly conversationRepo: ConversationRepository) {}

  async execute(cmd: SendMessageCommand): Promise<SendMessageResult> {
    const conversation = await this.conversationRepo.findById(cmd.conversationId);
    if (!conversation) throw new Error('Conversation not found');

    if (conversation.userId !== cmd.userId) {
      throw new Error('Not authorized to send messages to this conversation');
    }

    const message = Message.user(cmd.conversationId, cmd.content);
    conversation.addMessage(message);

    await this.conversationRepo.save(conversation);

    return {
      messageId: message.messageId,
      role: 'user',
    };
  }
}
