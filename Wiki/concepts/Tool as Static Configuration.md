---
type: concept
tags:
  - wiki/concept
  - wiki/generation
  - wiki/architecture
date_updated: 2026-07-30
source_count: 4
confidence: high
---

# Tool as Static Configuration

> Architectural pattern — every tool is the same concept, different configuration

## Principle

A `Tool` is a **static configuration object** in `packages/domain`. It declares WHAT data to acquire, HOW MANY elaboration steps to run, and WHICH prompt templates to use. The difference between any two tools is purely configuration — same execution engine, same [[XState Integration|XState machine]], same [[Session]] aggregate.

> *"One tool worth 100 tools."*

## Naming Convention

```
{output}[-{variant}]
```

The `toolKey` declares **what the tool produces**. No verbs, no abbreviations, no proper names. Three families:

### Content — `{format}[-{variant}]`

| toolKey | Output | Variant |
|---------|--------|---------|
| `landing-funnel` | Landing page | Funnel (optin → quiz → VSL) |
| `landing-page` | Landing page | Single + thank-you |
| `video-script-long-form` | Video script | Long-form (6 steps) |
| `video-description` | Video description | — |
| `blog-post` | Blog article | — |
| `ad-copy` | Ad copy | — |

### Asset — `{asset-type}`

The `toolKey` is **identical to the `AssetType`** produced. The `toolKey → assetType` mapping is 1:1.

| toolKey | Produced AssetType |
|---------|-------------------|
| `brief` | `brief` |
| `brand-voice` | `brand-voice` |
| `buyer-persona` | `persona` |
| `marketing-angle` | `angle` |

### Analysis — `{domain}-analysis`

| toolKey | Output |
|---------|--------|
| `ai-overview-analysis` | Competitive presence analysis on Google AI Overview |

## Structure

```typescript
// packages/domain/src/generation/tool-definition.ts

type ToolDefinition = {
  toolKey: string;
  name: string;
  description: string;

  // Credit consumption: how many credits this tool costs per generation.
  // Default: 1. Complex tools (e.g., 4-step with premium models) can cost more.
  creditCost?: number;

  // Asset production: if set, the final Artifact will be promoted to this AssetType.
  produces?: AssetType;

  // PHASE 1 — Acquisition
  acquisition: {
    userText?:  TextInput[];
    files?:     FileInput[];
    apiCalls?:  ApiCallInput[];
    assets?:    AssetInput[];
  };

  // PHASE 2+3 — Processing (1..N steps)
  steps: StepDefinition[];
};

type StepDefinition = {
  order: number;
  label: string;
  prompt: {
    template: string;
    model: ModelTier;        // premium | balanced | light | search
  };
  enrichment: 'serial' | 'hybrid';
  apiSources?: string[];
  execution: {
    timeoutMs: number;
    maxRetries: number;
  };
};

type TextInput = {
  key: string;
  label: string;
  required: boolean;
  type?: 'short' | 'long' | 'select';   // default: 'short'
  placeholder?: string;
  options?: string[];                     // only for type: 'select'
  description?: string;                   // helper text below field
};

type FileInput = {
  key: string;
  label: string;
  accept: string[];                      // ['.txt', '.md', '.docx', '.csv']
  required: boolean;
  description?: string;
  maxSizeMb?: number;                    // default: 10
};

type AssetInput = {
  assetType: AssetType;
  required: boolean;
};

type ApiCallInput = {
  source: string;
  config: Record<string, unknown>;
  cache: { enabled: boolean; ttlSeconds: number };
};
```

## Examples

### Content: `landing-funnel`

```typescript
acquisition: {
  files: [{ key: 'briefing', label: 'File Briefing', accept: ['.txt','.md','.docx'], required: true }],
  assets: [{ assetType: 'brand-voice', required: false }],
},
steps: [
  { order: 1, label: 'Analisi Briefing', enrichment: 'serial', prompt: { template: 'landing-funnel/extraction', model: 'balanced' } },
  { order: 2, label: 'Opt-in',           enrichment: 'serial', prompt: { template: 'landing-funnel/opt-in',    model: 'premium'  } },
  { order: 3, label: 'Quiz',             enrichment: 'serial', prompt: { template: 'landing-funnel/quiz',      model: 'premium'  } },
  { order: 4, label: 'VSL',              enrichment: 'serial', prompt: { template: 'landing-funnel/vsl',       model: 'premium'  } },
]
```

### Asset: `brand-voice`

```typescript
produces: 'brand-voice',  // declares the Asset type this tool produces
acquisition: {
  files: [{ key: 'material', label: 'Materiale aziendale', accept: ['.txt','.md','.docx'], required: true }],
},
steps: [
  { order: 1, label: 'Tone of Voice', enrichment: 'serial', prompt: { template: 'brand-voice/extract', model: 'premium' } },
  // Single step → automatically final
]
```

### Analysis: `ai-overview-analysis`

```typescript
acquisition: {
  userText: [{ key: 'keyword', label: 'Keyword', required: true }],
  apiCalls: [{ source: 'serpapi', config: { engine: 'google', feature: 'ai_overview' }, cache: { enabled: true, ttl: 3600 } }],
  assets: [{ assetType: 'brand-voice', required: false }],
},
steps: [
  { order: 1, label: 'Estrazione AI Overview', enrichment: 'hybrid', apiSources: ['serpapi'], prompt: { template: 'ai-overview/extract',      model: 'search'   } },
  { order: 2, label: 'Scoring Competitor',     enrichment: 'serial',                            prompt: { template: 'ai-overview/scoring',      model: 'balanced' } },
  { order: 3, label: 'Report Strategico',      enrichment: 'hybrid', apiSources: ['serpapi'],    prompt: { template: 'ai-overview/strategic',    model: 'premium'  } },
  { order: 4, label: 'Report Unificato',       enrichment: 'serial',                            prompt: { template: 'ai-overview/unified',      model: 'premium'  } },
]
```

## Registry

```typescript
// packages/domain/src/generation/tools/index.ts

export const toolRegistry: Record<ToolKey, ToolDefinition> = {
  // Content
  'landing-funnel':              landingFunnelTool,
  'landing-page':                landingPageTool,
  'video-script-long-form':      videoScriptLongFormTool,
  'video-description':           videoDescriptionTool,
  'blog-post':                   blogPostTool,
  'ad-copy':                     adCopyTool,

  // Asset
  'brief':                       briefTool,
  'brand-voice':                 brandVoiceTool,
  'buyer-persona':               buyerPersonaTool,
  'marketing-angle':             marketingAngleTool,

  // Analysis
  'ai-overview-analysis':        aiOverviewAnalysisTool,
};

export function getTool(key: ToolKey): ToolDefinition | undefined {
  return toolRegistry[key];
}
```

## Key Properties

| Property | Meaning |
|-----------|-------------|
| **Last step = final** | Positional. The last element of `steps[]` produces the promotable Artifact |
| **No `StepType`** | Each step is an LLM prompt. Difference: `enrichment: serial | hybrid` |
| **No `ArtifactRole`** | `isLastStep(step, steps)` replaces the explicit role |
| **Asset tool: 1:1 mapping** | `toolKey === assetType` — no mapping table needed |
| **Explicit variants** | `video-script-long-form` vs future `video-script-short-form` |
| **Zero abbreviations** | No `lf`, `tov`, `geo` in the domain |

## Sources

- [[sources/APP-CONCEPT]] — Registry-Driven Architecture, tool catalog
- [[sources/PRD]] — FR-T01 to FR-T11, FR-U01
- [[sources/STARTUP]] — Tool definitions
- [[sources/USER-STORIES]] — Tool epics 4-9