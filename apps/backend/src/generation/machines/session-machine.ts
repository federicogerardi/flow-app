import { setup, assign, fromPromise } from 'xstate';
import type { Session, ToolDefinition, AcquisitionData, Artifact } from '@flow-app/domain';
import { NotImplementedError } from '@flow-app/domain';

export interface SessionContext {
  session: Session;
  tool: ToolDefinition;
  currentStepIndex: number;
  stepResults: Artifact[];
  acquisitionData: AcquisitionData;
}

type SessionEvent =
  | { type: 'CONFIGURE'; acquisitionData: AcquisitionData }
  | { type: 'QUEUE' }
  | { type: 'WORKER_PICKUP' }
  | { type: 'CANCEL' };

/** Event emitted by XState when executeStep actor completes (onDone) */
interface StepDoneEvent {
  output: Artifact;
}

export const sessionMachine = setup({
  types: {
    context: {} as SessionContext,
    events: {} as SessionEvent,
    input: {} as { session: Session; tool: ToolDefinition },
  },
  actors: {
    executeStep: fromPromise<Artifact, SessionContext>(
      async () => { throw new NotImplementedError('provide executeStep'); },
    ),
    persistSession: fromPromise<void, { session: Session }>(
      async () => { throw new NotImplementedError('provide persistSession'); },
    ),
  },
  guards: {
    canQueue: () => true,
    isLastStep: ({ context }) =>
      context.currentStepIndex >= context.tool.steps.length - 1,
  },
  actions: {
    updateStepResults: assign({
      stepResults: ({ context, event }) => {
        const output = (event as unknown as StepDoneEvent).output;
        return [...context.stepResults, output];
      },
    }),
    callApply: ({ context, event }) => {
      const output = (event as unknown as StepDoneEvent).output;
      const stepIndex = context.currentStepIndex;
      context.session.apply({
        type: 'ADD_ARTIFACT',
        artifact: output,
        isLast: stepIndex >= context.tool.steps.length - 1,
        stepLabel: context.tool.steps[stepIndex]?.label ?? '',
      });
    },
    advanceStep: assign({
      currentStepIndex: ({ context }) => context.currentStepIndex + 1,
    }),
    completeSession: ({ context }) => {
      context.session.apply({ type: 'COMPLETE' });
    },
    failSession: ({ context, event }) => {
      const err = (event as unknown as { error: Error & { code?: string } }).error;
      context.session.apply({
        type: 'FAIL',
        errorCode: err?.code ?? 'SESSION_FAILED',
        errorMessage: err?.message ?? 'Session failed',
      });
    },
  },
}).createMachine({
  id: 'session',
  initial: 'draft',
  context: ({ input }) => ({
    session: input.session,
    tool: input.tool,
    currentStepIndex: 0,
    stepResults: [],
    acquisitionData: {
      userInputs: {},
      fileContents: {},
      apiResponses: [],
      resolvedAssets: new Map(),
    },
  }),
  states: {
    draft: {
      on: {
        CONFIGURE: {
          target: 'ready',
          actions: assign({ acquisitionData: ({ event }) => event.acquisitionData }),
        },
      },
    },
    ready: {
      on: {
        QUEUE: { target: 'queued', guard: 'canQueue' },
        CANCEL: { target: 'cancelled' },
      },
    },
    queued: {
      on: {
        WORKER_PICKUP: { target: 'running' },
        CANCEL: { target: 'cancelled' },
      },
    },
    running: {
      initial: 'executingStep',
      states: {
        executingStep: {
          invoke: {
            src: 'executeStep',
            input: ({ context }) => context,
            onDone: {
              target: 'persistingStep',
              actions: ['updateStepResults', 'callApply'],
            },
            onError: { target: '#session.failed', actions: 'failSession' },
          },
        },
        persistingStep: {
          invoke: {
            src: 'persistSession',
            input: ({ context }) => ({ session: context.session }),
            onDone: { target: 'stepCompleted' },
            onError: { target: '#session.failed', actions: 'failSession' },
          },
        },
        stepCompleted: {
          always: [
            {
              target: '#session.completed',
              guard: 'isLastStep',
              actions: 'completeSession',
            },
            {
              target: 'executingStep',
              actions: 'advanceStep',
            },
          ],
        },
      },
    },
    completed: { type: 'final' },
    failed: { type: 'final' },
    cancelled: { type: 'final' },
  },
});
