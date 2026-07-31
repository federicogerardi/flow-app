---
type: concept
tags:
  - wiki/concept
  - wiki/architecture
  - wiki/generation
date_updated: 2026-07-31
source_count: 4
confidence: high
---

# Session Machine (XState v5)

> Application-layer state machine for the unified tool execution pipeline

## Architecture

The `sessionMachine` lives in `apps/backend/src/generation/machines/`. It **imports and executes** the state machine definition from the domain — it does **not** define states, transitions, or which states are final. That knowledge lives in [[Session#Session Lifecycle — Domain-Owned State Machine|SessionLifecycle]] (`packages/domain`). XState is the **runtime engine**: actors, `invoke`, context, persistence, DI via `provide()`.

```
┌── packages/domain ──────────────────────┐
│  SessionLifecycle (pure data)            │  ← single source of truth
│  → states, transitions, final states    │
└────────────────┬────────────────────────┘
                 │ imports
                 ▼
┌── apps/backend ─────────────────────────┐
│  sessionMachine (XState v5)              │  ← runtime engine
│  → actors (invoke LLM, persist)         │
│  → guards (ReadinessPolicy)             │
│  → actions (publish events)             │
│  → .provide() DI                        │
└─────────────────────────────────────────┘
```

> **Architecture decision (Pattern B, 2026-07-31)**: Previously XState defined the states/transitions itself, and Session had duplicate guard methods. Now the domain `SessionLifecycle` is the single source. XState imports it and adds only runtime concerns.

## Type Definitions

```typescript
// apps/backend/src/generation/machines/session-machine.ts

import { setup, assign, fromPromise } from 'xstate';
import { SessionLifecycle } from '@flow-app/domain/generation';
import type { Session, Artifact, ToolDefinition, AcquisitionData } from '@flow-app/domain';

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
    executeStep: fromPromise<Artifact, SessionContext>(
      async () => { throw new Error('provide executeStep'); }
    ),
    persistSession: fromPromise<void, { session: Session }>(
      async () => { throw new Error('provide persistSession'); }
    ),
  },
  guards: {
    canStart: ({ context }) => {
      // Delegates to domain VO — no inline business logic
      const policy = ReadinessPolicy.from(context.tool);
      return policy.evaluate(context.acquisitionData).isReady;
    },
    isLastStep: ({ context }) =>
      context.currentStepIndex >= context.tool.steps.length - 1,
  },
  actions: {
    updateStepResults: assign({
      stepResults: ({ context, event }) =>
        [...context.stepResults, event.output as Artifact],
    }),
    // Calls Session.apply() — the single domain entry point.
    // isLast and stepLabel are computed here (from ToolDefinition) and passed
    // IN the event. The aggregate does NOT look up ToolRegistry.
    callApply: ({ context, event }) => {
      const output = event.output as Artifact;
      const stepIndex = context.currentStepIndex;
      const domainEvent = context.session.apply({
        type: 'ADD_ARTIFACT',
        artifact: output,
        isLast: stepIndex >= context.tool.steps.length - 1,        // ← computed here
        stepLabel: context.tool.steps[stepIndex]?.label ?? '',     // ← computed here
      });
      if (domainEvent) eventBus.publish(domainEvent);
    },
    advanceStep: assign({
      currentStepIndex: ({ context }) => context.currentStepIndex + 1,
    }),
    completeSession: ({ context }) => {
      // Session.apply() validates and returns the domain event
      const domainEvent = context.session.apply({ type: 'COMPLETE' });
      eventBus.publish(domainEvent);
    },
  },
}).createMachine({
  id: 'session',
  initial: SessionLifecycle.initialState,     // ← from domain, not hardcoded
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
    // States are defined here (XState needs the runtime structure),
    // but transitions mirror SessionLifecycle.states — validated at startup.
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
              actions: ['updateStepResults', 'callApply'],  // Session.apply() guards the transition
            },
            onError: { target: '#session.failed' },
          },
        },
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

### Startup Validation

At application startup, verify that XState's states match `SessionLifecycle`:

```typescript
// apps/backend/src/generation/machines/validate-lifecycle.ts

import { SessionLifecycle } from '@flow-app/domain/generation';

function validateXStateMatchesDomain(): void {
  // Ensure every domain state has a matching XState state
  for (const state of Object.keys(SessionLifecycle.states)) {
    if (!(state in sessionMachine.config.states!)) {
      throw new Error(
        `FATAL: XState machine missing state "${state}" defined in SessionLifecycle`
      );
    }
  }
  // Ensure every domain transition has a matching XState transition
  for (const [stateName, stateDef] of Object.entries(SessionLifecycle.states)) {
    if ('transitions' in stateDef) {
      const xstateState = (sessionMachine.config.states! as any)[stateName];
      for (const eventName of Object.keys(stateDef.transitions)) {
        if (!(eventName in (xstateState.on ?? {}))) {
          throw new Error(
            `FATAL: XState machine missing transition "${stateName} → ${eventName}" defined in SessionLifecycle`
          );
        }
      }
    }
  }
}
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

## Key Design Decisions (Pattern B applied)

| Decision | Description |
|----------|-------------|
| **Domain-owned lifecycle** | `SessionLifecycle` in `packages/domain` is the single source of truth for states and transitions. XState imports it — never defines it. |
| **Single entry point** | `Session.apply(event)` is the only way to change state. No duplicate guard methods. Domain validates the transition; XState orchestrates the flow. |
| **Guard delegation** | `canStart` delegates to `ReadinessPolicy` (domain VO). No business logic in XState guards. |
| **Actor injection** | `executeStep` and `persistSession` are injected via `machine.provide()` in `SessionOrchestrator` — no closure captures. |
| **Startup validation** | `validateXStateMatchesDomain()` runs on boot — fails fast if XState states/transitions drift from `SessionLifecycle`. |
| **Async persistence** | Persistence is an `invoke` state (`persistingStep`), not an async action. Crash-safe: snapshot can resume from any state. |
| **Pure context updates** | `assign()` only updates context. Domain side effects (event publishing) happen in separate actions (`callApply`, `completeSession`) via `Session.apply()`.

## State Flow

```
draft
  CONFIGURE → ready (assign acquisitionData)
  START + canStart (ReadinessPolicy) → running
    executingStep:
      invoke executeStep (provided by SessionOrchestrator)
        onDone → persistingStep (updateStepResults + callApply → Session.apply(ADD_ARTIFACT))
        onError → failed
    persistingStep:
      invoke persistSession (provided by SessionOrchestrator)
        onDone → stepCompleted
        onError → failed
    stepCompleted:
      isLastStep → completed (completeSession → Session.apply(COMPLETE) + eventBus)
      else → executingStep (advanceStep)
completed [final]
failed    [final]
cancelled [final]
```

> **Session.apply() flow**: XState action calls `session.apply({ type: 'ADD_ARTIFACT', artifact, isLast, stepLabel })` → Session validates transition against `SessionLifecycle` → mutates state → returns `DomainEvent | null` → XState publishes event via `eventBus.publish()`. The aggregate never calls `getTool()` — `isLast` and `stepLabel` are computed by XState (which owns the `ToolDefinition`) and passed in the event.

## Sources

- [[sources/APP-CONCEPT]] — BE-Driven workflow
- [[sources/PRD]] — FR-W01, FR-W03 (resume), FR-W04 (cancel)
- [[sources/STARTUP]] — Ordered Step Chain
- [[sources/USER-STORIES]] — US-GF01 to US-GF04