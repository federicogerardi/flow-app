---
type: concept
tags:
  - wiki/concept
  - wiki/generation
  - wiki/prompting
  - wiki/infrastructure
date_updated: 2026-08-01
source_count: 6
confidence: high
---

# Prompt Caching Strategy

> Deterministic caching of composed prompts — same template + same context = same `ResolvedPrompt`, zero wasted LLM tokens on re-composition.

## Definition

**Prompt Caching** is the strategy for avoiding redundant `[[PromptComposer|PromptComposer.compose()]]` work when the same template version, same component set, and same injection context produce an identical `ResolvedPrompt`. The cache key is derived from the composition inputs. Cache hits skip composition entirely — the prompt goes straight to the `[[LLM Gateway - OpenRouter|LlmGateway]]`.

## What Gets Cached

Not the template (that is filesystem/versioned). Not the LLM response. **Only the composed prompt**:

```
Input → PromptComposer.compose() → ResolvedPrompt → [CACHE HERE] → LlmGateway.generate()
```

| What | Where | Why not cached |
|------|-------|----------------|
| Raw template (system.md, user.md) | Filesystem | Filesystem is already a cache (OS page cache) |
| Component fragments | Component registry (in-memory) | Loaded once at startup |
| **ResolvedPrompt** | **Redis — TTL 1h** | **This is the expensive composition step** |
| LLM response | Not cached here | Separate concern (LLM response caching is an infra decision) |

## Cache Key Design

The cache key is a deterministic hash of all composition inputs:

```typescript
// packages/domain/src/generation/prompting/PromptCacheKey.ts

class PromptCacheKey {
  private constructor(readonly value: string) {}

  static from(params: ComposeParams): PromptCacheKey {
    const normalized = JSON.stringify({
      templateId: params.templateId.toString(),
      version: params.version.value,
      systemHash: sha256(params.template.system),
      userHash: sha256(params.template.user),
      contextHash: params.context.contentHash(),    // deterministic hash of all slot values
      componentKeys: [...params.componentKeys].sort(), // sorted for consistency
    });

    return new PromptCacheKey(sha256(normalized));
  }
}
```

### Deterministic Context Hashing

`InjectionContext` must produce a deterministic hash. The order of keys matters:

```typescript
// packages/domain/src/generation/prompting/InjectionContext.ts

class InjectionContext {
  /** Deterministic hash of all key-value pairs, sorted by key */
  contentHash(): string {
    const entries = Array.from(this.data.entries())
      .sort(([a], [b]) => a.localeCompare(b));

    const normalized = entries.map(([k, v]) => {
      const value = typeof v === 'string' ? v : JSON.stringify(v);
      return `${k}:${value}`;
    }).join('|');

    return sha256(normalized);
  }
}
```

This guarantees: two `InjectionContext` instances with the same data produce the same hash, regardless of insertion order.

## Cache Interface

```typescript
// packages/domain/src/generation/prompting/PromptCache.ts

interface PromptCache {
  get(key: PromptCacheKey): Promise<ResolvedPrompt | null>;
  set(key: PromptCacheKey, prompt: ResolvedPrompt, ttlSeconds: number): Promise<void>;
  invalidateByTemplate(templateId: PromptTemplateId): Promise<void>;
  invalidateByComponent(componentKey: string): Promise<void>;
  stats(): Promise<CacheStats>;
}

type CacheStats = {
  hits: number;
  misses: number;
  size: number;        // number of cached entries
  hitRate: number;     // hits / (hits + misses)
};
```

## Cache Invalidation Rules

| Trigger | Action | Rationale |
|---------|--------|-----------|
| New template version published (`PromptTemplatePublished`) | `invalidateByTemplate(templateId)` | Old composed prompts use old template |
| Component updated (new version) | `invalidateByComponent(componentKey)` | Old composed prompts use old component |
| Session-specific data changes (never cached) | N/A | Context hash includes all input data — natural cache miss |
| TTL expired | Auto-eviction | Prevents stale cache entries |

### Invalidation via Domain Events

```typescript
// In PromptTemplatePublished event handler:
eventBus.on('PromptTemplatePublished', async (event: PromptTemplatePublished) => {
  await promptCache.invalidateByTemplate(event.templateId);
  logger.info({ templateId: event.templateId.toString() }, 'Prompt cache invalidated for template');
});

// In ComponentPublished event handler (future):
eventBus.on('PromptComponentPublished', async (event) => {
  await promptCache.invalidateByComponent(event.componentKey);
  logger.info({ componentKey: event.componentKey }, 'Prompt cache invalidated for component');
});
```

