import { Box, Button, Card, CardContent, Typography, Alert, LinearProgress } from '@mui/material';
import { useMachine } from '@xstate/react';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../api/client';
import { PageHeader } from '../PageHeader';
import { useBreadcrumbs } from '../../layout/AppShell';
import { ReadinessSnapshot } from '../tool/ReadinessSnapshot';
import { SetupPanel, fetchToolDefinitions } from '../tool/SetupPanel';
import { toolPageMachine } from '../../machines/tool-page-machine';
import type { ToolDefinition, TextInput, FileInput, AssetInput } from '../../tool-inputs';
import { copy } from '@flow-app/copy';
import { AssetPicker } from '../shared/AssetPicker';
import { ASSET_TOOL_MAP } from '../../constants/assets';
import { ASSET_TYPE_LABELS } from '../../constants/assets';

// ── UI state derivation ────────────────────────────────────────────────────────

type UIState = 'loading' | 'setup' | 'submitting';

function deriveUIState(state: { value: unknown }): UIState {
  const v = String(state.value);
  if (v === 'draftEmpty') return 'loading';
  if (v === 'configuring') return 'setup';
  if (v === 'ready') return 'setup';
  if (v === 'submitting') return 'submitting';
  if (v === 'submitted') return 'submitting'; // brief flash before redirect
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
  const navigateRef = useRef(navigate);
  const [stuck, setStuck] = useState(false);

  // Keep navigate stable in ref
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  const uiState = deriveUIState(state);
  const { tool, inputs, session, replayed, error } = state.context;

  // ── Redirect to SessionPage after successful submit ────────────────────────
  useEffect(() => {
    if (state.matches('submitted') && session?.id) {
      const query = replayed ? '?replayed=true' : '';
      navigateRef.current(`/workspaces/${workspaceId}/sessions/${session.id}${query}`);
    }
  }, [state, session?.id, workspaceId, replayed]);

  // ── Escape hatch: if stuck in submitted state for 5s, show retry button ────
  useEffect(() => {
    if (!state.matches('submitted')) {
      setStuck(false);
      return;
    }
    const timer = setTimeout(() => setStuck(true), 5000);
    return () => clearTimeout(timer);
  }, [state]);

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
    document.title = `[${uiState}] ${title}${session?.id ? ` #${session.id.slice(0, 8)}` : ''}`;
  }, [uiState, title, session?.id]);

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: copy.t('workspace.nav.home'), path: `/workspaces/${workspaceId}` },
      { label: title },
    ]);
  }, [workspaceId, title, setBreadcrumbs]);

  // Load tool definition via LOAD event — resets on toolKey change
  useEffect(() => {
    let cancelled = false;
    fetchToolDefinitions(toolKey)
      .then((defs) => {
        if (cancelled) return;  // ignore stale responses
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
        if (cancelled) return;  // ignore stale errors
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
    return () => { cancelled = true; };
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
      // Remove file — send updated files map without that key
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
        <Alert severity="error" sx={{ mb: 2 }} role="alert">{error.message}</Alert>
      )}
      {error && error.code !== 'QUOTA_EXCEEDED' && error.code !== 'ARTIFACT_GATE_EXCEEDED' && (
        <Alert severity="error" sx={{ mb: 2 }} role="alert">
          {copy.t('errors.generation.failedToStart')}: {error.message}
        </Alert>
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
                  assetLabels={ASSET_TYPE_LABELS}
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
            {stuck && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {copy.t('shared.status.error')}
                </Typography>
                <Button variant="outlined" size="small" onClick={() => send({ type: 'RESET' })}>
                  {copy.t('shared.actions.retry')}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}