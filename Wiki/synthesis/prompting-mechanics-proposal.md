---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/generation
  - wiki/prompting
  - wiki/architecture
date_updated: 2026-08-01
---

# Prompting Mechanics — Architecture Proposal

> **Archived design proposal** — canonical documentation now lives in the three dedicated concept pages: [[Prompt Versioning]], [[Prompt Components]], and [[Context Injection]]. The directory structure is also documented in [[packages-domain Structure#Prompting]]. This page is retained for historical context (migration path, open questions).

> Synthesis of the three prompting mechanics: versioning, unified components, and context injection. All extensions live within `packages/domain/src/generation/prompting/`.

## Summary

This proposal extends the [[Content Generation]] bounded context with three orthogonal, composable mechanics that replace the current ad-hoc, unversioned prompt system:

| # | Mechanic | Problem Solved | New VO/DS Count |
|---|----------|---------------|-----------------|
| 1 | [[Prompt Versioning]] | Templates are unversioned flat files — no rollback, no audit, no deterministic replay | 3 VOs + 1 repository interface |
| 2 | [[Prompt Components]] | Common rules copy-pasted across templates — drift, bulk update pain, no discoverability | 2 VOs + 1 registry |
| 3 | [[Context Injection]] | Ad-hoc string concatenation in ContextEnricher — silent failures, no pre-flight validation | 3 VOs + 1 domain service |

All three are **backward-compatible** — the migration path allows coexistence of old (`template: string`) and new (`templateId + version`) step definitions.

## Directory Structure

```
packages/domain/src/generation/prompting/          ← NEW (13 files)
│
├── PromptTemplateId.ts                 # VO: "{toolKey}/{stepLabel}"
├── PromptVersion.ts                    # VO: "1.2.0" | "latest"
├── PromptComponent.ts                  # VO: reusable prompt fragment
├── PromptComponentRegistry.ts          # Registry: resolve component keys → components
├── PromptComponentNotFoundError.ts     # Error: component key not found
├── InjectionSlot.ts                    # VO: {{slot:source:key}} placeholder
├── InjectionSchema.ts                  # VO: validates all slots against context
├── InjectionContext.ts                 # VO: typed container of all injectable data
├── InjectionValidationError.ts         # Error: required slot missing
├── ResolvedPrompt.ts                   # VO: final system + user prompt ready for LLM
├── PromptComposer.ts                   # Domain Service: assembles template + components + context
├── PromptTemplateRepository.ts         # Interface: findById, publishVersion, listVersions
├── DefaultComponents.ts                # Config: default component keys per tool
├── PromptTemplatePublished.ts          # Domain Event: audit trail for template changes
└── index.ts                            # Barrel
```

**Total**: ~13 new files, all in `packages/domain`. Zero new infrastructure dependencies.

## StepDefinition Changes

```typescript
// BEFORE
type StepDefinition = {
  prompt: {
    template: string;     // "landing-funnel/opt-in" — raw path
    model: ModelTier;
  };
};

// AFTER (backward-compatible during migration)
type StepDefinition = {
  prompt: {
    templateId?: string;   // NEW: "landing-funnel/opt-in"
    template?: string;     // DEPRECATED: removed after migration
    version?: string;      // NEW: "1.2.0" | "latest"
    model: ModelTier;      // unchanged
    components?: string[]; // NEW: ["anti-hallucination/v1", "output-markdown/v1"]
  };
};
```

## End-to-End Flow

```
User submits tool
       │
       ▼
StartSessionUseCase
  ├── AcquisitionData gathered (inputs, files, assets, API)
  ├── InjectionContext.fromAcquisition()              ← NEW: typed context
  ├── ReadinessPolicy.evaluate()
  │     └── Validates all prompt slots can resolve    ← NEW: pre-flight check
  └── Session created
       │
       ▼ (step loop)
ProcessStepUseCase (per step)
  ├── 1. Load template @ version
  │      PromptTemplateRepo.findById(templateId, version)   ← NEW: versioned
  ├── 2. Extend context with previous step outputs
  │      InjectionContext.withPreviousSteps(artifacts)      ← NEW: typed chain
  ├── 3. Validate all slots
  │      InjectionSchema.validate(context)                   ← NEW: fail-fast
  ├── 4. Compose final prompt
  │      PromptComposer.compose({                            ← NEW: assembly
  │        template,
  │        context,
  │        componentKeys,
  │      })
  ├── 5. Call LLM
  │      LlmGateway.generate({ systemPrompt, userPrompt })
  └── 6. Return Artifact
```

## Filesystem Changes

```
apps/backend/src/prompts/
│
├── {tool}/{step}/
│   └── versions/                    ← NEW: versioned instead of flat
│       ├── 1.0.0/{system.md, user.md}
│       ├── 1.1.0/{system.md, user.md}
│       └── latest → 1.1.0/
│
├── components/                      ← NEW: catalog
│   ├── anti-hallucination/v1/component.md
│   ├── output-markdown/v1/component.md
│   ├── marketing-tone/v1/component.md
│   └── ...
```

## Migration Path

| Phase | Action | Breaking? |
|-------|--------|-----------|
| **0** | Create `prompting/` in domain. `StepDefinition` accepts both `template` and `templateId`. | No |
| **1** | Move all templates to `versions/1.0.0/`. Add `templateId` + `version: "1.0.0"` to every ToolDefinition. | No |
| **2** | Extract common rules into components. Add `components: [...]` to steps. Remove duplicated text from templates. | No |
| **3** | Replace ad-hoc placeholders with `{{slot:*}}` syntax. Activate `InjectionSchema.validate()` in ReadinessPolicy. | No (slots are additive) |
| **4** | Remove deprecated `template` field from `StepDefinition`. | Yes — cleanup only |

## Impact on Other Bounded Contexts

| Context | Impact |
|---------|--------|
| [[Content Generation]] | **Extended** — new `prompting/` sub-module, `StepDefinition` gains fields |
| [[Workspace & Assets]] | None — assets are injected via `{{slot:asset:*}}`, already resolved by `AssetResolver` |
| [[Auth Dependencies]] | None |
| [[Usage & Quota]] | None — credit consumption unchanged |

## Startup Validation

The server must validate at boot:

1. Every `StepDefinition.prompt.templateId` + `version` resolves to existing files
2. Every `StepDefinition.prompt.components[]` key exists in the component registry
3. Both `system.md` and `user.md` are non-empty for every template version
4. All `{{slot:*}}` placeholders in every template use known `InjectionSource` values

**Fail-fast**: the server refuses to start if any validation fails.

## Open Questions

1. **Idempotency and versions**: should `[[Idempotency]]` include `(templateId, version)`? Including it means same inputs + new template version = new session (deterministic replay). Excluding it means cached session is returned regardless of template changes. Recommendation: include by default, opt-out for dev.

2. **Component hot-reload**: with filesystem storage, component changes require redeploy. For faster iteration, a future phase could add a Redis-backed component registry with admin API for hot-reload. Current proposal keeps it simple: filesystem, git-native.

3. **Prompt A/B testing**: with versioned templates, A/B testing becomes possible: route a percentage of sessions to `v1.2.0` vs `v1.1.0` and compare quality metrics. This is a future feature — the versioning infrastructure enables it but does not implement it.

4. **`latest` in production**: `PromptVersion.LATEST` is convenient for development but non-deterministic in production. Production `ToolDefinition` should always pin a specific version. A lint rule can enforce this.

## Sources

- [[Prompt Versioning]] — Detailed concept page
- [[Prompt Components]] — Detailed concept page
- [[Context Injection]] — Detailed concept page
- [[PromptComposer]] — Domain service that ties all three together
- [[Tool as Static Configuration]] — StepDefinition structure that gains versioning
- [[ReadinessPolicy]] — Pre-flight validation of slot availability
- [[Progressive Context Enrichment]] — Current mechanism being replaced/upgraded
- [[LLM Gateway - OpenRouter]] — Integration point for resolved prompts
- [[Application Services]] — ProcessStepUseCase integration point