export interface StepProgress {
  current: number;
  total: number;
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
      };
    }
  | {
      event: 'session_completed';
      data: {
        sessionId: string;
        status: 'completed';
        finalArtifactId: string;
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
