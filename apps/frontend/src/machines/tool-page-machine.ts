import { setup, assign, fromPromise } from 'xstate';
import type { ToolDefinition, TextInput, FileInput, AssetInput } from '../tool-inputs';
import { api } from '../api/client';
import type { SessionDTO } from '../api/client';

// ── Types ──────────────────────────────────────────────────────────────────────

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
  error: { code: string; message: string } | null;
}

// ── Events ─────────────────────────────────────────────────────────────────────

export type ToolPageEvent =
  | { type: 'LOAD'; tool: ToolDefinition; workspaceId: string }
  | { type: 'CONFIGURE'; inputs: Partial<ToolPageInputs> }
  | { type: 'SUBMIT' }
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
    error: null,
  },
  states: {
    // ── No tool loaded, no inputs ──────────────────────────────────────────────
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

    // ── User is filling inputs ─────────────────────────────────────────────────
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
      },
      always: [
        { target: 'ready', guard: 'canSubmit' },
      ],
    },

    // ── All required inputs filled — user can submit ───────────────────────────
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
            error: () => null,
          }),
        },
      },
    },

    // ── HTTP POST in flight ────────────────────────────────────────────────────
    submitting: {
      invoke: {
        src: 'submitSession',
        input: ({ context }) => ({
          toolKey: context.tool?.key ?? '',
          workspaceId: context.workspaceId,
          inputs: context.inputs,
        }),
        onDone: {
          target: 'submitted',
          actions: assign({
            session: ({ event }) => (event.output as { session: SessionDTO }).session,
            inputs: () => emptyInputs(),
          }),
        },
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

    // ── Session created — the ToolPageLayout navigates away immediately ────────
    submitted: {
      type: 'final',
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