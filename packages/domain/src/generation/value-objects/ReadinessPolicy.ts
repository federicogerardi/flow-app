import type { ToolDefinition } from '../tools/tool-definition';

export interface AcquisitionData {
  userInputs: Record<string, string>;
  fileContents: Record<string, string>;
  apiResponses: Array<{ source: string; data: unknown }>;
  resolvedAssets: Map<string, string>;
}

interface ReadinessResult {
  isReady: boolean;
  missing: Array<{ type: string; key: string; label: string }>;
}

export class ReadinessPolicy {
  private constructor(private readonly tool: ToolDefinition) {}

  static from(tool: ToolDefinition): ReadinessPolicy {
    return new ReadinessPolicy(tool);
  }

  evaluate(data: AcquisitionData): ReadinessResult {
    const missing: ReadinessResult['missing'] = [];

    if (this.tool.acquisition.userText) {
      for (const input of this.tool.acquisition.userText) {
        if (input.required && !data.userInputs[input.key]) {
          missing.push({ type: 'text', key: input.key, label: input.label });
        }
      }
    }

    if (this.tool.acquisition.files) {
      for (const file of this.tool.acquisition.files) {
        if (file.required && !data.fileContents[file.key]) {
          missing.push({ type: 'file', key: file.key, label: file.label });
        }
      }
    }

    if (this.tool.acquisition.assets) {
      for (const asset of this.tool.acquisition.assets) {
        if (asset.required && !data.resolvedAssets.has(asset.assetType)) {
          missing.push({ type: 'asset', key: asset.assetType, label: asset.assetType });
        }
      }
    }

    return { isReady: missing.length === 0, missing };
  }
}
