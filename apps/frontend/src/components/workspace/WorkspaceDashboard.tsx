import { Box, Typography } from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import FilterCenterFocusIcon from '@mui/icons-material/FilterCenterFocus';
import AssignmentIcon from '@mui/icons-material/Assignment';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import { useNavigate } from 'react-router';
import { ToolCard } from '../tool/ToolCard';
import { SessionList } from '../workspace/SessionList';
import { QuickGenerateBar } from '../shared/QuickGenerateBar';
import { AssetCoverageBar } from '../workspace/AssetCoverageBar';
import { ReadyToPromoteList } from '../workspace/ReadyToPromoteList';
import { copy } from '@flow-app/copy';

const TOP_TOOLS = [
  { key: 'blog-post', name: 'Blog Post', icon: <ArticleIcon fontSize="small" /> },
  { key: 'landing-funnel', name: 'Landing Funnel', icon: <FilterCenterFocusIcon fontSize="small" /> },
  { key: 'brief', name: 'Brief', icon: <AssignmentIcon fontSize="small" /> },
  { key: 'brand-voice', name: 'Brand Voice', icon: <RecordVoiceOverIcon fontSize="small" /> },
  { key: 'buyer-persona', name: 'Buyer Persona', icon: <PersonOutlineIcon fontSize="small" /> },
  { key: 'marketing-angle', name: 'Marketing Angle', icon: <LightbulbOutlinedIcon fontSize="small" /> },
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

      {/* Tools grid — fluid multi-row, max 4 columns */}
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
          {TOP_TOOLS.map((tool) => (
            <ToolCard
              key={tool.key}
              toolKey={tool.key}
              name={tool.name}
              icon={tool.icon}
              workspaceId={workspaceId}
              variant="compact"
            />
          ))}
        </Box>
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