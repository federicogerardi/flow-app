import { Box, Button, Card, CardContent, Typography, Alert, LinearProgress } from '@mui/material';
import { useMachine } from '@xstate/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../api/client';
import { PageHeader } from '../PageHeader';
import { useBreadcrumbs } from '../../layout/AppShell';
import { ErrorState } from '../ErrorState';
import { ReadinessSnapshot } from '../tool/ReadinessSnapshot';
import { SetupPanel, fetchToolDefinitions } from '../tool/SetupPanel';
import { FeedbackPanel } from '../tool/FeedbackPanel';
import { SessionSummary } from '../tool/SessionSummary';
import { CompletionBanner } from '../shared/CompletionBanner';
import { toolPageMachine } from '../../machines/tool-page-machine';
import type { ToolDefinition, TextInput, FileInput, AssetInput } from '../../tool-inputs';
import { copy } from '@flow-app/copy';
import { AssetPicker } from '../shared/AssetPicker';
import { ASSET_LABELS, ASSET_TOOL_MAP } from '../workspace/AssetCoverageBar';

// ── UI state derivation ────────────────────────────────────────────────────────

type UIState = 'loading' | 'setup' | 'submitting' | 'progress' | 'completed' | 'failed' | 'cancelled';

function deriveUIState(state: { value: unknown }): UIState {
  const v = String(state.value);
  if (v === 'draftEmpty') return 'loading';
  if (v === 'configuring') return 'setup';
  if (v === 'ready') return 'setup';
  if (v === 'submitting') return 'submitting';
  if (v === 'running') return 'progress';
  if (v === 'completed') return 'completed';
  if (v === 'failed') return 'failed';
  if (v === 'cancelled') return 'cancelled';
  return 'loading';
}

// ── Component ──────────────────────────────────────────────────────────────────

interface ToolPageLayoutProps {
  workspaceId: string;
  toolKey: string;
}

