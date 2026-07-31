---
type: concept
tags:
  - wiki/concept
  - wiki/frontend
  - wiki/architecture
date_updated: 2026-07-31
source_count: 5
confidence: high
---

# ToolPage Machine (XState v5)

> Frontend state machine for the unified tool execution UI  
> `apps/frontend/src/machines/tool-page-machine.ts`  
> Component architecture: see [[Frontend Architecture]]

## Architecture

The `toolPageMachine` manages the complete lifecycle of a tool page: from input configuration through readiness validation, submission, real-time progress, to completion. It consumes domain types from `@flow-app/contracts` and communicates with the backend via HTTP + SSE.

**Principle**: one machine for all 11 tools. Differences are purely configuration — which `ToolDefinition` is loaded determines which inputs to show, how many steps to expect, and what CTA states to render.

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
│  draft-empty ──▶ configuring ──▶ ready ──▶ submitting          │
│                                                 │               │
│                                                 ▼               │
│                                              running ──▶ completed
│                                                 │         │     │
│                                                 ▼         ▼     │
│                                              failed    cancelled│
└───────────────────────────────────────────────────────────────┘
```

## Type Definitions

```typescript
// apps/frontend/src/machines/tool-page-machine.ts

import { setup, assign, fromPromise, fromCallback } from 'xstate';
import type { 
  ToolDefinition, 
  AssetType,
  AcquisitionInput,
  SessionDTO, 
  ArtifactDTO,
  StepProgress,
} from '@flow-app/contracts';

interface ToolPageContext {
  // Tool + workspace
  tool: ToolDefinition | null;
  workspaceId: string;

  // User inputs (acquisition data)
  inputs: {
    text: Record<string, string>;
    files: Record<string, File>;
    selectedAssetIds: string[];
    selectedAssetsByType: Partial<Record<AssetType, string>>;
  };

  // Server responses
  session: SessionDTO | null;
  artifacts: ArtifactDTO[];

  // Progress
  progress: StepProgress | null;
  error: { code: string; message: string } | null;
}

type ToolPageEvent =
  | { type: 'LOAD'; tool: ToolDefinition; workspaceId: string }
  | { type: 'CONFIGURE'; inputs: Partial<ToolPageContext['inputs']> }
  | { type: 'SUBMIT' }
  | { type: 'CANCEL' }
  | { type: 'SESSION_STARTED'; session: SessionDTO }
  | { type: 'STEP_COMPLETED'; artifact: ArtifactDTO; progress: StepProgress }
  | { type: 'SESSION_COMPLETED'; finalArtifact: ArtifactDTO }
  | { type: 'SESSION_FAILED'; error: { code: string; message: string } }
  | { type: 'RETRY' }
  | { type: 'RESET' };
