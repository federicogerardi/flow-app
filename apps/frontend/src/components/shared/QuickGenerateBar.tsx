import { Box, Select, MenuItem, Button, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import BoltIcon from '@mui/icons-material/Bolt';

const QUICK_TOOLS = [
  { key: 'blog-post', name: 'Blog Post' },
  { key: 'landing-funnel', name: 'Landing Funnel' },
  { key: 'ad-copy', name: 'Ad Copy' },
  { key: 'brief', name: 'Brief' },
  { key: 'brand-voice', name: 'Brand Voice' },
  { key: 'marketing-angle', name: 'Marketing Angle' },
] as const;

interface QuickGenerateBarProps {
  workspaceId: string;
}

export function QuickGenerateBar({ workspaceId }: QuickGenerateBarProps) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('blog-post');

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: 'action.hover',
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        flexWrap: 'wrap',
        mb: 3,
      }}
    >
      <Typography variant="body2" fontWeight={600} sx={{ mr: 1 }}>
        Quick Generate
      </Typography>
      <Select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        size="small"
        sx={{ minWidth: 160 }}
      >
        {QUICK_TOOLS.map((t) => (
          <MenuItem key={t.key} value={t.key}>{t.name}</MenuItem>
        ))}
      </Select>
      <Button
        variant="contained"
        onClick={() => navigate(`/workspaces/${workspaceId}/tools/${selected}`)}
        startIcon={<BoltIcon />}
        size="small"
      >
        Generate
      </Button>
    </Box>
  );
}
