import { Box, Card, CardContent, Typography, IconButton, Tooltip, Chip, keyframes, Divider } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useRef, useEffect, useState, useCallback } from 'react';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatInput } from './ChatInput';
import { AgentContextDrawer } from './AgentContextDrawer';
import { copy } from '@flow-app/copy';

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

/** Agent key → copy module key mapping (hyphens → camelCase) */
const AGENT_COPY_KEY: Record<string, string> = {
  strategist: 'strategist',
  copywriter: 'copywriter',
  'seo-specialist': 'seoSpecialist',
  'ads-specialist': 'adsSpecialist',
  analyst: 'analyst',
  'creative-director': 'creativeDirector',
  'email-marketer': 'emailMarketer',
};

function getSuggestedQuestions(agentKey: string): string[] {
  const copyKey = AGENT_COPY_KEY[agentKey] ?? agentKey;
  const suggestions = copy.raw.conversations?.suggested as unknown as Record<string, string[]> | undefined;
  const questions = suggestions?.[copyKey];
  if (questions && questions.length > 0) return questions;
  return [
    copy.t('conversations.empty.fallbackQuestion1'),
    copy.t('conversations.empty.fallbackQuestion2'),
    copy.t('conversations.empty.fallbackQuestion3'),
  ];
}

interface ConversationViewProps {
  workspaceId: string;
  agentName: string;
  agentKey: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
    tokensUsed?: number | null;
    modelUsed?: string | null;
  }>;
  isStreaming: boolean;
  onSend: (message: string) => Promise<void>;
}

export function ConversationView({
  workspaceId,
  agentName,
  agentKey,
  messages,
  isStreaming,
  onSend,
}: ConversationViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  const handleScroll = useCallback(() => {
    const el = messageListRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsScrolledUp(distanceFromBottom > 80);
  }, []);

  useEffect(() => {
    if (!isScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isScrolledUp]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsScrolledUp(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <Box sx={{ position: 'absolute', top: 80, right: 24, zIndex: 2 }}>
        <Tooltip title={copy.t('conversations.contextLabel')}>
          <IconButton onClick={() => setDrawerOpen(true)} size="small">
            <InfoIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {isScrolledUp && (
        <Box sx={{ position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
          <Chip
            icon={<KeyboardArrowDownIcon />}
            label={copy.t('conversations.input.label')}
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
          sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}
          role="log"
          aria-live="polite"
          aria-label={copy.t('conversations.aria.conversationLabel', { agentName })}
        >
          {messages.length === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, px: 2 }}>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {agentName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center', maxWidth: 400 }}>
                {copy.t('conversations.empty.description')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {copy.t('conversations.empty.suggestedLabel')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', maxWidth: 500 }} role="list">
                {getSuggestedQuestions(agentKey).map((q, i) => (
                  <Chip
                    key={i}
                    label={q}
                    variant="outlined"
                    size="small"
                    role="listitem"
                    tabIndex={0}
                    onClick={() => onSend(q)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onSend(q); }}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
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
                {showSeparator && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 2 }}>
                    <Divider sx={{ flex: 1 }} />
                    <Chip label={currentDate} size="small" variant="outlined" sx={{ fontSize: '0.7rem', color: 'text.secondary', borderColor: 'divider' }} />
                    <Divider sx={{ flex: 1 }} />
                  </Box>
                )}
                <ChatMessageBubble
                  role={msg.role as 'user' | 'agent' | 'system'}
                  content={msg.content}
                  tokensUsed={msg.tokensUsed ?? undefined}
                  modelUsed={msg.modelUsed}
                />
              </Box>
            );
          })}

          {isStreaming && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </CardContent>

        <ChatInput onSend={onSend} disabled={isStreaming} />
      </Card>

      <AgentContextDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        workspaceId={workspaceId}
      />
    </Box>
  );
}