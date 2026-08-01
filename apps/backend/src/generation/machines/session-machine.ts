import { setup, assign, fromPromise } from 'xstate';
import type { Session, ToolDefinition, AcquisitionData, Artifact } from '@flow-app/domain';

interface SessionContext {
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

export const sessionMachine = setup({
  types: {
    context: {} as SessionContext,
    events: {} as SessionEvent,
    input: {} as { session: Session; tool: ToolDefinition },
  },
  actors: {
    executeStep: fromPromise<Artifact, SessionContext>(
      async () => { throw new Error('provide executeStep'); },
    ),
    persistSession: fromPromise<void, { session: Session }>(
      async () => { throw new Error('provide persistSession'); },
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
        const output = (event as any).output as Artifact;
        return [...context.stepResults, output];
      },
    }),
    callApply: ({ context, event }) => {
      const output = (event as any).output as Artifact;
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
            onError: { target: '#session.failed' },
          },
        },
        persistingStep: {
          invoke: {
            src: 'persistSession',
            input: ({ context }) => ({ session: context.session }),
            onDone: { target: 'stepCompleted' },
            onError: { target: '#session.failed' },
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
