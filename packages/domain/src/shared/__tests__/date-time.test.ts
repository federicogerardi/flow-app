import { describe, it, expect } from 'vitest';
import { DateTime } from '../date-time';

describe('DateTime', () => {
  it('now() returns a DateTime close to Date.now()', () => {
    const before = Date.now();
    const dt = DateTime.now();
    const after = Date.now();
    const ms = dt.toDate().getTime();
    expect(ms).toBeGreaterThanOrEqual(before);
    expect(ms).toBeLessThanOrEqual(after);
  });

  it('from(date) creates DateTime from Date', () => {
    const date = new Date('2025-06-15T10:30:00.000Z');
    const dt = DateTime.from(date);
    expect(dt.toISOString()).toBe('2025-06-15T10:30:00.000Z');
  });

  it('fromISO(iso) creates DateTime from ISO string', () => {
    const dt = DateTime.fromISO('2025-01-01T00:00:00.000Z');
    expect(dt.toISOString()).toBe('2025-01-01T00:00:00.000Z');
  });

  it('isBefore() returns true when before', () => {
    const earlier = DateTime.fromISO('2025-01-01T00:00:00.000Z');
    const later = DateTime.fromISO('2025-06-01T00:00:00.000Z');
    expect(earlier.isBefore(later)).toBe(true);
  });

  it('isBefore() returns false when not before', () => {
    const earlier = DateTime.fromISO('2025-01-01T00:00:00.000Z');
    const later = DateTime.fromISO('2025-06-01T00:00:00.000Z');
    expect(later.isBefore(earlier)).toBe(false);
  });

  it('isAfter() returns true when after', () => {
    const earlier = DateTime.fromISO('2025-01-01T00:00:00.000Z');
    const later = DateTime.fromISO('2025-06-01T00:00:00.000Z');
    expect(later.isAfter(earlier)).toBe(true);
  });

  it('isAfter() returns false when not after', () => {
    const earlier = DateTime.fromISO('2025-01-01T00:00:00.000Z');
    const later = DateTime.fromISO('2025-06-01T00:00:00.000Z');
    expect(earlier.isAfter(later)).toBe(false);
  });

  it('equals() returns true for same time', () => {
    const a = DateTime.fromISO('2025-03-10T12:00:00.000Z');
    const b = DateTime.fromISO('2025-03-10T12:00:00.000Z');
    expect(a.equals(b)).toBe(true);
  });

  it('equals() returns false for different time', () => {
    const a = DateTime.fromISO('2025-03-10T12:00:00.000Z');
    const b = DateTime.fromISO('2025-03-10T12:00:01.000Z');
    expect(a.equals(b)).toBe(false);
  });

  it('toDate() returns a copy — mutating it does not affect DateTime', () => {
    const dt = DateTime.fromISO('2025-06-15T10:30:00.000Z');
    const copy = dt.toDate();
    copy.setFullYear(2099);
    expect(dt.toISOString()).toBe('2025-06-15T10:30:00.000Z');
  });

  it('toISOString() returns ISO string', () => {
    const dt = DateTime.fromISO('2025-12-31T23:59:59.999Z');
    expect(dt.toISOString()).toBe('2025-12-31T23:59:59.999Z');
  });
});
