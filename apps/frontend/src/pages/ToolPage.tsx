import { Box, Button, Card, CardContent, MenuItem, TextField, Typography } from '@mui/material';
import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { ErrorState } from '../components/ErrorState';
import { getToolInputs, type TextInput } from '../tool-inputs';
import { copy } from '@flow-app/copy';

export default function ToolPage() {
  const { workspaceId, toolKey } = useParams<{ workspaceId: string; toolKey: string }>();
  const navigate = useNavigate();
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toolDef = toolKey ? getToolInputs(toolKey) : [];
  const userInputs: TextInput[] = toolDef;

  const requiredMissing = useMemo(
    () => userInputs.some((input) => input.required && !inputs[input.key]?.trim()),
    [userInputs, inputs],
  );

  const handleInputChange = (key: string, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!toolKey) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.startSession(toolKey, { workspaceId: workspaceId!, inputs });
      navigate(`/workspaces/${workspaceId}/sessions/${result.session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.t('errors.generation.failedToStart'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={toolKey?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Tool'}
        breadcrumbs={[
          { label: copy.t('workspace.nav.home'), path: workspaceId ? `/workspaces/${workspaceId}` : '/dashboard' },
          { label: toolKey ?? '' },
        ]}
      />

      {error && <ErrorState message={error} />}

      <Card>
        <CardContent>
          <Typography variant="h3" sx={{ mb: 2 }}>
            {copy.t('toolPage.config.title')}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            {userInputs.map((input) => (
              <TextField
                key={input.key}
                label={input.label}
                placeholder={input.placeholder}
                value={inputs[input.key] ?? ''}
                onChange={(e) => handleInputChange(input.key, e.target.value)}
                required={input.required}
                select={input.type === 'select'}
                fullWidth={input.type === 'long'}
                multiline={input.type === 'long'}
                rows={input.type === 'long' ? 4 : undefined}
                sx={input.type !== 'long' ? { maxWidth: 400 } : undefined}
              >
                {input.type === 'select' && input.options?.map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </TextField>
            ))}
          </Box>

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || requiredMissing}
            size="large"
          >
            {submitting ? copy.t('toolPage.cta.submitting') : copy.t('toolPage.cta.submit')}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
