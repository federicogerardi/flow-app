import { TextField, MenuItem, Box, Typography } from '@mui/material';
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
      {toolDef.map((input) => (
        <TextField
          key={input.key}
          label={input.label}
          placeholder={input.placeholder}
          value={inputs[input.key] ?? ''}
          onChange={(e) => onChange(input.key, e.target.value)}
          required={input.required}
          disabled={disabled}
          select={input.type === 'select'}
          fullWidth={input.type === 'long'}
          multiline={input.type === 'long'}
          rows={input.type === 'long' ? 4 : undefined}
          sx={input.type !== 'long' ? { maxWidth: 400 } : undefined}
          helperText={input.description}
        >
          {input.type === 'select' && input.options?.map((opt) => (
            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
          ))}
        </TextField>
      ))}
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
