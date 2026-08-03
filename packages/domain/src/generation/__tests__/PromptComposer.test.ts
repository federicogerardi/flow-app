import { describe, it, expect } from 'vitest';
import { PromptComposer } from '../prompting/PromptComposer';
import { PromptComponentRegistry } from '../prompting/PromptComponentRegistry';
import { PromptComponent } from '../prompting/PromptComponent';
import { PromptVersion } from '../prompting/PromptVersion';
import type { PromptTemplateContent } from '../prompting/PromptTemplateContent';

function makeTemplate(overrides: Partial<PromptTemplateContent> = {}): PromptTemplateContent {
  return {
    system: 'You are a helpful assistant.',
    user: 'Write about {{topic}}.',
    ...overrides,
  };
}

function setupRegistry(components: PromptComponent[] = []): PromptComponentRegistry {
  const registry = new PromptComponentRegistry();
  for (const c of components) registry.register(c);
  return registry;
}

function makeComponent(
  key: string,
  type: 'system_rule' | 'format_constraint' | 'safety_guard' | 'style_guide' | 'domain_knowledge',
  content: string,
): PromptComponent {
  return PromptComponent.create(key, type, content, PromptVersion.from('1.0.0'), `Desc ${key}`);
}

describe('PromptComposer', () => {
  describe('compose', () => {
    it('should pass through template when no components provided', () => {
      const registry = setupRegistry();
      const composer = new PromptComposer(registry);
      const template = makeTemplate();

      const result = composer.compose(template, []);

      expect(result.system).toBe('You are a helpful assistant.');
      expect(result.user).toBe('Write about {{topic}}.');
      expect(result.componentKeys).toEqual([]);
    });

    it('should prepend system_rule to system prompt', () => {
      const comp = makeComponent('rules-1', 'system_rule', 'Always be concise.');
      const registry = setupRegistry([comp]);
      const composer = new PromptComposer(registry);

      const result = composer.compose(makeTemplate(), ['rules-1']);

      expect(result.system).toContain('Always be concise.');
      expect(result.system).toContain('---');
      expect(result.system).toContain('You are a helpful assistant.');
    });

    it('should prepend safety_guard to system prompt', () => {
      const comp = makeComponent('safety-1', 'safety_guard', 'Do not generate harmful content.');
      const registry = setupRegistry([comp]);
      const composer = new PromptComposer(registry);

      const result = composer.compose(makeTemplate(), ['safety-1']);

      expect(result.system).toContain('Do not generate harmful content.');
      expect(result.system).toContain('---');
    });

    it('should append format_constraint to user prompt', () => {
      const comp = makeComponent('fmt-1', 'format_constraint', 'Use bullet points.');
      const registry = setupRegistry([comp]);
      const composer = new PromptComposer(registry);

      const result = composer.compose(makeTemplate(), ['fmt-1']);

      expect(result.user).toContain('Use bullet points.');
      expect(result.user).toContain('---');
    });

    it('should append style_guide to user prompt', () => {
      const comp = makeComponent('style-1', 'style_guide', 'Professional tone.');
      const registry = setupRegistry([comp]);
      const composer = new PromptComposer(registry);

      const result = composer.compose(makeTemplate(), ['style-1']);

      expect(result.user).toContain('Professional tone.');
      expect(result.user).toContain('---');
    });

    it('should append domain_knowledge to user prompt', () => {
      const comp = makeComponent('dk-1', 'domain_knowledge', 'SaaS metrics context.');
      const registry = setupRegistry([comp]);
      const composer = new PromptComposer(registry);

      const result = composer.compose(makeTemplate(), ['dk-1']);

      expect(result.user).toContain('SaaS metrics context.');
      expect(result.user).toContain('---');
    });

    it('should replace {{slots}} with context values', () => {
      const registry = setupRegistry();
      const composer = new PromptComposer(registry);

      const result = composer.compose(makeTemplate(), [], { topic: 'AI trends' });

      expect(result.user).toBe('Write about AI trends.');
      expect(result.user).not.toContain('{{topic}}');
    });

    it('should handle both system and format components together', () => {
      const sysComp = makeComponent('rules-1', 'system_rule', 'Be concise.');
      const fmtComp = makeComponent('fmt-1', 'format_constraint', 'Use markdown.');
      const registry = setupRegistry([sysComp, fmtComp]);
      const composer = new PromptComposer(registry);

      const result = composer.compose(makeTemplate(), ['rules-1', 'fmt-1'], { topic: 'ML' });

      expect(result.system).toContain('Be concise.');
      expect(result.system).toContain('---');
      expect(result.user).toContain('Write about ML.');
      expect(result.user).toContain('Use markdown.');
      expect(result.componentKeys).toEqual(['rules-1', 'fmt-1']);
    });

    it('should replace multiple {{slots}} in user prompt', () => {
      const registry = setupRegistry();
      const composer = new PromptComposer(registry);
      const template: PromptTemplateContent = {
        system: 'System',
        user: 'Write about {{topic}} in {{language}}.',
      };

      const result = composer.compose(template, [], { topic: 'AI', language: 'English' });

      expect(result.user).toBe('Write about AI in English.');
    });
  });
});
