import { Box, Typography, Divider, Card, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Snackbar, Alert, Button } from '@mui/material';
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
import { useNavigate } from 'react-router';

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
      case 'pdf': {
        // Server-side conversion — fetch blob and trigger download
        const a = document.createElement('a');
        a.href = `/api/artifacts/${artifactId}/download?format=${format}`;
        a.download = `step-${index + 1}-${shortId}.${format}`;
        a.click();
        break;
      }
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
          <ListItemText>{copy.t('toolPage.download.formatLabel', { format: copy.t('toolPage.download.formatMd'), ext: 'md' })}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDownload('txt')}>
          <ListItemIcon><TextSnippetIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{copy.t('toolPage.download.formatLabel', { format: copy.t('toolPage.download.formatTxt'), ext: 'txt' })}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDownload('docx')}>
          <ListItemIcon><ArticleIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{copy.t('toolPage.download.formatLabel', { format: copy.t('toolPage.download.formatDocx'), ext: 'docx' })}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDownload('pdf')}>
          <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{copy.t('toolPage.download.formatLabel', { format: copy.t('toolPage.download.formatPdf'), ext: 'pdf' })}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

interface SessionSummaryProps {
  artifacts: ArtifactDTO[];
  workspaceId?: string;
  produces?: string;
  stepCount?: number;
}

export function SessionSummary({ artifacts, workspaceId, produces, stepCount }: SessionSummaryProps) {
  const navigate = useNavigate();
  const [toast, setToast] = useState<{ open: boolean; assetId?: string; assetType?: string; assetName?: string | null }>({ open: false });

  const handlePromoted = (assetId: string, assetType: string, name: string | null) => {
    setToast({ open: true, assetId, assetType, assetName: name });
  };

  // Deduplicate artifacts by stepNumber — keep the LAST artifact for each step.
  // This handles backend retries that may create duplicate artifacts with different UUIDs
  // for the same stepNumber.
  const deduplicated = artifacts.reduce<ArtifactDTO[]>((acc, a) => {
    const existingIndex = acc.findIndex((existing) => existing.stepNumber === a.stepNumber);
    if (existingIndex >= 0) {
      // Replace with the latest artifact (preserve order)
      acc[existingIndex] = a;
    } else {
      acc.push(a);
    }
    return acc;
  }, []);

  const displayStepCount = stepCount ?? deduplicated.length;

  if (!artifacts || artifacts.length === 0) return null;

  return (
    <>
    <Card>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h3">
          {copy.t('toolPage.progress.completed')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {copy.t('toolPage.progress.stepCount', { count: String(displayStepCount) })}
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ p: 2 }}>
        {deduplicated.map((artifact, i) => {
          // Normalise stepNumber: backend may produce 0-based step numbers;
          // always display 1-based.
          const displayNumber = artifact.stepNumber > 0 ? artifact.stepNumber : i + 1;
          return (
          <Box key={artifact.id ?? i} sx={{ mb: i < deduplicated.length - 1 ? 3 : 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                {copy.t('toolPage.progress.artifactLabel', { number: String(displayNumber) })}
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
                  onPromoted={handlePromoted}
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
        )})}
      </Box>
    </Card>
    <Snackbar
      open={toast.open}
      autoHideDuration={6000}
      onClose={() => setToast({ open: false })}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert
        severity="success"
        variant="filled"
        onClose={() => setToast({ open: false })}
        action={
          toast.assetId ? (
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate(`/workspaces/${workspaceId}/assets/${toast.assetId}`)}
            >
              {copy.t('shared.actions.viewAsset')} →
            </Button>
          ) : undefined
        }
      >
        {toast.assetName
            ? copy.t('notifications.asset.promotedWithName', { name: toast.assetName })
            : copy.t('notifications.asset.promotedWithType', { type: toast.assetType ?? '' })}
      </Alert>
    </Snackbar>
    </>
  );
}
