import { describe, it, expect } from 'vitest';
import { QuotaPeriod, InvalidQuotaPeriodError } from '../value-objects/QuotaPeriod';

describe('QuotaPeriod', () => {
  describe('from', () => {
    it('should create for valid YYYY-MM', () => {
      const period = QuotaPeriod.from('2026-08');
      expect(period.toString()).toBe('2026-08');
    });

    it('should create for month 01', () => {
      const period = QuotaPeriod.from('2026-01');
      expect(period.toString()).toBe('2026-01');
    });

    it('should create for month 12', () => {
      const period = QuotaPeriod.from('2026-12');
      expect(period.toString()).toBe('2026-12');
    });

    it('should throw for month 00', () => {
      expect(() => QuotaPeriod.from('2026-00')).toThrow(InvalidQuotaPeriodError);
    });

    it('should throw for month 13', () => {
      expect(() => QuotaPeriod.from('2026-13')).toThrow(InvalidQuotaPeriodError);
    });

    it('should throw for invalid format', () => {
      expect(() => QuotaPeriod.from('2026/08')).toThrow(InvalidQuotaPeriodError);
    });

    it('should throw for plain year', () => {
      expect(() => QuotaPeriod.from('2026')).toThrow(InvalidQuotaPeriodError);
    });
  });

  describe('current', () => {
    it('should return current YYYY-MM', () => {
      const period = QuotaPeriod.current();
      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      expect(period.toString()).toBe(expected);
    });
  });

  describe('equals', () => {
    it('should return true for same period', () => {
      expect(QuotaPeriod.from('2026-08').equals(QuotaPeriod.from('2026-08'))).toBe(true);
    });

    it('should return false for different period', () => {
      expect(QuotaPeriod.from('2026-08').equals(QuotaPeriod.from('2026-09'))).toBe(false);
    });
  });
});
