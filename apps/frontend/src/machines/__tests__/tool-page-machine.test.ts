import { describe, it, expect, vi } from 'vitest';
import { createActor, waitFor } from 'xstate';
import { toolPageMachine } from '../tool-page-machine';
import type { ToolDefinition } from '../../tool-inputs';
import type { SessionDTO } from '../../api/client';

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

/** Pre-configure actor with tool loaded and required input filled */
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
      expect(snap.context.replayed).toBe(false);
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

  describe('ready state', () => {
    it('CONFIGURE sends back to configuring', () => {
      const actor = setupActor();
      // After filling required input, should be in ready
      expect(actor.getSnapshot().value).toBe('ready');

      // Changing input sends back to configuring (guard re-evaluates)
      actor.send({ type: 'CONFIGURE', inputs: { text: { topic: '' } } });
      expect(actor.getSnapshot().value).toBe('configuring');
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

    it('RESET is a no-op when inputs present (machine already in ready)', () => {
      const actor = createActor(toolPageMachine);
      actor.start();
      actor.send({ type: 'LOAD', tool: mockToolDef(), workspaceId: 'ws-1' });
      actor.send({ type: 'CONFIGURE', inputs: { text: { topic: 'AI' } } });
      // After filling required input, auto-transitions to 'ready' via always guard
      expect(actor.getSnapshot().value).toBe('ready');
      // RESET from ready is a no-op — inputs are present, machine stays in ready
      actor.send({ type: 'RESET' });
      expect(actor.getSnapshot().value).toBe('ready');
    });
  });

  describe('SUBMIT — happy path', () => {
    it('SUBMIT transitions submitting → submitted and stores session', async () => {
      vi.mocked(api.startSession).mockResolvedValue({
        session: mockSession({ status: 'running' }),
        replayed: false,
      });
      const actor = setupActor();
      actor.send({ type: 'SUBMIT' });
      await waitFor(actor, (s) => s.matches('submitted'));
      expect(actor.getSnapshot().context.session?.id).toBe('sess-001');
      expect(actor.getSnapshot().context.session?.status).toBe('running');
    });

    it('SUBMIT resets inputs on successful submission', async () => {
      vi.mocked(api.startSession).mockResolvedValue({
        session: mockSession({ status: 'running' }),
        replayed: false,
      });
      const actor = setupActor();
      actor.send({ type: 'SUBMIT' });
      await waitFor(actor, (s) => s.matches('submitted'));
      // Inputs are reset to empty after successful submit
      expect(actor.getSnapshot().context.inputs.text).toEqual({});
    });

    it('stores replayed: true in context when API returns a replayed session', async () => {
      vi.mocked(api.startSession).mockResolvedValue({
        session: mockSession({ status: 'completed' }),
        replayed: true,
      });
      const actor = setupActor();
      actor.send({ type: 'SUBMIT' });
      await waitFor(actor, (s) => s.matches('submitted'));
      expect(actor.getSnapshot().context.replayed).toBe(true);
      expect(actor.getSnapshot().context.session?.status).toBe('completed');
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
      await waitFor(actor, (s) => s.matches('ready'));
      expect(actor.getSnapshot().context.error).toEqual({
        code: 'QUOTA_EXCEEDED',
        message: 'Quota exceeded',
      });
    });

    it('defaults to SUBMIT_FAILED when error has no code', async () => {
      vi.mocked(api.startSession).mockRejectedValue(new Error('Network error'));
      const actor = setupActor();
      actor.send({ type: 'SUBMIT' });
      await waitFor(actor, (s) => s.matches('ready'));
      expect(actor.getSnapshot().context.error?.code).toBe('SUBMIT_FAILED');
    });
  });
});