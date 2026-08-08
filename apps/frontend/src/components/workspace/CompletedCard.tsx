import { Box, Card, CardContent, Typography, Button, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import PushPinIcon from '@mui/icons-material/PushPin';
import { copy } from '@flow-app/copy';
import type { SessionListItemDTO } from '@flow-app/contracts';

interface CompletedCardProps {
  session: SessionListItemDTO;
  onView?: () => void;
  onDownload?: () => void;
  onPromote?: () => void;
}

function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null) return '';
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}m ${sec}s`;
}

export function CompletedCard({ session, onView, onDownload, onPromote }: CompletedCardProps) {
  const toolLabel = session.toolKey.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="body1" fontWeight={600}>
            {toolLabel}
          </Typography>
          <Chip
            icon={<CheckCircleIcon />}
            label={copy.t('shared.sessionStatus.completed')}
            size="small"
            color="success"
            variant="outlined"
          />
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
            <Button size="small" variant="text" onClick={onView}>
              {copy.t('shared.actions.viewAsset')}
            </Button>
          )}
          {onDownload && (
            <Button size="small" variant="text" startIcon={<DownloadIcon />} onClick={onDownload}>
              {copy.t('shared.actions.download')}
            </Button>
          )}
          {session.isPromotable && onPromote && (
            <Button size="small" variant="contained" startIcon={<PushPinIcon />} onClick={onPromote}>
              {copy.t('shared.actions.promote')}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
