import { Box, TextField, Button, Alert } from '@mui/material';
import { useState } from 'react';
import { copy } from '@flow-app/copy';

interface ChatInputProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await onSend(newMessage.trim());
      setNewMessage('');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send message');
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

  return (
    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
      {sendError && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setSendError(null)}>
          {sendError}
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          size="small"
          multiline
          maxRows={4}
        />
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={disabled || sending || !newMessage.trim()}
        >
          {sending ? '...' : copy.t('shared.actions.send')}
        </Button>
      </Box>
    </Box>
  );
}
