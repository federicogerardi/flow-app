export interface TextInput {
  key: string;
  label: string;
  required: boolean;
  type?: 'short' | 'long' | 'select';
  placeholder?: string;
  options?: string[];
  description?: string;
}

export interface FileInput {
  key: string;
  label: string;
  accept: string[];
  required: boolean;
  description?: string;
  maxSizeMb?: number;
}

export interface AssetInput {
  assetType: string;
  required: boolean;
  multiple: boolean;
}

export interface ToolDefinition {
  key: string;
  label: string;
  textInputs: TextInput[];
  fileInputs: FileInput[];
  assetInputs: AssetInput[];
  creditCost: number;
  stepCount: number;
  produces?: string;
}

const BLOG_POST_INPUTS: TextInput[] = [
  { key: 'topic', label: 'Topic', required: true, type: 'short' },
  { key: 'language', label: 'Language', required: false, type: 'select', options: ['it', 'en'], placeholder: 'it' },
];

const AD_COPY_INPUTS: TextInput[] = [
  { key: 'goal', label: 'Campaign Goal', required: true, type: 'select', options: ['Awareness', 'Traffic', 'Engagement', 'Leads', 'Sales'] },
  { key: 'tone', label: 'Tone', required: false, type: 'select', options: ['Professional', 'Casual', 'Urgente', 'Empatico', 'Autorevole'] },
  { key: 'copyLength', label: 'Copy Length', required: true, type: 'select', options: ['short', 'medium', 'long'] },
];

const BRIEF_INPUTS: TextInput[] = [
  { key: 'objective', label: 'Obiettivo', required: true, type: 'long', placeholder: 'Descrivi obiettivo e contesto del brief...' },
];

const BRIEF_FILES: FileInput[] = [
  { key: 'briefing', label: 'Documento briefing', accept: ['.txt', '.md', '.docx'], required: true, description: 'Carica un documento briefing (.txt, .md, .docx)' },
];

const DEFAULT_INPUTS: TextInput[] = [
  { key: 'topic', label: 'Topic', required: true, type: 'short' },
  { key: 'language', label: 'Language', required: false, type: 'select', options: ['it', 'en'], placeholder: 'it' },
];

const TOOL_INPUTS: Record<string, TextInput[]> = {
  'blog-post': BLOG_POST_INPUTS,
  'landing-funnel': DEFAULT_INPUTS,
  'landing-page': DEFAULT_INPUTS,
  'video-script-long-form': DEFAULT_INPUTS,
  'video-description': DEFAULT_INPUTS,
  'ad-copy': AD_COPY_INPUTS,
  'brief': BRIEF_INPUTS,
  'brand-voice': [],   // no text inputs — uses brief asset + optional file
  'buyer-persona': [],   // no text inputs — uses brief asset + optional file
  'marketing-angle': [],   // no text inputs — uses brief + persona assets
  'ai-overview-analysis': DEFAULT_INPUTS,
};

const TOOL_FILES: Record<string, FileInput[]> = {
  'brief': BRIEF_FILES,
  'brand-voice': [
    { key: 'material', label: 'Materiale aggiuntivo', accept: ['.txt', '.md', '.docx'], required: false, description: 'Opzionale: specifiche aggiuntive sulla brand identity' },
  ],
  'buyer-persona': [
    { key: 'instructions', label: 'Dati supplementari', accept: ['.txt', '.md', '.docx'], required: false, description: 'Opzionale: survey, competitor analysis...' },
  ],
};

export function getToolInputs(toolKey: string): TextInput[] {
  return TOOL_INPUTS[toolKey] ?? DEFAULT_INPUTS;
}

export function getToolFiles(toolKey: string): FileInput[] {
  return TOOL_FILES[toolKey] ?? [];
}
