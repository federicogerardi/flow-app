---
type: concept
tags:
  - wiki/concept
  - wiki/frontend
  - wiki/architecture
date_updated: 2026-08-08
source_count: 6
confidence: high
---

# ToolPage Machine (XState v5)

> Frontend state machine for the unified tool setup UI  
> `apps/frontend/src/machines/tool-page-machine.ts`  
> Component architecture: see [[Frontend Architecture]]

## Architecture (simplified 2026-08-08)

The `toolPageMachine` manages the **setup-only** lifecycle of a tool page: from tool loading through input configuration, readiness validation, and submission. **Post-submit progress and results are handled by [[SessionPage]]** — the tool page redirects to `/sessions/[id]` after successful submission.

**Rationale**: eliminating SSE-duplication between `ToolPageLayout` (which had its own `subscribeToSSE` actor) and `SessionPage` (which uses `useSession` hook with SSE). The tool page is now a pure setup form; SessionPage is the single canonical view for session progress and results.

**Principle**: one machine for all 11 tools. Differences are purely configuration — which `ToolDefinition` is loaded determines which inputs to show.

## Determinism Contract (2026-07-31 remediation)

Readiness must be deterministic across domain, API, and UI:

1. **Domain is canonical**: backend `ReadinessPolicy` determines whether submission is allowed.
2. **Frontend mirrors the same predicates** for immediate UX feedback.
3. **Reason codes are canonical** (`missing_text`, `missing_file`, `missing_asset`, `missing_workspace`) and are rendered by `ReadinessSnapshot`.
4. **Parity tests are mandatory**: FE readiness fixtures must match BE readiness fixtures for all tools.

No optional bypass exists for required assets.

```
┌───────────────────────────────────────────────────────────────┐
│ toolPageMachine (XState v5 — React)                            │
│                                                                 │
│  draftEmpty ──▶ configuring ⇄ ready ──▶ submitting             │
│                                                │                │
│                                                ▼                │
│                                             submitted (final)   │
│                                             → redirect to       │
│                                             /sessions/[id]      │
└───────────────────────────────────────────────────────────────┘
```

## Type Definitions

```typescript
// apps/frontend/src/machines/tool-page-machine.ts

interface ToolPageContext {
  tool: ToolDefinition | null;
  workspaceId: string;
  inputs: {
    text: Record<string, string>;
    files: Record<string, File>;
    selectedAssetIds: string[];
    selectedAssetsByType: Partial<Record<string, string[]>>;
  };
  session: SessionDTO | null;
  error: { code: string; message: string } | null;
}

type ToolPageEvent =
  | { type: 'LOAD'; tool: ToolDefinition; workspaceId: string }
  | { type: 'CONFIGURE'; inputs: Partial<ToolPageInputs> }
  | { type: 'SUBMIT' }
  | { type: 'RESET' };
```

## Machine Definition (simplified)

```typescript
export const toolPageMachine = setup({
  types: { context: {} as ToolPageContext, events: {} as ToolPageEvent },
  actors: {
    // POST /api/tools/:toolKey/sessions — single HTTP call, no SSE
    submitSession: fromPromise(async ({ input }) => {
      // Reads file contents, calls api.startSession()
      const result = await api.startSession(input.toolKey, {
        workspaceId: input.workspaceId,
        inputs: { text, files, selectedAssets },
      });
      return result; // { session: SessionDTO, replayed: boolean }
    }),
  },
  guards: {
    canSubmit: canSubmitGuard,     // mirrors backend ReadinessPolicy
    isStillDraft: isStillDraftGuard, // true when inputs are all empty
  },
}).createMachine({
  id: 'toolPage',
  initial: 'draftEmpty',
  states: {
    // 1. No tool loaded
    draftEmpty: {
      on: { LOAD: { target: 'configuring', actions: 'setTool' } },
    },

    // 2. User configuring inputs — auto-transitions to ready via always guard
    configuring: {
      on: {
        CONFIGURE: { actions: 'updateInputs' },
        RESET: { guard: 'isStillDraft', target: 'draftEmpty' },
      },
      always: [{ target: 'ready', guard: 'canSubmit' }],
    },

    // 3. All required inputs present
    ready: {
      on: {
        CONFIGURE: { target: 'configuring', actions: 'updateInputs' },
        SUBMIT: { target: 'submitting' },
      },
    },

    // 4. HTTP POST in flight
    submitting: {
      invoke: {
        src: 'submitSession',
        onDone: {
          target: 'submitted',
          actions: assign({
            session: ({ event }) => event.output.session,
            inputs: () => emptyInputs(),
          }),
        },
        onError: {
          target: 'ready',
          actions: assign({ error: ({ event }) => extractError(event) }),
        },
      },
    },

    // 5. Terminal — ToolPageLayout navigates to /sessions/[id]
    submitted: { type: 'final' },
  },
});
```

