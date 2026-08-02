import { Box, Button, Card, CardContent, TextField, Typography } from '@mui/material';
import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router';
import useSWR from 'swr';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';
import { copy } from '@flow-app/copy';

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleSend = async () => {
    if (!newMessage.trim() || !conversationId) return;
    setSending(true);
    try {
      await api.sendMessage(conversationId, newMessage.trim());
      setNewMessage('');
      await mutate();
    } catch (err) {
      console.error('Failed to send message:', err instanceof Error ? err.message : err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
      />

      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CardContent sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {conversation.messages.length === 0 && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Start the conversation by sending a message.
            </Typography>
          )}

          {conversation.messages.map((msg) => (
            <Box
              key={msg.id}
              sx={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <Box
                sx={{
                  maxWidth: '70%',
                  px: 2,
                  py: 1.5,
                  borderRadius: 2,
                  bgcolor: msg.role === 'user' ? 'primary.main' : 'grey.100',
                  color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                }}
              >
                <Typography variant="body2">{msg.content}</Typography>
                {msg.tokensUsed > 0 && (
                  <Typography variant="caption" sx={{ opacity: 0.6, mt: 0.5, display: 'block' }}>
                    {msg.modelUsed} — {msg.tokensUsed} tokens
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>

        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            size="small"
            multiline
            maxRows={4}
          />
          <Button variant="contained" onClick={handleSend} disabled={sending || !newMessage.trim()}>
            {copy.t('shared.actions.send')}
          </Button>
        </Box>
      </Card>
    </Box>
  );
}
