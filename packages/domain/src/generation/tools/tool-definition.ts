import type { ToolKeyValue } from '../value-objects/ToolKey';
import type { ModelTier } from '../value-objects/ModelTier';

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
  multiple?: boolean;
}

export interface ApiCallInput {
  source: string;
  config: Record<string, unknown>;
  cache: { enabled: boolean; ttlSeconds: number };
}

export interface StepPromptDefinition {
  /** Legacy template path (backward compatibility) */
  template?: string;
  /** Versioned template identity (e.g. "blog-post/seo-structure") */
  templateId?: string;
  /** Prompt version: semver or "latest" */
  version?: string;
  /** Model tier for this step */
  model: ModelTier;
  /** Component keys to include (overrides tool defaults) */
  components?: string[];
}

export interface StepDefinition {
  order: number;
  label: string;
  prompt: StepPromptDefinition;
  enrichment: 'serial' | 'hybrid';
  apiSources?: string[];
  execution: {
    timeoutMs: number;
    maxRetries: number;
  };
}

export interface ToolDefinition {
  toolKey: ToolKeyValue;
  name: string;
  description: string;
  creditCost?: number;
  produces?: string;
  defaultComponents?: string[];
  acquisition: {
    userText?: TextInput[];
    files?: FileInput[];
    apiCalls?: ApiCallInput[];
    assets?: AssetInput[];
  };
  steps: StepDefinition[];
}
