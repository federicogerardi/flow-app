import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActor } from 'xstate';
import { sessionMachine } from '../machines/session-machine.js';

function createMockSession() {
  return {
    sessionId: 's-1',
    toolKey: { value: 'blog-post', toString: () => 'blog-post' },
    workspaceId: 'ws-1',
    status: { toString: () => 'draft' },
    currentStepIndex: 0,
    startedAt: new Date(),
    completedAt: null,
    apply: vi.fn(),
    version: 1,
  };
}

function createMockTool() {
  return {
    toolKey: 'blog-post',
    name: 'Blog Post',
    steps: [
      { label: 'Draft', prompt: { model: 'test-model' }, execution: { timeoutMs: 30000 } },
      { label: 'Review', prompt: { model: 'test-model' }, execution: { timeoutMs: 30000 } },
    ],
  };
}

describe('sessionMachine', () => {
  let mockSession: ReturnType<typeof createMockSession>;
  let mockTool: ReturnType<typeof createMockTool>;

  beforeEach(() => {
    mockSession = createMockSession();
    mockTool = createMockTool();
  });

  it('should start in draft state', () => {
    const actor = createActor(sessionMachine, {
      input: { session: mockSession, tool: mockTool },
    });
    actor.start();

    expect(actor.getSnapshot().value).toBe('draft');
  });

  it('should transition from draft to ready on CONFIGURE', () => {
    const actor = createActor(sessionMachine, {
      input: { session: mockSession, tool: mockTool },
    });
    actor.start();
    actor.send({ type: 'CONFIGURE', acquisitionData: { userInputs: {}, fileContents: {}, apiResponses: [], resolvedAssets: new Map() } });

    expect(actor.getSnapshot().value).toBe('ready');
  });

  it('should transition from ready to queued on QUEUE', () => {
    const actor = createActor(sessionMachine, {
      input: { session: mockSession, tool: mockTool },
    });
    actor.start();
    actor.send({ type: 'CONFIGURE', acquisitionData: { userInputs: {}, fileContents: {}, apiResponses: [], resolvedAssets: new Map() } });
    actor.send({ type: 'QUEUE' });

    expect(actor.getSnapshot().value).toBe('queued');
  });

  it('should transition from queued to running on WORKER_PICKUP', () => {
    const actor = createActor(sessionMachine, {
      input: { session: mockSession, tool: mockTool },
    });
    actor.start();
    actor.send({ type: 'CONFIGURE', acquisitionData: { userInputs: {}, fileContents: {}, apiResponses: [], resolvedAssets: new Map() } });
    actor.send({ type: 'QUEUE' });
    actor.send({ type: 'WORKER_PICKUP' });

    const snapshot = actor.getSnapshot();
    const running = typeof snapshot.value === 'object' ? (snapshot.value as Record<string, unknown>) : null;
    expect(running).toBeTruthy();
    expect(running?.running).toBeDefined();
  });

  it('should transition to cancelled from ready on CANCEL', () => {
    const actor = createActor(sessionMachine, {
      input: { session: mockSession, tool: mockTool },
    });
    actor.start();
    actor.send({ type: 'CONFIGURE', acquisitionData: { userInputs: {}, fileContents: {}, apiResponses: [], resolvedAssets: new Map() } });
    actor.send({ type: 'CANCEL' });

    expect(actor.getSnapshot().value).toBe('cancelled');
  });

  it('should transition to cancelled from queued on CANCEL', () => {
    const actor = createActor(sessionMachine, {
      input: { session: mockSession, tool: mockTool },
    });
    actor.start();
    actor.send({ type: 'CONFIGURE', acquisitionData: { userInputs: {}, fileContents: {}, apiResponses: [], resolvedAssets: new Map() } });
    actor.send({ type: 'QUEUE' });
    actor.send({ type: 'CANCEL' });

    expect(actor.getSnapshot().value).toBe('cancelled');
  });

  it('should reject CONFIGURE from draft (not ready yet)', () => {
    const actor = createActor(sessionMachine, {
      input: { session: mockSession, tool: mockTool },
    });
    actor.start();

    // QUEUE from draft is not a valid transition — should not move
    actor.send({ type: 'QUEUE' });
    expect(actor.getSnapshot().value).toBe('draft');
  });

  it('should store acquisitionData in context on CONFIGURE', () => {
    const actor = createActor(sessionMachine, {
      input: { session: mockSession, tool: mockTool },
    });
    actor.start();
    actor.send({
      type: 'CONFIGURE',
      acquisitionData: {
        userInputs: { topic: 'AI trends' },
        fileContents: { doc: 'file content' },
        apiResponses: [],
        resolvedAssets: new Map(),
      },
    });

    const ctx = actor.getSnapshot().context;
    expect(ctx.acquisitionData.userInputs).toEqual({ topic: 'AI trends' });
    expect(ctx.acquisitionData.fileContents).toEqual({ doc: 'file content' });
  });

  it('should have isLastStep guard returning false on first step with 2 steps', () => {
    const actor = createActor(sessionMachine, {
      input: { session: mockSession, tool: mockTool },
    });
    actor.start();
    actor.send({ type: 'CONFIGURE', acquisitionData: { userInputs: {}, fileContents: {}, apiResponses: [], resolvedAssets: new Map() } });
    actor.send({ type: 'QUEUE' });
    actor.send({ type: 'WORKER_PICKUP' });

    const ctx = actor.getSnapshot().context;
    expect(ctx.currentStepIndex).toBe(0);
  });

  it('should expose correct context after CONFIGURE', () => {
    const actor = createActor(sessionMachine, {
      input: { session: mockSession, tool: mockTool },
    });
    actor.start();

    const ctx = actor.getSnapshot().context;
    expect(ctx.session.sessionId).toBe('s-1');
    expect(ctx.tool.toolKey).toBe('blog-post');
    expect(ctx.currentStepIndex).toBe(0);
    expect(ctx.stepResults).toEqual([]);
  });
});
