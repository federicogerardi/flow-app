import { Box, Card, CardActionArea, CardContent, Chip, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { useNavigate, useParams } from 'react-router';
import useSWR from 'swr';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { copy } from '@flow-app/copy';

const TOOLS = [
  { key: 'blog-post', name: 'Blog Post', description: 'SEO-optimized blog article', icon: '📝' },
  { key: 'landing-funnel', name: 'Landing Funnel', description: 'Landing page + opt-in + quiz + VSL', icon: '🎯' },
  { key: 'landing-page', name: 'Landing Page', description: 'Landing page + thank-you', icon: '📄' },
  { key: 'video-script-long-form', name: 'Video Script', description: 'Long-form video script', icon: '🎬' },
  { key: 'video-description', name: 'Video Description', description: 'YouTube video description', icon: '📺' },
  { key: 'ad-copy', name: 'Ad Copy', description: 'Ad copy for paid campaigns', icon: '📢' },
  { key: 'brief', name: 'Brief', description: 'Marketing brief', icon: '📋' },
  { key: 'brand-voice', name: 'Brand Voice', description: 'Brand voice guidelines', icon: '🗣️' },
  { key: 'buyer-persona', name: 'Buyer Persona', description: 'Target audience persona', icon: '👤' },
  { key: 'marketing-angle', name: 'Marketing Angle', description: 'Strategic marketing angle', icon: '💡' },
  { key: 'ai-overview-analysis', name: 'AI Overview Analysis', description: 'Google AI Overview presence analysis', icon: '🔍' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: workspaces, isLoading, error } = useSWR('workspaces', () => api.listWorkspaces());

  const currentWorkspace = workspaces?.find((w: any) => w.id === workspaceId);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error.message} />;
  if (!currentWorkspace) {
    return (
      <EmptyState
        title={copy.t('workspace.switcher.selectWorkspace')}
        message={copy.t('workspace.switcher.noWorkspaces')}
      />
    );
  }

  return (
    <Box>
      <PageHeader
        title={currentWorkspace.name}
        subtitle={copy.t('workspace.dashboard.subtitle')}
      />

      <Typography variant="h3" sx={{ mb: 2 }}>
        {copy.t('workspace.dashboard.tools')}
      </Typography>
      <Grid container spacing={2}>
        {TOOLS.map((tool) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tool.key}>
            <Card>
              <CardActionArea
                onClick={() => navigate(`/workspaces/${workspaceId}/tools/${tool.key}`)}
                sx={{ p: 2 }}
              >
                <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                  <Typography variant="h4" sx={{ mb: 0.5 }}>
                    {tool.icon} {tool.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tool.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          {copy.t('workspace.dashboard.recentSessions')}
        </Typography>
        <RecentSessions workspaceId={workspaceId!} />
      </Box>
    </Box>
  );
}

function RecentSessions({ workspaceId }: { workspaceId: string }) {
  const { data: sessions, isLoading } = useSWR(
    `sessions-${workspaceId}`,
    () => api.listSessions({ workspaceId }),
  );

  if (isLoading) return <LoadingSkeleton />;
  if (!sessions || sessions.data.length === 0) {
    return <EmptyState title={copy.t('workspace.detail.noSessions')} message={copy.t('workspace.dashboard.noSessions')} />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {sessions.data.map((s: any) => (
        <Card key={s.id} variant="outlined">
          <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box>
              <Typography variant="body1" fontWeight={600}>
                {s.toolKey}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(s.createdAt).toLocaleString()}
              </Typography>
            </Box>
            <Chip
              label={s.status}
              color={s.status === 'completed' ? 'success' : s.status === 'failed' ? 'error' : 'primary'}
              size="small"
            />
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
