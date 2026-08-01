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

# Prompt Components

> Reusable, versioned prompt fragments shared across all tools — `packages/domain/src/generation/prompting/`

## Definition

**Prompt Components** are immutable, reusable fragments of prompt text that are shared across multiple tools and steps. Instead of each template duplicating common rules (anti-hallucination, format constraints, style guides), templates reference components by key. Components are versioned independently and assembled at render time by the [[PromptComposer]].

## Motivation

Current state (pre-proposal): every template file (`system.md`, `user.md`) is self-contained. Common rules like "do not hallucinate" or "output valid Markdown" are copy-pasted across dozens of templates. This causes:

- **Drift**: the anti-hallucination rule in `blog-post/article` may differ from `landing-funnel/opt-in` after independent edits
- **Bulk update pain**: changing a global rule requires editing N files
- **No discoverability**: a new prompt engineer cannot see which rules apply to which templates

## Domain Model

### PromptComponent

```typescript
// packages/domain/src/generation/prompting/PromptComponent.ts

type PromptComponentType =
  | 'system_rule'        // System-level instructions (anti-hallucination, context-awareness)
  | 'format_constraint'  // Output format rules (Markdown, JSON, plain text)
  | 'safety_guard'       // Content safety rules (no offensive content, privacy)
  | 'style_guide'        // Tone and style guidelines (B2B professional, formal Italian)
  | 'domain_knowledge';  // Domain-specific knowledge (marketing glossary, SEO rules)

class PromptComponent {
  private constructor(
    readonly componentKey: string,       // "anti-hallucination/v1"
    readonly type: PromptComponentType,
    readonly content: string,            // The prompt fragment text
    readonly version: PromptVersion,
    readonly description: string,        // Documentation for prompt engineers
  ) {}

  static create(
    componentKey: string,
    type: PromptComponentType,
    content: string,
    version: PromptVersion,
    description: string,
  ): PromptComponent {
    if (!content.trim())
      throw new ValidationError('Component content must not be empty');
    return new PromptComponent(componentKey, type, content, version, description);
  }
}
```

### PromptComponentRegistry

```typescript
class PromptComponentRegistry {
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

  /** Resolve a list of component keys, throwing if any is missing */
  resolveAll(keys: string[]): PromptComponent[] {
    const resolved: PromptComponent[] = [];
    for (const key of keys) {
      const component = this.get(key);
      if (!component) throw new PromptComponentNotFoundError(key);
      resolved.push(component);
    }
    return resolved;
  }
}
```

## Component Catalog

### System Rules (system_rule)

| Key | Description | Included by default |
|-----|-------------|---------------------|
| `anti-hallucination/v1` | Do not fabricate facts, quotes, or sources. State uncertainty when unsure. | All tools |
| `no-prior-knowledge/v1` | Use only the context provided. Do not bring external world knowledge. | All tools |
| `step-awareness/v1` | You are step N of M. Generate intermediate output suitable as input for the next step. | Multi-step tools |

Example — `anti-hallucination/v1`:
```
IMPORTANT RULES:
- Do not fabricate statistics, quotes, or sources. If you are unsure, state your uncertainty.
- When citing data, use only information explicitly provided in the input context.
- Do not claim expertise beyond the provided materials.
- If the user's request is unclear, ask for clarification rather than guessing.
```

### Format Constraints (format_constraint)

| Key | Description | Used by |
|-----|-------------|---------|
| `output-markdown/v1` | Output valid Markdown with proper heading hierarchy. No code block wrapping entire response. | Content tools |
| `output-json/v1` | Output valid JSON matching a specified schema. No markdown wrapping. | Analysis tools |
| `output-plain-text/v1` | Output plain text only. No formatting, no markdown. | Asset tools (brief, brand-voice) |

Example — `output-markdown/v1`:
```
OUTPUT FORMAT:
- Respond in valid Markdown.
- Use ## for sections, ### for subsections.
- Use bullet lists (-) for items, numbered lists (1.) for sequences.
- Wrap code in triple backticks with language identifier.
- Do NOT wrap the entire response in a markdown code block.
```

### Safety Guards (safety_guard)

| Key | Description |
|-----|-------------|
| `no-offensive-content/v1` | No hate speech, harassment, or offensive material |
| `no-competitor-slander/v1` | Do not make negative claims about competitors without verified data |
| `data-privacy/v1` | Do not generate or expose PII, credentials, or sensitive data |

### Style Guides (style_guide)

