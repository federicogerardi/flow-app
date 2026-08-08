import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { ToolCard } from '../tool/ToolCard';
import { SessionList } from '../workspace/SessionList';
import { QuickGenerateBar } from '../shared/QuickGenerateBar';
import { AssetCoverageBar } from '../workspace/AssetCoverageBar';
import { ReadyToPromoteList } from '../workspace/ReadyToPromoteList';
import { WorkspaceMembers } from '../workspace/WorkspaceMembers';
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

interface WorkspaceDashboardProps {
  workspaceId: string;
}

export function WorkspaceDashboard({ workspaceId }: WorkspaceDashboardProps) {

  return (
    <Box>
      {/* Quick generate shortcut */}
      <Box sx={{ mt: 3 }}>
        <QuickGenerateBar workspaceId={workspaceId} />
      </Box>

      {/* In-progress sessions */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          {copy.t('workspace.dashboard.recentSessions')}
        </Typography>
        <SessionList workspaceId={workspaceId} />
      </Box>

      {/* Ready to promote (KPI #3) */}
      <ReadyToPromoteList workspaceId={workspaceId} />

      {/* Asset coverage */}
      <Box sx={{ mb: 4, mt: 4 }}>
        <AssetCoverageBar workspaceId={workspaceId} />
      </Box>

      {/* Tools grid */}
      <Typography variant="h3" sx={{ mb: 2 }}>
        {copy.t('workspace.dashboard.tools')}
      </Typography>
      <Grid container spacing={2}>
        {TOOLS.map((tool) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tool.key}>
            <ToolCard
              toolKey={tool.key}
              name={tool.name}
              description={tool.description}
              icon={tool.icon}
              workspaceId={workspaceId}
            />
          </Grid>
        ))}
      </Grid>

      {/* Team members */}
      <Box sx={{ mt: 4 }}>
        <WorkspaceMembers workspaceId={workspaceId} />
      </Box>
    </Box>
  );
}