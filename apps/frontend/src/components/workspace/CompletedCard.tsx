import { Box, Card, CardContent, Typography, Button, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import { copy } from '@flow-app/copy';
import { PromotedBadge } from '../shared/PromotedBadge';
import { PromoteActionButton } from '../shared/PromoteActionButton';
import type { SessionListItemDTO } from '@flow-app/contracts';

interface CompletedCardProps {
  session: SessionListItemDTO;
  onView?: () => void;
  onDownload?: () => void;
  onPromote?: () => void;
  /** If true, the artifact is already promoted — shows a disabled "Promosso ad asset" button */
  promoted?: boolean;
}

function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null) return '';
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}m ${sec}s`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CompletedCard({ session, onView, onDownload, onPromote, promoted }: CompletedCardProps) {
  const toolLabel = session.toolKey.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
          <Typography variant="body1" fontWeight={600}>
            {toolLabel}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
            <Chip
              icon={<CheckCircleIcon />}
              label={copy.t('shared.sessionStatus.completed')}
              size="small"
              color="success"
              variant="outlined"
            />
            {session.completedAt && (
              <Typography variant="caption" color="text.secondary">
                {formatDate(session.completedAt)}
              </Typography>
            )}
          </Box>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {session.stepCount} {session.stepCount === 1 ? copy.t('shared.sessionStatus.step') : copy.t('shared.sessionStatus.steps')}
          {session.durationSeconds !== undefined ? ` · ${formatDuration(session.durationSeconds)}` : ''}
        </Typography>

        {session.lastArtifactPreview && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic', mb: 1 }}>
            {session.lastArtifactPreview}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          {onView && (
            <Button size="small" variant="text" onClick={onView} aria-label={copy.t('shared.actions.viewSession')}>
              {copy.t('shared.actions.viewSession')}
            </Button>
          )}
          {onDownload && (
            <Button size="small" variant="text" startIcon={<DownloadIcon />} onClick={onDownload} aria-label={copy.t('shared.actions.download')}>
              {copy.t('shared.actions.download')}
            </Button>
          )}
          {session.isPromotable && promoted && <PromotedBadge />}
          {session.isPromotable && !promoted && onPromote && (
            <PromoteActionButton onClick={onPromote} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}