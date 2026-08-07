import { describe, it, expect } from 'vitest';
import { Session, InvalidSessionStateError } from '../entities/Session';
import { Artifact } from '../entities/Artifact';
import { SessionStatus } from '../value-objects/SessionStatus';
import { ToolKey } from '../value-objects/ToolKey';

const makeSession = () =>
  Session.create(ToolKey.BlogPost, 'ws-1', 'user-1', 'idem-hash-1');

describe('Session', () => {
  describe('create', () => {
    it('should initialize with Draft status', () => {
      const session = makeSession();
      expect(session.status).toBe(SessionStatus.Draft);
    });

    it('should initialize with version 1', () => {
      const session = makeSession();
      expect(session.version).toBe(1);
    });

    it('should store toolKey', () => {
      const session = makeSession();
      expect(session.toolKey).toBe(ToolKey.BlogPost);
    });

    it('should store workspaceId', () => {
      const session = makeSession();
      expect(session.workspaceId).toBe('ws-1');
    });

    it('should store userId', () => {
      const session = makeSession();
      expect(session.userId).toBe('user-1');
    });

    it('should store idempotencyKeyHash', () => {
      const session = makeSession();
      expect(session.idempotencyKeyHash).toBe('idem-hash-1');
    });

    it('should initialize currentStepIndex at 0', () => {
      const session = makeSession();
      expect(session.currentStepIndex).toBe(0);
    });

    it('should initialize startedAt as null', () => {
      const session = makeSession();
      expect(session.startedAt).toBeNull();
    });

    it('should initialize completedAt as null', () => {
      const session = makeSession();
      expect(session.completedAt).toBeNull();
    });

    it('should initialize errorCode as null', () => {
      const session = makeSession();
      expect(session.errorCode).toBeNull();
    });

    it('should initialize errorMessage as null', () => {
      const session = makeSession();
      expect(session.errorMessage).toBeNull();
    });

    it('should initialize artifacts as empty', () => {
      const session = makeSession();
      expect(session.artifacts).toEqual([]);
    });
  });

  describe('reconstitute', () => {
    it('should pass through all fields', () => {
      const startedAt = new Date('2025-01-01');
      const completedAt = new Date('2025-01-02');
      const session = Session.reconstitute(
        'sess-1',
        ToolKey.AdCopy,
        'ws-2',
        'user-2',
        'hash-2',
        SessionStatus.Completed,
        3,
        startedAt,
        completedAt,
        null,
        null,
        5,
        [],
        new Date('2025-01-01'),
      );

      expect(session.sessionId).toBe('sess-1');
      expect(session.toolKey).toBe(ToolKey.AdCopy);
      expect(session.workspaceId).toBe('ws-2');
      expect(session.userId).toBe('user-2');
      expect(session.idempotencyKeyHash).toBe('hash-2');
      expect(session.status).toBe(SessionStatus.Completed);
      expect(session.currentStepIndex).toBe(3);
      expect(session.startedAt).toBe(startedAt);
      expect(session.completedAt).toBe(completedAt);
      expect(session.version).toBe(5);
    });
  });

  describe('apply — valid transitions', () => {
    it('should transition draft→ready on CONFIGURE and set startedAt', () => {
      const session = makeSession();
      session.apply({ type: 'CONFIGURE' });

      expect(session.status).toBe(SessionStatus.Ready);
      expect(session.startedAt).toBeInstanceOf(Date);
    });

    it('should transition ready→queued on QUEUE', () => {
      const session = makeSession();
      session.apply({ type: 'CONFIGURE' });
      session.apply({ type: 'QUEUE' });

      expect(session.status).toBe(SessionStatus.Queued);
    });

    it('should transition queued→running on WORKER_PICKUP', () => {
      const session = makeSession();
      session.apply({ type: 'CONFIGURE' });
      session.apply({ type: 'QUEUE' });
      session.apply({ type: 'WORKER_PICKUP' });

      expect(session.status).toBe(SessionStatus.Running);
    });

    it('should increment currentStepIndex and add artifact on ADD_ARTIFACT', () => {
      const session = makeSession();
      session.apply({ type: 'CONFIGURE' });
      session.apply({ type: 'QUEUE' });
      session.apply({ type: 'WORKER_PICKUP' });

      const artifact = Artifact.create(session.sessionId, 1, 'step 1 content');
      session.apply({ type: 'ADD_ARTIFACT', artifact, isLast: false, stepLabel: 'Step 1' });

      expect(session.currentStepIndex).toBe(1);
      expect(session.artifacts).toHaveLength(1);
      expect(session.artifacts[0]).toBe(artifact);
    });

    it('should transition running→completed on COMPLETE and return SessionCompleted event', () => {
      const session = makeSession();
      session.apply({ type: 'CONFIGURE' });
      session.apply({ type: 'QUEUE' });
      session.apply({ type: 'WORKER_PICKUP' });

      const event = session.apply({ type: 'COMPLETE' });

      expect(session.status).toBe(SessionStatus.Completed);
      expect(session.completedAt).toBeInstanceOf(Date);
      expect(event).not.toBeNull();
      expect(event!.eventType).toBe('SessionCompleted');
      expect(event!.aggregateId).toBe(session.sessionId);
    });

    it('should transition running→failed on FAIL and set error fields', () => {
      const session = makeSession();
      session.apply({ type: 'CONFIGURE' });
      session.apply({ type: 'QUEUE' });
      session.apply({ type: 'WORKER_PICKUP' });

      const event = session.apply({
        type: 'FAIL',
        errorCode: 'RATE_LIMIT',
        errorMessage: 'Too many requests',
      });

      expect(session.status).toBe(SessionStatus.Failed);
      expect(session.errorCode).toBe('RATE_LIMIT');
      expect(session.errorMessage).toBe('Too many requests');
      expect(session.completedAt).toBeInstanceOf(Date);
      expect(event).not.toBeNull();
      expect(event!.eventType).toBe('SessionFailed');
    });

    it('should transition ready→cancelled on CANCEL', () => {
      const session = makeSession();
      session.apply({ type: 'CONFIGURE' });

      const event = session.apply({ type: 'CANCEL' });

      expect(session.status).toBe(SessionStatus.Cancelled);
      expect(session.completedAt).toBeInstanceOf(Date);
      expect(event).not.toBeNull();
      expect(event!.eventType).toBe('SessionCancelled');
    });

    it('should transition queued→cancelled on CANCEL', () => {
      const session = makeSession();
      session.apply({ type: 'CONFIGURE' });
      session.apply({ type: 'QUEUE' });

      session.apply({ type: 'CANCEL' });

      expect(session.status).toBe(SessionStatus.Cancelled);
    });

    it('should transition running→cancelled on CANCEL', () => {
      const session = makeSession();
      session.apply({ type: 'CONFIGURE' });
      session.apply({ type: 'QUEUE' });
      session.apply({ type: 'WORKER_PICKUP' });

      session.apply({ type: 'CANCEL' });

      expect(session.status).toBe(SessionStatus.Cancelled);
    });
  });

  describe('apply — invalid transitions', () => {
    it('should throw InvalidSessionStateError for COMPLETE from draft', () => {
      const session = makeSession();

      expect(() => session.apply({ type: 'COMPLETE' })).toThrow(InvalidSessionStateError);
    });

    it('should throw InvalidSessionStateError for QUEUE from draft', () => {
      const session = makeSession();

      expect(() => session.apply({ type: 'QUEUE' })).toThrow(InvalidSessionStateError);
    });

    it('should throw InvalidSessionStateError for WORKER_PICKUP from draft', () => {
      const session = makeSession();

      expect(() => session.apply({ type: 'WORKER_PICKUP' })).toThrow(InvalidSessionStateError);
    });

    it('should throw InvalidSessionStateError for COMPLETE from completed', () => {
      const session = makeSession();
      session.apply({ type: 'CONFIGURE' });
      session.apply({ type: 'QUEUE' });
      session.apply({ type: 'WORKER_PICKUP' });
      session.apply({ type: 'COMPLETE' });

      expect(() => session.apply({ type: 'COMPLETE' })).toThrow(InvalidSessionStateError);
    });

    it('should throw InvalidSessionStateError for QUEUE from completed', () => {
      const session = makeSession();
      session.apply({ type: 'CONFIGURE' });
      session.apply({ type: 'QUEUE' });
      session.apply({ type: 'WORKER_PICKUP' });
      session.apply({ type: 'COMPLETE' });

      expect(() => session.apply({ type: 'QUEUE' })).toThrow(InvalidSessionStateError);
    });

    it('should throw InvalidSessionStateError for CONFIGURE from ready', () => {
      const session = makeSession();
      session.apply({ type: 'CONFIGURE' });

      expect(() => session.apply({ type: 'CONFIGURE' })).toThrow(InvalidSessionStateError);
    });
  });

  describe('version', () => {
    it('should increment on every apply', () => {
      const session = makeSession();
      expect(session.version).toBe(1);

      session.apply({ type: 'CONFIGURE' });
      expect(session.version).toBe(2);

      session.apply({ type: 'QUEUE' });
      expect(session.version).toBe(3);

      session.apply({ type: 'WORKER_PICKUP' });
      expect(session.version).toBe(4);

      const artifact = Artifact.create(session.sessionId, 1, 'content');
      session.apply({ type: 'ADD_ARTIFACT', artifact, isLast: true, stepLabel: 'Final' });
      expect(session.version).toBe(5);

      session.apply({ type: 'COMPLETE' });
      expect(session.version).toBe(6);
    });
  });
});
