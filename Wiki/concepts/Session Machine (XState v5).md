---
type: concept
tags:
  - wiki/concept
  - wiki/architecture
  - wiki/generation
date_updated: 2026-07-30
source_count: 4
confidence: high
---

# Session Machine (XState v5)

> Application-layer state machine for the unified tool execution pipeline

## Architecture

The `sessionMachine` lives in `apps/backend/src/generation/machines/`. It orchestrates the execution of ANY tool using a single generic machine. The domain (`packages/domain`) is framework-agnostic; XState drives it.

```
┌──────────────────────────────────────────────────────────────────┐
│ sessionMachine (XState v5)                                        │
│                                                                    │
│  draft ──CONFIGURE──▶ ready ──START──▶ running ──────▶ completed  │
│                              │         │  ├── executingStep        │
│                              │         │  ├── persistingStep       │
│                              │         │  └── stepCompleted ◀──┘  │
│                              ▼         ▼                           │
│                          cancelled   failed                        │
└──────────────────────────────────────────────────────────────────┘
```

## Type Definitions

```typescript
// apps/backend/src/generation/machines/session-machine.ts

import { setup, assign, fromPromise } from 'xstate';
import type { Session, Artifact, ToolDefinition, AcquisitionData, ReadinessPolicy } from '@flow-app/domain';

interface SessionContext {
  session: Session;
  tool: ToolDefinition;
  currentStepIndex: number;
  stepResults: Artifact[];
  acquisitionData: AcquisitionData;
}

type SessionEvent =
  | { type: 'CONFIGURE'; acquisitionData: AcquisitionData }
  | { type: 'START' }
  | { type: 'CANCEL' };
```

## Machine Definition

```typescript
// Step 1: machine declares interface (no concrete dependencies)
const sessionMachine = setup({
  types: {
    context: {} as SessionContext,
    events:  {} as SessionEvent,
    input:   {} as { session: Session; tool: ToolDefinition },
  },
  actors: {
    // Declared as stubs — implementations injected via .provide() at runtime
    executeStep: fromPromise<Artifact, SessionContext>(
      async () => { throw new Error('provide executeStep'); }
    ),
    persistSession: fromPromise<void, { session: Session }>(
      async () => { throw new Error('provide persistSession'); }
    ),
  },
  guards: {
    // Fix #3: delegates to ReadinessPolicy domain VO — no inline business logic
    canStart: ({ context }) => {
      const policy = ReadinessPolicy.from(context.tool);
      return policy.evaluate(context.acquisitionData).isReady;
    },
    isLastStep: ({ context }) =>
      context.currentStepIndex >= context.tool.steps.length - 1,
  },
  actions: {
    // Fix #8: pure context update only — no domain side effects inside assign
    updateStepResults: assign({
      stepResults: ({ context, event }) =>
        [...context.stepResults, event.output as Artifact],
    }),
    // Fix #8: separate action for domain side effect
    callAddArtifact: ({ context, event }) => {
      context.session.addArtifact(event.output as Artifact);
    },
    advanceStep: assign({
      currentStepIndex: ({ context }) => context.currentStepIndex + 1,
    }),
    // Sync: session.complete() returns domain event, eventBus.publish() is fire-and-forget
    completeSession: ({ context }) => {
      const event = context.session.complete();
      eventBus.publish(event);
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
        START:  { target: 'running', guard: 'canStart' },
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
              // Fix #8: pure context update first, domain side effect second
              actions: ['updateStepResults', 'callAddArtifact'],
            },
            onError: { target: '#session.failed' },
          },
        },
        // Fix #7: persistence is now an invoked async actor, not an async action
        persistingStep: {
          invoke: {
            src: 'persistSession',
            input: ({ context }) => ({ session: context.session }),
            onDone:  { target: 'stepCompleted' },
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
    failed:    { type: 'final' },
    cancelled: { type: 'final' },
  },
});
```

## Dependency Injection via `provide()`

```typescript
// Fix #9: concrete implementations injected at runtime, not captured as closures

// apps/backend/src/generation/services/session-orchestrator.ts

class SessionOrchestrator {
  constructor(
    private processStepUseCase: ProcessStepUseCase,
    private sessionRepository: SessionRepository,
  ) {}

  private buildMachine() {
    return sessionMachine.provide({
      actors: {
        executeStep: fromPromise(async ({ input: context }) => {
          const step = context.tool.steps[context.currentStepIndex];
          return await this.processStepUseCase.execute({
            session: context.session,
            step,
            previousResults: context.stepResults,
            acquisitionData: context.acquisitionData,
          });
        }),
        persistSession: fromPromise(async ({ input: { session } }) => {
          await this.sessionRepository.save(session);
        }),
      },
    });
  }

  async start(session: Session, tool: ToolDefinition, acquisitionData: AcquisitionData): Promise<void> {
    const machine = this.buildMachine();
    const actor = createActor(machine, { input: { session, tool } });

    actor.subscribe(async (snapshot) => {
      await this.persistSnapshot(session.sessionId, snapshot);
    });

    actor.start();
    actor.send({ type: 'CONFIGURE', acquisitionData });
    actor.send({ type: 'START' });
  }

  async resume(sessionId: SessionId): Promise<void> {
    const snapshot = await this.loadSnapshot(sessionId);
    const machine  = this.buildMachine();
    const actor    = createActor(machine, { snapshot });
    actor.start();
  }
}
```

## Key Design Decisions (all 4 fixes applied)

| Fix | Problem | Solution |
|-----|---------|---------|
| **#3** | `canStart` contained inline readiness logic | Delegates to `ReadinessPolicy.from(tool).evaluate(data)` |
| **#7** | `persistSession` was an async action | Now an `invoke` state (`persistingStep`) with `fromPromise` |
| **#8** | `assign` mixed domain side effects with context update | Split into `callAddArtifact` (side effect) + `updateStepResults` (pure assign) |
| **#9** | `processStepUseCase` captured as closure | Injected via `machine.provide()` in `SessionOrchestrator` |

## State Flow

```
draft
  CONFIGURE → ready (assign acquisitionData)
  START + canStart (ReadinessPolicy) → running
    executingStep:
      invoke executeStep (provided by SessionOrchestrator)
        onDone → persistingStep (updateStepResults + callAddArtifact)
        onError → failed
    persistingStep:
      invoke persistSession (provided by SessionOrchestrator)
        onDone → stepCompleted
        onError → failed
    stepCompleted:
      isLastStep → completed (completeSession: session.complete() + eventBus)
      else → executingStep (advanceStep)
completed [final]
failed    [final]
cancelled [final]
```

## Sources

- [[sources/APP-CONCEPT]] — BE-Driven workflow
- [[sources/PRD]] — FR-W01, FR-W03 (resume), FR-W04 (cancel)
- [[sources/STARTUP]] — Ordered Step Chain
- [[sources/USER-STORIES]] — US-GF01 to US-GF04