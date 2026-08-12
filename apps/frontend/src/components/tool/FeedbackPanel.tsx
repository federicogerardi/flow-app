import { Box, Typography, LinearProgress, Stack, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { copy } from '@flow-app/copy';
import { useEffect, useRef, useState } from 'react';
import type { ArtifactDTO } from '../../api/client';
import { slideInFade, stepPulse } from '../../shared/animations';

interface StepProgressData {
  current: number;
  total: number;
}

interface FeedbackPanelProps {
  progress: StepProgressData | null;
  status: string;
  artifacts?: ArtifactDTO[];
  startedAt?: string | null;
  layoutMode?: 'compact' | 'side-by-side';
  totalSteps?: number;
}

function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number>(null);

  useEffect(() => {
    const tick = () => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [startedAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <Typography variant="body2" color="text.secondary" role="timer" aria-label={copy.t('toolPage.progress.elapsedTime', { mins: String(mins), secs: String(secs) })}>
      {mins}:{secs.toString().padStart(2, '0')}
    </Typography>
  );
}

function StepIndicator({ index, isCompleted, isActive, total, artifactPreview }: { index: number; isCompleted: boolean; isActive: boolean; total: number; artifactPreview?: string }) {
  const stepParams = { current: String(index + 1), total: String(total) };
  const ariaLabel = isCompleted
    ? copy.t('toolPage.progress.stepCompleted', stepParams)
    : isActive
      ? copy.t('toolPage.progress.stepActive', stepParams)
      : copy.t('toolPage.progress.stepPending', stepParams);

  return (
    <Box
      role="listitem"
      aria-label={ariaLabel}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1.5,
        px: 2,
        borderRadius: 1,
        bgcolor: isActive ? 'action.selected' : 'transparent',
        opacity: isCompleted || isActive ? 1 : 0.4,
        animation: isCompleted
          ? `${slideInFade} 300ms ease-out`
          : isActive
            ? `${stepPulse} 1.5s ease-in-out infinite`
            : 'none',
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
        },
      }}
    >
      {isCompleted ? (
        <CheckCircleIcon color="success" fontSize="small" />
      ) : isActive ? (
        <Box sx={{ position: 'relative', width: 20, height: 20 }}>
          <LinearProgress
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              '& .MuiLinearProgress-bar': { borderRadius: '50%' },
            }}
          />
        </Box>
      ) : (
        <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
      )}
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="body2"
          fontWeight={isActive ? 600 : 400}
          color={isCompleted ? 'success.main' : isActive ? 'text.primary' : 'text.disabled'}
        >
          {artifactPreview
            ? artifactPreview
            : copy.t('toolPage.progress.stepLabel', { current: String(index + 1), total: String(total) })}
        </Typography>
        {isCompleted && artifactPreview && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', fontStyle: 'italic', mt: 0.25, animation: `${slideInFade} 300ms ease-out` }}
          >
            {artifactPreview}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export function FeedbackPanel({ progress, status, artifacts = [], startedAt, layoutMode = 'compact', totalSteps }: FeedbackPanelProps) {
  const timerStartMs = startedAt ? new Date(startedAt).getTime() : Date.now();

  if (!progress) {
    const isQueued = status === 'queued' || status === 'draft';

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
        {totalSteps != null && totalSteps > 1 && (
          <Chip
            label={copy.t('toolPage.progress.stepCount', { count: String(totalSteps) })}
            size="small"
            variant="outlined"
            color="primary"
            sx={{ mb: 2 }}
          />
        )}
        <LinearProgress
          sx={{ width: '60%', mb: 2 }}
          aria-label={isQueued ? copy.t('toolPage.progress.queued') : copy.t('toolPage.progress.starting')}
        />
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {isQueued ? copy.t('toolPage.progress.queued') : copy.t('toolPage.progress.starting')}
        </Typography>
        {isQueued && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            {copy.t('toolPage.progress.queuedHint')}
          </Typography>
        )}
      </Box>
    );
  }

  const stepList = (
    <Stack spacing={0.5}>
      {Array.from({ length: progress.total }, (_, i) => {
        const artifact = artifacts.find((a) => a.stepNumber === i + 1);
        return (
          <StepIndicator
            key={i}
            index={i}
            isCompleted={i < progress.current}
            isActive={i === progress.current}
            total={progress.total}
            artifactPreview={artifact?.content?.slice(0, 150)}
          />
        );
      })}
    </Stack>
  );

  const latestArtifact = artifacts.length > 0 ? artifacts[artifacts.length - 1] : null;

  return (
    <Box role="status" aria-live="polite">
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="body2" fontWeight={600}>
            {copy.t('toolPage.progress.title')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {progress.current}/{progress.total}
            </Typography>
            <ElapsedTimer startedAt={timerStartMs} />
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={(progress.current / progress.total) * 100}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'action.hover',
          }}
          aria-label={copy.t('toolPage.progress.ariaLabel', {
            current: String(progress.current),
            total: String(progress.total),
          })}
        />
      </Box>

      {layoutMode === 'side-by-side' ? (
        <Box sx={{ display: 'flex', gap: 3, mt: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: { md: '0 0 40%' }, minWidth: 0 }}>
            {stepList}
          </Box>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'grey.50',
              maxHeight: { md: '60vh' },
              overflow: 'auto',
            }}
            aria-live="polite"
            aria-label={copy.t('toolPage.progress.livePreviewAria')}
          >
            {latestArtifact?.content ? (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  {copy.t('toolPage.progress.lastCompletedStep', { step: String(latestArtifact.stepNumber) })}
                </Typography>
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    m: 0,
                  }}
                >
                  {latestArtifact.content}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.disabled" fontStyle="italic">
                {copy.t('toolPage.progress.waitingForContent')}
              </Typography>
            )}
          </Box>
        </Box>
      ) : (
        stepList
      )}
    </Box>
  );
}
