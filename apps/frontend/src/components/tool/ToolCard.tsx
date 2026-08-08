import { Card, CardActionArea, CardContent, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router';
import type { ReactNode } from 'react';

interface ToolCardProps {
  toolKey: string;
  name: string;
  description?: string;
  icon?: ReactNode;
  workspaceId: string;
  variant?: 'default' | 'compact';
}

export function ToolCard({ toolKey, name, description, icon, workspaceId, variant = 'default' }: ToolCardProps) {
  const navigate = useNavigate();

  return (
    <Card variant="outlined">
      <CardActionArea
        onClick={() => navigate(`/workspaces/${workspaceId}/tools/${toolKey}`)}
        sx={{ p: variant === 'compact' ? 1.5 : 2 }}
      >
        <CardContent
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: '0 !important',
          }}
        >
          {icon && (
            <Box sx={{ display: 'flex', color: 'primary.main', flexShrink: 0 }}>
              {icon}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap={variant === 'default'}>
              {name}
            </Typography>
            {variant === 'default' && description && (
              <Typography variant="caption" color="text.secondary">
                {description}
              </Typography>
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}