import { setup, assign, fromPromise, fromCallback } from 'xstate';
import type { ToolDefinition, TextInput, FileInput, AssetInput } from '../tool-inputs';
import { api } from '../api/client';
import type { SessionDTO, ArtifactDTO } from '../api/client';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StepProgress {
  current: number;
  total: number;
  label?: string;
}

export interface ToolPageInputs {
  text: Record<string, string>;
  files: Record<string, File>;
  selectedAssetIds: string[];
  selectedAssetsByType: Partial<Record<string, string[]>>;
}

export interface ToolPageContext {
  tool: ToolDefinition | null;
  workspaceId: string;
  inputs: ToolPageInputs;
  session: SessionDTO | null;
  artifacts: ArtifactDTO[];
  progress: StepProgress | null;
  error: { code: string; message: string } | null;
}

// ── Events ─────────────────────────────────────────────────────────────────────

export type ToolPageEvent =
  | { type: 'LOAD'; tool: ToolDefinition; workspaceId: string }
  | { type: 'CONFIGURE'; inputs: Partial<ToolPageInputs> }
  | { type: 'SUBMIT' }
  | { type: 'CANCEL' }
  | { type: 'SESSION_STARTED'; session: SessionDTO }
  | { type: 'STEP_COMPLETED'; artifact: ArtifactDTO; progress: StepProgress }
  | { type: 'SESSION_COMPLETED'; finalArtifact: ArtifactDTO }
  | { type: 'SESSION_FAILED'; error: { code: string; message: string } }
  | { type: 'RETRY' }
  | { type: 'RESET' };

// ── Helpers ────────────────────────────────────────────────────────────────────

function deepMergeInputs(base: ToolPageInputs, patch: Partial<ToolPageInputs>): ToolPageInputs {
  return {
    text: { ...base.text, ...patch.text },
    files: { ...base.files, ...patch.files },
    selectedAssetIds: patch.selectedAssetIds ?? base.selectedAssetIds,
    selectedAssetsByType: { ...base.selectedAssetsByType, ...patch.selectedAssetsByType },
  };
}

function emptyInputs(): ToolPageInputs {
  return {
    text: {},
    files: {},
    selectedAssetIds: [],
    selectedAssetsByType: {},
  };
}

function canSubmitGuard({ context }: { context: ToolPageContext }): boolean {
  const { tool, inputs } = context;
  if (!tool) return false;

  // Check required text inputs
  for (const def of (tool.textInputs ?? []).filter((d: TextInput) => d.required)) {
    if (!inputs.text[def.key]?.trim()) return false;
  }

  // Check required file inputs
  for (const def of (tool.fileInputs ?? []).filter((d: FileInput) => d.required)) {
    if (!inputs.files[def.key]) return false;
  }

  // Check required asset inputs
  for (const def of (tool.assetInputs ?? []).filter((d: AssetInput) => d.required)) {
    const selectedOfType = inputs.selectedAssetsByType[def.assetType];
    if (!selectedOfType || selectedOfType.length === 0) return false;
  }

  return true;
}

function isStillDraftGuard({ context }: { context: ToolPageContext }): boolean {
  const hasText = Object.values(context.inputs.text).some((v) => v.trim());
  const hasFiles = Object.keys(context.inputs.files).length > 0;
  const hasAssets = context.inputs.selectedAssetIds.length > 0;
  return !hasText && !hasFiles && !hasAssets;
}

// ── Machine ────────────────────────────────────────────────────────────────────

