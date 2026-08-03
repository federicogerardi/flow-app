import { describe, it, expect } from 'vitest';
import { SessionStatus } from '../value-objects/SessionStatus';
import { SessionLifecycle } from '../session-lifecycle';

describe('SessionLifecycle', () => {
  describe('initialState', () => {
    it('should be Draft', () => {
      expect(SessionLifecycle.initialState).toBe(SessionStatus.Draft);
    });
  });

  describe('getValidTransition', () => {
    describe('valid transitions', () => {
      it('should transition draft + CONFIGURE → ready', () => {
        const result = SessionLifecycle.getValidTransition(SessionStatus.Draft, 'CONFIGURE');
        expect(result?.value).toBe('ready');
      });

      it('should transition ready + QUEUE → queued', () => {
        const result = SessionLifecycle.getValidTransition(SessionStatus.Ready, 'QUEUE');
        expect(result?.value).toBe('queued');
      });

      it('should transition queued + WORKER_PICKUP → running', () => {
        const result = SessionLifecycle.getValidTransition(SessionStatus.Queued, 'WORKER_PICKUP');
        expect(result?.value).toBe('running');
      });

      it('should transition running + COMPLETE → completed', () => {
        const result = SessionLifecycle.getValidTransition(SessionStatus.Running, 'COMPLETE');
        expect(result?.value).toBe('completed');
      });

      it('should transition running + FAIL → failed', () => {
        const result = SessionLifecycle.getValidTransition(SessionStatus.Running, 'FAIL');
        expect(result?.value).toBe('failed');
      });

      it('should transition running + ADD_ARTIFACT → running', () => {
        const result = SessionLifecycle.getValidTransition(SessionStatus.Running, 'ADD_ARTIFACT');
        expect(result?.value).toBe('running');
      });

      it('should transition ready + CANCEL → cancelled', () => {
        const result = SessionLifecycle.getValidTransition(SessionStatus.Ready, 'CANCEL');
        expect(result?.value).toBe('cancelled');
      });

      it('should transition queued + CANCEL → cancelled', () => {
        const result = SessionLifecycle.getValidTransition(SessionStatus.Queued, 'CANCEL');
        expect(result?.value).toBe('cancelled');
      });

      it('should transition running + CANCEL → cancelled', () => {
        const result = SessionLifecycle.getValidTransition(SessionStatus.Running, 'CANCEL');
        expect(result?.value).toBe('cancelled');
      });
    });

    describe('invalid transitions return null', () => {
      it('should return null for draft + COMPLETE', () => {
        expect(SessionLifecycle.getValidTransition(SessionStatus.Draft, 'COMPLETE')).toBeNull();
      });

      it('should return null for draft + QUEUE', () => {
        expect(SessionLifecycle.getValidTransition(SessionStatus.Draft, 'QUEUE')).toBeNull();
      });

      it('should return null for completed + CONFIGURE', () => {
        expect(SessionLifecycle.getValidTransition(SessionStatus.Completed, 'CONFIGURE')).toBeNull();
      });

      it('should return null for failed + CANCEL', () => {
        expect(SessionLifecycle.getValidTransition(SessionStatus.Failed, 'CANCEL')).toBeNull();
      });

      it('should return null for cancelled + COMPLETE', () => {
        expect(SessionLifecycle.getValidTransition(SessionStatus.Cancelled, 'COMPLETE')).toBeNull();
      });

      it('should return null for draft + WORKER_PICKUP', () => {
        expect(SessionLifecycle.getValidTransition(SessionStatus.Draft, 'WORKER_PICKUP')).toBeNull();
      });

      it('should return null for completed + FAIL', () => {
        expect(SessionLifecycle.getValidTransition(SessionStatus.Completed, 'FAIL')).toBeNull();
      });
    });
  });

  describe('isFinalState', () => {
    it('should return true for completed', () => {
      expect(SessionLifecycle.isFinalState(SessionStatus.Completed)).toBe(true);
    });

    it('should return true for failed', () => {
      expect(SessionLifecycle.isFinalState(SessionStatus.Failed)).toBe(true);
    });

    it('should return true for cancelled', () => {
      expect(SessionLifecycle.isFinalState(SessionStatus.Cancelled)).toBe(true);
    });

    it('should return false for draft', () => {
      expect(SessionLifecycle.isFinalState(SessionStatus.Draft)).toBe(false);
    });

    it('should return false for ready', () => {
      expect(SessionLifecycle.isFinalState(SessionStatus.Ready)).toBe(false);
    });

    it('should return false for queued', () => {
      expect(SessionLifecycle.isFinalState(SessionStatus.Queued)).toBe(false);
    });

    it('should return false for running', () => {
      expect(SessionLifecycle.isFinalState(SessionStatus.Running)).toBe(false);
    });
  });
});
