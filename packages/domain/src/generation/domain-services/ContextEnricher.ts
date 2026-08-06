import type { StepDefinition } from '../tools/tool-definition';
import type { Artifact } from '../entities/Artifact';
import type { AcquisitionData } from '../value-objects/ReadinessPolicy';

interface EnrichContextInput {
  step: StepDefinition;
  previousResults: Artifact[];
  acquisitionData: AcquisitionData;
}

export class ContextEnricher {
  enrich(input: EnrichContextInput): string {
    const parts: string[] = [];

    if (input.step.enrichment === 'hybrid') {
      for (const apiResponse of input.acquisitionData.apiResponses) {
        if (input.step.apiSources?.includes(apiResponse.source)) {
          parts.push(`[API Data - ${apiResponse.source}]\n${JSON.stringify(apiResponse.data)}`);
        }
      }
    }

    for (const [type, contents] of input.acquisitionData.resolvedAssets.entries()) {
      if (contents.length === 1) {
        parts.push(`[Asset - ${type}]\n${contents[0]}`);
      } else {
        for (let i = 0; i < contents.length; i++) {
          parts.push(`[Asset - ${type} #${i + 1}]\n${contents[i]}`);
        }
      }
    }

    for (const [key, value] of Object.entries(input.acquisitionData.fileContents)) {
      parts.push(`[File - ${key}]\n${value}`);
    }

    for (const [key, value] of Object.entries(input.acquisitionData.userInputs)) {
      parts.push(`[Input - ${key}]\n${value}`);
    }

    for (const result of input.previousResults) {
      parts.push(`[Previous Step ${result.stepNumber}]\n${result.content}`);
    }

    return parts.join('\n\n');
  }
}
