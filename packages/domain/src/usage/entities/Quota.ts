import { randomUUID } from 'node:crypto';
import type { DomainEvent } from '../../shared/domain-event';
import { Plan } from '../value-objects/Plan';
import type { CreditAmount } from '../value-objects/Plan';
import { InvalidCreditAmountError } from '../value-objects/Plan';
import { QuotaPeriod } from '../value-objects/QuotaPeriod';
import { TransactionReason } from '../value-objects/TransactionReason';
import { CreditTransaction } from './CreditTransaction';
import { QuotaExceededError, ArtifactGateExceededError } from '../errors';

export class Quota {
  private _transactions: CreditTransaction[];
  private _version: number;

  private constructor(
    readonly quotaId: string,
    readonly userId: string,
    readonly period: QuotaPeriod,
    private _plan: Plan,
    private _artifactLimit: number,
    private _artifactCount: number,
    private _creditLimit: number,
    private _creditConsumed: number,
    readonly createdAt: Date,
    version: number,
    transactions: CreditTransaction[],
  ) {
    this._version = version;
    this._transactions = transactions;
  }

  static create(userId: string, period: QuotaPeriod, plan: Plan): Quota {
    return new Quota(
      randomUUID(),
      userId,
      period,
      plan,
      plan.artifactLimit,
      0,
      plan.creditLimit,
      0,
      new Date(),
      1,
      [],
    );
  }

  static reconstitute(
    quotaId: string,
    userId: string,
    period: QuotaPeriod,
    plan: Plan,
    artifactLimit: number,
    artifactCount: number,
    creditLimit: number,
    creditConsumed: number,
    createdAt: Date,
    version: number,
    transactions: CreditTransaction[],
  ): Quota {
    return new Quota(
      quotaId,
      userId,
      period,
      plan,
      artifactLimit,
      artifactCount,
      creditLimit,
      creditConsumed,
      createdAt,
      version,
      transactions,
    );
  }

  canCreateArtifact(): boolean {
    return this._artifactCount < this._artifactLimit;
  }

  consumeArtifact(): void {
    if (!this.canCreateArtifact()) {
      throw new ArtifactGateExceededError(this._artifactLimit, this._artifactCount);
    }
    this._artifactCount++;
    this._version++;
  }

  canConsumeCredits(amount: number): boolean {
    return this._creditConsumed + amount <= this._creditLimit;
  }

  consumeCredits(amount: number, sessionId: string): DomainEvent {
    if (!this.canConsumeCredits(amount)) {
      throw new QuotaExceededError(this._creditLimit, this._creditConsumed + amount);
    }
    this._creditConsumed += amount;
    const transaction = CreditTransaction.create(this.quotaId, amount, TransactionReason.Generation, sessionId);
    this._transactions.push(transaction);
    this._version++;
    return {
      eventType: 'CreditConsumed',
      occurredAt: new Date(),
      aggregateId: this.quotaId,
      userId: this.userId,
      amount,
      sessionId,
      remainingCredits: this.remainingCredits,
    } as DomainEvent;
  }

  addCredits(amount: CreditAmount, reason: TransactionReason): void {
    if (amount.toValue() <= 0) throw new InvalidCreditAmountError('Credit amount must be positive');
    this._creditLimit += amount.toValue();
    const transaction = CreditTransaction.create(this.quotaId, amount.toValue(), reason);
    this._transactions.push(transaction);
    this._version++;
  }

  upgradePlan(newPlan: Plan): void {
    this._plan = newPlan;
    this._creditLimit = newPlan.creditLimit;
    this._artifactLimit = newPlan.artifactLimit;
    this._version++;
  }

  get plan(): Plan {
    return this._plan;
  }

  get transactions(): ReadonlyArray<CreditTransaction> {
    return this._transactions;
  }

  get remainingCredits(): number {
    return Math.max(0, this._creditLimit - this._creditConsumed);
  }

  get remainingArtifacts(): number {
    return Math.max(0, this._artifactLimit - this._artifactCount);
  }

  get creditUsagePercent(): number {
    return Math.round((this._creditConsumed / this._creditLimit) * 100);
  }

  get artifactCount(): number {
    return this._artifactCount;
  }

  get creditConsumed(): number {
    return this._creditConsumed;
  }

  get version(): number {
    return this._version;
  }
}
