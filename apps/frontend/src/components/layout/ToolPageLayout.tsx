import { Box, Button, Card, CardContent, Typography, Alert, LinearProgress } from '@mui/material';
import { useMachine } from '@xstate/react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { api, ApiClientError } from '../../api/client';
import { PageHeader } from '../PageHeader';
import { ErrorState } from '../ErrorState';
import { ReadinessSnapshot } from '../tool/ReadinessSnapshot';
import { SetupPanel, fetchToolInputs } from '../tool/SetupPanel';
import { FeedbackPanel } from '../tool/FeedbackPanel';
import { SessionSummary } from '../tool/SessionSummary';
import { CompletionBanner } from '../shared/CompletionBanner';
import { toolPageMachine } from '../../machines/tool-page-machine';
import { useSession } from '../../api/hooks';
import type { TextInput } from '../../tool-inputs';
import { copy } from '@flow-app/copy';
import { useState } from 'react';

interface ToolPageLayoutProps {
  workspaceId: string;
  toolKey: string;
}

export function ToolPageLayout({ workspaceId, toolKey }: ToolPageLayoutProps) {
  const navigate = useNavigate();
  const [state, send] = useMachine(toolPageMachine);
  const [toolDef, setToolDef] = useState<TextInput[]>([]);
  const [loadingTool, setLoadingTool] = useState(true);

  const phase = state.value as string;
  const { inputs, error, errorCode, sessionId } = state.context;

  // Load tool definition on mount
  useEffect(() => {
    setLoadingTool(true);
    fetchToolInputs(toolKey)
      .then(setToolDef)
      .finally(() => setLoadingTool(false));
  }, [toolKey]);

  // SSE session tracking when running
  const { session, progress } = useSession(
    phase === 'running' || phase === 'completed' ? sessionId : null,
  );

  // React to session completion via SSE
  useEffect(() => {
    if (session?.status === 'completed' && phase === 'running') {
      send({ type: 'SESSION_COMPLETED' });
    }
    if (session?.status === 'failed' && phase === 'running') {
      send({ type: 'SESSION_FAILED', error: 'Session failed' });
    }
  }, [session?.status, phase, send]);

  const requiredMissing = toolDef.some(
    (input) => input.required && !inputs[input.key]?.trim(),
  );

  const handleInputChange = (key: string, value: string) => {
    send({ type: 'CONFIGURE', key, value });
  };

  const handleSubmit = async () => {
    send({ type: 'SUBMIT' });
    try {
      const result = await api.startSession(toolKey, { workspaceId, inputs });
      send({ type: 'SESSION_STARTED', sessionId: result.session.id });
    } catch (err) {
      if (err instanceof ApiClientError) {
        send({
          type: 'SESSION_FAILED',
          error: err.message,
          code: err.code,
        });
      } else {
        send({
          type: 'SESSION_FAILED',
          error: err instanceof Error ? err.message : copy.t('errors.generation.failedToStart'),
        });
      }
    }
  };

  const title = toolKey?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Tool';

  return (
    <Box>
      <PageHeader
        title={title}
        breadcrumbs={[
          { label: copy.t('workspace.nav.home'), path: `/workspaces/${workspaceId}` },
          { label: toolKey },
        ]}
      />

      {/* Quota errors */}
      {error && (errorCode === 'QUOTA_EXCEEDED' || errorCode === 'ARTIFACT_GATE_EXCEEDED') && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {/* Phase: configuring */}
      {(phase === 'configuring' || phase === 'draftEmpty' || phase === 'ready') && (
        <Card>
          <CardContent>
            <Typography variant="h3" sx={{ mb: 2 }}>
              {copy.t('toolPage.config.title')}
            </Typography>

            {loadingTool ? (
              <LinearProgress sx={{ mb: 3 }} />
            ) : (
              <>
                <Box sx={{ mb: 3 }}>
                  <SetupPanel
                    inputs={inputs}
                    toolDef={toolDef}
                    onChange={handleInputChange}
                    disabled={false}
                  />
                </Box>
                <ReadinessSnapshot inputs={inputs} toolDef={toolDef} />
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={requiredMissing}
                  size="large"
                >
                  {copy.t('toolPage.cta.submit')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Phase: submitting */}
      {phase === 'submitting' && (
        <Card>
          <CardContent>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {copy.t('toolPage.cta.submitting')}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Phase: running */}
      {phase === 'running' && (
        <Card>
          <CardContent>
            <FeedbackPanel progress={progress} status="running" />
          </CardContent>
        </Card>
      )}

      {/* Phase: completed */}
      {phase === 'completed' && (
        <>
          <CompletionBanner
            durationSeconds={0}
            stepCount={toolDef.length || 1}
            creditCost={1}
          />
          {session?.artifacts && (
            <SessionSummary artifacts={session.artifacts} workspaceId={workspaceId} />
          )}
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => send({ type: 'RESET' })}>
              New Generation
            </Button>
            <Button variant="outlined" onClick={() => navigate(`/workspaces/${workspaceId}`)}>
              Back to Workspace
            </Button>
          </Box>
        </>
      )}

      {/* Phase: failed */}
      {phase === 'failed' && (
        <>
          {error && !errorCode && <ErrorState message={error} onRetry={() => send({ type: 'SUBMIT' })} />}
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => send({ type: 'RESET' })}>
              Try Again
            </Button>
            <Button variant="outlined" onClick={() => navigate(`/workspaces/${workspaceId}`)}>
              Back to Workspace
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
