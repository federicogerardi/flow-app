import type { SessionStatus } from './value-objects/SessionStatus';

export type SessionEventType =
  | 'CONFIGURE'
  | 'QUEUE'
  | 'WORKER_PICKUP'
  | 'ADD_ARTIFACT'
  | 'COMPLETE'
  | 'FAIL'
  | 'CANCEL';

export type SessionState = SessionStatus;

interface StateDefinition {
  transitions: Partial<Record<SessionEventType, SessionState>>;
  isFinal: boolean;
}

const states: Record<SessionState, StateDefinition> = {
  draft: {
    transitions: { CONFIGURE: 'ready' },
    isFinal: false,
  },
  ready: {
    transitions: { QUEUE: 'queued', CANCEL: 'cancelled' },
    isFinal: false,
  },
  queued: {
    transitions: { WORKER_PICKUP: 'running', CANCEL: 'cancelled' },
    isFinal: false,
  },
  running: {
    transitions: { ADD_ARTIFACT: 'running', COMPLETE: 'completed', FAIL: 'failed', CANCEL: 'cancelled' },
    isFinal: false,
  },
  completed: {
    transitions: {},
    isFinal: true,
  },
  failed: {
    transitions: {},
    isFinal: true,
  },
  cancelled: {
    transitions: {},
    isFinal: true,
  },
};

export const SessionLifecycle = {
  initialState: 'draft' as SessionState,
  states,

  getValidTransition(
    currentState: SessionState,
    event: SessionEventType,
  ): SessionState | null {
    const stateDef = states[currentState];
    if (!stateDef) return null;
    return stateDef.transitions[event] ?? null;
  },

  isFinalState(state: SessionState): boolean {
    return states[state]?.isFinal ?? false;
  },
};
