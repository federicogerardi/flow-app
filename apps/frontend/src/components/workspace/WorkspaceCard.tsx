import { Card, CardActionArea, CardContent, Typography, Box } from '@mui/material';

interface WorkspaceCardProps {
  id: string;
  name: string;
  memberCount: number;
  isActive: boolean;
  accentColor: string;
  onClick: () => void;
}

export function WorkspaceCard({ id: _id, name, memberCount, isActive, accentColor, onClick }: WorkspaceCardProps) {
  return (
    <Card variant={isActive ? 'elevation' : 'outlined'} sx={{ borderColor: isActive ? accentColor : undefined }}>
      <CardActionArea onClick={onClick}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accentColor, flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
