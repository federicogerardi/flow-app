import { Box, Button, Card, CardContent, Typography, Alert, LinearProgress } from '@mui/material';
import { useMachine } from '@xstate/react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { api, ApiClientError } from '../../api/client';
import { PageHeader } from '../PageHeader';
import { useBreadcrumbs } from '../../layout/AppShell';
import { ErrorState } from '../ErrorState';
import { ReadinessSnapshot } from '../tool/ReadinessSnapshot';
import { SetupPanel, fetchToolDefinitions } from '../tool/SetupPanel';
import { FeedbackPanel } from '../tool/FeedbackPanel';
import { SessionSummary } from '../tool/SessionSummary';
import { CompletionBanner } from '../shared/CompletionBanner';
import { toolPageMachine } from '../../machines/tool-page-machine';
import { useSession } from '../../api/hooks';
import type { TextInput, FileInput } from '../../tool-inputs';
import { copy } from '@flow-app/copy';
import { useState } from 'react';

/** Read file content as text for API submission */
function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

interface ToolPageLayoutProps {
  workspaceId: string;
  toolKey: string;
}

export function ToolPageLayout({ workspaceId, toolKey }: ToolPageLayoutProps) {
  const navigate = useNavigate();
  const [state, send] = useMachine(toolPageMachine);
  const [toolDef, setToolDef] = useState<TextInput[]>([]);
  const [fileDef, setFileDef] = useState<FileInput[]>([]);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [loadingTool, setLoadingTool] = useState(true);
  const [creditCost, setCreditCost] = useState(1);
  const { setBreadcrumbs } = useBreadcrumbs();

  // Local state for submission/running/completed/failed — bypass XState async transition issue
  const [submitting, setSubmitting] = useState(false);
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localErrorCode, setLocalErrorCode] = useState<string | null>(null);
  const [phaseOverride, setPhaseOverride] = useState<'running' | 'completed' | 'failed' | null>(null);

  const phase = phaseOverride ?? (state.value as string);
  const { inputs } = state.context;
  const displaySessionId = localSessionId;
  const displayError = localError ?? state.context.error;
  const displayErrorCode = localErrorCode ?? state.context.errorCode;

  const title = toolKey?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Tool';

  // Debug: write phase to document title
  useEffect(() => {
    document.title = `[${phase}] ${title}${localSessionId ? ` #${localSessionId.slice(0,8)}` : ''}`;
  }, [phase, title, localSessionId]);

  // Set breadcrumbs via context (L1)
  useEffect(() => {
    setBreadcrumbs([
      { label: copy.t('workspace.nav.home'), path: `/workspaces/${workspaceId}` },
      { label: title },
    ]);
  }, [workspaceId, title, setBreadcrumbs]);

  // Load tool definition + credit cost on mount
  useEffect(() => {
    setLoadingTool(true);
    // Reset file state when tool changes
    setFiles({});
    Promise.all([
      fetchToolDefinitions(toolKey),
    ])
      .then(([defs]) => {
        setToolDef(defs.textInputs);
        setFileDef(defs.fileInputs);
        setCreditCost(defs.creditCost);
      })
      .finally(() => setLoadingTool(false));
  }, [toolKey]);

  // SSE session tracking when running
  const { session, progress } = useSession(
    phase === 'running' || phase === 'completed' ? displaySessionId : null,
  );

  // React to session completion via SSE — override to completed/failed
  useEffect(() => {
    if (session?.status === 'completed' && phaseOverride === 'running') {
      setPhaseOverride('completed');
    }
    if (session?.status === 'failed' && phaseOverride === 'running') {
      setPhaseOverride('failed');
      setLocalError('Session failed');
    }
  }, [session?.status, phaseOverride]);

  const textMissing = toolDef.some(
    (input) => input.required && !inputs[input.key]?.trim(),
  );
  const fileMissing = fileDef.some(
    (input) => input.required && !files[input.key],
  );
  const requiredMissing = textMissing || fileMissing;

  const handleInputChange = (key: string, value: string) => {
    send({ type: 'CONFIGURE', key, value });
  };

  const handleFileChange = (key: string, file: File | null) => {
    setFiles((prev) => {
      const next = { ...prev };
      if (file) {
        next[key] = file;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setLocalError(null);
    setLocalErrorCode(null);
    try {
      // Read file contents for API submission
      const fileContents: { key: string; content: string }[] = [];
      for (const [key, file] of Object.entries(files)) {
        try {
          const content = await readFileContent(file);
          fileContents.push({ key, content });
        } catch {
          // File read failed — submit without this file
        }
      }

      const result = await api.startSession(toolKey, {
        workspaceId,
        inputs: {
          text: inputs,
          files: fileContents.length > 0 ? fileContents : undefined,
        },
      });

      setLocalSessionId(result.session.id);
      setSubmitting(false);
      setPhaseOverride('running');
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiClientError) {
        setLocalError(err.message);
        setLocalErrorCode(err.code);
      } else {
        setLocalError(err instanceof Error ? err.message : copy.t('errors.generation.failedToStart'));
      }
    }
  };

  return (
    <Box>
      <PageHeader title={title} />

      {/* Quota errors */}
      {(displayError) && (displayErrorCode === 'QUOTA_EXCEEDED' || displayErrorCode === 'ARTIFACT_GATE_EXCEEDED') && (
        <Alert severity="error" sx={{ mb: 2 }}>{displayError}</Alert>
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
                    fileDef={fileDef.length > 0 ? fileDef : undefined}
                    files={files}
                    onFileChange={handleFileChange}
                  />
                </Box>
                <ReadinessSnapshot
                  inputs={inputs}
                  toolDef={toolDef}
                  fileDef={fileDef.length > 0 ? fileDef : undefined}
                  files={files}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={requiredMissing}
                    size="large"
                  >
                    {copy.t('toolPage.cta.submit')}
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    {creditCost} credit{creditCost !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Phase: submitting */}
      {submitting && (
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
            <SessionSummary artifacts={session.artifacts} workspaceId={workspaceId} produces={session.produces} />
          )}
           <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => { send({ type: 'RESET' }); setPhaseOverride(null); setLocalSessionId(null); setSubmitting(false); }}>
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
          {(displayError && !displayErrorCode) && <ErrorState message={displayError} onRetry={() => send({ type: 'SUBMIT' })} />}
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => { send({ type: 'RESET' }); setPhaseOverride(null); setLocalSessionId(null); setSubmitting(false); }}>
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
