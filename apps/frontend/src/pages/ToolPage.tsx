import { Box, Button, Card, CardContent, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api } from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { ErrorState } from '../components/ErrorState';
import { copy } from '@flow-app/copy';

export default function ToolPage() {
  const { workspaceId, toolKey } = useParams<{ workspaceId: string; toolKey: string }>();
  const navigate = useNavigate();
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.message ?? copy.t('errors.generation.failedToStart'));
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
            <TextField
              label={copy.t('toolPage.config.topic')}
              placeholder={copy.t('toolPage.config.topicPlaceholder')}
              value={inputs.topic ?? ''}
              onChange={(e) => handleInputChange('topic', e.target.value)}
              fullWidth
            />
            <TextField
              label={copy.t('toolPage.config.language')}
              placeholder="it"
              value={inputs.language ?? ''}
              onChange={(e) => handleInputChange('language', e.target.value)}
              sx={{ maxWidth: 200 }}
            />
          </Box>

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || !inputs.topic}
            size="large"
          >
            {submitting ? copy.t('toolPage.cta.submitting') : copy.t('toolPage.cta.submit')}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
