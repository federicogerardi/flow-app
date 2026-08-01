import { describe, it, expect } from 'vitest';
import { Identifier } from '../identifier';

class TestId extends Identifier<string> {
  static from(value: string): TestId {
    return new TestId(value);
  }
}

describe('Identifier', () => {
  it('should store and return value', () => {
    const id = TestId.from('abc-123');
    expect(id.value).toBe('abc-123');
  });

  it('should compare equal identifiers', () => {
    const id1 = TestId.from('abc');
    const id2 = TestId.from('abc');
    expect(id1.equals(id2)).toBe(true);
  });

  it('should compare different identifiers', () => {
    const id1 = TestId.from('abc');
    const id2 = TestId.from('def');
    expect(id1.equals(id2)).toBe(false);
  });

  it('should convert to string', () => {
    const id = TestId.from('abc-123');
    expect(id.toString()).toBe('abc-123');
  });
});
