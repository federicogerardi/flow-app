import { Card, CardActionArea, CardContent, Typography, Chip, Stack } from '@mui/material';

interface AgentCardProps {
  agentKey: string;
  name: string;
  role: string;
  capabilities: string[];
  onClick: () => void;
}

export function AgentCard({ name, role, capabilities, onClick }: AgentCardProps) {
  return (
    <Card>
      <CardActionArea onClick={onClick} sx={{ p: 2, height: '100%' }}>
        <CardContent sx={{ '&:last-child': { pb: 2 }, p: '0 !important' }}>
          <Typography variant="h5" fontWeight={600} sx={{ mb: 0.5 }}>
            {name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {role}
          </Typography>
          <Stack direction="row" gap={0.5} flexWrap="wrap">
            {capabilities.slice(0, 3).map((cap) => (
              <Chip key={cap} label={cap} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            ))}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