## Integration with ProcessStepUseCase

```typescript
// apps/backend/src/application/generation/process-step.usecase.ts

class ProcessStepUseCase {
  constructor(
    private promptRepo: PromptTemplateRepository,
    private componentRegistry: PromptComponentRegistry,
    private composer: PromptComposer,
    private promptCache: PromptCache,           // NEW
    private llmGateway: LlmGateway,
    private logger: Logger,
  ) {}

  async execute(cmd: ProcessStepCommand): Promise<Artifact> {
    const step = cmd.step;
    const templateId = PromptTemplateId.from(cmd.session.toolKey, step.label);
    const version = PromptVersion.from(step.prompt.version ?? 'latest');

    // 1. Load template (always — filesystem is fast, caching adds complexity)
    const template = await this.promptRepo.findById(templateId, version);
    if (!template) throw new PromptTemplateNotFoundError(templateId, version);

    // 2. Build context
    const context = InjectionContext
      .fromAcquisition(cmd.acquisitionData)
      .withPreviousSteps(cmd.previousResults);

    // 3. Validate
    const schema = InjectionSchema.from(template.system + template.user);
    const validation = schema.validate(context);
    if (!validation.isValid) throw new InjectionValidationError(validation.missing, templateId.toString());

    // 4. Resolve components
    const componentKeys = this.resolveComponentKeys(cmd.session.toolKey, step);

    // 5. Try cache
    const cacheKey = PromptCacheKey.from({
      templateId,
      version,
      template,
      context,
      componentKeys,
    });

    const cached = await this.promptCache.get(cacheKey);
    let result: ComposeResult;

    if (cached) {
      this.logger.debug({ cacheKey: cacheKey.value, templateId: templateId.toString() }, 'Prompt cache hit');
      result = { success: true, resolved: cached, metadata: { fromCache: true } } as any;
    } else {
      result = this.composer.compose({ template, context, componentKeys });
      if (!result.success) throw new PromptCompositionError(result.error);

      // Cache for 1 hour (TTL aligned with typical session duration)
      await this.promptCache.set(cacheKey, result.resolved, 3600);
    }

    // 6. Call LLM
    const llmResult = await this.llmGateway.generate({
      model: step.prompt.model,
      systemPrompt: result.resolved.system,
      userPrompt: result.resolved.user,
      timeout: step.execution.timeoutMs,
    });

    return Artifact.create(StepNumber.of(step.order), ArtifactContent.from(llmResult.content));
  }
}
```

## When Caching Helps

| Scenario | Cache Hit? | Why |
|----------|-----------|-----|
| Same user retries same tool with same inputs | ✅ Yes | Context hash identical → cached |
| Different user, same tool, same inputs | ✅ Yes | Context hash includes all input data |
| Same user, different keyword | ❌ No | `input:keyword` differs → context hash differs |
| Same user, same tool, asset updated | ❌ No | `asset:brand-voice` content differs → context hash differs |
| Same user, same tool, new template version | ❌ No | Version in cache key differs |

## When NOT to Cache

| Anti-pattern | Why |
|-------------|-----|
| Caching `LlmGateway.generate()` responses | Non-deterministic — LLMs produce different output for same prompt |
| Caching across sessions | Session-scoped context (step outputs) is unique per session |
| Caching with `version: "latest"` | Latest is mutable — cache key must include the resolved concrete version |

## Key Properties

| Property | Meaning |
|----------|---------|
| **Cache key = deterministic hash** | Same inputs → same key. No floating-point, no ordering issues |
| **Invalidation via domain events** | `PromptTemplatePublished` → evict. No polling, no TTL-only |
| **TTL = 1 hour** | Aligned with typical session duration. Long enough to help, short enough to not stale |
| **Session-scoped** | Context includes step outputs → cache naturally varies per session |
| **Optional infrastructure** | Cache miss is not an error — the system works without Redis |

## Sources

- [[PromptComposer]] — The thing being cached
- [[Prompt Versioning]] — Template versions trigger invalidation
- [[Prompt Components]] — Component updates trigger invalidation
- [[Context Injection]] — InjectionContext.contentHash() powers the cache key
- [[LLM Gateway - OpenRouter]] — Consumer of cached ResolvedPrompt
- [[Application Services]] — ProcessStepUseCase integration point