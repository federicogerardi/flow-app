import type { Kysely } from 'kysely';
import type { DB } from '@flow-app/infra-db';

export class LeaderboardProjectionRepository {
  constructor(private readonly db: Kysely<DB>) {}

  async incrementXP(userId: string, workspaceId: string, amount: number, seasonId: string): Promise<void> {
    await this.db
      .insertInto('workspace_leaderboard')
      .values({
        user_id: userId,
        workspace_id: workspaceId,
        xp: amount,
        season_id: seasonId,
      })
      .onConflict((oc) =>
        oc.columns(['user_id', 'workspace_id', 'season_id']).doUpdateSet((eb) => ({
          xp: eb('workspace_leaderboard.xp', '+', amount),
          updated_at: new Date(),
        })),
      )
      .execute();
  }

  async getLeaderboard(workspaceId: string, seasonId: string): Promise<Array<{ userId: string; xp: number }>> {
    const rows = await this.db
      .selectFrom('workspace_leaderboard')
      .where('workspace_id', '=', workspaceId)
      .where('season_id', '=', seasonId)
      .select(['user_id', 'xp'])
      .orderBy('xp', 'desc')
      .execute();

    return rows.map((r) => ({ userId: r.user_id, xp: r.xp }));
  }
}
