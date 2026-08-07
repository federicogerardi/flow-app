import { Card, CardActionArea, CardContent, Typography, Chip, Stack } from '@mui/material';

interface AgentCardProps {
  agentKey: string;
  name: string;
  role: string;
  description?: string;
  capabilities: string[];
  onClick: () => void;
}

export function AgentCard({ name, role, description, capabilities, onClick }: AgentCardProps) {
  return (
    <Card
      sx={{
        transition: 'box-shadow 200ms ease, transform 200ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: 'var(--shadow-accent, 0 4px 12px rgba(37, 99, 235, 0.2))',
        },
      }}
    >
      <CardActionArea
        onClick={onClick}
        sx={{ p: 2, height: '100%' }}
        aria-label={`${name}, ${role}${description ? `. ${description}` : ''}`}
      >
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
