---
type: concept
tags:
  - wiki/concept
  - wiki/generation
  - wiki/prompting
date_updated: 2026-08-01
source_count: 7
confidence: high
---

# Prompt Versioning

> Immutable, git-tracked prompt templates with semantic versions — `packages/domain/src/generation/prompting/`

## Definition

**Prompt Versioning** is the practice of treating each prompt template as an immutable, versioned artifact. Every `StepDefinition` in a [[Tool as Static Configuration|Tool]] references a specific `PromptTemplateId` and `PromptVersion` rather than a raw template path. This enables safe iteration, audit trails, and deterministic replay of generation sessions.

## Motivation

Current state (pre-proposal): [[Tool as Static Configuration|StepDefinition.prompt.template]] is a plain string path (e.g. `"landing-funnel/opt-in"`). Templates live on the filesystem with no versioning. Changing a template silently changes behavior for all future sessions — there is no way to pin a session to a specific template version, no rollback mechanism, and no audit trail.

## Domain Model

### Value Objects

| VO | Type | Description |
|----|------|-------------|
| `PromptTemplateId` | `{toolKey}/{stepLabel}` | Unique identifier for a template, e.g. `"landing-funnel/opt-in"` |
| `PromptVersion` | `"latest"` or `semver` | The version of the template to use. `"latest"` is for development only |
| `PromptTemplateContent` | `{ system: string, user: string }` | The actual template text at a given version |

### PromptTemplateId

```typescript
// packages/domain/src/generation/prompting/PromptTemplateId.ts

class PromptTemplateId {
  private constructor(
    readonly toolKey: string,   // "landing-funnel"
    readonly stepLabel: string,  // "opt-in"
  ) {}

  static from(toolKey: string, stepLabel: string): PromptTemplateId {
    if (!/^[a-z][a-z0-9-]*$/.test(toolKey))
      throw new ValidationError(`Invalid toolKey: ${toolKey}`);
    if (!/^[a-z][a-z0-9-]*$/.test(stepLabel))
      throw new ValidationError(`Invalid stepLabel: ${stepLabel}`);
    return new PromptTemplateId(toolKey, stepLabel);
  }

  toString(): string {
    return `${this.toolKey}/${this.stepLabel}`;
  }
}
```

### PromptVersion

```typescript
// packages/domain/src/generation/prompting/PromptVersion.ts

class PromptVersion {
  private constructor(readonly value: string) {}

  static readonly LATEST = new PromptVersion("latest");

  static from(version: string): PromptVersion {
    if (version === "latest") return PromptVersion.LATEST;
    if (!/^\d+\.\d+\.\d+$/.test(version))
      throw new ValidationError(
        `Invalid version: ${version}. Must be semver or "latest".`
      );
    return new PromptVersion(version);
  }

  get isLatest(): boolean { return this.value === "latest"; }
  get isPinned(): boolean { return !this.isLatest; }
}
```

## StepDefinition Changes

The existing `StepDefinition.prompt` field changes from a raw path to a versioned reference:

```typescript
// BEFORE (current)
type StepDefinition = {
  prompt: {
    template: string;     // "landing-funnel/opt-in" — unversioned path
    model: ModelTier;
  };
  // ...
};

// AFTER (proposed)
type StepDefinition = {
  prompt: {
    templateId: string;    // "landing-funnel/opt-in" — template identity
    version: string;       // "1.2.0" | "latest" — pinned or dev
    model: ModelTier;
    components?: string[]; // see [[Prompt Components]]
  };
  // ...
};
```

**Backward compatibility**: during migration, `StepDefinition` accepts both `template` (legacy) and `templateId` (new). Deprecation window: 2 sprints.

## Repository Interface

```typescript
// packages/domain/src/generation/prompting/PromptTemplateRepository.ts

interface PromptTemplateRepository {
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

type PromptTemplateContent = {
  system: string;
  user: string;
};
```

The repository is implemented in `apps/backend/src/infrastructure/` using the filesystem. Each template version lives at:

```
apps/backend/src/prompts/{toolKey}/{stepLabel}/versions/{semver}/
├── system.md
└── user.md
```

A `latest` symlink points to the most recent published version for development convenience.

## Filesystem Layout

```
apps/backend/src/prompts/
├── landing-funnel/
│   ├── extraction/
│   │   └── versions/
│   │       ├── 1.0.0/{system.md, user.md}
│   │       └── latest → 1.0.0/
│   ├── opt-in/
│   │   └── versions/
│   │       ├── 1.0.0/{system.md, user.md}
│   │       ├── 1.1.0/{system.md, user.md}
│   │       ├── 1.2.0/{system.md, user.md}
│   │       └── latest → 1.2.0/
│   └── ...
├── blog-post/
│   ├── seo-structure/versions/...
│   ├── outline/versions/...
│   └── article/versions/...
└── ...
```

## Domain Event: PromptTemplatePublished

```typescript
// packages/domain/src/generation/prompting/PromptTemplatePublished.ts

class PromptTemplatePublished {
  constructor(
    readonly templateId: PromptTemplateId,
    readonly version: PromptVersion,
    readonly previousVersion: PromptVersion | null,
    readonly publishedBy: string,
    readonly publishedAt: DateTime,
  ) {}
}
```

Consumers:
- **Audit log** — who changed which prompt and when
- **Rollback automation** — if a new version degrades quality metrics, trigger automatic rollback
- **Admin notification** — alert prompt engineers when templates change

## Startup Validation

At server startup, every `ToolDefinition.steps[].prompt.templateId` is validated:

1. The `PromptTemplateId` is well-formed (valid `toolKey` and `stepLabel`)
2. The requested `PromptVersion` exists on disk (or `"latest"` symlink resolves)
3. Both `system.md` and `user.md` files exist and are non-empty
4. Any referenced [[Prompt Components|components]] exist in the component registry

**Fail-fast**: the server refuses to start if any template is missing, preventing silent generation failures.

## Impact on Idempotency

An open question (see [[prompting-mechanics-proposal#open-questions|proposal]]): should the `[[IdempotencyKey]]` include the prompt version?

- **Include version**: same inputs + same template version = idempotent replay. Different template version = new session. This is the safer default.
- **Exclude version**: same inputs always return the cached session regardless of template changes. Useful for development but masks template drift.

**Recommendation**: include `(templateId, version)` in the idempotency key hash by default, with an opt-out flag for development environments.

## Key Properties

| Property | Meaning |
|----------|---------|
| **Immutable versions** | Once published, a version is never modified — only new versions are created |
| **Git-native** | Templates on filesystem → diff, PR review, git blame, revert via git |
| **`latest` for dev only** | Production `ToolDefinition` must pin a specific version |
| **Startup validation** | Fail-fast if a referenced version does not exist |
| **No DB dependency** | Template storage stays on filesystem — no new tables needed |

## Sources

- [[Tool as Static Configuration]] — StepDefinition structure that gains versioning
- [[Prompt Components]] — Components referenced by versioned templates
- [[Context Injection]] — Slot syntax used within template text
- [[LLM Gateway - OpenRouter]] — Prompt loading and validation at startup
- [[Application Services]] — ProcessStepUseCase integration point
- [[Progressive Context Enrichment]] — Slot `{{slot:step:N}}` for previous step outputs
- [[prompting-mechanics-proposal]] — Overall architecture proposal (synthesis)