```

## Machine Definition

```typescript
export const toolPageMachine = setup({
  types: {
    context: {} as ToolPageContext,
    events: {} as ToolPageEvent,
  },
  actors: {
    // POST /api/tools/:toolKey/sessions — start generation
    submitSession: fromPromise(async ({ context }: { context: ToolPageContext }) => {
      const response = await fetch(`/api/tools/${context.tool!.toolKey}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: context.workspaceId,
          inputs: context.inputs,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(JSON.stringify(error.error));
      }

      return (await response.json()).session as SessionDTO;
    }),

    // GET /api/sessions/:id/events — SSE progress stream
    subscribeToSSE: fromCallback<
      ToolPageEvent,
      { sessionId: string }
    >(({ input, sendBack }) => {
      const eventSource = new EventSource(`/api/sessions/${input.sessionId}/events`);

      eventSource.addEventListener('session_started', (e) => {
        sendBack({ type: 'SESSION_STARTED', session: JSON.parse(e.data) });
      });

      eventSource.addEventListener('step_completed', (e) => {
        const data = JSON.parse(e.data);
        sendBack({
          type: 'STEP_COMPLETED',
          artifact: data.artifact,
          progress: data.progress,
        });
      });

      eventSource.addEventListener('session_completed', (e) => {
        const data = JSON.parse(e.data);
        sendBack({ type: 'SESSION_COMPLETED', finalArtifact: data.artifact });
        eventSource.close();
      });

      eventSource.addEventListener('session_failed', (e) => {
        const data = JSON.parse(e.data);
        sendBack({ type: 'SESSION_FAILED', error: data.error });
        eventSource.close();
      });

      eventSource.onerror = () => {
        sendBack({
          type: 'SESSION_FAILED',
          error: { code: 'SSE_ERROR', message: 'Connection lost' },
        });
        eventSource.close();
      };

      return () => eventSource.close(); // cleanup
    }),
  },
  guards: {
    // Validate readiness — delegates to domain ReadinessPolicy (shared via contracts)
    canSubmit: ({ context }) => {
      if (!context.tool) return false;

      const acquisition = context.tool.acquisition;
      const requiredText   = acquisition.userText?.filter(t => t.required) ?? [];
      const requiredFiles  = acquisition.files?.filter(f => f.required) ?? [];
      const requiredAssets = acquisition.assets?.filter(a => a.required) ?? [];

      const textOk   = requiredText.every(t => context.inputs.text[t.key]?.trim());
      const filesOk  = requiredFiles.every(f => context.inputs.files[f.key]);
      const assetsOk = requiredAssets.every(
        (a) => !!context.inputs.selectedAssetsByType[a.assetType]
      );

      return textOk && filesOk && assetsOk;
    },
    isStillDraft: ({ context }) => {
      // No inputs configured — back to empty state
      return Object.keys(context.inputs.text).length === 0
          && Object.keys(context.inputs.files).length === 0;
    },
  },
  actions: {
    setTool: assign({
      tool: ({ event }) => (event as { tool: ToolDefinition }).tool,
      workspaceId: ({ event }) => (event as { workspaceId: string }).workspaceId,
      inputs: { text: {}, files: {}, selectedAssetIds: [], selectedAssetsByType: {} },
    }),
    updateInputs: assign({
      inputs: ({ context, event }) => {
        const { inputs } = event as { inputs: Partial<ToolPageContext['inputs']> };
        return {
            ...context.inputs,
            ...inputs,
            text: { ...context.inputs.text, ...(inputs.text ?? {}) },
            files: { ...context.inputs.files, ...(inputs.files ?? {}) },
            selectedAssetsByType: {
              ...context.inputs.selectedAssetsByType,
              ...(inputs.selectedAssetsByType ?? {}),
            },
          };
        },
    }),
    setSession: assign({
      session: ({ event }) => (event as { session: SessionDTO }).session,
    }),
    addArtifact: assign({
      artifacts: ({ context, event }) => {
        const { artifact } = event as { artifact: ArtifactDTO };
        return [...context.artifacts, artifact];
      },
    }),
    setProgress: assign({
      progress: ({ event }) => (event as { progress: StepProgress }).progress,
    }),
    setError: assign({
      error: ({ event }) => (event as { error: { code: string; message: string } }).error,
    }),
    setFinalArtifact: assign({
      artifacts: ({ context, event }) => {
        const { finalArtifact } = event as { finalArtifact: ArtifactDTO };
        return [...context.artifacts, finalArtifact];
      },
    }),
    reset: assign({
      session: null,
      artifacts: [],
      progress: null,
      error: null,
    }),
  },
}).createMachine({
  id: 'toolPage',
  initial: 'draftEmpty',
  context: {
    tool: null,
    workspaceId: '',
    inputs: { text: {}, files: {}, selectedAssetIds: [], selectedAssetsByType: {} },
    session: null,
    artifacts: [],
    progress: null,
    error: null,
  },
  states: {
    // 1. No tool loaded, no inputs
    draftEmpty: {
      on: {
        LOAD: {
          target: 'configuring',
          actions: 'setTool',
        },
      },
    },

    // 2. User configuring inputs
    configuring: {
      on: {
        CONFIGURE: {
          target: 'configuring',       // re-enter to re-evaluate guards
          actions: 'updateInputs',
        },
        RESET: {
          target: 'draftEmpty',
          guard: 'isStillDraft',
        },
      },
      always: [
        { target: 'ready', guard: 'canSubmit' },
      ],
    },

    // 3. All required inputs present — user can submit
    ready: {
      on: {
        CONFIGURE: {
          target: 'configuring',       // user changed something, re-evaluate
          actions: 'updateInputs',
        },
        SUBMIT: {
          target: 'submitting',
          actions: 'reset',            // clear previous run artifacts
        },
      },
    },

    // 4. HTTP POST in flight
    submitting: {
      invoke: {
        src: 'submitSession',
        onDone: {
          target: 'running',
          actions: 'setSession',
        },
        onError: {
          target: 'ready',             // stay ready — user can retry
          actions: setErrorFromEvent,
        },
      },
    },

    // 5. Generation in progress — SSE events drive transitions
    running: {
      invoke: {
        src: 'subscribeToSSE',
        input: ({ context }) => ({ sessionId: context.session!.id }),
      },
      on: {
        STEP_COMPLETED: {
          actions: ['addArtifact', 'setProgress'],
        },
        SESSION_COMPLETED: {
          target: 'completed',
          actions: ['setFinalArtifact', 'setProgress'],
        },
        SESSION_FAILED: {
          target: 'failed',
          actions: 'setError',
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },

    // 6. Successful completion
    completed: {
      on: {
        RETRY: {
          target: 'ready',             // go back to ready, user can resubmit
          actions: 'reset',
        },
        RESET: {
          target: 'draftEmpty',
        },
      },
    },

    // 7. Generation failed
    failed: {
      on: {
        RETRY: {
          target: 'submitting',        // retry the submit
          actions: 'reset',
        },
        RESET: {
          target: 'draftEmpty',
        },
      },
    },

    // 8. User cancelled
    cancelled: {
      on: {
        RETRY: {
          target: 'submitting',
          actions: 'reset',
        },
        RESET: {
          target: 'draftEmpty',
        },
      },
    },
  },
});
```

## React Integration

```typescript
// apps/frontend/src/components/ToolPage.tsx

import { useMachine } from '@xstate/react';
import { toolPageMachine } from '../machines/tool-page-machine';

function ToolPage({ toolKey, workspaceId }: Props) {
  const [state, send] = useMachine(toolPageMachine);

  // Load tool definition on mount
  useEffect(() => {
    const tool = toolRegistry[toolKey];
    send({ type: 'LOAD', tool, workspaceId });
  }, [toolKey, workspaceId]);

  // Derive UI from state
  const uiState = deriveUIState(state);

  return (
    <div className="tool-page">
      {uiState === 'setup' && (
        <SetupPanel
          tool={state.context.tool!}
          inputs={state.context.inputs}
          onChange={(inputs) => send({ type: 'CONFIGURE', inputs })}
          onSubmit={() => send({ type: 'SUBMIT' })}
          canSubmit={state.matches('ready')}
        />
      )}
      {uiState === 'progress' && (
        <FeedbackPanel
          artifacts={state.context.artifacts}
          progress={state.context.progress}
          onCancel={() => send({ type: 'CANCEL' })}
        />
      )}
      {uiState === 'completed' && (
        <SessionSummary
          artifacts={state.context.artifacts}
          onDownload={(id) => downloadArtifact(id)}
          onRetry={() => send({ type: 'RETRY' })}
        />
      )}
      {uiState === 'failed' && (
        <ErrorPanel
          error={state.context.error}
          onRetry={() => send({ type: 'RETRY' })}
        />
      )}
    </div>
  );
}
```

## State → UI Derivation

```typescript
type UIState = 'loading' | 'setup' | 'submitting' | 'progress' | 'completed' | 'failed' | 'cancelled';

function deriveUIState(state: Snapshot): UIState {
  if (state.matches('draftEmpty'))           return 'loading';
  if (state.matches('configuring'))          return 'setup';
  if (state.matches('ready'))                return 'setup';
  if (state.matches('submitting'))           return 'submitting';
  if (state.matches('running'))              return 'progress';
  if (state.matches('completed'))            return 'completed';
  if (state.matches('failed'))               return 'failed';
  if (state.matches('cancelled'))            return 'cancelled';
  return 'loading';
}
```

| State | CTA Button | Panel |
|-------|-----------|-------|
| `loading` | — (spinner) | Loading |
| `setup` (configuring) | "Configure" (disabled) | SetupPanel |
| `setup` (ready) | "Generate" (enabled) | SetupPanel + KnowledgePanel |
| `submitting` | — (spinner) | SetupPanel (disabled) |
| `progress` | "Cancel" | FeedbackPanel (cards) |
| `completed` | "Download" + "New" | SessionSummary + Download |
| `failed` | "Retry" | ErrorPanel + error message |
| `cancelled` | "Retry" | SetupPanel (restored) |

## Component Tree

```
ToolPage
├── KnowledgePanel           # Asset selection (available when ready)
│   └── AssetCard[]
├── SetupPanel               # Input fields + file upload
│   ├── TextField[]            # userText inputs
│   ├── FileUpload[]           # file inputs
│   └── SubmitButton           # CTA — enabled/disabled based on canSubmit
├── FeedbackPanel            # Step progress (visible during running)
│   ├── ProgressBar            # overall progress
│   └── StepCard[]             # per-step artifacts (animated)
├── SessionSummary           # Final result
│   ├── ArtifactPreview        # final artifact content
│   └── DownloadButton[]       # format: md, txt, docx, pdf
└── ErrorPanel               # Error state
    ├── ErrorMessage           # human-readable
    └── RetryButton
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **One machine, 11 tools** | Same pattern as backend `sessionMachine`. Tool differences are configuration, not code |
| **`fromCallback` for SSE** | SSE is a long-lived connection — `fromCallback` provides lifecycle management (open/close/error) |
| **`useMachine` hook** | Returns `[state, send, actor]` — simplest API for direct state access in React |
| **State → UI derivation** | 8 machine states map to 6 UI states. `configuring` and `ready` both render `SetupPanel` but differ in CTA enabled state |
| **canSubmit guard** | Mirrors backend `ReadinessPolicy` exactly, including required asset checks by `assetType` |
| **Readiness reason codes** | Canonical backend codes are rendered in FE (`ReadinessSnapshot`) with parity tests |
| **Retry flow** | `completed`/`failed`/`cancelled` → RETRY → `ready` or `submitting`. Preserves inputs, clears artifacts |

## Sources

- [[sources/APP-CONCEPT]] — Registry-Driven Architecture, ToolPage
- [[sources/PRD]] — FR-U01 to FR-U04 (UI requirements)
- [[sources/USER-STORIES]] — US-GF01 to US-GF04 (workflow UX)
- [[Session Machine (XState v5)]] — backend equivalent machine
- [[Tool UX Architecture]] — 4-phase lifecycle, always-on information pattern
