import { Box, Typography, Card, CardContent, CardActionArea } from '@mui/material';
import Grid from '@mui/material/Grid2';
import GroupsIcon from '@mui/icons-material/Groups';
import { useNavigate, useParams } from 'react-router';
import useSWR from 'swr';
import { api } from '../../api/client';
import { PageHeader } from '../PageHeader';
import { LoadingSkeleton } from '../LoadingSkeleton';
import { ErrorState } from '../ErrorState';
import { EmptyState } from '../EmptyState';
import { AgentCard } from './AgentCard';
import { copy } from '@flow-app/copy';

export function TeamHub() {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const { data: agentsData, isLoading: agentsLoading, error: agentsError } = useSWR(
    workspaceId ? `agents-${workspaceId}` : null,
    () => api.listAgents(workspaceId!),
  );

  const { data: conversationsData, isLoading: convLoading } = useSWR(
    workspaceId ? `conversations-${workspaceId}` : null,
    () => api.listConversations(workspaceId!),
  );

  if (agentsLoading || convLoading) return <LoadingSkeleton />;
  if (agentsError) return <ErrorState message={agentsError.message} />;

  const agents = agentsData?.agents ?? [];
  const conversations = conversationsData?.conversations ?? [];

  const handleStartConversation = async (agentKey: string) => {
    if (!workspaceId) return;
    try {
      const conv = await api.startConversation(workspaceId, agentKey);
      navigate(`/workspaces/${workspaceId}/conversations/${conv.id}`);
    } catch {
      // error handled by global handler
    }
  };

  return (
    <Box>
      <PageHeader title={copy.t('workspace.nav.team')} />

      <Box sx={{ p: 3, mb: 3, borderRadius: 2, background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: 'white', display: 'flex', alignItems: 'center', gap: 2.5 }}>
        <GroupsIcon sx={{ fontSize: 40, opacity: 0.8 }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Il tuo team marketing virtuale
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.85 }}>
            7 specialisti con accesso completo agli asset del workspace — pronti a collaborare su strategia, copy, SEO, ads e analytics.
          </Typography>
        </Box>
      </Box>

      <Typography variant="h3" sx={{ mb: 2 }}>
        Agents
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {agents.map((agent) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={agent.key}>
            <AgentCard
              agentKey={agent.key}
              name={agent.name}
              role={agent.role}
              capabilities={agent.capabilities}
              onClick={() => handleStartConversation(agent.key)}
            />
          </Grid>
        ))}
      </Grid>

      {conversations.length > 0 && (
        <>
          <Typography variant="h3" sx={{ mb: 2 }}>
            Recent Conversations
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {conversations.map((conv) => (
              <Card key={conv.id} variant="outlined">
                <CardActionArea onClick={() => navigate(`/workspaces/${workspaceId}/conversations/${conv.id}`)}>
                  <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        {conv.title ?? `Chat with ${conv.agentName}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {conv.messageCount} messages · {new Date(conv.updatedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {conv.agentName}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        </>
      )}

      {conversations.length === 0 && !convLoading && (
        <EmptyState
          title={copy.t('conversations.empty.title')}
          message={copy.t('conversations.empty.message')}
        />
      )}
    </Box>
  );
}