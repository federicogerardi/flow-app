import type { PromptVersion } from './PromptVersion';
import { DomainError } from '../../shared/domain-error';

export type PromptComponentType =
  | 'system_rule'
  | 'format_constraint'
  | 'safety_guard'
  | 'style_guide'
  | 'domain_knowledge';

export class PromptComponent {
  private constructor(
    readonly componentKey: string,
    readonly type: PromptComponentType,
    readonly content: string,
    readonly version: PromptVersion,
    readonly description: string,
  ) {}

  static create(
    componentKey: string,
    type: PromptComponentType,
    content: string,
    version: PromptVersion,
    description: string,
  ): PromptComponent {
    if (!content.trim()) {
      throw new EmptyComponentContentError();
    }
    return new PromptComponent(componentKey, type, content, version, description);
  }

  static fromFile(
    componentKey: string,
    type: PromptComponentType,
    content: string,
    version: PromptVersion,
    description: string,
  ): PromptComponent {
    return new PromptComponent(componentKey, type, content, version, description);
  }
}

export class EmptyComponentContentError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor() {
    super('Component content must not be empty');
  }
}