| Key | Description | Used by |
|-----|-------------|---------|
| `marketing-tone/v1` | Professional B2B tone. No hype, no empty superlatives. Write for decision-makers. | Content tools |
| `italian-formal/v1` | Formal Italian. Use "Lei" form. No slang, no anglicisms. | Asset tools |
| `seo-optimized/v1` | SEO best practices: keyword placement, meta description hints, readability. | `blog-post` |

Example — `marketing-tone/v1`:
```
TONE GUIDELINES:
- Professional B2B tone. Avoid marketing hype and empty superlatives ("revolutionary", "game-changing").
- Be specific and concrete. Use data when available.
- Write for a decision-maker audience (CMOs, marketing directors).
- Italian text should be formal but not bureaucratic. Use "Lei" form where appropriate.
```

## Default Components Per Tool

```typescript
// packages/domain/src/generation/prompting/default-components.ts

const DEFAULT_COMPONENTS: Record<string, string[]> = {
  // Content tools — Markdown output, marketing tone
  'landing-funnel':           ['anti-hallucination/v1', 'output-markdown/v1', 'marketing-tone/v1'],
  'landing-page':             ['anti-hallucination/v1', 'output-markdown/v1', 'marketing-tone/v1'],
  'video-script-long-form':   ['anti-hallucination/v1', 'output-markdown/v1'],
  'video-description':        ['anti-hallucination/v1', 'output-markdown/v1'],
  'blog-post':                ['anti-hallucination/v1', 'output-markdown/v1', 'seo-optimized/v1'],
  'ad-copy':                  ['anti-hallucination/v1', 'output-plain-text/v1', 'marketing-tone/v1'],

  // Asset tools — plain text, formal Italian
  'brief':                    ['anti-hallucination/v1', 'output-plain-text/v1', 'italian-formal/v1'],
  'brand-voice':              ['anti-hallucination/v1', 'output-plain-text/v1', 'italian-formal/v1'],
  'buyer-persona':            ['anti-hallucination/v1', 'output-plain-text/v1'],
  'marketing-angle':          ['anti-hallucination/v1', 'output-plain-text/v1'],

  // Analysis — JSON output, no competitor slander
  'ai-overview-analysis':     ['anti-hallucination/v1', 'output-json/v1', 'no-competitor-slander/v1'],
};
```

Individual steps can override the tool-level defaults via `StepDefinition.prompt.components`.

## Composition Model

The [[PromptComposer]] assembles the final prompt by layering components:

```
┌──────────────────────────────────────┐
│ system_rule components               │  ← Pre-pended to system prompt
│ (anti-hallucination, step-awareness) │
├──────────────────────────────────────┤
│ template.system                      │  ← The step-specific system prompt
├──────────────────────────────────────┤
│ template.user (with slots resolved)  │  ← The step-specific user prompt
├──────────────────────────────────────┤
│ format_constraint + style_guide      │  ← Appended to user prompt
│ (output-markdown, marketing-tone)    │
└──────────────────────────────────────┘
```

This layering respects the LLM's attention mechanism: system rules at the top have the highest priority, format constraints at the bottom are the last thing the model sees before generating.

## Filesystem Layout

```
apps/backend/src/prompts/components/
├── anti-hallucination/
│   └── v1/
│       └── component.md
├── no-prior-knowledge/
│   └── v1/
│       └── component.md
├── output-markdown/
│   └── v1/
│       └── component.md
├── output-json/
│   └── v1/
│       └── component.md
├── output-plain-text/
│   └── v1/
│       └── component.md
├── marketing-tone/
│   └── v1/
│       └── component.md
├── italian-formal/
│   └── v1/
│       └── component.md
├── seo-optimized/
│   └── v1/
│       └── component.md
└── ... (safety guard components)
```

Each `component.md` contains the raw prompt fragment. The `componentKey` is `{name}/v{N}`.

## Key Properties

| Property | Meaning |
|----------|---------|
| **Zero duplication** | Each rule is written once, referenced everywhere |
| **Independent versioning** | Components can be updated without touching templates |
| **Layered composition** | System rules → template → format constraints (respects LLM attention) |
| **Default + override** | Tool-level defaults, step-level overrides via `StepDefinition.prompt.components` |
| **Startup validation** | All referenced component keys must exist — fail-fast at boot |

## Sources

- [[Prompt Versioning]] — Templates reference components via `StepDefinition.prompt.components`
- [[Context Injection]] — Slot syntax used alongside component injection
- [[PromptComposer]] — Domain service that assembles components + templates + context
- [[Tool as Static Configuration]] — ToolDefinition gains `components` field
- [[LLM Gateway - OpenRouter]] — Startup validation of component existence
- [[prompting-mechanics-proposal]] — Overall architecture proposal (synthesis)