export const toolPageMachine = setup({
  types: {
    context: {} as ToolPageContext,
    events: {} as ToolPageEvent,
  },
  actors: {
    submitSession: fromPromise(async ({ input }: { input: { toolKey: string; workspaceId: string; inputs: ToolPageInputs } }) => {
      // Read file contents for API submission
      const fileContents: { key: string; content: string }[] = [];
      for (const [key, file] of Object.entries(input.inputs.files)) {
        try {
          const content = await readFileContent(file);
          fileContents.push({ key, content });
        } catch {
          // File read failed — submit without this file
        }
      }

      const result = await api.startSession(input.toolKey, {
        workspaceId: input.workspaceId,
        inputs: {
          text: input.inputs.text,
          files: fileContents.length > 0 ? fileContents : undefined,
          selectedAssets: input.inputs.selectedAssetIds.length > 0 ? input.inputs.selectedAssetIds : undefined,
        },
      });

      return result;
    }),

    subscribeToSSE: fromCallback(({ sendBack, input }: { sendBack: (event: ToolPageEvent) => void; input: { sessionId: string } }) => {
      const { sessionId } = input;

      const source = new EventSource(`/api/sessions/${sessionId}/events`, {
        withCredentials: true,
      });

      source.addEventListener('step_completed', (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        sendBack({
          type: 'STEP_COMPLETED',
          artifact: data.artifact ?? { id: `step-${data.stepNumber}`, stepNumber: data.stepNumber, status: 'completed', createdAt: new Date().toISOString(), sessionId, content: '' },
          progress: data.progress,
        });
      });

      source.addEventListener('session_completed', (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        sendBack({
          type: 'SESSION_COMPLETED',
          finalArtifact: data.finalArtifact ?? { id: data.finalArtifactId, stepNumber: 0, status: 'completed', createdAt: data.completedAt, sessionId, content: '' },
        });
        source.close();
      });

      source.addEventListener('session_failed', (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        sendBack({
          type: 'SESSION_FAILED',
          error: data.error ?? { code: 'UNKNOWN', message: 'Session failed' },
        });
        source.close();
      });

      source.onerror = () => {
        source.close();
      };

      return () => {
        source.close();
      };
    }),
  },
  guards: {
    canSubmit: canSubmitGuard,
    isStillDraft: isStillDraftGuard,
  },
}).createMachine({
  id: 'toolPage',
  initial: 'draftEmpty',
  context: {
    tool: null,
    workspaceId: '',
    inputs: emptyInputs(),
    session: null,
    artifacts: [],
    progress: null,
    error: null,
  },
  states: {
    draftEmpty: {
      on: {
        LOAD: {
          target: 'configuring',
          actions: assign({
            tool: ({ event }) => event.tool,
            workspaceId: ({ event }) => event.workspaceId,
            inputs: () => emptyInputs(),
          }),
        },
      },
    },

    configuring: {
      on: {
        CONFIGURE: {
          actions: assign({
            inputs: ({ context, event }) => deepMergeInputs(context.inputs, event.inputs),
          }),
        },
        RESET: {
          guard: 'isStillDraft',
          target: 'draftEmpty',
        },
        SUBMIT: {
          guard: 'canSubmit',
          target: 'submitting',
          actions: assign({
            session: () => null,
            artifacts: () => [],
            progress: () => null,
            error: () => null,
          }),
        },
      },
    },

    ready: {
      on: {
        CONFIGURE: {
          target: 'configuring',
          actions: assign({
            inputs: ({ context, event }) => deepMergeInputs(context.inputs, event.inputs),
          }),
        },
        SUBMIT: {
          target: 'submitting',
          actions: assign({
            session: () => null,
            artifacts: () => [],
            progress: () => null,
            error: () => null,
          }),
        },
      },
    },

    submitting: {
      invoke: {
        src: 'submitSession',
        input: ({ context }) => ({
          toolKey: context.tool?.key ?? '',
          workspaceId: context.workspaceId,
          inputs: context.inputs,
        }),
        onDone: [
          {
            target: 'completed',
            guard: ({ event }) => {
              const output = event.output as { session: SessionDTO; replayed: boolean };
              return !!output.replayed && output.session.status === 'completed';
            },
            actions: assign({
              session: ({ event }) => (event.output as { session: SessionDTO }).session,
            }),
          },
          {
            target: 'failed',
            guard: ({ event }) => {
              const output = event.output as { session: SessionDTO; replayed: boolean };
              return !!output.replayed && (output.session.status === 'failed' || output.session.status === 'cancelled');
            },
            actions: assign({
              session: ({ event }) => (event.output as { session: SessionDTO }).session,
              error: ({ event }) => {
                const output = event.output as { session: SessionDTO };
                return output.session.status === 'failed'
                  ? { code: 'SESSION_FAILED', message: 'Session previously failed' }
                  : { code: 'SESSION_CANCELLED', message: 'Session was cancelled' };
              },
            }),
          },
          {
            target: 'running',
            actions: assign({
              session: ({ event }) => (event.output as { session: SessionDTO }).session,
            }),
          },
        ],
        onError: {
          target: 'ready',
          actions: assign({
            error: ({ event }) => {
              const err = event.error as { code?: string; message?: string } | undefined;
              return {
                code: err?.code ?? 'SUBMIT_FAILED',
                message: err?.message ?? 'Failed to start session',
              };
            },
          }),
        },
      },
    },

    running: {
      invoke: {
        src: 'subscribeToSSE',
        input: ({ context }) => ({
          sessionId: context.session?.id ?? '',
        }),
      },
      on: {
        STEP_COMPLETED: {
          actions: assign({
            artifacts: ({ context, event }) => [...context.artifacts, event.artifact],
            progress: ({ event }) => event.progress,
          }),
        },
        SESSION_COMPLETED: {
          target: 'completed',
          actions: assign({
            artifacts: ({ context, event }) => [...context.artifacts, event.finalArtifact],
          }),
        },
        SESSION_FAILED: {
          target: 'failed',
          actions: assign({
            error: ({ event }) => event.error,
          }),
        },
        CANCEL: 'cancelled',
      },
    },

    completed: {
      on: {
        RETRY: {
          target: 'ready',
          actions: assign({
            session: () => null,
            artifacts: () => [],
            progress: () => null,
            error: () => null,
          }),
        },
        RESET: {
          target: 'draftEmpty',
          actions: assign({
            session: () => null,
            artifacts: () => [],
            progress: () => null,
            error: () => null,
          }),
        },
      },
    },

    failed: {
      on: {
        RETRY: {
          target: 'submitting',
          actions: assign({
            session: () => null,
            artifacts: () => [],
            progress: () => null,
            error: () => null,
          }),
        },
        RESET: {
          target: 'draftEmpty',
          actions: assign({
            session: () => null,
            artifacts: () => [],
            progress: () => null,
            error: () => null,
          }),
        },
      },
    },

    cancelled: {
      on: {
        RETRY: {
          target: 'submitting',
          actions: assign({
            session: () => null,
            artifacts: () => [],
            progress: () => null,
            error: () => null,
          }),
        },
        RESET: {
          target: 'draftEmpty',
          actions: assign({
            session: () => null,
            artifacts: () => [],
            progress: () => null,
            error: () => null,
          }),
        },
      },
    },
  },
});

// ── Utility ────────────────────────────────────────────────────────────────────

function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
