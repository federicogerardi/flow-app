import type { Kysely } from 'kysely';
import type { DB } from '../types';
import {
  Quota,
  CreditTransaction,
  Plan,
  PlanType,
  QuotaPeriod,
  TransactionReason,
  ConcurrencyError,
  type QuotaRepository,
} from '@flow-app/domain';

export class KyselyQuotaRepository implements QuotaRepository {
  constructor(private readonly db: Kysely<DB>) {}

  async findByUserAndPeriod(userId: string, period: string): Promise<Quota | null> {
    const quota = await this.db
      .selectFrom('quotas')
      .where('user_id', '=', userId)
      .where('period', '=', period)
      .selectAll()
      .executeTakeFirst();

    if (!quota) return null;

    const transactions = await this.db
      .selectFrom('credit_transactions')
      .where('quota_id', '=', quota.id)
      .selectAll()
      .execute();

    return Quota.reconstitute(
      quota.id,
      quota.user_id,
      QuotaPeriod.from(quota.period),
      Plan.fromType(PlanType.from(quota.plan_type)),
      quota.artifact_limit,
      quota.artifact_count,
      quota.credit_limit,
      quota.credit_consumed,
      quota.created_at,
      quota.version,
      transactions.map((t) =>
        CreditTransaction.reconstitute(
          t.id,
          t.quota_id,
          t.amount,
          TransactionReason.from(t.reason),
          t.session_id,
          t.created_at,
        ),
      ),
    );
  }

  async findCurrent(userId: string): Promise<Quota | null> {
    const period = QuotaPeriod.current().toString();
    return this.findByUserAndPeriod(userId, period);
  }

  async save(quota: Quota): Promise<void> {
    await this.db
      .insertInto('quotas')
      .values({
        id: quota.quotaId,
        user_id: quota.userId,
        period: quota.period.toString(),
        plan_type: quota.plan.type.toString(),
        artifact_limit: quota.plan.artifactLimit,
        artifact_count: quota.artifactCount,
        credit_limit: quota.plan.creditLimit,
        credit_consumed: quota.creditConsumed,
        version: quota.version,
      })
      .onConflict((oc) =>
        oc.columns(['user_id', 'period']).doUpdateSet({
          plan_type: quota.plan.type.toString(),
          artifact_limit: quota.plan.artifactLimit,
          artifact_count: quota.artifactCount,
          credit_limit: quota.plan.creditLimit,
          credit_consumed: quota.creditConsumed,
          version: quota.version,
        }),
      )
      .execute();

    await this.syncTransactions(this.db, quota.quotaId, quota.transactions);
  }

  async saveWithLock(quota: Quota, expectedVersion: number): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      const result = await trx
        .updateTable('quotas')
        .set({
          plan_type: quota.plan.type.toString(),
          artifact_limit: quota.plan.artifactLimit,
          artifact_count: quota.artifactCount,
          credit_limit: quota.plan.creditLimit,
          credit_consumed: quota.creditConsumed,
          version: quota.version,
        })
        .where('id', '=', quota.quotaId)
        .where('version', '=', expectedVersion)
        .executeTakeFirst();

      if (result.numUpdatedRows === 0n) {
        const current = await trx
          .selectFrom('quotas')
          .where('id', '=', quota.quotaId)
          .select('version')
          .executeTakeFirst();

        throw new ConcurrencyError(
          quota.quotaId,
          expectedVersion,
          current?.version ?? -1,
        );
      }

      await this.syncTransactions(trx, quota.quotaId, quota.transactions);
    });
  }

  private async syncTransactions(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    executor: Kysely<DB> | any,
    quotaId: string,
    transactions: readonly CreditTransaction[],
  ): Promise<void> {
    if (transactions.length === 0) return;

    await Promise.all(
      transactions.map((t) =>
        executor
          .insertInto('credit_transactions')
          .values({
            id: t.id,
            quota_id: quotaId,
            amount: t.amount,
            reason: t.reason.value,
            session_id: t.sessionId,
            created_at: t.createdAt,
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .onConflict((oc: any) => oc.column('id').doNothing())
          .execute(),
      ),
    );
  }
}
