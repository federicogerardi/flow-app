import { Box, Typography, keyframes } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const cursorBlink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

interface ChatMessageBubbleProps {
  role: 'user' | 'agent' | 'system';
  content: string;
  tokensUsed?: number;
  modelUsed?: string | null;
  createdAt?: string;
  isStreaming?: boolean;
}

export function ChatMessageBubble({ role, content, tokensUsed, modelUsed, createdAt, isStreaming = false }: ChatMessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 0.5,
      }}
    >
      {/* Agent emoji avatar (left side, per spec) */}
      {!isUser && (
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            bgcolor: 'action.selected',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          🤖
        </Box>
      )}

      <Box sx={{ maxWidth: '72%' }}>
        <Box
          sx={{
            px: 2,
            py: 1.5,
            // Spec: asymmetric border-radius per role
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            bgcolor: isUser ? 'primary.main' : 'background.paper',
            color: isUser ? 'primary.contrastText' : 'text.primary',
            border: isUser ? 'none' : '1px solid',
            borderColor: isUser ? 'transparent' : 'divider',
          }}
        >
          {isUser ? (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {content}
            </Typography>
          ) : (
            <Box
              sx={{
                '& p': { m: 0, '&:not(:last-child)': { mb: 0.75 } },
                '& code': {
                  bgcolor: 'grey.100',
                  px: 0.5,
                  py: 0.25,
                  borderRadius: 0.5,
                  fontSize: '0.85em',
                  fontFamily: 'monospace',
                },
                '& pre': {
                  bgcolor: 'grey.100',
                  p: 1.5,
                  borderRadius: 1,
                  overflow: 'auto',
                  fontSize: '0.8em',
                  my: 0.75,
                },
                '& ul, & ol': { pl: 2.5, my: 0.5 },
                '& li': { mb: 0.25 },
                '& blockquote': {
                  borderLeft: '3px solid',
                  borderColor: 'primary.main',
                  pl: 1.5,
                  ml: 0,
                  color: 'text.secondary',
                  fontStyle: 'italic',
                  my: 0.5,
                },
                '& a': { color: 'primary.main' },
                '& strong': { fontWeight: 600 },
                '& em': { fontStyle: 'italic' },
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </Box>
          )}
          {/* Streaming cursor (M7): blinking ▐ when agent is streaming */}
          {isStreaming && !isUser && (
            <Box
              component="span"
              sx={{
                display: 'inline',
                animation: `${cursorBlink} 0.8s step-end infinite`,
                color: 'primary.main',
                fontWeight: 700,
                ml: 0.25,
              }}
            >
              {'\u258C'}
            </Box>
          )}
        </Box>

        {/* Footer: timestamp + token count */}
        {createdAt && (
          <Typography variant="caption" sx={{ opacity: 0.4, mt: 0.25, display: 'block', px: 1 }}>
            {isUser
              ? new Date(createdAt).toLocaleTimeString()
              : `${new Date(createdAt).toLocaleTimeString()}${modelUsed ? ` · ${modelUsed}` : ''}${tokensUsed && tokensUsed > 0 ? ` · ${tokensUsed} tokens` : ''}`}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
