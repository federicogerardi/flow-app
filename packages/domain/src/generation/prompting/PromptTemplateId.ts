export class PromptTemplateId {
  private constructor(
    readonly toolKey: string,
    readonly stepLabel: string,
  ) {}

  static from(toolKey: string, stepLabel: string): PromptTemplateId {
    if (!/^[a-z][a-z0-9-]*$/.test(toolKey)) {
      throw new Error(`Invalid toolKey: ${toolKey}`);
    }
    if (!/^[a-z][a-z0-9-]*$/.test(stepLabel)) {
      throw new Error(`Invalid stepLabel: ${stepLabel}`);
    }
    return new PromptTemplateId(toolKey, stepLabel);
  }

  static fromString(value: string): PromptTemplateId {
    const parts = value.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid template ID format: ${value}. Expected "{toolKey}/{stepLabel}"`);
    }
    return PromptTemplateId.from(parts[0], parts[1]);
  }

  toString(): string {
    return `${this.toolKey}/${this.stepLabel}`;
  }

  equals(other: PromptTemplateId): boolean {
    return this.toolKey === other.toolKey && this.stepLabel === other.stepLabel;
  }
}
