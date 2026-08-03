import type { Kysely } from 'kysely';
import type { DB } from '@flow-app/infra-db';
import type { AllTimeStats } from '@flow-app/domain';

export class GamificationStatsRepository {
  constructor(private readonly db: Kysely<DB>) {}

  async getStats(userId: string): Promise<AllTimeStats> {
    const [sessions, promotions, agentMessages, distinctTools, distinctAgents, workspacesJoined] =
      await Promise.all([
        this.db
          .selectFrom('sessions')
          .where('user_id', '=', userId)
          .select((eb) => eb.fn.countAll<number>().as('count'))
          .executeTakeFirst()
          .then((r) => r?.count ?? 0),

        // promotions: count of sessions with status 'completed' (proxy until ArtifactPromoted event exists)
        this.db
          .selectFrom('sessions')
          .where('user_id', '=', userId)
          .where('status', '=', 'completed')
          .select((eb) => eb.fn.countAll<number>().as('count'))
          .executeTakeFirst()
          .then((r) => r?.count ?? 0),

        this.db
          .selectFrom('messages')
          .innerJoin('conversations', 'conversations.id', 'messages.conversation_id')
          .where('conversations.user_id', '=', userId)
          .select((eb) => eb.fn.countAll<number>().as('count'))
          .executeTakeFirst()
          .then((r) => r?.count ?? 0),

        this.db
          .selectFrom('sessions')
          .where('user_id', '=', userId)
          .select((eb) => eb.fn.count<string>('tool_key').distinct().as('count'))
          .executeTakeFirst()
          .then((r) => Number(r?.count ?? 0)),

        this.db
          .selectFrom('conversations')
          .where('user_id', '=', userId)
          .select((eb) => eb.fn.count<string>('agent_key').distinct().as('count'))
          .executeTakeFirst()
          .then((r) => Number(r?.count ?? 0)),

        this.db
          .selectFrom('workspace_memberships')
          .where('user_id', '=', userId)
          .where('status', '=', 'active')
          .select((eb) => eb.fn.countAll<number>().as('count'))
          .executeTakeFirst()
          .then((r) => r?.count ?? 0),
      ]);

    return {
      totalSessions: sessions,
      totalPromotions: promotions,
      totalAgentMessages: agentMessages,
      distinctToolsUsed: distinctTools,
      distinctAgentsUsed: distinctAgents,
      workspacesJoined,
    };
  }
}
