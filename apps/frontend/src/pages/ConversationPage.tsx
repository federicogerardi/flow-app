import { Box } from '@mui/material';
import { useState } from 'react';
import { useParams } from 'react-router';
import useSWR from 'swr';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { useBreadcrumbs } from '../layout/AppShell';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';
import { ConversationView } from '../components/agent-chat/ConversationView';
import { copy } from '@flow-app/copy';
import { useEffect } from 'react';

export default function ConversationPage() {
  const { conversationId, workspaceId } = useParams<{ conversationId: string; workspaceId: string }>();
  const [isStreaming, setIsStreaming] = useState(false);
  const { setBreadcrumbs } = useBreadcrumbs();

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
    if (conversation) {
      setBreadcrumbs([
        { label: copy.t('workspace.nav.home'), path: workspaceId ? `/workspaces/${workspaceId}` : '/dashboard' },
        { label: conversation.agentName },
      ]);
    }
  }, [conversation, setBreadcrumbs]);

  const handleSend = async (message: string) => {
    if (!conversationId) return;
    setIsStreaming(true);
    try {
      await api.sendMessage(conversationId, message);
      await mutate();
    } finally {
      setIsStreaming(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error.message} />;
  if (!conversation) return <ErrorState message={copy.t('conversations.notFound')} />;

  const messages = conversation.messages ?? [];
  const agentKey = conversation.agentKey || '';
  const agentName = conversation.title ?? `Chat with ${conversation.agentName}`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <PageHeader
        title={agentName}
        action={{ label: '', onClick: () => {} }}
      />
      <ConversationView
        workspaceId={conversation.workspaceId}
        agentName={conversation.agentName}
        agentKey={agentKey}
        messages={messages}
        isStreaming={isStreaming}
        onSend={handleSend}
      />
    </Box>
  );
}