import { Box, Button, Card, CardContent, MenuItem, TextField, Typography, Alert } from '@mui/material';
import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, ApiClientError } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { ErrorState } from '../components/ErrorState';
import { ReadinessSnapshot } from '../components/tool/ReadinessSnapshot';
import { getToolInputs, type TextInput } from '../tool-inputs';
import { copy } from '@flow-app/copy';

export default function ToolPage() {
  const { workspaceId, toolKey } = useParams<{ workspaceId: string; toolKey: string }>();
  const navigate = useNavigate();
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

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
    setErrorCode(null);
    try {
      const result = await api.startSession(toolKey, { workspaceId: workspaceId!, inputs });
      navigate(`/workspaces/${workspaceId}/sessions/${result.session.id}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorCode(err.code);
        if (err.code === 'QUOTA_EXCEEDED') {
          setError(copy.t('usage.quota.exhausted'));
        } else if (err.code === 'ARTIFACT_GATE_EXCEEDED') {
          setError(copy.t('usage.quota.artifactGateExceeded'));
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : copy.t('errors.generation.failedToStart'));
      }
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

      {error && (errorCode === 'QUOTA_EXCEEDED' || errorCode === 'ARTIFACT_GATE_EXCEEDED' ? (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      ) : (
        <ErrorState message={error} />
      ))}

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

          <ReadinessSnapshot inputs={inputs} toolDef={userInputs} />

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
