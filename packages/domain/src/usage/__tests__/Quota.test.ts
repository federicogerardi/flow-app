import { describe, it, expect } from 'vitest';
import { Quota } from '../entities/Quota';
import { Plan, CreditAmount } from '../value-objects/Plan';
import { QuotaPeriod } from '../value-objects/QuotaPeriod';
import { TransactionReason } from '../value-objects/TransactionReason';
import { QuotaExceededError, ArtifactGateExceededError } from '../errors';

describe('Quota', () => {
  const userId = 'user-1';
  const sessionId = 'session-1';

  function createQuota(): Quota {
    return Quota.create(userId, QuotaPeriod.current(), Plan.free());
  }

  describe('create', () => {
    it('should initialize with zero usage', () => {
      const quota = createQuota();

      expect(quota.userId).toBe(userId);
      expect(quota.plan.type.toString()).toBe('free');
      expect(quota.artifactCount).toBe(0);
      expect(quota.creditConsumed).toBe(0);
      expect(quota.remainingCredits).toBe(250);
      expect(quota.remainingArtifacts).toBe(1000);
      expect(quota.transactions).toHaveLength(0);
      expect(quota.version).toBe(1);
    });

    it('should have correct credit limits from plan', () => {
      const quota = Quota.create(userId, QuotaPeriod.current(), Plan.free());
      expect(quota.remainingCredits).toBe(250);
      expect(quota.remainingArtifacts).toBe(1000);
    });
  });

  describe('reconstitute', () => {
    it('should pass through all fields', () => {
      const period = QuotaPeriod.current();
      const plan = Plan.free();
      const now = new Date();
      const quota = Quota.reconstitute(
        'q-1',
        userId,
        period,
        plan,
        1000,
        10,
        250,
        5,
        now,
        3,
        [],
      );

      expect(quota.quotaId).toBe('q-1');
      expect(quota.userId).toBe(userId);
      expect(quota.artifactCount).toBe(10);
      expect(quota.creditConsumed).toBe(5);
      expect(quota.version).toBe(3);
    });
  });

  describe('canCreateArtifact', () => {
    it('should return true when below limit', () => {
      const quota = createQuota();
      expect(quota.canCreateArtifact()).toBe(true);
    });

    it('should return false when limit reached', () => {
      const quota = Quota.reconstitute(
        'q-1', userId, QuotaPeriod.current(), Plan.free(),
        1000, 1000, 250, 0, new Date(), 1, [],
      );
      expect(quota.canCreateArtifact()).toBe(false);
    });
  });

  describe('consumeArtifact', () => {
    it('should increment artifact count', () => {
      const quota = createQuota();
      quota.consumeArtifact();
      expect(quota.artifactCount).toBe(1);
      expect(quota.version).toBe(2);
    });

    it('should throw ArtifactGateExceededError when limit reached', () => {
      const quota = Quota.reconstitute(
        'q-1', userId, QuotaPeriod.current(), Plan.free(),
        1000, 1000, 250, 0, new Date(), 1, [],
      );
      expect(() => quota.consumeArtifact()).toThrow(ArtifactGateExceededError);
    });
  });

  describe('canConsumeCredits', () => {
    it('should return true when within limit', () => {
      const quota = createQuota();
      expect(quota.canConsumeCredits(10)).toBe(true);
    });

    it('should return false when exceeding limit', () => {
      const quota = createQuota();
      expect(quota.canConsumeCredits(251)).toBe(false);
    });
  });

  describe('consumeCredits', () => {
    it('should deduct credits and return CreditConsumed event', () => {
      const quota = createQuota();
      const event = quota.consumeCredits(5, sessionId);

      expect(event.eventType).toBe('CreditConsumed');
      expect(quota.creditConsumed).toBe(5);
      expect(quota.remainingCredits).toBe(245);
      expect(quota.transactions).toHaveLength(1);
      expect(quota.version).toBe(2);
    });

    it('should throw QuotaExceededError when exceeding limit', () => {
      const quota = createQuota();
      expect(() => quota.consumeCredits(300, sessionId)).toThrow(QuotaExceededError);
    });

    it('should accumulate transactions on multiple consumes', () => {
      const quota = createQuota();
      quota.consumeCredits(10, 's-1');
      quota.consumeCredits(20, 's-2');

      expect(quota.creditConsumed).toBe(30);
      expect(quota.transactions).toHaveLength(2);
    });
  });

  describe('remainingCredits', () => {
    it('should not return negative when consumed > limit', () => {
      const quota = Quota.reconstitute(
        'q-1', userId, QuotaPeriod.current(), Plan.free(),
        1000, 0, 250, 300, new Date(), 1, [],
      );
      expect(quota.remainingCredits).toBe(0);
    });
  });

  describe('remainingArtifacts', () => {
    it('should not return negative when count > limit', () => {
      const quota = Quota.reconstitute(
        'q-1', userId, QuotaPeriod.current(), Plan.free(),
        1000, 1500, 250, 0, new Date(), 1, [],
      );
      expect(quota.remainingArtifacts).toBe(0);
    });
  });

  describe('creditUsagePercent', () => {
    it('should return percentage of consumed credits', () => {
      const quota = createQuota();
      quota.consumeCredits(50, sessionId);
      expect(quota.creditUsagePercent).toBe(20);
    });
  });

  describe('addCredits', () => {
    it('should increase credit limit', () => {
      const quota = createQuota();
      quota.addCredits(CreditAmount.from(100), TransactionReason.AdminGrant);

      expect(quota.remainingCredits).toBe(350);
      expect(quota.transactions).toHaveLength(1);
    });
  });

  describe('upgradePlan', () => {
    it('should update limits without resetting consumed counters', () => {
      const quota = Quota.reconstitute(
        'q-1', userId, QuotaPeriod.current(), Plan.free(),
        1000, 50, 250, 100, new Date(), 1, [],
      );
      const newPlan = Plan.free();
      quota.upgradePlan(newPlan);

      expect(quota.remainingCredits).toBe(150);
      expect(quota.remainingArtifacts).toBe(950);
    });
  });

  describe('transactions', () => {
    it('should return ReadonlyArray', () => {
      const quota = createQuota();
      quota.consumeCredits(5, sessionId);
      const txs = quota.transactions;
      expect(txs).toHaveLength(1);
    });
  });
});
