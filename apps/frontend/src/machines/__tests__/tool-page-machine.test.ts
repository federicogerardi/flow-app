import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createActor, waitFor } from 'xstate';
import { toolPageMachine } from '../tool-page-machine';
import type { ToolDefinition } from '../../tool-inputs';
import type { SessionDTO, ArtifactDTO } from '../../api/client';

// ── Fixtures ────────────────────────────────────────────────────────────────────

function mockToolDef(overrides?: Partial<ToolDefinition>): ToolDefinition {
  return {
    key: 'blog-post',
    label: 'Blog Post',
    textInputs: [{ key: 'topic', label: 'Topic', required: true }],
    fileInputs: [],
    assetInputs: [],
    creditCost: 1,
    stepCount: 5,
    ...overrides,
  };
}

function mockSession(overrides?: Partial<SessionDTO>): SessionDTO {
  return {
    id: 'sess-001',
    toolKey: 'blog-post',
    workspaceId: 'ws-1',
    status: 'running',
    stepCount: 5,
    createdAt: '2026-08-07T10:00:00.000Z',
    ...overrides,
  };
}

function mockArtifact(overrides?: Partial<ArtifactDTO>): ArtifactDTO {
  return {
    id: 'art-001',
    sessionId: 'sess-001',
    stepNumber: 1,
    status: 'completed',
    content: '# Generated content',
    createdAt: '2026-08-07T10:00:05.000Z',
    ...overrides,
  };
}

// ── Mock EventSource for jsdom ──────────────────────────────────────────────────

class MockEventSource {
  onerror: (() => void) | null = null;
  private listeners: Record<string, Array<(e: MessageEvent) => void>> = {};
  addEventListener(type: string, handler: (e: MessageEvent) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }
  close() { /* noop */ }
}

beforeAll(() => {
  (globalThis as any).EventSource = MockEventSource;
});

// ── Mock API client ─────────────────────────────────────────────────────────────

vi.mock('../../api/client', () => {
  const runningSession = {
    id: 'sess-001',
    toolKey: 'blog-post',
    workspaceId: 'ws-1',
    status: 'running',
    stepCount: 5,
    createdAt: '2026-08-07T10:00:00.000Z',
  };
  return {
    api: {
      startSession: vi.fn().mockResolvedValue({ session: runningSession, replayed: false }),
      getSession: vi.fn(),
    },
  };
});

import { api } from '../../api/client';

// ── Helper: drive machine to a specific state ───────────────────────────────────

async function goToRunning(actor: ReturnType<typeof createActor<typeof toolPageMachine>>) {
  vi.mocked(api.startSession).mockResolvedValue({
    session: mockSession({ status: 'running' }),
    replayed: false,
  });
  actor.send({ type: 'SUBMIT' });
  await waitFor(actor, (s) => s.value === 'running');
}

async function goToCompleted(actor: ReturnType<typeof createActor<typeof toolPageMachine>>) {
  vi.mocked(api.startSession).mockResolvedValue({
    session: mockSession({ status: 'completed' }),
    replayed: true,
  });
  actor.send({ type: 'SUBMIT' });
  await waitFor(actor, (s) => s.value === 'completed');
}

async function goToFailed(actor: ReturnType<typeof createActor<typeof toolPageMachine>>) {
  vi.mocked(api.startSession).mockResolvedValue({
    session: mockSession({ status: 'failed' }),
    replayed: true,
  });
  actor.send({ type: 'SUBMIT' });
  await waitFor(actor, (s) => s.value === 'failed');
}

/** Pre-configure actor in configuring state with filled required inputs */
function setupActor() {
  const actor = createActor(toolPageMachine);
  actor.start();
  actor.send({ type: 'LOAD', tool: mockToolDef(), workspaceId: 'ws-1' });
  actor.send({ type: 'CONFIGURE', inputs: { text: { topic: 'AI' } } });
  return actor;
}

// ── Tests ───────────────────────────────────────────────────────────────────────

