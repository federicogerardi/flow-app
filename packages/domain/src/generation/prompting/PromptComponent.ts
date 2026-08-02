import type { PromptVersion } from './PromptVersion';
import { DomainError } from '../../shared/domain-error';

export class InvalidPromptComponentTypeError extends DomainError {
  readonly code = 'INVALID_PROMPT_COMPONENT_TYPE';
  readonly retryable = false;
  constructor(value: string) {
    super(`Invalid PromptComponentType: "${value}". Expected "system_rule", "format_constraint", "safety_guard", "style_guide", or "domain_knowledge".`);
  }
}

export class PromptComponentType {
  private static readonly VALID = new Set<string>(['system_rule', 'format_constraint', 'safety_guard', 'style_guide', 'domain_knowledge']);

  private constructor(private readonly _value: PromptComponentTypeValue) {}

  static readonly SystemRule = new PromptComponentType('system_rule');
  static readonly FormatConstraint = new PromptComponentType('format_constraint');
  static readonly SafetyGuard = new PromptComponentType('safety_guard');
  static readonly StyleGuide = new PromptComponentType('style_guide');
  static readonly DomainKnowledge = new PromptComponentType('domain_knowledge');

  static from(value: string): PromptComponentType {
    if (!PromptComponentType.VALID.has(value)) {
      throw new InvalidPromptComponentTypeError(value);
    }
    switch (value) {
      case 'system_rule': return PromptComponentType.SystemRule;
      case 'format_constraint': return PromptComponentType.FormatConstraint;
      case 'safety_guard': return PromptComponentType.SafetyGuard;
      case 'style_guide': return PromptComponentType.StyleGuide;
      case 'domain_knowledge': return PromptComponentType.DomainKnowledge;
      default: throw new InvalidPromptComponentTypeError(value);
    }
  }

  get value(): string {
    return this._value;
  }

  get isSystemRule(): boolean {
    return this._value === 'system_rule';
  }

  get isFormatConstraint(): boolean {
    return this._value === 'format_constraint';
  }

  get isSafetyGuard(): boolean {
    return this._value === 'safety_guard';
  }

  get isStyleGuide(): boolean {
    return this._value === 'style_guide';
  }

  get isDomainKnowledge(): boolean {
    return this._value === 'domain_knowledge';
  }

  equals(other: PromptComponentType): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}

export type PromptComponentTypeValue = 'system_rule' | 'format_constraint' | 'safety_guard' | 'style_guide' | 'domain_knowledge';

export class PromptComponent {
  private constructor(
    readonly componentKey: string,
    readonly type: PromptComponentTypeValue,
    readonly content: string,
    readonly version: PromptVersion,
    readonly description: string,
  ) {}

  static create(
    componentKey: string,
    type: PromptComponentTypeValue,
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
    type: PromptComponentTypeValue,
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
