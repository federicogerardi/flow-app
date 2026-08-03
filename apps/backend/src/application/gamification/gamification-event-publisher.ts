import type { Queue } from 'bullmq';

export type GamificationEventType = 'SessionCompleted' | 'MessageAdded' | 'MemberJoined';

export interface GamificationEventJob {
  eventType: GamificationEventType;
  eventId: string;
  userId: string;
  workspaceId: string;
  payload: Record<string, unknown>;
}

export class GamificationEventPublisher {
  constructor(private readonly queue: Queue<GamificationEventJob>) {}

  async publishSessionCompleted(
    sessionId: string,
    workspaceId: string,
    userId: string,
    toolKey: string,
  ): Promise<void> {
    await this.queue.add('gamification', {
      eventType: 'SessionCompleted',
      eventId: sessionId,
      userId,
      workspaceId,
      payload: { toolKey, sessionId },
    });
  }

  async publishMessageAdded(
    messageId: string,
    workspaceId: string,
    userId: string,
    conversationId: string,
  ): Promise<void> {
    await this.queue.add('gamification', {
      eventType: 'MessageAdded',
      eventId: messageId,
      userId,
      workspaceId,
      payload: { conversationId },
    });
  }

  async publishMemberJoined(workspaceId: string, userId: string): Promise<void> {
    await this.queue.add('gamification', {
      eventType: 'MemberJoined',
      eventId: `${workspaceId}:${userId}`,
      userId,
      workspaceId,
      payload: {},
    });
  }
}
