import { SessionStatus, type SessionStatusValue } from './value-objects/SessionStatus';

export type SessionEventType =
  | 'CONFIGURE'
  | 'QUEUE'
  | 'WORKER_PICKUP'
  | 'ADD_ARTIFACT'
  | 'COMPLETE'
  | 'FAIL'
  | 'CANCEL';

export type SessionState = SessionStatusValue;

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
  initialState: SessionStatus.Draft,
  states,

  getValidTransition(
    currentState: SessionStatus,
    event: SessionEventType,
  ): SessionStatus | null {
    const stateDef = states[currentState.value];
    if (!stateDef) return null;
    const target = stateDef.transitions[event];
    return target ? SessionStatus.from(target) : null;
  },

  isFinalState(state: SessionStatus): boolean {
    return states[state.value]?.isFinal ?? false;
  },
};
