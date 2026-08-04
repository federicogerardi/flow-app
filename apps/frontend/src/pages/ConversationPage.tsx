import { Box, Card, CardContent, Typography, IconButton, Tooltip, Chip, keyframes, Divider } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useRef, useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router';
import useSWR from 'swr';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { useBreadcrumbs } from '../layout/AppShell';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';
import { ChatMessageBubble } from '../components/agent-chat/ChatMessageBubble';
import { ChatInput } from '../components/agent-chat/ChatInput';
import { AgentContextDrawer } from '../components/agent-chat/AgentContextDrawer';
import { copy } from '@flow-app/copy';

/** Per-agent suggested question chips for empty state */
const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  strategist: [
    'What marketing strategy should I use for a SaaS launch?',
    'Analyze my competitors and suggest positioning angles',
    'Which channels would be most effective for B2B lead gen?',
  ],
  copywriter: [
    'Write a compelling headline for a B2B landing page',
    'Help me improve the tone of this email campaign',
    'Generate 5 social media post variations for a product launch',
  ],
  'seo-specialist': [
    'Suggest SEO improvements for my blog post',
    'What keywords should I target for this topic?',
    'Audit my landing page for on-page SEO',
  ],
  'ads-specialist': [
    'Write 3 Google Ads variations for my campaign',
    'Suggest audience targeting for LinkedIn ads',
    'Help me A/B test my ad copy',
  ],
  analyst: [
    'Analyze my latest campaign performance data',
    'What metrics should I track for content marketing?',
    'Benchmark our conversion rates against industry standards',
  ],
  'creative-director': [
    'Review my brand messaging for consistency',
    'Suggest creative angles for a testimonial campaign',
    'Help me align our visual and written identity',
  ],
  'email-marketer': [
    'Write a drip campaign sequence for new signups',
    'Help me improve my newsletter open rates',
    'Suggest subject lines for a re-engagement campaign',
  ],
};

function getSuggestedQuestions(agentKey: string): string[] {
  return SUGGESTED_QUESTIONS[agentKey] ?? [
    'What can you help me with?',
    'How should I get started with this project?',
    'What information do you need from me?',
  ];
}

const typingPulse = keyframes`
  0%, 80%, 100% { opacity: 0.2; }
  40% { opacity: 0.8; }
`;

function TypingIndicator() {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, px: 2, py: 1.5 }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: 'text.secondary',
            animation: `${typingPulse} 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </Box>
  );
}

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
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

  // Set breadcrumbs via context (L1)
  useEffect(() => {
    if (conversation) {
      setBreadcrumbs([
        { label: copy.t('workspace.nav.home'), path: '/dashboard' },
        { label: conversation.agentName },
      ]);
    }
  }, [conversation, setBreadcrumbs]);

  // Detect scroll position for "scroll-lock" badge (M3)
  const handleScroll = useCallback(() => {
    const el = messageListRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsScrolledUp(distanceFromBottom > 80);
  }, []);

  // Auto-scroll only when NOT scrolled up
  useEffect(() => {
    if (!isScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation?.messages?.length, isScrolledUp]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsScrolledUp(false);
  };

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
  if (!conversation) return <ErrorState message="Conversation not found" />;

  const messages = conversation.messages ?? [];
  const agentKey = conversation.agentKey || '';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <PageHeader
        title={conversation.title ?? `Chat with ${conversation.agentName}`}
        action={{
          label: '',
          onClick: () => {},
        }}
      />
      <Box sx={{ position: 'absolute', top: 80, right: 24, zIndex: 2 }}>
        <Tooltip title="Workspace context">
          <IconButton onClick={() => setDrawerOpen(true)} size="small">
            <InfoIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Scroll-to-bottom badge (M3) */}
      {isScrolledUp && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
          }}
        >
          <Chip
            icon={<KeyboardArrowDownIcon />}
            label="Nuovo messaggio"
            color="primary"
            size="small"
            onClick={scrollToBottom}
            sx={{ boxShadow: 2, cursor: 'pointer' }}
          />
        </Box>
      )}

      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CardContent
          ref={messageListRef}
          onScroll={handleScroll}
          sx={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
          role="log"
          aria-live="polite"
          aria-label={`Conversation with ${conversation.agentName}`}
        >
          {/* Empty state with suggested questions (M2) */}
          {messages.length === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, px: 2 }}>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {conversation.agentName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center', maxWidth: 400 }}>
                Ask me anything about your marketing needs. I have full access to your workspace assets.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Suggested questions
              </Typography>
              <Box
                sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', maxWidth: 500 }}
                role="list"
              >
                {getSuggestedQuestions(agentKey).map((q, i) => (
                  <Chip
                    key={i}
                    label={q}
                    variant="outlined"
                    size="small"
                    role="listitem"
                    tabIndex={0}
                    onClick={() => handleSend(q)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSend(q); }}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {messages.map((msg, i) => {
            const currentDate = new Date(msg.createdAt).toLocaleDateString();
            const prevDate = i > 0 ? new Date(messages[i - 1].createdAt).toLocaleDateString() : null;
            const showSeparator = prevDate !== null && currentDate !== prevDate;

            return (
              <Box key={msg.id}>
                {/* Date separator for multi-day conversations (M19) */}
                {showSeparator && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 2 }}>
                    <Divider sx={{ flex: 1 }} />
                    <Chip
                      label={currentDate}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', color: 'text.secondary', borderColor: 'divider' }}
                    />
                    <Divider sx={{ flex: 1 }} />
                  </Box>
                )}
                <ChatMessageBubble
                  role={msg.role as 'user' | 'agent' | 'system'}
                  content={msg.content}
                  tokensUsed={msg.tokensUsed}
                  modelUsed={msg.modelUsed}
                  createdAt={msg.createdAt}
                />
              </Box>
            );
          })}

          {/* Typing indicator (M4) */}
          {isStreaming && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </CardContent>

        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </Card>

      <AgentContextDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        workspaceId={conversation.workspaceId}
      />
    </Box>
  );
}
