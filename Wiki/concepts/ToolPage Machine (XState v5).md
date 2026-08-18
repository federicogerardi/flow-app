---
type: concept
tags:
  - wiki/concept
  - wiki/frontend
  - wiki/architecture
date_updated: 2026-08-15
source_count: 7
confidence: high
---

# ToolPage Machine (XState v5)

> Frontend state machine for the unified tool setup UI  
> `apps/frontend/src/machines/tool-page-machine.ts`  
> Component architecture: see [[Frontend Architecture]]

## Architecture (simplified 2026-08-08, inline generation 2026-08-13)

The `toolPageMachine` manages the lifecycle of a tool page: from tool loading through input configuration, readiness validation, submission, and **inline generation** — progress and results render on the same page via `SessionTracker` (no redirect).

**2026-08-13 change**: after submission the tool page no longer redirects to [[Session List - Live Status]]. The `submitted` state renders `InlineSessionTracker` → `SessionTracker` inline, so the user lands directly on the session lifecycle without a page transition. [[Session List - Live Status]] remains as the standalone deep-link route (`/sessions/[id]`).

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
│                                             submitted          │
│                                             → inline           │
│                                             SessionTracker     │
│                                             (RESET → back to   │
│                                              configuring)      │
└───────────────────────────────────────────────────────────────┘
```

## Type Definitions

```typescript
// apps/frontend/src/machines/tool-page-machine.ts

interface ToolPageContext {
  tool: ToolDefinition | null;
  workspaceId: string;
  inputs: { ... };
  session: SessionDTO | null;
  replayed: boolean;              // true when API returns an idempotency replay (2026-08-08)
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

    // 5. Session created — inline generation renders on tool page; RESET returns to configuring for "Nuova generazione"
    submitted: {
      on: {
        RESET: { target: 'configuring' },
      },
    },
  },
});
```

## State → UI Derivation

```typescript
type UIState = 'loading' | 'setup' | 'generating';

function deriveUIState(state: Snapshot): UIState {
  if (state.matches('draftEmpty'))  return 'loading';
  if (state.matches('configuring')) return 'setup';
  if (state.matches('ready'))       return 'setup';
  if (state.matches('submitting'))  return 'generating'; // POST in flight — same UI as submitted
  if (state.matches('submitted'))   return 'generating';
  return 'loading';
}
```

> **2026-08-15**: `submitting` and `submitted` both map to `generating`. During `submitting` the `session.id` is not yet available, so `ToolPageLayout` renders an inline "Preparazione in corso..." placeholder in the same container as the tracker; when the POST returns the real `InlineSessionTracker` replaces the placeholder without a layout jump. This eliminates the redundant double transition (a separate "Avvio in corso..." Card followed by the tracker).

| State | CTA Button | Panel |
|-------|-----------|-------|
| `loading` | — (spinner) | Loading |
| `setup` (configuring) | "Configure" (disabled) | SetupPanel |
| `setup` (ready) | **"Generate"** (enabled) | SetupPanel + KnowledgePanel |
| `generating` (submitting) | — (spinner) | Placeholder "Preparazione in corso..." (no session.id yet) |
| `generating` (submitted) | Cancel / "Nuova generazione" | `InlineSessionTracker` → `SessionTracker` |

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

**Post-submit components** (rendered by `SessionTracker` — consumed by both inline tool page and standalone [[Session List - Live Status]]): `FeedbackPanel`, `SessionSummary`, `CompletionBanner`, `ErrorPanel`.

## React Integration

```typescript
function ToolPageLayout({ workspaceId, toolKey }: Props) {
  const [state, send] = useMachine(toolPageMachine);

  // URL management: after submit, set ?s=sessionId (replaceState, no reload)
  // so a refresh resumes the inline session. Clear ?s= when the machine
  // leaves submitted (RESET → "Nuova generazione").
  useEffect(() => {
    if (state.matches('submitted') && state.context.session?.id) {
      const query = state.context.replayed
        ? `?s=${state.context.session.id}&replayed=true`
        : `?s=${state.context.session.id}`;
      window.history.replaceState(null, '', `${window.location.pathname}${query}`);
    }
    if (!state.matches('submitted') && !state.matches('submitting')) {
      const url = new URL(window.location.href);
      if (url.searchParams.has('s')) {
        url.searchParams.delete('s');
        url.searchParams.delete('replayed');
        window.history.replaceState(null, '', url.pathname);
      }
    }
  }, [state, state.context.session?.id, state.context.replayed]);

  const uiState = deriveUIState(state);
  const { tool, inputs, session } = state.context;

  if (uiState === 'loading') return <LoadingState />;
  if (uiState === 'setup' && tool) return (
    <SetupPanel tool={tool} inputs={inputs}
      onChange={(inputs) => send({ type: 'CONFIGURE', inputs })} />
  );

  // uiState === 'generating' — inline tracker (or placeholder while POST in flight)
  return session?.id ? (
    <InlineSessionTracker
      sessionId={session.id}
      initialSession={{ ...session, workspaceId, toolKey }}
      workspaceId={workspaceId}
      produces={tool?.label}
      onReset={() => send({ type: 'RESET' })}
    />
  ) : (
    <PreparingPlaceholder onRetry={() => send({ type: 'RESET' })} />
  );
}
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **One machine, 11 tools** | Same pattern as backend `sessionMachine`. Tool differences are configuration, not code |
| **Inline generation, no redirect** | `submitted` renders `InlineSessionTracker` → `SessionTracker` on the tool page. [[Session List - Live Status]] remains for deep-links. `submitting` and `submitted` share one `generating` UI state to avoid a redundant double transition (2026-08-15) |
| **`fromPromise` only** | Single HTTP POST call; no `fromCallback` needed since SSE is handled by `useSession` inside the tracker |
| **`submitted` + `RESET`** | `RESET` in `submitted` powers the "Nuova generazione" button, returning to `configuring` in-place |
| **State → UI derivation** | 5 machine states → 3 UI states (`loading`/`setup`/`generating`). `configuring` and `ready` both render `SetupPanel` but differ in CTA enabled state |
| **canSubmit guard** | Mirrors backend `ReadinessPolicy` exactly, including required asset checks by `assetType` |
| **Idempotent replay** | `submitSession` stores `replayed` flag from API response in context. `ToolPageLayout` appends `?replayed=true` to the URL; `SessionTracker` shows the replay banner |

## Sources

- [[sources/APP-CONCEPT]] — Registry-Driven Architecture, ToolPage
- [[sources/PRD]] — FR-U01 to FR-U04 (UI requirements)
- [[sources/USER-STORIES]] — US-GF01 to US-GF04 (workflow UX)
- [[Session Machine (XState v5)]] — backend equivalent machine
- [[Tool UX Architecture]] — inline generation UX, SessionTracker + InlineSessionTracker
- [[Session List - Live Status]] — standalone session deep-link page
- [[log]] — 2026-08-15: submitting→generating, placeholder merge, dead copy removal