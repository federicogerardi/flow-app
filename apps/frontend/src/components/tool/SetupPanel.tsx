import { TextField, MenuItem, Box, Typography, TextareaAutosize, FormControl, FormLabel, Button, Paper } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { TextInput as ToolTextInput, FileInput as ToolFileInput } from '../../tool-inputs';

interface SetupPanelProps {
  inputs: Record<string, string>;
  toolDef: ToolTextInput[];
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
  /** File acquisition support */
  fileDef?: ToolFileInput[];
  files?: Record<string, File>;
  onFileChange?: (key: string, file: File | null) => void;
}

export function SetupPanel({ inputs, toolDef, onChange, disabled = false, fileDef, files = {}, onFileChange }: SetupPanelProps) {
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
                  borderColor: 'rgba(0,0,0,0.23)',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  resize: 'vertical',
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
                      borderColor: 'rgba(0,0,0,0.23)',
                      bgcolor: 'grey.50',
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
                      Click to upload or drag and drop
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      Accepted: {fileInput.accept.join(', ')}
                      {fileInput.maxSizeMb && ` (max ${fileInput.maxSizeMb}MB)`}
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
                        Remove
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

      {toolDef.length === 0 && !fileDef?.length && (
        <Typography variant="body2" color="text.secondary">
          No inputs required. You can start the generation directly.
        </Typography>
      )}
    </Box>
  );
}

/** Data returned by fetchToolDefinitions */
export interface ToolDefinitionData {
  textInputs: ToolTextInput[];
  fileInputs: ToolFileInput[];
  creditCost: number;
}

/** Fetch tool definitions (text + file inputs + credit cost) from the API in a single call */
export async function fetchToolDefinitions(toolKey: string): Promise<ToolDefinitionData> {
  const base = import.meta.env.VITE_API_URL as string || '';
  const resp = await fetch(`${base}/api/tools`, { credentials: 'include' });
  if (!resp.ok) return { textInputs: [], fileInputs: [], creditCost: 1 };

  interface ApiToolResponse {
    tools: Array<{
      toolKey: string;
      creditCost: number;
      acquisition: {
        userText: ToolTextInput[];
        files: ToolFileInput[];
      };
    }>;
  }

  const { tools } = await resp.json() as ApiToolResponse;
  const tool = tools.find((t) => t.toolKey === toolKey);
  return {
    textInputs: tool?.acquisition?.userText ?? [],
    fileInputs: tool?.acquisition?.files ?? [],
    creditCost: tool?.creditCost ?? 1,
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
