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

    for (const asset of input.acquisitionData.resolvedAssets.entries()) {
      parts.push(`[Asset - ${asset[0]}]\n${asset[1]}`);
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
