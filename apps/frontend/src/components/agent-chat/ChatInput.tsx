import { Box, TextField, Button, Alert, Typography } from '@mui/material';
import { useState } from 'react';
import { copy } from '@flow-app/copy';

const MAX_LENGTH = 4000;
const WARNING_THRESHOLD = 0.9; // 90% → 3600 chars

interface ChatInputProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const charCount = newMessage.length;
  const isOverLimit = charCount > MAX_LENGTH;

  const handleSend = async () => {
    if (!newMessage.trim() || sending || isOverLimit) return;
    setSending(true);
    setSendError(null);
    try {
      await onSend(newMessage.trim());
      setNewMessage('');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : copy.t('shared.chat.failedToSend'));
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

  const placeholder = disabled ? copy.t('shared.chat.typingReply') : copy.t('shared.chat.typeYourMessage');

  return (
    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
      {sendError && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setSendError(null)}>
          {sendError}
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <TextField
            fullWidth
            placeholder={placeholder}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || sending}
            size="small"
            multiline
            maxRows={4}
            inputProps={{ maxLength: MAX_LENGTH }}
            error={isOverLimit}
          />
          {/* Character counter (M8): warning at 90%, error at 100% */}
          {charCount > 0 && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'right',
                mt: 0.25,
                color:
                  isOverLimit
                    ? 'error.main'
                    : charCount >= MAX_LENGTH * WARNING_THRESHOLD
                      ? 'warning.main'
                      : 'text.secondary',
              }}
            >
              {charCount}/{MAX_LENGTH}
            </Typography>
          )}
        </Box>
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={disabled || sending || !newMessage.trim() || isOverLimit}
          aria-label={copy.t('shared.aria.sendMessage')}
        >
          {sending ? '...' : copy.t('shared.actions.send')}
        </Button>
      </Box>
    </Box>
  );
}
