import { Card, CardActionArea, CardContent, Typography } from '@mui/material';
import { useNavigate } from 'react-router';

interface ToolCardProps {
  toolKey: string;
  name: string;
  description: string;
  icon?: string;
  workspaceId: string;
}

export function ToolCard({ toolKey, name, description, icon, workspaceId }: ToolCardProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardActionArea
        onClick={() => navigate(`/workspaces/${workspaceId}/tools/${toolKey}`)}
        sx={{ p: 2 }}
      >
        <CardContent sx={{ '&:last-child': { pb: 2 } }}>
          <Typography variant="h4" sx={{ mb: 0.5 }}>
            {icon ? `${icon} ` : ''}{name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
