import type { Kysely } from 'kysely';
import type { DB } from '@flow-app/infra-db';

export interface XPTransactionRow {
  userId: string;
  amount: number;
  source: string;
  sourceId: string | null;
  workspaceId: string | null;
  seasonId: string;
}

export class XPTransactionRepository {
  constructor(private readonly db: Kysely<DB>) {}

  async insert(row: XPTransactionRow): Promise<void> {
    await this.db
      .insertInto('xp_transactions')
      .values({
        user_id: row.userId,
        amount: row.amount,
        source: row.source,
        source_id: row.sourceId,
        workspace_id: row.workspaceId,
        season_id: row.seasonId,
      })
      .execute();
  }
}
