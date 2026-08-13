export type UIState = 'loading' | 'setup' | 'submitting' | 'generating';

/**
 * Maps XState v5 toolPageMachine state values to UI rendering states.
 *
 * Machine states:
 *   draftEmpty  — no tool loaded yet (initial mount)
 *   configuring — user filling inputs
 *   ready       — all required inputs filled, can submit
 *   submitting  — HTTP POST in flight
 *   submitted   — session created, inline generation active
 */
export function deriveUIState(state: { value: unknown }): UIState {
  const v = String(state.value);
  if (v === 'draftEmpty') return 'loading';
  if (v === 'configuring') return 'setup';
  if (v === 'ready') return 'setup';
  if (v === 'submitting') return 'submitting';
  if (v === 'submitted') return 'generating';
  return 'loading';
}