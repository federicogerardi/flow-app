import { Box, Typography, Divider, Card, Tooltip, IconButton } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { copy } from '@flow-app/copy';
import { PromoteButton } from '../shared/PromoteButton';
import type { ArtifactDTO } from '../../api/client';

interface SessionSummaryProps {
  artifacts: ArtifactDTO[];
  workspaceId?: string;
}

export function SessionSummary({ artifacts, workspaceId }: SessionSummaryProps) {
  if (!artifacts || artifacts.length === 0) return null;

  return (
    <Card>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h3">
          {copy.t('toolPage.progress.completed')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {artifacts.length} {artifacts.length === 1 ? 'step' : 'steps'}
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ p: 2 }}>
        {artifacts.map((artifact, i) => (
          <Box key={artifact.artifactId ?? i} sx={{ mb: i < artifacts.length - 1 ? 3 : 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                Step {artifact.stepNumber}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title={copy.t('shared.actions.download')}>
                  <IconButton size="small" disabled aria-label={copy.t('shared.actions.download')}>
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <PromoteButton
                  artifactId={artifact.artifactId ?? `step-${i}`}
                  workspaceId={workspaceId ?? ''}
                  disabled
                />
              </Box>
            </Box>
            <Card variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
              <Box
                sx={{
                  '& h1,h2,h3,h4,h5,h6': { mt: 2, mb: 1, fontWeight: 600 },
                  '& h1': { fontSize: '1.5rem' },
                  '& h2': { fontSize: '1.25rem' },
                  '& h3': { fontSize: '1.1rem' },
                  '& p': { mb: 1.5, lineHeight: 1.7 },
                  '& ul,ol': { pl: 3, mb: 1.5 },
                  '& li': { mb: 0.25 },
                  '& code': {
                    bgcolor: 'grey.100',
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 0.5,
                    fontSize: '0.85em',
                    fontFamily: 'monospace',
                  },
                  '& pre': { bgcolor: 'grey.100', p: 2, borderRadius: 1, overflow: 'auto', fontSize: '0.85em' },
                  '& table': { borderCollapse: 'collapse', width: '100%', mb: 1.5 },
                  '& th,td': { border: '1px solid', borderColor: 'divider', p: 1, textAlign: 'left' },
                  '& th': { bgcolor: 'action.hover', fontWeight: 600 },
                  '& blockquote': {
                    borderLeft: '3px solid',
                    borderColor: 'primary.main',
                    pl: 2,
                    ml: 0,
                    color: 'text.secondary',
                    fontStyle: 'italic',
                  },
                  '& a': { color: 'primary.main' },
                  '& img': { maxWidth: '100%' },
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {artifact.content}
                </ReactMarkdown>
              </Box>
            </Card>
          </Box>
        ))}
      </Box>
    </Card>
  );
}
