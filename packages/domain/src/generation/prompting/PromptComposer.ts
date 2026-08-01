import type { PromptTemplateContent } from './PromptTemplateContent';
import type { PromptComponentRegistry } from './PromptComponentRegistry';

export interface ComposedPrompt {
  system: string;
  user: string;
  componentKeys: string[];
}

export class PromptComposer {
  constructor(private readonly componentRegistry: PromptComponentRegistry) {}

  compose(
    template: PromptTemplateContent,
    componentKeys: string[],
    context?: Record<string, string>,
  ): ComposedPrompt {
    const components = this.componentRegistry.resolveAll(componentKeys);

    const systemRules = components
      .filter((c) => c.type === 'system_rule' || c.type === 'safety_guard')
      .map((c) => c.content)
      .join('\n\n');

    const formatConstraints = components
      .filter((c) => c.type === 'format_constraint' || c.type === 'style_guide' || c.type === 'domain_knowledge')
      .map((c) => c.content)
      .join('\n\n');

    let system = template.system;
    if (systemRules) {
      system = `${systemRules}\n\n---\n\n${system}`;
    }

    let user = template.user;
    if (context) {
      user = this.resolveSlots(user, context);
    }
    if (formatConstraints) {
      user = `${user}\n\n---\n\n${formatConstraints}`;
    }

    return {
      system,
      user,
      componentKeys,
    };
  }

  private resolveSlots(text: string, context: Record<string, string>): string {
    let resolved = text;
    for (const [key, value] of Object.entries(context)) {
      resolved = resolved.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return resolved;
  }
}
