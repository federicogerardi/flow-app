import type { ArtifactDTO } from './session.dto';

export interface StepProgress {
  current: number;
  total: number;
  label?: string;
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
        artifact: ArtifactDTO;  // artifact content for live preview
      };
    }
  | {
      event: 'session_completed';
      data: {
        sessionId: string;
        status: 'completed';
        finalArtifact: ArtifactDTO;  // full artifact object (was finalArtifactId: string)
        completedAt: string;
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
