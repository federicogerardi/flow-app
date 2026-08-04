import { setup, assign } from 'xstate';

export type ToolPagePhase = 'draftEmpty' | 'configuring' | 'ready' | 'submitting' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ToolPageContext {
  inputs: Record<string, string>;
  error: string | null;
  errorCode: string | null;
  sessionId: string | null;
  phase: ToolPagePhase;
}

type ConfigureEvent = { type: 'CONFIGURE'; key: string; value: string };
type SubmitEvent = { type: 'SUBMIT' };
type StartedEvent = { type: 'SESSION_STARTED'; sessionId: string };
type CompletedEvent = { type: 'SESSION_COMPLETED' };
type FailedEvent = { type: 'SESSION_FAILED'; error: string; code?: string };
type CancelEvent = { type: 'CANCEL' };
type ResetEvent = { type: 'RESET' };

export type ToolPageEvent = ConfigureEvent | SubmitEvent | StartedEvent | CompletedEvent | FailedEvent | CancelEvent | ResetEvent;

export const toolPageMachine = setup({
  types: {
    context: {} as ToolPageContext,
    events: {} as ToolPageEvent,
  },
}).createMachine({
  id: 'toolPage',
  initial: 'configuring',
  context: {
    inputs: {},
    error: null,
    errorCode: null,
    sessionId: null,
    phase: 'configuring',
  },
  states: {
    configuring: {
      entry: assign({ phase: 'configuring', error: null }),
      on: {
        CONFIGURE: {
          actions: assign({
            inputs: ({ context, event }) => ({
              ...context.inputs,
              [event.key]: event.value,
            }),
          }),
        },
        SUBMIT: 'submitting',
      },
    },
    submitting: {
      entry: assign({ phase: 'submitting', error: null }),
      on: {
        SESSION_STARTED: {
          target: 'running',
          actions: assign({ sessionId: ({ event }) => event.sessionId }),
        },
        SESSION_FAILED: {
          target: 'failed',
          actions: assign({
            error: ({ event }) => event.error,
            errorCode: ({ event }) => event.code ?? null,
          }),
        },
      },
    },
    running: {
      entry: assign({ phase: 'running' }),
      on: {
        SESSION_COMPLETED: 'completed',
        SESSION_FAILED: {
          target: 'failed',
          actions: assign({
            error: ({ event }) => event.error,
            errorCode: ({ event }) => event.code ?? null,
          }),
        },
        CANCEL: 'cancelled',
      },
    },
    completed: {
      entry: assign({ phase: 'completed' }),
      on: { RESET: 'configuring' },
    },
    failed: {
      entry: assign({ phase: 'failed' }),
      on: {
        RESET: 'configuring',
        SUBMIT: 'submitting',
      },
    },
    cancelled: {
      entry: assign({ phase: 'cancelled' }),
      on: { RESET: 'configuring' },
    },
  },
});
