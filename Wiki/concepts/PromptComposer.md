---
type: concept
tags:
  - wiki/concept
  - wiki/generation
  - wiki/prompting
date_updated: 2026-08-01
source_count: 5
confidence: high
---

# PromptComposer

> Domain Service — assembles versioned templates, reusable components, and validated context into a final LLM-ready prompt. Lives in `packages/domain/src/generation/prompting/PromptComposer.ts`.

## Definition

The `PromptComposer` is the single entry point for prompt assembly. It takes a versioned template, a set of component keys, and a validated `[[Context Injection|InjectionContext]]`, and produces a `ResolvedPrompt` ready for the `[[LLM Gateway - OpenRouter|LlmGateway]]`. It ensures that **no prompt reaches the LLM with missing data**.

## Responsibility

| Concern | Handled by |
|---------|-----------|
| Template loading | `[[Prompt Versioning|PromptTemplateRepository]]` (infrastructure) |
| Component resolution | `[[Prompt Components|PromptComponentRegistry]]` (domain) |
| Slot resolution | `[[Context Injection|InjectionContext.get()]]` (domain VO) |
| Assembly & ordering | `PromptComposer.compose()` (THIS service) |
| Validation | `InjectionSchema.validate()` (called BEFORE compose) |

The composer does **not** validate — validation is a separate step performed by `InjectionSchema.validate()` before `compose()` is called. This separation means the composer can assume all data is present and focus purely on assembly.

## Domain Model

### ResolvedPrompt

```typescript
// packages/domain/src/generation/prompting/ResolvedPrompt.ts

class ResolvedPrompt {
  constructor(
    readonly system: string,   // Fully assembled system prompt
    readonly user: string,     // Fully assembled user prompt with all slots resolved
  ) {}
}
```

### PromptComposer

```typescript
// packages/domain/src/generation/prompting/PromptComposer.ts

class PromptComposer {
  constructor(
    private readonly componentRegistry: PromptComponentRegistry,
  ) {}

  compose(params: ComposeParams): ComposeResult {
    const { template, context, componentKeys } = params;

    // 1. Resolve components from registry
    const components = this.componentRegistry.resolveAll(componentKeys);

    // 2. Assemble system prompt:
    //    [system_rule components] + [safety_guard components]
    //    ↓
    //    template.system
    const systemPrefix = components
      .filter(c => c.type === 'system_rule' || c.type === 'safety_guard')
      .map(c => c.content)
      .join('\n\n');

    const systemPrompt = systemPrefix
      ? `${systemPrefix}\n\n---\n\n${template.system}`
      : template.system;

    // 3. Assemble user prompt:
    //    template.user (with slots resolved)
    //    ↓
    //    [format_constraint components] + [style_guide components]
    let userPrompt = template.user;

    // 3a. Resolve all {{slot:*}} placeholders
    const slots = InjectionSlot.extractAll(userPrompt);
    let resolvedCount = 0;
    let failedCount = 0;

    for (const slot of slots) {
      const value = slot.resolve(context);
      if (slot.required && value === null) {
        failedCount++;
        userPrompt = userPrompt.replace(
          `{{slot:${slot.source}:${slot.key}}}`,
          `[ERROR: Missing required slot {{slot:${slot.source}:${slot.key}}}]`
        );
        continue;
      }
      userPrompt = userPrompt.replace(
        `{{slot:${slot.source}:${slot.key}}}`,
        value ?? slot.defaultValue ?? `[MISSING: ${slot.key}]`
      );
      resolvedCount++;
    }

    if (failedCount > 0) {
      return {
        success: false,
        error: `${failedCount} required slot(s) could not be resolved. ` +
               `Validation should have caught this — InjectionSchema.validate() must be called before compose().`
      };
    }

    // 3b. Append format constraints and style guides
    const userSuffix = components
      .filter(c => c.type === 'format_constraint' || c.type === 'style_guide')
      .map(c => c.content)
      .join('\n\n');

    if (userSuffix) {
      userPrompt = `${userPrompt}\n\n---\n\n${userSuffix}`;
    }

    return {
      success: true,
      resolved: new ResolvedPrompt(systemPrompt, userPrompt),
      metadata: {
        componentsUsed: components.map(c => c.componentKey),
        slotsResolved: resolvedCount,
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
      },
    };
  }
}
```

### Type Definitions

```typescript
type ComposeParams = {
  /** The versioned template loaded from PromptTemplateRepository */
  template: PromptTemplateContent;

  /** The validated injection context (user inputs, assets, files, step outputs, API data) */
  context: InjectionContext;

  /** Which components to include (resolved from registry) */
  componentKeys: string[];
};

type ComposeResult =
  | {
      success: true;
      resolved: ResolvedPrompt;
      metadata: ComposeMetadata;
    }
  | {
      success: false;
      error: string;
    };

type ComposeMetadata = {
  componentsUsed: string[];
  slotsResolved: number;
  systemPromptLength: number;
  userPromptLength: number;
};

type PromptTemplateContent = {
  system: string;
  user: string;
};
```

## Layering Strategy

The composer assembles the prompt in a specific order that respects LLM attention mechanics:

```
┌──────────────────────────────────────────────┐
│ LAYER 1 — system_rule components              │  ← Highest priority
│ (anti-hallucination, step-awareness,          │     Model processes first
│  no-prior-knowledge)                          │
├──────────────────────────────────────────────┤
│ LAYER 2 — safety_guard components             │  ← Model sees these early
│ (no-offensive-content, data-privacy,          │
│  no-competitor-slander)                       │
├──────────────────────────────────────────────┤
│ SEPARATOR: "---"                              │
├──────────────────────────────────────────────┤
│ LAYER 3 — template.system                     │  ← Tool-specific instructions
│ (role definition, task description)           │
├──────────────────────────────────────────────┤
│ LAYER 4 — template.user                       │  ← The actual task
│ (context data via {{slot:*}}, specific ask)   │
├──────────────────────────────────────────────┤
│ SEPARATOR: "---"                              │
├──────────────────────────────────────────────┤
│ LAYER 5 — format_constraint components        │  ← Last thing model sees
│ (output-markdown, output-json)                │     before generating
├──────────────────────────────────────────────┤
│ LAYER 6 — style_guide components              │  ← Stylistic preferences
│ (marketing-tone, italian-formal, seo)         │
└──────────────────────────────────────────────┘
```

**Rationale**: LLMs attend most strongly to the beginning (system prompt) and end (last user message) of the context window. System rules at the top ensure the model internalizes constraints. Format and style at the bottom ensure they are fresh in the model's context when it starts generating.

## Component Selection Strategy

Components are selected through a priority chain:

```typescript
// In ProcessStepUseCase:

function resolveComponentKeys(toolKey: string, step: StepDefinition): string[] {
  // Priority: step override > tool default > global minimum

  // 1. Step-level override takes absolute priority
  if (step.prompt.components && step.prompt.components.length > 0) {
    return step.prompt.components;
  }

  // 2. Tool-level defaults (defined in DefaultComponents.ts)
  const toolDefaults = DEFAULT_COMPONENTS[toolKey];
  if (toolDefaults) return toolDefaults;

  // 3. Global minimum: every prompt gets anti-hallucination
  return ['anti-hallucination/v1'];
}
```

## Integration with ProcessStepUseCase

```typescript
// apps/backend/src/application/generation/process-step.usecase.ts

class ProcessStepUseCase {
  constructor(
    private promptRepo: PromptTemplateRepository,
    private componentRegistry: PromptComponentRegistry,
    private composer: PromptComposer,
    private llmGateway: LlmGateway,
    private logger: Logger,
  ) {}

  async execute(cmd: ProcessStepCommand): Promise<Artifact> {
    const step = cmd.step;
    const templateId = PromptTemplateId.from(cmd.session.toolKey, step.label);
    const version = PromptVersion.from(step.prompt.version ?? 'latest');

    // 1. Load versioned template
    const template = await this.promptRepo.findById(templateId, version);
    if (!template) {
      throw new PromptTemplateNotFoundError(templateId, version);
    }

    // 2. Build injection context
    const context = InjectionContext
      .fromAcquisition(cmd.acquisitionData)
      .withPreviousSteps(cmd.previousResults);

    // 3. Validate all slots BEFORE composing
    const schema = InjectionSchema.from(template.system + template.user);
    const validation = schema.validate(context);
    if (!validation.isValid) {
      throw new InjectionValidationError(validation.missing, templateId.toString());
    }

    // 4. Resolve components
    const componentKeys = this.resolveComponentKeys(
      cmd.session.toolKey, step
    );

    // 5. Compose final prompt
    const result = this.composer.compose({ template, context, componentKeys });
    if (!result.success) {
      throw new PromptCompositionError(result.error);
    }

    // 6. Call LLM
    const llmResult = await this.llmGateway.generate({
      model: step.prompt.model,
      systemPrompt: result.resolved.system,
      userPrompt: result.resolved.user,
      timeout: step.execution.timeoutMs,
    });

    // 7. Audit log
    this.logger.info({
      templateId: templateId.toString(),
      version: version.value,
      components: result.metadata.componentsUsed,
      slotsResolved: result.metadata.slotsResolved,
      promptLength: {
        system: result.metadata.systemPromptLength,
        user: result.metadata.userPromptLength,
      },
      model: llmResult.model,
      tokens: llmResult.usage.totalTokens,
    }, 'Prompt composed and executed');

    // 8. Return artifact
    return Artifact.create(
      StepNumber.of(step.order),
      ArtifactContent.from(llmResult.content),
    );
  }
}
```

## Error Handling Matrix

| Error | Source | When | User Impact |
|-------|--------|------|-------------|
| `PromptTemplateNotFoundError` | Repository miss | Step execution | Session fails — template deleted after deployment |
| `PromptComponentNotFoundError` | Registry miss | `compose()` | Session fails — component removed without updating refs |
| `InjectionValidationError` | Schema validation | Pre-compose | Session fails — missing required input/asset/file |
| `PromptCompositionError` | Composer internal | `compose()` | Session fails — slot resolution failed despite validation |

All errors flow through the standard `Session.apply({ type: 'FAIL' })` path, surfacing to the UI via SSE `session_failed` events.

## Key Properties

| Property | Meaning |
|----------|---------|
| **Single entry point** | All prompt assembly goes through `compose()` — no ad-hoc string building |
| **Layered assembly** | System rules → template → format constraints, respecting LLM attention |
| **Component priority** | Step override > tool default > global minimum (`anti-hallucination/v1`) |
| **Metadata-rich** | Every composition logs components used, slots resolved, prompt sizes |
| **Validation before composition** | `InjectionSchema.validate()` is a separate step — composer assumes valid input |

## Sources

- [[Prompt Versioning]] — Templates loaded by id + version before composition
- [[Prompt Components]] — Component registry resolves keys into fragments
- [[Context Injection]] — InjectionContext + InjectionSchema provide validated data
- [[LLM Gateway - OpenRouter]] — Consumer of the final ResolvedPrompt
- [[Application Services]] — ProcessStepUseCase is the integration point