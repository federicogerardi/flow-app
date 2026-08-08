import { Box, Typography } from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import FilterCenterFocusIcon from '@mui/icons-material/FilterCenterFocus';
import DescriptionIcon from '@mui/icons-material/Description';
import SmartDisplayIcon from '@mui/icons-material/SmartDisplay';
import InsightsIcon from '@mui/icons-material/Insights';
import CampaignIcon from '@mui/icons-material/Campaign';
import { useNavigate } from 'react-router';
import useSWR from 'swr';
import { api } from '../../api/client';
import { ToolCard } from '../tool/ToolCard';
import { SessionList } from '../workspace/SessionList';
import { AssetCoverageBar } from '../workspace/AssetCoverageBar';
import { ReadyToPromoteList } from '../workspace/ReadyToPromoteList';
import { copy } from '@flow-app/copy';

/** Icon map for content tools — presentation concern, not a domain rule */
const TOOL_ICON_MAP: Record<string, React.ReactNode> = {
  'blog-post': <ArticleIcon fontSize="small" />,
  'landing-funnel': <FilterCenterFocusIcon fontSize="small" />,
  'landing-page': <DescriptionIcon fontSize="small" />,
  'video-script-long-form': <SmartDisplayIcon fontSize="small" />,
  'ai-overview-analysis': <InsightsIcon fontSize="small" />,
  'ad-copy': <CampaignIcon fontSize="small" />,
  'video-description': <SmartDisplayIcon fontSize="small" />,
};

interface WorkspaceDashboardProps {
  workspaceId: string;
}

export function WorkspaceDashboard({ workspaceId }: WorkspaceDashboardProps) {
  const navigate = useNavigate();
  const { data: toolsData } = useSWR('tools-list-content', () => api.listTools());

  const contentTools = (toolsData?.tools ?? []).filter(
    (t) => t.outputCategory === 'content',
  );

  return (
    <Box>
      {/* Asset coverage — data-driven from ToolOutputCategory.AssetProducer */}
      <Box sx={{ mt: 2 }}>
        <AssetCoverageBar workspaceId={workspaceId} />
      </Box>

      {/* Content tools grid — data-driven from ToolOutputCategory.ContentProducer */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          {copy.t('workspace.dashboard.tools')}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 1.5,
          }}
        >
          {contentTools.map((tool) => (
            <ToolCard
              key={tool.toolKey}
              toolKey={tool.toolKey}
              name={tool.name}
              icon={TOOL_ICON_MAP[tool.toolKey]}
              workspaceId={workspaceId}
              variant="compact"
            />
          ))}
        </Box>
      </Box>

      {/* Ready to promote — compact rows */}
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