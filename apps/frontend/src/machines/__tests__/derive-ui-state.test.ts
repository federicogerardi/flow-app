import { describe, it, expect } from 'vitest';
import { deriveUIState } from '../derive-ui-state';

describe('deriveUIState', () => {
  it.each([
    ['draftEmpty', 'loading'],
    ['configuring', 'setup'],
    ['ready', 'setup'],
    ['submitting', 'submitting'],
    ['submitted', 'generating'],
  ] as const)('maps machine state %s → UI state %s', (machineValue, expectedUIState) => {
    expect(deriveUIState({ value: machineValue })).toBe(expectedUIState);
  });

  it('returns loading for unknown states', () => {
    expect(deriveUIState({ value: 'nonexistent' })).toBe('loading');
  });

  it('handles compound XState values by converting to string', () => {
    expect(deriveUIState({ value: { submitting: 'processing' } })).toBe('loading');
  });

  it('submitted maps to generating (inline generation, no redirect)', () => {
    expect(deriveUIState({ value: 'submitted' })).toBe('generating');
    expect(deriveUIState({ value: 'submitted' })).not.toBe('submitting');
  });
});