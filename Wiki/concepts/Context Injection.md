---
type: concept
tags:
  - wiki/concept
  - wiki/generation
  - wiki/prompting
date_updated: 2026-08-01
source_count: 6
confidence: high
---

# Context Injection

> Typed, validatable variable injection into prompt templates — `packages/domain/src/generation/prompting/`

## Definition

**Context Injection** is the mechanism by which runtime data (user inputs, workspace assets, previous step outputs, file uploads, API data) is safely injected into prompt templates. It replaces the current ad-hoc string concatenation in `ContextEnricher` with a validated, typed slot system that fails before calling the LLM if required data is missing.

## Motivation

Current state (pre-proposal): the `[[Progressive Context Enrichment|ContextEnricher]]` domain service assembles context as a raw string. Templates have ad-hoc placeholders like `{keyword}` or `{brand_voice}` with no formal contract between what the template expects and what the context provides. Missing data is discovered only when the LLM produces a low-quality output — or not at all.

## Domain Model

### InjectionSlot

```typescript
// packages/domain/src/generation/prompting/InjectionSlot.ts

type InjectionSource =
  | 'input'     // User text input (e.g. {{slot:input:keyword}})
  | 'asset'     // Workspace asset (e.g. {{slot:asset:brand-voice}})
  | 'file'      // Uploaded file content (e.g. {{slot:file:briefing}})
  | 'step'      // Previous step output (e.g. {{slot:step:1}})
  | 'data'      // Structured API/JSON data (e.g. {{slot:data:serpapi}})
  | 'meta';     // Metadata (e.g. {{slot:meta:workspace.name}}, {{slot:meta:date}})

class InjectionSlot {
  private static readonly PATTERN = /\{\{slot:(\w+):([\w.-]+)\}\}/g;

  private constructor(
    readonly source: InjectionSource,
    readonly key: string,            // "brand-voice", "keyword", "briefing", "1"
    readonly required: boolean,
    readonly defaultValue?: string,  // Fallback if not found in context
  ) {}

  /** Extract all slots from a template string */
  static extractAll(template: string): InjectionSlot[] {
    const slots: InjectionSlot[] = [];
    for (const match of template.matchAll(InjectionSlot.PATTERN)) {
      slots.push(new InjectionSlot(
        match[1] as InjectionSource,
        match[2],
        true,  // Default: required unless overridden
      ));
    }
    return slots;
  }

  /** Resolve this slot's value from an InjectionContext */
  resolve(context: InjectionContext): string | null {
    return context.get(this.source, this.key) ?? this.defaultValue ?? null;
  }
}
```

### Slot Syntax

```
Source          Syntax                          Example value
──────          ────────                        ─────────────
input utente    {{slot:input:keyword}}          "marketing automation"
asset           {{slot:asset:brand-voice}}      "Tono professionale, diretto..."
file            {{slot:file:briefing}}           "Il cliente vuole una landing..."
step precedente {{slot:step:1}}                  "Analisi del briefing estratta..."
dati strutt.    {{slot:data:serpapi}}            {"results": [...], ...}
metadati        {{slot:meta:workspace.name}}     "Q3 Campaign 2026"
```

### InjectionSchema

```typescript
// packages/domain/src/generation/prompting/InjectionSchema.ts

class InjectionSchema {
  private constructor(readonly slots: ReadonlyArray<InjectionSlot>) {}

  static from(template: string): InjectionSchema {
    return new InjectionSchema(InjectionSlot.extractAll(template));
  }

  /** Validate that all required slots can be resolved from the context */
  validate(context: InjectionContext): InjectionValidationResult {
    const missing: InjectionSlot[] = [];

    for (const slot of this.slots) {
      if (slot.required && slot.resolve(context) === null) {
        missing.push(slot);
      }
    }

    return {
      isValid: missing.length === 0,
      missing: missing.map(s => `{{slot:${s.source}:${s.key}}}`),
    };
  }
}

type InjectionValidationResult = {
  isValid: boolean;
  missing: string[];
};
```

### InjectionContext

