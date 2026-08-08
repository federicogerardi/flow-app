import { describe, it, expect } from 'vitest';

// ── Replicate the `deriveUIState` function from ToolPageLayout ─────────────────
// (It's a private function in ToolPageLayout.tsx; reproduced here for testing)

type UIState = 'loading' | 'setup' | 'submitting';

function deriveUIState(state: { value: unknown }): UIState {
  const v = String(state.value);
  if (v === 'draftEmpty') return 'loading';
  if (v === 'configuring') return 'setup';
  if (v === 'ready') return 'setup';
  if (v === 'submitting') return 'submitting';
  if (v === 'submitted') return 'submitting'; // brief flash before redirect
  return 'loading';
}

// ── Tests ───────────────────────────────────────────────────────────────────────

describe('deriveUIState', () => {
  it.each([
    ['draftEmpty', 'loading'],
    ['configuring', 'setup'],
    ['ready', 'setup'],
    ['submitting', 'submitting'],
    ['submitted', 'submitting'],
  ] as const)('maps machine state %s → UI state %s', (machineValue, expectedUIState) => {
    expect(deriveUIState({ value: machineValue })).toBe(expectedUIState);
  });

  it('returns loading for unknown states', () => {
    expect(deriveUIState({ value: 'nonexistent' })).toBe('loading');
  });

  it('handles compound XState values by converting to string', () => {
    // XState v5 can return compound values like { submitting: 'processing' }
    expect(deriveUIState({ value: { submitting: 'processing' } })).toBe('loading');
  });
});