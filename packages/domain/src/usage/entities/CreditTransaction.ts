import { randomUUID } from '../../shared/random-uuid';
import { TransactionReason } from '../value-objects/TransactionReason';

export class CreditTransaction {
  private constructor(
    readonly id: string,
    readonly quotaId: string,
    readonly amount: number,
    readonly reason: TransactionReason,
    readonly sessionId: string | null,
    readonly createdAt: Date,
  ) {}

  static create(quotaId: string, amount: number, reason: TransactionReason, sessionId?: string): CreditTransaction {
    return new CreditTransaction(randomUUID(), quotaId, amount, reason, sessionId ?? null, new Date());
  }

  static reconstitute(
    id: string,
    quotaId: string,
    amount: number,
    reason: TransactionReason,
    sessionId: string | null,
    createdAt: Date,
  ): CreditTransaction {
    return new CreditTransaction(id, quotaId, amount, reason, sessionId, createdAt);
  }
}
