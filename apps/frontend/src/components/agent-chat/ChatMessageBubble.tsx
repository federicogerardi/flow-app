import { Box, Typography } from '@mui/material';

interface ChatMessageBubbleProps {
  role: 'user' | 'agent' | 'system';
  content: string;
  tokensUsed?: number;
  modelUsed?: string | null;
  createdAt?: string;
}

export function ChatMessageBubble({ role, content, tokensUsed, modelUsed, createdAt }: ChatMessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <Box
        sx={{
          maxWidth: '70%',
          px: 2,
          py: 1.5,
          borderRadius: 2,
          bgcolor: isUser ? 'primary.main' : 'action.hover',
          color: isUser ? 'primary.contrastText' : 'text.primary',
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{content}</Typography>
        {tokensUsed && tokensUsed > 0 && (
          <Typography variant="caption" sx={{ opacity: 0.6, mt: 0.5, display: 'block' }}>
            {modelUsed} — {tokensUsed} tokens
          </Typography>
        )}
        {createdAt && !isUser && (
          <Typography variant="caption" sx={{ opacity: 0.4, mt: 0.25, display: 'block' }}>
            {new Date(createdAt).toLocaleTimeString()}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
