import { describe, it, expect } from 'vitest';
import { PlanType, Plan, CreditAmount, InvalidPlanTypeError, InvalidCreditAmountError } from '../value-objects/Plan';

describe('PlanType', () => {
  describe('from', () => {
    it('should return Free for "free"', () => {
      expect(PlanType.from('free')).toBe(PlanType.Free);
    });

    it('should throw InvalidPlanTypeError for unknown value', () => {
      expect(() => PlanType.from('pro')).toThrow(InvalidPlanTypeError);
    });
  });

  describe('equals', () => {
    it('should return true for same value', () => {
      expect(PlanType.Free.equals(PlanType.Free)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return "free"', () => {
      expect(PlanType.Free.toString()).toBe('free');
    });
  });
});

describe('Plan', () => {
  describe('free', () => {
    it('should create a free plan with correct limits', () => {
      const plan = Plan.free();
      expect(plan.type).toBe(PlanType.Free);
      expect(plan.artifactLimit).toBe(1000);
      expect(plan.creditLimit).toBe(250);
    });
  });

  describe('fromType', () => {
    it('should return free plan from Free type', () => {
      const plan = Plan.fromType(PlanType.Free);
      expect(plan.artifactLimit).toBe(1000);
      expect(plan.creditLimit).toBe(250);
    });
  });
});

describe('CreditAmount', () => {
  describe('from', () => {
    it('should create for valid non-negative integer', () => {
      const amount = CreditAmount.from(5);
      expect(amount.toValue()).toBe(5);
    });

    it('should create for zero', () => {
      const amount = CreditAmount.from(0);
      expect(amount.toValue()).toBe(0);
    });

    it('should throw for negative values', () => {
      expect(() => CreditAmount.from(-1)).toThrow(InvalidCreditAmountError);
    });

    it('should throw for non-integer values', () => {
      expect(() => CreditAmount.from(1.5)).toThrow(InvalidCreditAmountError);
    });
  });

  describe('equals', () => {
    it('should return true for same amount', () => {
      expect(CreditAmount.from(5).equals(CreditAmount.from(5))).toBe(true);
    });

    it('should return false for different amounts', () => {
      expect(CreditAmount.from(5).equals(CreditAmount.from(10))).toBe(false);
    });
  });
});
