import type { Kysely } from 'kysely';
import type { DB } from '@flow-app/infra-db';

export class ProcessedEventRepository {
  constructor(private readonly db: Kysely<DB>) {}

  /** Atomic claim — INSERT ON CONFLICT DO NOTHING. Returns true if first claim. */
  async tryClaim(eventId: string): Promise<boolean> {
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

    const result = await this.db
      .insertInto('gamification_processed_events')
      .values({
        event_id: eventId,
        expires_at: expiresAt,
      })
      .onConflict((oc) => oc.column('event_id').doNothing())
      .executeTakeFirst();

    // numInsertedOrUpdatedRows: BigInt — 0n means conflict (already claimed)
    return result.numInsertedOrUpdatedRows !== 0n;
  }
}