## State → UI Derivation

```typescript
type UIState = 'loading' | 'setup' | 'submitting';

function deriveUIState(state: Snapshot): UIState {
  if (state.matches('draftEmpty'))  return 'loading';
  if (state.matches('configuring')) return 'setup';
  if (state.matches('ready'))       return 'setup';
  if (state.matches('submitting'))  return 'submitting';
  if (state.matches('submitted'))   return 'submitting'; // brief flash before redirect
  return 'loading';
}
```

| State | CTA Button | Panel |
|-------|-----------|-------|
| `loading` | — (spinner) | Loading |
| `setup` (configuring) | "Configure" (disabled) | SetupPanel |
| `setup` (ready) | **"Generate"** (enabled) | SetupPanel + KnowledgePanel |
| `submitting` | — (spinner) | SetupPanel (disabled) |
| `submitted` | — (redirect) | → navigates to `/sessions/[id]` |

## Component Tree

```
ToolPageLayout
├── KnowledgePanel           # Asset selection (available when ready)
│   └── AssetCard[]
├── SetupPanel               # Input fields + file upload
│   ├── TextField[]            # userText inputs
│   ├── FileUpload[]           # file inputs
│   └── SubmitButton           # CTA — enabled/disabled based on canSubmit
└── ReadinessSnapshot        # Pre-flight validation display
```

**Removed from ToolPage** (now only in [[SessionPage]]): `FeedbackPanel`, `SessionSummary`, `CompletionBanner`, `ErrorPanel`.

## React Integration

```typescript
function ToolPageLayout({ workspaceId, toolKey }: Props) {
  const [state, send] = useMachine(toolPageMachine);
  const navigate = useNavigate();

  // Redirect to SessionPage after successful submit
  useEffect(() => {
    if (state.matches('submitted') && state.context.session?.id) {
      navigate(`/workspaces/${workspaceId}/sessions/${state.context.session.id}`);
    }
  }, [state]);

  if (state.matches('submitting')) return <SubmittingState />;

  return (
    <SetupPanel
      tool={state.context.tool}
      inputs={state.context.inputs}
      onChange={(inputs) => send({ type: 'CONFIGURE', inputs })}
    />
  );
}
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **One machine, 11 tools** | Same pattern as backend `sessionMachine`. Tool differences are configuration, not code |
| **Setup-only, no SSE** | `SessionPage` is the single canonical SSE subscriber — eliminates duplicated EventSource connections |
| **`fromPromise` only** | Single HTTP POST call; no `fromCallback` needed since SSE is handled by SessionPage |
| **`submitted` terminal state** | Machine reaches `submitted` → `ToolPageLayout` navigates to `/sessions/[id]` via `useEffect` |
| **State → UI derivation** | 5 machine states → 3 UI states. `configuring` and `ready` both render `SetupPanel` but differ in CTA enabled state |
| **canSubmit guard** | Mirrors backend `ReadinessPolicy` exactly, including required asset checks by `assetType` |
| **Idempotent replay** | Handled transparently: `submitSession` returns session regardless of `replayed` flag; redirect sends user to SessionPage which fetches the real state |

## Sources

- [[sources/APP-CONCEPT]] — Registry-Driven Architecture, ToolPage
- [[sources/PRD]] — FR-U01 to FR-U04 (UI requirements)
- [[sources/USER-STORIES]] — US-GF01 to US-GF04 (workflow UX)
- [[Session Machine (XState v5)]] — backend equivalent machine
- [[Tool UX Architecture]] — setup-only UX, redirect to SessionPage
- [[SessionPage]] — canonical post-submit destination for progress + results