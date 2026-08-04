import { Box, Card, CardContent, Typography, IconButton, Tooltip } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import useSWR from 'swr';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';
import { ChatMessageBubble } from '../components/agent-chat/ChatMessageBubble';
import { ChatInput } from '../components/agent-chat/ChatInput';
import { AgentContextDrawer } from '../components/agent-chat/AgentContextDrawer';
import { copy } from '@flow-app/copy';

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    data: conversation,
    isLoading,
    error,
    mutate,
  } = useSWR(
    conversationId ? `conversation-${conversationId}` : null,
    () => api.getConversation(conversationId!),
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages?.length]);

  const handleSend = async (message: string) => {
    if (!conversationId) return;
    await api.sendMessage(conversationId, message);
    await mutate();
  };

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error.message} />;
  if (!conversation) return <ErrorState message="Conversation not found" />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <PageHeader
        title={conversation.title ?? `Chat with ${conversation.agentName}`}
        breadcrumbs={[
          { label: copy.t('workspace.nav.home'), path: '/dashboard' },
          { label: conversation.agentName },
        ]}
        action={{
          label: '',
          onClick: () => {},
        }}
      />
      <Box sx={{ position: 'absolute', top: 80, right: 24, zIndex: 1 }}>
        <Tooltip title="Workspace context">
          <IconButton onClick={() => setDrawerOpen(true)} size="small">
            <InfoIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CardContent sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {conversation.messages.length === 0 && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Start the conversation by sending a message.
            </Typography>
          )}

          {conversation.messages.map((msg) => (
            <ChatMessageBubble
              key={msg.id}
              role={msg.role as 'user' | 'agent' | 'system'}
              content={msg.content}
              tokensUsed={msg.tokensUsed}
              modelUsed={msg.modelUsed}
              createdAt={msg.createdAt}
            />
          ))}
          <div ref={messagesEndRef} />
        </CardContent>

        <ChatInput onSend={handleSend} />
      </Card>

      <AgentContextDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        workspaceId={conversation.workspaceId}
      />
    </Box>
  );
}
