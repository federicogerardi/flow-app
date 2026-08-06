import { Box, Typography, Divider, Card, IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DescriptionIcon from '@mui/icons-material/Description';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArticleIcon from '@mui/icons-material/Article';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { copy } from '@flow-app/copy';
import { PromoteButton } from '../shared/PromoteButton';
import type { ArtifactDTO } from '../../api/client';
import { useState } from 'react';

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ArtifactDownloadMenu({ artifactId, content, index }: { artifactId: string; content: string; index: number }) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const shortId = artifactId.slice(0, 8);

  const handleDownload = (format: string) => {
    setAnchorEl(null);
    switch (format) {
      case 'md': {
        const a = document.createElement('a');
        a.href = `/api/artifacts/${artifactId}/download?format=md`;
        a.download = `step-${index + 1}-${shortId}.md`;
        a.click();
        break;
      }
      case 'txt':
        // Strip basic markdown formatting for plain text
        downloadFile(content, `step-${index + 1}-${shortId}.txt`, 'text/plain;charset=utf-8');
        break;
      case 'docx':
      case 'pdf':
        // Requires server-side conversion — deferred
        break;
    }
  };

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} aria-label={copy.t('shared.actions.download')}>
        <DownloadIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => handleDownload('md')}>
          <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Markdown (.md)</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDownload('txt')}>
          <ListItemIcon><TextSnippetIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Plain Text (.txt)</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDownload('docx')} disabled>
          <ListItemIcon><ArticleIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Word (.docx) — coming soon</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDownload('pdf')} disabled>
          <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>
          <ListItemText>PDF (.pdf) — coming soon</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

interface SessionSummaryProps {
  artifacts: ArtifactDTO[];
  workspaceId?: string;
  produces?: string;
}

export function SessionSummary({ artifacts, workspaceId, produces }: SessionSummaryProps) {
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
          <Box key={artifact.id ?? i} sx={{ mb: i < artifacts.length - 1 ? 3 : 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                Step {artifact.stepNumber}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <ArtifactDownloadMenu
                  artifactId={artifact.id}
                  content={artifact.content}
                  index={i}
                />
                <PromoteButton
                  artifactId={artifact.id}
                  workspaceId={workspaceId ?? ''}
                  produces={produces}
                  promotedAssetId={artifact.promotedAssetId}
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
                    color: 'text.primary',
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 0.5,
                    fontSize: '0.85em',
                    fontFamily: 'monospace',
                  },
                  '& pre': { bgcolor: 'grey.100', color: 'text.primary', p: 2, borderRadius: 1, overflow: 'auto', fontSize: '0.85em' },
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
