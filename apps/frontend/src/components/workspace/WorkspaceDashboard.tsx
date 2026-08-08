import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { useNavigate } from 'react-router';
import { ToolCard } from '../tool/ToolCard';
import { SessionList } from '../workspace/SessionList';
import { QuickGenerateBar } from '../shared/QuickGenerateBar';
import { AssetCoverageBar } from '../workspace/AssetCoverageBar';
import { ReadyToPromoteList } from '../workspace/ReadyToPromoteList';
import { copy } from '@flow-app/copy';

const TOP_TOOLS = [
  { key: 'blog-post', name: 'Blog Post', description: 'SEO article', icon: '📝' },
  { key: 'landing-funnel', name: 'Landing Funnel', description: 'Landing + opt-in', icon: '🎯' },
  { key: 'brief', name: 'Brief', description: 'Marketing brief', icon: '📋' },
  { key: 'brand-voice', name: 'Brand Voice', description: 'Voice guidelines', icon: '🗣️' },
  { key: 'buyer-persona', name: 'Buyer Persona', description: 'Target audience', icon: '👤' },
  { key: 'marketing-angle', name: 'Marketing Angle', description: 'Strategic angle', icon: '💡' },
];

interface WorkspaceDashboardProps {
  workspaceId: string;
}

export function WorkspaceDashboard({ workspaceId }: WorkspaceDashboardProps) {
  const navigate = useNavigate();

  return (
    <Box>
      {/* Quick generate shortcut */}
      <Box sx={{ mt: 2 }}>
        <QuickGenerateBar workspaceId={workspaceId} />
      </Box>

      {/* Asset coverage */}
      <Box sx={{ mt: 4 }}>
        <AssetCoverageBar workspaceId={workspaceId} />
      </Box>

      {/* Tools grid — compact (top 6 tools, 2-row) */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          {copy.t('workspace.dashboard.tools')}
        </Typography>
        <Grid container spacing={2}>
          {TOP_TOOLS.map((tool) => (
            <Grid size={{ xs: 6, sm: 4, md: 2 }} key={tool.key}>
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
      </Box>

      {/* Ready to promote — compact */}
      <Box sx={{ mt: 4 }}>
        <ReadyToPromoteList workspaceId={workspaceId} />
      </Box>

      {/* Recent sessions — last section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          {copy.t('workspace.dashboard.recentSessions')}
        </Typography>
        <SessionList
          workspaceId={workspaceId}
          emptyCtaLabel={copy.t('workspace.dashboard.ctaStartTool')}
          onEmptyCta={() => navigate(`/workspaces/${workspaceId}`)}
        />
      </Box>
    </Box>
  );
}