describe('toolPageMachine', () => {
  describe('initial state', () => {
    it('starts in draftEmpty with null tool and empty inputs', () => {
      const actor = createActor(toolPageMachine);
      actor.start();
      const snap = actor.getSnapshot();
      expect(snap.value).toBe('draftEmpty');
      expect(snap.context.tool).toBeNull();
      expect(snap.context.inputs.text).toEqual({});
      expect(snap.context.inputs.files).toEqual({});
      expect(snap.context.inputs.selectedAssetIds).toEqual([]);
      expect(snap.context.session).toBeNull();
      expect(snap.context.artifacts).toEqual([]);
      expect(snap.context.progress).toBeNull();
      expect(snap.context.error).toBeNull();
    });
  });

  describe('LOAD transition', () => {
    it('LOAD transitions draftEmpty → configuring and sets tool + workspaceId', () => {
      const actor = createActor(toolPageMachine);
      actor.start();
      actor.send({ type: 'LOAD', tool: mockToolDef(), workspaceId: 'ws-1' });
      expect(actor.getSnapshot().value).toBe('configuring');
      expect(actor.getSnapshot().context.tool).toEqual(mockToolDef());
      expect(actor.getSnapshot().context.workspaceId).toBe('ws-1');
    });

    it('LOAD resets inputs to empty when entering configuring', () => {
      const actor = createActor(toolPageMachine);
      actor.start();
      actor.send({ type: 'LOAD', tool: mockToolDef(), workspaceId: 'ws-1' });
      expect(actor.getSnapshot().context.inputs.text).toEqual({});
    });
  });

  describe('CONFIGURE event', () => {
    it('CONFIGURE merges text inputs incrementally', () => {
      const actor = createActor(toolPageMachine);
      actor.start();
      actor.send({ type: 'LOAD', tool: mockToolDef(), workspaceId: 'ws-1' });
      actor.send({ type: 'CONFIGURE', inputs: { text: { topic: 'AI' } } });
      expect(actor.getSnapshot().context.inputs.text.topic).toBe('AI');

      actor.send({ type: 'CONFIGURE', inputs: { text: { language: 'en' } } });
      expect(actor.getSnapshot().context.inputs.text).toEqual({ topic: 'AI', language: 'en' });
    });

    it('CONFIGURE merges file inputs', () => {
      const actor = createActor(toolPageMachine);
      actor.start();
      actor.send({ type: 'LOAD', tool: mockToolDef({
        fileInputs: [{ key: 'brief', label: 'Brief', required: false, accept: ['.txt'] }],
      }), workspaceId: 'ws-1' });
      const f = new File(['content'], 'brief.txt');
      actor.send({ type: 'CONFIGURE', inputs: { files: { brief: f } } });
      expect(actor.getSnapshot().context.inputs.files.brief).toBe(f);
    });

    it('CONFIGURE merges asset selections', () => {
      const actor = createActor(toolPageMachine);
      actor.start();
      actor.send({ type: 'LOAD', tool: mockToolDef(), workspaceId: 'ws-1' });
      actor.send({ type: 'CONFIGURE', inputs: {
        selectedAssetIds: ['a-1'],
        selectedAssetsByType: { brief: ['a-1'] },
      } });
      expect(actor.getSnapshot().context.inputs.selectedAssetIds).toEqual(['a-1']);
      expect(actor.getSnapshot().context.inputs.selectedAssetsByType).toEqual({ brief: ['a-1'] });
    });
  });

  describe('canSubmit guard', () => {
    it('blocks SUBMIT when required text input is empty', () => {
      const tool = mockToolDef({ textInputs: [{ key: 'topic', label: 'Topic', required: true }] });
      const actor = createActor(toolPageMachine);
      actor.start();
      actor.send({ type: 'LOAD', tool, workspaceId: 'ws-1' });
      // topic is empty — guard fails
      actor.send({ type: 'SUBMIT' });
      expect(actor.getSnapshot().value).toBe('configuring');
    });

    it('allows SUBMIT when required text input is filled', () => {
      const tool = mockToolDef({ textInputs: [{ key: 'topic', label: 'Topic', required: true }] });
      const actor = createActor(toolPageMachine);
      actor.start();
      actor.send({ type: 'LOAD', tool, workspaceId: 'ws-1' });
      actor.send({ type: 'CONFIGURE', inputs: { text: { topic: 'AI' } } });
      actor.send({ type: 'SUBMIT' });
      expect(actor.getSnapshot().value).toBe('submitting');
    });

    it('blocks SUBMIT when required file is missing', () => {
      const tool = mockToolDef({
        fileInputs: [{ key: 'brief', label: 'Brief', accept: ['.txt'], required: true }],
      });
      const actor = createActor(toolPageMachine);
      actor.start();
      actor.send({ type: 'LOAD', tool, workspaceId: 'ws-1' });
      actor.send({ type: 'CONFIGURE', inputs: { text: { topic: 'AI' } } });
      actor.send({ type: 'SUBMIT' });
      expect(actor.getSnapshot().value).toBe('configuring');
    });

    it('allows SUBMIT when required file is provided', () => {
      const tool = mockToolDef({
        fileInputs: [{ key: 'brief', label: 'Brief', accept: ['.txt'], required: true }],
      });
      const actor = createActor(toolPageMachine);
      actor.start();
      actor.send({ type: 'LOAD', tool, workspaceId: 'ws-1' });
      actor.send({ type: 'CONFIGURE', inputs: {
        text: { topic: 'AI' },
        files: { brief: new File([''], 'brief.txt') },
      } });
      actor.send({ type: 'SUBMIT' });
      expect(actor.getSnapshot().value).toBe('submitting');
    });

    it('blocks SUBMIT when required asset is missing', () => {
      const tool = mockToolDef({
        assetInputs: [{ assetType: 'brief', required: true, multiple: false }],
      });
      const actor = createActor(toolPageMachine);
      actor.start();
      actor.send({ type: 'LOAD', tool, workspaceId: 'ws-1' });
      actor.send({ type: 'CONFIGURE', inputs: { text: { topic: 'AI' } } });
      actor.send({ type: 'SUBMIT' });
      expect(actor.getSnapshot().value).toBe('configuring');
    });

    it('allows SUBMIT when required asset is selected', () => {
      const tool = mockToolDef({
        assetInputs: [{ assetType: 'brief', required: true, multiple: false }],
      });
      const actor = createActor(toolPageMachine);
      actor.start();
      actor.send({ type: 'LOAD', tool, workspaceId: 'ws-1' });
      actor.send({ type: 'CONFIGURE', inputs: {
        text: { topic: 'AI' },
        selectedAssetsByType: { brief: ['asset-1'] },
        selectedAssetIds: ['asset-1'],
      } });
      actor.send({ type: 'SUBMIT' });
      expect(actor.getSnapshot().value).toBe('submitting');
    });

    it('canSubmit returns false when tool is null', () => {
      const actor = createActor(toolPageMachine);
      actor.start();
      // tool is null — SUBMIT from draftEmpty should not transition
      actor.send({ type: 'SUBMIT' });
      expect(actor.getSnapshot().value).toBe('draftEmpty');
    });
  });

  describe('isStillDraft guard', () => {
    it('RESET returns to draftEmpty when inputs are all empty', () => {
      const actor = createActor(toolPageMachine);
      actor.start();
      actor.send({ type: 'LOAD', tool: mockToolDef(), workspaceId: 'ws-1' });
      expect(actor.getSnapshot().value).toBe('configuring');
      actor.send({ type: 'RESET' });
      expect(actor.getSnapshot().value).toBe('draftEmpty');
    });

    it('RESET stays in configuring when text inputs present', () => {
      const actor = createActor(toolPageMachine);
      actor.start();
      actor.send({ type: 'LOAD', tool: mockToolDef(), workspaceId: 'ws-1' });
      actor.send({ type: 'CONFIGURE', inputs: { text: { topic: 'AI' } } });
      actor.send({ type: 'RESET' });
      expect(actor.getSnapshot().value).toBe('configuring');
    });

    it('RESET stays in configuring when files present', () => {
      const actor = createActor(toolPageMachine);
      actor.start();
      actor.send({ type: 'LOAD', tool: mockToolDef(), workspaceId: 'ws-1' });
      actor.send({ type: 'CONFIGURE', inputs: { files: { brief: new File([''], 'test.txt') } } });
      actor.send({ type: 'RESET' });
      expect(actor.getSnapshot().value).toBe('configuring');
    });
  });

  describe('SUBMIT — happy path', () => {
    it('SUBMIT transitions submitting → running when session is new', async () => {
      const actor = setupActor();
      await goToRunning(actor);
      expect(actor.getSnapshot().context.session?.id).toBe('sess-001');
      expect(actor.getSnapshot().context.session?.status).toBe('running');
    });
  });

  describe('SUBMIT — error handling', () => {
    it('returns to ready with error on QUOTA_EXCEEDED', async () => {
      vi.mocked(api.startSession).mockRejectedValue({
        code: 'QUOTA_EXCEEDED',
        message: 'Quota exceeded',
      });
      const actor = setupActor();
      actor.send({ type: 'SUBMIT' });
      await waitFor(actor, (s) => s.value === 'ready');
      expect(actor.getSnapshot().context.error).toEqual({
        code: 'QUOTA_EXCEEDED',
        message: 'Quota exceeded',
      });
    });

    it('defaults to SUBMIT_FAILED when error has no code', async () => {
      vi.mocked(api.startSession).mockRejectedValue(new Error('Network error'));
      const actor = setupActor();
      actor.send({ type: 'SUBMIT' });
      await waitFor(actor, (s) => s.value === 'ready');
      expect(actor.getSnapshot().context.error?.code).toBe('SUBMIT_FAILED');
    });
  });

  describe('SUBMIT — replayed sessions', () => {
    it('replayed completed → completed directly', async () => {
      const actor = setupActor();
      await goToCompleted(actor);
      expect(actor.getSnapshot().context.session?.status).toBe('completed');
    });

    it('replayed failed → failed with SESSION_FAILED error', async () => {
      const actor = setupActor();
      await goToFailed(actor);
      expect(actor.getSnapshot().context.error?.code).toBe('SESSION_FAILED');
    });

    it('replayed cancelled → failed with SESSION_CANCELLED error', async () => {
      vi.mocked(api.startSession).mockResolvedValue({
        session: mockSession({ status: 'cancelled' }),
        replayed: true,
      });
      const actor = setupActor();
      actor.send({ type: 'SUBMIT' });
      await waitFor(actor, (s) => s.value === 'failed');
      expect(actor.getSnapshot().context.error?.code).toBe('SESSION_CANCELLED');
    });
  });

  describe('running state events', () => {
    it('STEP_COMPLETED appends artifact and updates progress', async () => {
      const actor = setupActor();
      await goToRunning(actor);

      const artifact = mockArtifact({ id: 'art-1', stepNumber: 1 });
      actor.send({
        type: 'STEP_COMPLETED',
        artifact,
        progress: { current: 1, total: 5, label: 'Step 1' },
      });

      expect(actor.getSnapshot().context.artifacts).toHaveLength(1);
      expect(actor.getSnapshot().context.artifacts[0].id).toBe('art-1');
      expect(actor.getSnapshot().context.progress).toEqual({
        current: 1, total: 5, label: 'Step 1',
      });
    });

    it('STEP_COMPLETED accumulates multiple artifacts', async () => {
      const actor = setupActor();
      await goToRunning(actor);

      actor.send({ type: 'STEP_COMPLETED', artifact: mockArtifact({ id: 'art-1', stepNumber: 1 }), progress: { current: 1, total: 5 } });
      actor.send({ type: 'STEP_COMPLETED', artifact: mockArtifact({ id: 'art-2', stepNumber: 2 }), progress: { current: 2, total: 5 } });

      expect(actor.getSnapshot().context.artifacts).toHaveLength(2);
      expect(actor.getSnapshot().context.artifacts[0].id).toBe('art-1');
      expect(actor.getSnapshot().context.artifacts[1].id).toBe('art-2');
    });

    it('SESSION_COMPLETED transitions to completed and appends final artifact', async () => {
      const actor = setupActor();
      await goToRunning(actor);

      // Add a step artifact first
      actor.send({
        type: 'STEP_COMPLETED',
        artifact: mockArtifact({ id: 'art-step-1', stepNumber: 1 }),
        progress: { current: 1, total: 2 },
      });

      const finalArtifact = mockArtifact({ id: 'art-final', stepNumber: 2 });
      actor.send({ type: 'SESSION_COMPLETED', finalArtifact });

      expect(actor.getSnapshot().value).toBe('completed');
      expect(actor.getSnapshot().context.artifacts).toHaveLength(2);
      expect(actor.getSnapshot().context.artifacts[1].id).toBe('art-final');
    });

    it('SESSION_FAILED transitions to failed with error', async () => {
      const actor = setupActor();
      await goToRunning(actor);

      actor.send({
        type: 'SESSION_FAILED',
        error: { code: 'LLM_TIMEOUT', message: 'LLM call timed out' },
      });

      expect(actor.getSnapshot().value).toBe('failed');
      expect(actor.getSnapshot().context.error).toEqual({
        code: 'LLM_TIMEOUT',
        message: 'LLM call timed out',
      });
    });

    it('CANCEL transitions to cancelled', async () => {
      const actor = setupActor();
      await goToRunning(actor);

      actor.send({ type: 'CANCEL' });
      expect(actor.getSnapshot().value).toBe('cancelled');
    });
  });

  describe('terminal state transitions', () => {
    it('RETRY from completed → ready with reset context', async () => {
      const actor = setupActor();
      await goToCompleted(actor);
      actor.send({ type: 'RETRY' });

      expect(actor.getSnapshot().value).toBe('ready');
      expect(actor.getSnapshot().context.session).toBeNull();
      expect(actor.getSnapshot().context.artifacts).toEqual([]);
      expect(actor.getSnapshot().context.progress).toBeNull();
      expect(actor.getSnapshot().context.error).toBeNull();
    });

    it('RETRY from failed → submitting', async () => {
      const actor = setupActor();
      await goToFailed(actor);
      actor.send({ type: 'RETRY' });

      expect(actor.getSnapshot().value).toBe('submitting');
    });

    it('RETRY from cancelled → submitting', async () => {
      const actor = setupActor();
      await goToRunning(actor);
      actor.send({ type: 'CANCEL' });
      expect(actor.getSnapshot().value).toBe('cancelled');

      actor.send({ type: 'RETRY' });
      expect(actor.getSnapshot().value).toBe('submitting');
    });

    it('RESET from completed → draftEmpty (tool preserved, context reset)', async () => {
      const actor = setupActor();
      await goToCompleted(actor);
      actor.send({ type: 'RESET' });

      expect(actor.getSnapshot().value).toBe('draftEmpty');
      // RESET clears session/artifacts/progress/error but preserves tool
      expect(actor.getSnapshot().context.tool).toEqual(mockToolDef());
      expect(actor.getSnapshot().context.session).toBeNull();
      expect(actor.getSnapshot().context.artifacts).toEqual([]);
      expect(actor.getSnapshot().context.progress).toBeNull();
      expect(actor.getSnapshot().context.error).toBeNull();
    });

    it('RESET from failed → draftEmpty', async () => {
      const actor = setupActor();
      await goToFailed(actor);
      actor.send({ type: 'RESET' });

      expect(actor.getSnapshot().value).toBe('draftEmpty');
    });

    it('RESET from cancelled → draftEmpty', async () => {
      const actor = setupActor();
      await goToRunning(actor);
      actor.send({ type: 'CANCEL' });
      actor.send({ type: 'RESET' });

      expect(actor.getSnapshot().value).toBe('draftEmpty');
    });

    it('SUBMIT from ready → submitting', async () => {
      const actor = setupActor();
      // From configuring, fill required inputs → guard passes → SUBMIT transitions to submitting
      actor.send({ type: 'SUBMIT' });
      expect(actor.getSnapshot().value).toBe('submitting');
    });
  });
});