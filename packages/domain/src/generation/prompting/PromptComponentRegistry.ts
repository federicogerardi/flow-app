import { PromptComponent } from './PromptComponent';

export class PromptComponentNotFoundError extends Error {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;
  constructor(componentKey: string) {
    super(`Prompt component not found: ${componentKey}`);
    this.name = 'PromptComponentNotFoundError';
  }
}

export class PromptComponentRegistry {
  private components: Map<string, PromptComponent> = new Map();

  register(component: PromptComponent): void {
    this.components.set(component.componentKey, component);
  }

  get(key: string): PromptComponent | undefined {
    return this.components.get(key);
  }

  getAll(): PromptComponent[] {
    return Array.from(this.components.values());
  }

  resolveAll(keys: string[]): PromptComponent[] {
    const resolved: PromptComponent[] = [];
    for (const key of keys) {
      const component = this.get(key);
      if (!component) throw new PromptComponentNotFoundError(key);
      resolved.push(component);
    }
    return resolved;
  }

  has(key: string): boolean {
    return this.components.has(key);
  }
}
