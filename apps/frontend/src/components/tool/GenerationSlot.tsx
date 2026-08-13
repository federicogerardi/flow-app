import { Box } from '@mui/material';
import { FeedbackPanel } from './FeedbackPanel';
import { SessionSummary } from './SessionSummary';
import { CompletionBanner } from '../shared/CompletionBanner';
import { ErrorState } from '../ErrorState';
import { fadeSlideUp } from '../../shared/animations';
import { copy } from '@flow-app/copy';
import { isTerminalStatus, isCompletedStatus, isFailedStatus } from '../../shared/session-utils';
import type { StepProgress } from '../../api/hooks';
import type { ArtifactDTO } from '../../api/client';
import type { SessionStatusDTO } from '@flow-app/contracts';

interface GenerationSlotProps {
  status: SessionStatusDTO;
  progress: StepProgress | null;
  stepArtifacts: { stepNumber: number; content: string }[];
  startedAt: string | null;
  artifacts: ArtifactDTO[];
  workspaceId?: string;
  produces?: string;
  totalSteps: number;
  durationMs?: number;
  creditCost?: number;
  xpEarned?: number;
  onRetry?: () => void;
}

export function GenerationSlot({
  status, progress, stepArtifacts, startedAt,
  artifacts, workspaceId, produces, totalSteps,
  durationMs, creditCost, xpEarned, onRetry,
}: GenerationSlotProps) {
  const isTerminal = isTerminalStatus(status);
  const isCompleted = isCompletedStatus(status);
  const isFailed = isFailedStatus(status);

  return (
    <Box>
      <Box
        role="status"
        aria-live="polite"
        aria-hidden={isTerminal}
        sx={{
          display: 'grid',
          gridTemplateRows: isTerminal ? '0fr' : '1fr',
          overflow: 'hidden',
          opacity: isTerminal ? 0 : 1,
          transition: 'grid-template-rows 400ms ease-out, opacity 400ms ease-out',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      >
        <Box sx={{ minHeight: 0, overflow: 'hidden' }}>
          <FeedbackPanel
            progress={progress}
            status={status}
            startedAt={startedAt}
            isTerminal={isTerminal}
            artifacts={stepArtifacts.map((a) => ({
              id: `step-${a.stepNumber}`,
              stepNumber: a.stepNumber,
              content: a.content,
            } as ArtifactDTO))}
            totalSteps={totalSteps}
            layoutMode="side-by-side"
          />
        </Box>
      </Box>

      {isCompleted && durationMs != null && (
        <Box
          sx={{
            animation: `${fadeSlideUp} 500ms ease-out both`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <CompletionBanner
            durationSeconds={Math.round(durationMs / 1000)}
            stepCount={totalSteps}
            creditCost={creditCost ?? 0}
            xpEarned={xpEarned}
          />
        </Box>
      )}

      {isCompleted && artifacts.length > 0 && (
        <Box
          sx={{
            animation: `${fadeSlideUp} 500ms ease-out 300ms both`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <SessionSummary
            artifacts={artifacts}
            workspaceId={workspaceId}
            produces={produces}
          />
        </Box>
      )}

      {isFailed && (
        <Box
          sx={{
            animation: `${fadeSlideUp} 500ms ease-out 300ms both`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <ErrorState
            message={copy.t('errors.generation.failed')}
            onRetry={onRetry}
          />
        </Box>
      )}
    </Box>
  );
}
