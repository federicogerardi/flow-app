import type { ToolKey } from '../value-objects/ToolKey';

export type ModelTier = 'premium' | 'balanced' | 'light' | 'search';

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
}

export interface ApiCallInput {
  source: string;
  config: Record<string, unknown>;
  cache: { enabled: boolean; ttlSeconds: number };
}

export interface StepDefinition {
  order: number;
  label: string;
  prompt: {
    template: string;
    model: ModelTier;
  };
  enrichment: 'serial' | 'hybrid';
  apiSources?: string[];
  execution: {
    timeoutMs: number;
    maxRetries: number;
  };
}

export interface ToolDefinition {
  toolKey: ToolKey;
  name: string;
  description: string;
  creditCost?: number;
  produces?: string;
  acquisition: {
    userText?: TextInput[];
    files?: FileInput[];
    apiCalls?: ApiCallInput[];
    assets?: AssetInput[];
  };
  steps: StepDefinition[];
}
