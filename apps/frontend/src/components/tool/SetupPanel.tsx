import { TextField, MenuItem, Box, Typography, TextareaAutosize, FormControl, FormLabel } from '@mui/material';
import type { TextInput as ToolTextInput } from '../../tool-inputs';

interface SetupPanelProps {
  inputs: Record<string, string>;
  toolDef: ToolTextInput[];
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
}

export function SetupPanel({ inputs, toolDef, onChange, disabled = false }: SetupPanelProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {toolDef.map((input) => {
        // Long text: use TextareaAutosize per spec (minRows=3, maxRows=10)
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
      {toolDef.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No inputs required. You can start the generation directly.
        </Typography>
      )}
    </Box>
  );
}

/** Fetch tool definitions from the API and convert to TextInput format */
export async function fetchToolInputs(toolKey: string): Promise<ToolTextInput[]> {
  const base = import.meta.env.VITE_API_URL as string || '';
  const resp = await fetch(`${base}/api/tools`, { credentials: 'include' });
  if (!resp.ok) return [];
  const { tools } = await resp.json() as { tools: Array<{ toolKey: string; acquisition: { userText: ToolTextInput[] } }> };
  const tool = tools.find((t) => t.toolKey === toolKey);
  return tool?.acquisition?.userText ?? [];
}
