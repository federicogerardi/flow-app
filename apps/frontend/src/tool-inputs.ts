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

const BLOG_POST_INPUTS: TextInput[] = [
  { key: 'topic', label: 'Topic', required: true, type: 'short' },
  { key: 'language', label: 'Language', required: false, type: 'select', options: ['it', 'en'], placeholder: 'it' },
];

const AD_COPY_INPUTS: TextInput[] = [
  { key: 'platform', label: 'Platform', required: true, type: 'select', options: ['Meta', 'Google', 'LinkedIn', 'TikTok'] },
  { key: 'audience', label: 'Target Audience', required: true, type: 'short' },
  { key: 'goal', label: 'Campaign Goal', required: true, type: 'short' },
  { key: 'tone', label: 'Tone', required: false, type: 'short', placeholder: 'Professional' },
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
  'brand-voice': DEFAULT_INPUTS,
  'buyer-persona': DEFAULT_INPUTS,
  'marketing-angle': DEFAULT_INPUTS,
  'ai-overview-analysis': DEFAULT_INPUTS,
};

const TOOL_FILES: Record<string, FileInput[]> = {
  'brief': BRIEF_FILES,
};

export function getToolInputs(toolKey: string): TextInput[] {
  return TOOL_INPUTS[toolKey] ?? DEFAULT_INPUTS;
}

export function getToolFiles(toolKey: string): FileInput[] {
  return TOOL_FILES[toolKey] ?? [];
}