```typescript
// packages/domain/src/generation/prompting/InjectionContext.ts

class InjectionContext {
  private constructor(
    private readonly data: Map<string, unknown>,
  ) {}

  static empty(): InjectionContext {
    return new InjectionContext(new Map());
  }

  /** Populate from acquisition data (user inputs, files, assets, API responses) */
  static fromAcquisition(acquisition: AcquisitionData): InjectionContext {
    const ctx = InjectionContext.empty();

    // User text inputs → input:* slots
    for (const [key, value] of Object.entries(acquisition.userInputs)) {
      ctx.set('input', key, value);
    }

    // Resolved workspace assets → asset:* slots
    for (const [assetType, content] of acquisition.resolvedAssets.entries()) {
      ctx.set('asset', assetType, content.value);
    }

    // Uploaded files → file:* slots
    for (const file of acquisition.fileContents) {
      if (file.key) ctx.set('file', file.key, file.content);
    }

    // API responses → data:* slots
    for (const [source, response] of Object.entries(acquisition.apiResponses)) {
      ctx.set('data', source, response);
    }

    // Metadata → meta:* slots
    ctx.set('meta', 'date', new Date().toISOString());
    ctx.set('meta', 'tool', acquisition.toolKey);

    return ctx;
  }

  /** Chain: add outputs from previous steps (for step N > 1) */
  withPreviousSteps(artifacts: Artifact[]): InjectionContext {
    for (const artifact of artifacts) {
      this.set('step', String(artifact.stepNumber), artifact.content.value);
    }
    return this;
  }

  get(source: string, key: string): string | null {
    const value = this.data.get(`${source}:${key}`);
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }

  private set(source: string, key: string, value: unknown): void {
    this.data.set(`${source}:${key}`, value);
  }
}
```

## Template Example

A `landing-funnel/opt-in` user template using slots:

```markdown
# user.md — landing-funnel/opt-in v1.2.0

## Briefing del cliente
{{slot:file:briefing}}

## Brand Voice
{{slot:asset:brand-voice}}

## Analisi del briefing (Step 1)
{{slot:step:1}}

## Istruzioni
Genera la sezione Opt-in della landing page. L'output deve:
1. Catturare l'attenzione con un headline potente
2. Comunicare il valore unico del prodotto/servizio
3. Includere una call-to-action chiara e misurabile

## Contesto aggiuntivo
- Workspace: {{slot:meta:workspace.name}}
- Data generazione: {{slot:meta:date}}
```

## Validation Flow

```
1. Template caricato dal PromptTemplateRepository
       │
2. InjectionSchema.from(template)  →  estrae tutti i {{slot:*}}
       │
3. schema.validate(context)        →  verifica ogni slot required
       │
   ┌───┴───┐
   │ VALID │──▶ Procedi con il PromptComposer
   └───────┘
       │
   ┌───┴──────┐
   │ INVALID  │──▶ Lancia InjectionValidationError
   └──────────┘     (fail-fast, nessun token LLM sprecato)
```

## Error Handling

```typescript
class InjectionValidationError extends Error {
  constructor(
    readonly missingSlots: string[],
    readonly templateId: string,
  ) {
    super(
      `Cannot render prompt "${templateId}": ` +
      `missing required slots [${missingSlots.join(', ')}]. ` +
      `Ensure all required inputs, assets, and files are provided before generation.`
    );
  }
}
```

This error is surfaced to the [[ReadinessPolicy|ReadinessPolicy.evaluate()]] which tells the UI exactly which inputs are missing before the user can even click "Generate".

## Integration with ReadinessPolicy

The `[[ReadinessPolicy]]` VO gains a new check:

```typescript
// Pre-flight: before creating the Session, validate all templates can be resolved
class ReadinessPolicy {
  evaluate(acquisition: AcquisitionData): ReadinessResult {
    // ... existing checks (required inputs, required files, required assets) ...

    // NEW: validate all prompt slots can be satisfied
    for (const step of this.tool.steps) {
      const template = this.promptRepo.findByIdSync(
        PromptTemplateId.from(this.tool.toolKey, step.label),
        PromptVersion.from(step.prompt.version),
      );
      if (!template) {
        missing.push(`Prompt template not found: ${step.prompt.templateId}@${step.prompt.version}`);
        continue;
      }
      const schema = InjectionSchema.from(template.system + template.user);
      const context = InjectionContext.fromAcquisition(acquisition);
      const validation = schema.validate(context);
      if (!validation.isValid) {
        missing.push(...validation.missing);
      }
    }

    return { isReady: missing.length === 0, missing };
  }
}
```

This means the user sees missing slots **before** clicking Generate — not after wasting credits.

## Key Properties

| Property | Meaning |
|----------|---------|
| **Typed slots** | `{{slot:source:key}}` — the source is part of the syntax, grep-friendly |
| **Pre-flight validation** | Missing slots are caught by ReadinessPolicy before Session creation |
| **Fail-fast at step level** | If a slot is missing at execution time, fail before calling the LLM |
| **Immutable context** | `InjectionContext` is built once per session, extended with step outputs |
| **No ad-hoc concatenation** | `ContextEnricher` is replaced by typed slot resolution |

## Sources

- [[Prompt Versioning]] — Templates contain slot syntax, versioned alongside content
- [[Prompt Components]] — Components use the same slot syntax for dynamic content
- [[PromptComposer]] — Domain service that resolves slots during composition
- [[ReadinessPolicy]] — Pre-flight validation of slot availability
- [[Progressive Context Enrichment]] — Step N slots resolve to step N-1 artifact content
- [[prompting-mechanics-proposal]] — Overall architecture proposal (synthesis)