import type { ArtifactStatusValue } from '@flow-app/domain';

/**
 * Progress snapshot embedded in `step_completed` SSE events.
 *
 * `completedCount` is a COUNT of completed steps (0 = none). The step at
 * index === completedCount is "awaiting execution". The backend worker
 * publishes this exact shape (`session-worker.ts`), so the field name must
 * stay in sync with the runtime payload.
 */
export interface StepProgress {
  completedCount: number;
  total: number;
}

/**
 * Artifact shape carried inside SSE events. This is a REDUCED subset of the
 * full `ArtifactDTO` — the SSE payload omits `stepLabel` and `promotedAssetId`
 * (the label travels at the top level of `step_completed`, not inside the
 * artifact object).
 */
export interface SSEArtifact {
  id: string;
  stepNumber: number;
  status: ArtifactStatusValue;
  createdAt: string;
  sessionId: string;
  content: string;
}

export type SSEEvent =
  | {
      event: 'session_started';
      data: { sessionId: string; status: 'running'; startedAt: string };
    }
  | {
      event: 'step_completed';
      data: {
        sessionId: string;
        stepNumber: number;
        stepLabel: string;
        progress: StepProgress;
        artifact: SSEArtifact; // artifact content for live preview
      };
    }
  | {
      event: 'session_completed';
      data: {
        sessionId: string;
        status: 'completed';
        /** Undefined when the session completed with no artifacts (edge case). */
        finalArtifact?: SSEArtifact;
        /** Undefined when `completedAt` was never set (e.g. cancelled mid-flight). */
        completedAt?: string;
      };
    }
  | {
      event: 'session_failed';
      data: {
        sessionId: string;
        status: 'failed';
        failedAtStep: number;
        error: { code: string; message: string };
      };
    };
