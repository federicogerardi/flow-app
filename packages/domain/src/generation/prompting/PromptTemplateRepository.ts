import type { PromptTemplateId } from './PromptTemplateId';
import type { PromptVersion } from './PromptVersion';
import type { PromptTemplateContent } from './PromptTemplateContent';

export interface PromptTemplateRepository {
  findById(
    templateId: PromptTemplateId,
    version?: PromptVersion,
  ): Promise<PromptTemplateContent | null>;

  publishVersion(
    templateId: PromptTemplateId,
    version: PromptVersion,
    content: PromptTemplateContent,
  ): Promise<void>;

  listVersions(templateId: PromptTemplateId): Promise<PromptVersion[]>;
}
