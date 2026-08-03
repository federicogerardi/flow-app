import type { Kysely } from 'kysely';
import type { DB } from '../types';
import type { PlayerProfileRepository } from '@flow-app/domain';
import { PlayerProfile, Achievement, BadgeKey, ConcurrencyError } from '@flow-app/domain';

export class KyselyPlayerProfileRepository implements PlayerProfileRepository {
  constructor(private readonly db: Kysely<DB>) {}

  async findByUserId(userId: string): Promise<PlayerProfile | null> {
    const row = await this.db
      .selectFrom('player_profiles')
      .where('user_id', '=', userId)
      .selectAll()
      .executeTakeFirst();

    if (!row) return null;

    const achievementRows = await this.db
      .selectFrom('achievements')
      .where('user_id', '=', userId)
      .selectAll()
      .orderBy('awarded_at', 'asc')
      .execute();

    const achievements = achievementRows.map((r) =>
      Achievement.reconstitute(
        r.id,
        r.user_id,
        BadgeKey.reconstitute(r.badge_key),
        r.awarded_at,
      ),
    );

    return PlayerProfile.reconstitute(
      row.user_id,
      row.xp_total,
      row.current_streak,
      row.longest_streak,
      row.last_active_date,
      row.created_at,
      row.updated_at,
      row.version,
      achievements,
    );
  }

  async findOrCreate(userId: string): Promise<PlayerProfile> {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;

    const profile = PlayerProfile.create(userId);
    await this.save(profile);
    return profile;
  }

  async save(profile: PlayerProfile): Promise<void> {
    await this.db
      .insertInto('player_profiles')
      .values({
        user_id: profile.userId,
        xp_total: profile.xpTotal,
        current_streak: profile.currentStreak,
        longest_streak: profile.longestStreak,
        last_active_date: profile.lastActiveDate,
        version: profile.version,
        created_at: profile.createdAt,
        updated_at: profile.updatedAt,
      })
      .onConflict((oc) =>
        oc.column('user_id').doUpdateSet({
          xp_total: profile.xpTotal,
          current_streak: profile.currentStreak,
          longest_streak: profile.longestStreak,
          last_active_date: profile.lastActiveDate,
          version: profile.version,
          updated_at: profile.updatedAt,
        }),
      )
      .execute();

    // Sync achievements (owned entities — Rule 5)
    await this.db.deleteFrom('achievements').where('user_id', '=', profile.userId).execute();

    if (profile.achievements.length > 0) {
      await this.db
        .insertInto('achievements')
        .values(
          profile.achievements.map((a) => ({
            id: a.achievementId,
            user_id: a.userId,
            badge_key: a.badgeKey.value,
            awarded_at: a.awardedAt,
          })),
        )
        .execute();
    }
  }

  async saveWithLock(profile: PlayerProfile, expectedVersion: number): Promise<void> {
    const result = await this.db
      .updateTable('player_profiles')
      .set({
        xp_total: profile.xpTotal,
        current_streak: profile.currentStreak,
        longest_streak: profile.longestStreak,
        last_active_date: profile.lastActiveDate,
        version: profile.version,
        updated_at: profile.updatedAt,
      })
      .where('user_id', '=', profile.userId)
      .where('version', '=', expectedVersion)
      .executeTakeFirst();

    if (result.numUpdatedRows === 0n) {
      const current = await this.db
        .selectFrom('player_profiles')
        .where('user_id', '=', profile.userId)
        .select('version')
        .executeTakeFirst();

      throw new ConcurrencyError(
        profile.userId,
        expectedVersion,
        current?.version ?? -1,
      );
    }

    // Sync achievements (owned entities — Rule 5)
    await this.db.deleteFrom('achievements').where('user_id', '=', profile.userId).execute();

    if (profile.achievements.length > 0) {
      await this.db
        .insertInto('achievements')
        .values(
          profile.achievements.map((a) => ({
            id: a.achievementId,
            user_id: a.userId,
            badge_key: a.badgeKey.value,
            awarded_at: a.awardedAt,
          })),
        )
        .execute();
    }
  }
}