export function ToolPageLayout({ workspaceId, toolKey }: ToolPageLayoutProps) {
  const navigate = useNavigate();
  const [state, send] = useMachine(toolPageMachine);
  const [workspaceAssets, setWorkspaceAssets] = useState<Array<{ id: string; assetType: string; name: string | null; createdAt: string }>>([]);
  const { setBreadcrumbs } = useBreadcrumbs();

  const uiState = deriveUIState(state);
  const { tool, inputs, session, artifacts, progress, error } = state.context;

  // Derived readiness
  const textMissing = (tool?.textInputs ?? []).some(
    (input: TextInput) => input.required && !inputs.text[input.key]?.trim(),
  );
  const fileMissing = (tool?.fileInputs ?? []).some(
    (input: FileInput) => input.required && !inputs.files[input.key],
  );
  const assetMissing = (tool?.assetInputs ?? []).some((def: AssetInput) => {
    if (!def.required) return false;
    const selectedOfType = inputs.selectedAssetsByType[def.assetType];
    return !selectedOfType || selectedOfType.length === 0;
  });
  const requiredMissing = textMissing || fileMissing || assetMissing;

  const title = toolKey?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Tool';

  // Debug: write phase to document title
  useEffect(() => {
    document.title = `[${uiState}] ${title}${session?.id ? ` #${session.id.slice(0,8)}` : ''}`;
  }, [uiState, title, session?.id]);

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: copy.t('workspace.nav.home'), path: `/workspaces/${workspaceId}` },
      { label: title },
    ]);
  }, [workspaceId, title, setBreadcrumbs]);

  // Load tool definition via LOAD event
  useEffect(() => {
    fetchToolDefinitions(toolKey)
      .then((defs) => {
        const toolDef: ToolDefinition = {
          key: toolKey,
          label: title,
          textInputs: defs.textInputs,
          fileInputs: defs.fileInputs,
          assetInputs: defs.assetInputs,
          creditCost: defs.creditCost,
          stepCount: defs.stepCount,
        };
        send({ type: 'LOAD', tool: toolDef, workspaceId });
      })
      .catch(() => {
        // Fallback: create empty tool def
        const toolDef: ToolDefinition = {
          key: toolKey,
          label: title,
          textInputs: [],
          fileInputs: [],
          assetInputs: [],
          creditCost: 1,
          stepCount: 1,
        };
        send({ type: 'LOAD', tool: toolDef, workspaceId });
      });
  }, [toolKey, workspaceId, send, title]);

  // Load workspace assets
  useEffect(() => {
    api.listAssets(workspaceId)
      .then((data) => setWorkspaceAssets(data.assets ?? []))
      .catch(() => {});
  }, [workspaceId]);

  // Handle input changes — send CONFIGURE with partial inputs
  const handleInputChange = (key: string, value: string) => {
    send({ type: 'CONFIGURE', inputs: { text: { [key]: value } } });
  };

  const handleFileChange = (key: string, file: File | null) => {
    if (file) {
      send({ type: 'CONFIGURE', inputs: { files: { [key]: file } } });
    } else {
      // Remove file — send empty object for that key
      const newFiles = { ...inputs.files };
      delete newFiles[key];
      send({ type: 'CONFIGURE', inputs: { files: newFiles } });
    }
  };

  const handleAssetSelectionChange = (selectedIds: string[]) => {
    // Group by asset type
    const selectedAssetsByType: Record<string, string[]> = {};
    for (const asset of workspaceAssets) {
      if (selectedIds.includes(asset.id)) {
        if (!selectedAssetsByType[asset.assetType]) {
          selectedAssetsByType[asset.assetType] = [];
        }
        selectedAssetsByType[asset.assetType].push(asset.id);
      }
    }
    send({ type: 'CONFIGURE', inputs: { selectedAssetIds: selectedIds, selectedAssetsByType } });
  };

  return (
    <Box>
      <PageHeader title={title} />

      {/* Quota errors */}
      {error && (error.code === 'QUOTA_EXCEEDED' || error.code === 'ARTIFACT_GATE_EXCEEDED') && (
        <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>
      )}

      {/* UI State: loading */}
      {uiState === 'loading' && (
        <Card>
          <CardContent>
            <LinearProgress sx={{ mb: 3 }} />
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {copy.t('shared.status.loading')}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* UI State: setup */}
      {uiState === 'setup' && tool && (
        <Card>
          <CardContent>
            <Typography variant="h3" sx={{ mb: 2 }}>
              {copy.t('toolPage.config.title')}
            </Typography>

            <Box sx={{ mb: 3 }}>
              <SetupPanel
                inputs={inputs.text}
                toolDef={tool.textInputs}
                onChange={handleInputChange}
                disabled={false}
                fileDef={tool.fileInputs.length > 0 ? tool.fileInputs : undefined}
                files={inputs.files}
                onFileChange={handleFileChange}
                assetDef={tool.assetInputs.length > 0 ? tool.assetInputs : undefined}
              />
            </Box>
            {tool.assetInputs.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <AssetPicker
                  assetDef={tool.assetInputs}
                  workspaceAssets={workspaceAssets}
                  selectedAssets={inputs.selectedAssetIds}
                  onSelectionChange={handleAssetSelectionChange}
                  onCreateAsset={(assetType) => {
                    const targetToolKey = ASSET_TOOL_MAP[assetType];
                    if (targetToolKey) {
                      navigate(`/workspaces/${workspaceId}/tools/${targetToolKey}`);
                    }
                  }}
                  assetLabels={ASSET_LABELS}
                />
              </Box>
            )}
            <ReadinessSnapshot
              inputs={inputs.text}
              toolDef={tool.textInputs}
              fileDef={tool.fileInputs.length > 0 ? tool.fileInputs : undefined}
              files={inputs.files}
              assetDef={tool.assetInputs.length > 0 ? tool.assetInputs : undefined}
              selectedAssets={inputs.selectedAssetIds}
              workspaceAssets={workspaceAssets}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => send({ type: 'SUBMIT' })}
                disabled={uiState !== 'setup' || requiredMissing}
                size="large"
              >
                {copy.t('toolPage.cta.submit')}
              </Button>
              <Typography variant="body2" color="text.secondary">
                {copy.t('toolPage.config.creditCost', { count: String(tool.creditCost) })}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* UI State: submitting */}
      {uiState === 'submitting' && (
        <Card>
          <CardContent>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {copy.t('toolPage.cta.submitting')}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* UI State: progress */}
      {uiState === 'progress' && (
        <Card>
          <CardContent>
            <FeedbackPanel
              progress={progress}
              status="running"
              artifacts={artifacts}
            />
          </CardContent>
        </Card>
      )}

      {/* UI State: completed */}
      {uiState === 'completed' && (
        <>
          <CompletionBanner
            durationSeconds={0}
            stepCount={tool?.stepCount ?? 1}
            creditCost={tool?.creditCost ?? 1}
          />
          {artifacts.length > 0 && (
            <SessionSummary artifacts={artifacts} workspaceId={workspaceId} produces={tool?.produces} />
          )}
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => send({ type: 'RETRY' })}>
              {copy.t('toolPage.cta.new')}
            </Button>
            <Button variant="outlined" onClick={() => navigate(`/workspaces/${workspaceId}`)}>
              {copy.t('workspace.nav.backToWorkspace')}
            </Button>
          </Box>
        </>
      )}

      {/* UI State: failed */}
      {uiState === 'failed' && (
        <>
          {error && <ErrorState message={error.message} onRetry={() => send({ type: 'RETRY' })} />}
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => send({ type: 'RESET' })}>
              {copy.t('shared.actions.retry')}
            </Button>
            <Button variant="outlined" onClick={() => navigate(`/workspaces/${workspaceId}`)}>
              {copy.t('workspace.nav.backToWorkspace')}
            </Button>
          </Box>
        </>
      )}

      {/* UI State: cancelled */}
      {uiState === 'cancelled' && (
        <>
          <ErrorState message="La generazione è stata annullata." onRetry={() => send({ type: 'RETRY' })} />
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button variant="contained" onClick={() => send({ type: 'RESET' })}>
              {copy.t('toolPage.cta.new')}
            </Button>
            <Button variant="outlined" onClick={() => navigate(`/workspaces/${workspaceId}`)}>
              {copy.t('workspace.nav.backToWorkspace')}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
