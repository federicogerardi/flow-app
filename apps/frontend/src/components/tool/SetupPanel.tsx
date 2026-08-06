import { TextField, MenuItem, Box, Typography, TextareaAutosize, FormControl, FormLabel, Button, Paper, useTheme } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { TextInput as ToolTextInput, FileInput as ToolFileInput, AssetInput as ToolAssetInput } from '../../tool-inputs';
import { copy } from '@flow-app/copy';

interface SetupPanelProps {
  inputs: Record<string, string>;
  toolDef: ToolTextInput[];
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
  /** File acquisition support */
  fileDef?: ToolFileInput[];
  files?: Record<string, File>;
  onFileChange?: (key: string, file: File | null) => void;
  /** Asset acquisition — used to show correct empty-state message */
  assetDef?: ToolAssetInput[];
}

export function SetupPanel({ inputs, toolDef, onChange, disabled = false, fileDef, files = {}, onFileChange, assetDef }: SetupPanelProps) {
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Text inputs */}
      {toolDef.map((input) => {
        if (input.type === 'long') {
          return (
            <FormControl key={input.key} fullWidth disabled={disabled}>
              <FormLabel required={input.required} sx={{ mb: 0.5, fontSize: '0.75rem', fontWeight: 500 }}>
                {input.label}
              </FormLabel>
              <TextareaAutosize
                id={input.key}
                placeholder={input.placeholder}
                value={inputs[input.key] ?? ''}
                onChange={(e) => onChange(input.key, e.target.value)}
                minRows={3}
                maxRows={10}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: theme.palette.divider,
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                }}
              />
              {input.description && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
                  {input.description}
                </Typography>
              )}
            </FormControl>
          );
        }

        return (
          <TextField
            key={input.key}
            label={input.label}
            placeholder={input.placeholder}
            value={inputs[input.key] ?? ''}
            onChange={(e) => onChange(input.key, e.target.value)}
            required={input.required}
            disabled={disabled}
            select={input.type === 'select'}
            sx={{ maxWidth: 400 }}
            helperText={input.description}
          >
            {input.type === 'select' && input.options?.map((opt) => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </TextField>
        );
      })}

      {/* File inputs */}
      {fileDef && fileDef.length > 0 && (
        <Box sx={{ mt: 1 }}>
          {fileDef.map((fileInput) => {
            const selectedFile = files[fileInput.key];
            const acceptStr = fileInput.accept.join(',');

            return (
              <FormControl key={fileInput.key} fullWidth disabled={disabled}>
                <FormLabel required={fileInput.required} sx={{ mb: 0.5, fontSize: '0.75rem', fontWeight: 500 }}>
                  {fileInput.label}
                </FormLabel>
                {!selectedFile ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      borderStyle: 'dashed',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      cursor: disabled ? 'default' : 'pointer',
                      '&:hover': disabled ? {} : { borderColor: 'primary.main', bgcolor: 'action.hover' },
                    }}
                    component="label"
                  >
                    <input
                      type="file"
                      accept={acceptStr}
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        onFileChange?.(fileInput.key, file);
                      }}
                    />
                    <UploadFileIcon color="action" sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      {copy.t('toolPage.config.fileUploadHint')}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {copy.t('toolPage.config.acceptedFormats', { formats: fileInput.accept.join(', ') })}
                      {fileInput.maxSizeMb && ` ${copy.t('toolPage.config.maxFileSize', { size: String(fileInput.maxSizeMb) })}`}
                    </Typography>
                  </Paper>
                ) : (
                  <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <UploadFileIcon color="primary" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2">{selectedFile.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </Typography>
                    </Box>
                    {!disabled && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => onFileChange?.(fileInput.key, null)}
                      >
                        {copy.t('shared.actions.remove')}
                      </Button>
                    )}
                  </Paper>
                )}
                {fileInput.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
                    {fileInput.description}
                  </Typography>
                )}
              </FormControl>
            );
          })}
        </Box>
      )}

      {toolDef.length === 0 && !fileDef?.length && !assetDef?.length && (
        <Typography variant="body2" color="text.secondary">
          {copy.t('toolPage.readiness.noInputsRequired')}
        </Typography>
      )}
      {toolDef.length === 0 && !fileDef?.length && (assetDef?.length ?? 0) > 0 && (
        <Typography variant="body2" color="text.secondary">
          {copy.t('toolPage.readiness.assetsOnly')}
        </Typography>
      )}
    </Box>
  );
}

/** Data returned by fetchToolDefinitions */
export interface ToolDefinitionData {
  textInputs: ToolTextInput[];
  fileInputs: ToolFileInput[];
  assetInputs: ToolAssetInput[];
  creditCost: number;
  /** Total number of pipeline steps (extraction + generation, etc.) */
  stepCount: number;
}

/** Fetch tool definitions (text + file + asset inputs + credit cost) from the API in a single call */
export async function fetchToolDefinitions(toolKey: string): Promise<ToolDefinitionData> {
  const base = import.meta.env.VITE_API_URL as string || '';
  const resp = await fetch(`${base}/api/tools`, { credentials: 'include' });
  if (!resp.ok) return { textInputs: [], fileInputs: [], assetInputs: [], creditCost: 1, stepCount: 1 };

interface ApiToolResponse {
      tools: Array<{
        toolKey: string;
        creditCost: number;
        stepCount?: number;
        acquisition: {
          userText: ToolTextInput[];
          files: ToolFileInput[];
          assets: ToolAssetInput[];
        };
      }>;
    }

  const { tools } = await resp.json() as ApiToolResponse;
  const tool = tools.find((t) => t.toolKey === toolKey);
  return {
    textInputs: tool?.acquisition?.userText ?? [],
    fileInputs: tool?.acquisition?.files ?? [],
    assetInputs: tool?.acquisition?.assets ?? [],
    creditCost: tool?.creditCost ?? 1,
    stepCount: tool?.stepCount ?? (tool?.acquisition?.userText?.length || tool?.acquisition?.files?.length || 1),
  };
}

/**
 * @deprecated Use fetchToolDefinitions() instead — returns both text and file inputs.
 * Kept for backward compatibility with components that only need text inputs.
 */
export async function fetchToolInputs(toolKey: string): Promise<ToolTextInput[]> {
  const { textInputs } = await fetchToolDefinitions(toolKey);
  return textInputs;
}