import { describe, it, expect } from 'vitest';
import { PromptComponent } from '../prompting/PromptComponent';
import { PromptComponentRegistry, PromptComponentNotFoundError } from '../prompting/PromptComponentRegistry';
import { PromptVersion } from '../prompting/PromptVersion';

function makeComponent(key: string, type: 'system_rule' | 'format_constraint' = 'system_rule'): PromptComponent {
  return PromptComponent.create(key, type, `Content for ${key}`, PromptVersion.from('1.0.0'), `Desc ${key}`);
}

describe('PromptComponentRegistry', () => {
  describe('register and get', () => {
    it('should register a component and retrieve it by key', () => {
      const registry = new PromptComponentRegistry();
      const component = makeComponent('rules-1');

      registry.register(component);

      expect(registry.get('rules-1')).toBe(component);
    });

    it('should return undefined for unknown key', () => {
      const registry = new PromptComponentRegistry();

      expect(registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered components', () => {
      const registry = new PromptComponentRegistry();
      const c1 = makeComponent('rules-1');
      const c2 = makeComponent('fmt-1', 'format_constraint');

      registry.register(c1);
      registry.register(c2);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContain(c1);
      expect(all).toContain(c2);
    });

    it('should return empty array when nothing registered', () => {
      const registry = new PromptComponentRegistry();

      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('resolveAll', () => {
    it('should return components in requested order', () => {
      const registry = new PromptComponentRegistry();
      const c1 = makeComponent('rules-1');
      const c2 = makeComponent('fmt-1', 'format_constraint');

      registry.register(c1);
      registry.register(c2);

      const resolved = registry.resolveAll(['fmt-1', 'rules-1']);
      expect(resolved).toEqual([c2, c1]);
    });

    it('should throw PromptComponentNotFoundError for unknown key', () => {
      const registry = new PromptComponentRegistry();
      registry.register(makeComponent('rules-1'));

      expect(() => registry.resolveAll(['rules-1', 'missing'])).toThrow(PromptComponentNotFoundError);
    });

    it('should return empty array for empty keys', () => {
      const registry = new PromptComponentRegistry();

      expect(registry.resolveAll([])).toEqual([]);
    });
  });

  describe('has', () => {
    it('should return true for registered key', () => {
      const registry = new PromptComponentRegistry();
      registry.register(makeComponent('rules-1'));

      expect(registry.has('rules-1')).toBe(true);
    });

    it('should return false for unknown key', () => {
      const registry = new PromptComponentRegistry();

      expect(registry.has('nonexistent')).toBe(false);
    });
  });
});
