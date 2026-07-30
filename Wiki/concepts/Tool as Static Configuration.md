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

> *"Un tool che vale 100 tool."*

## Naming Convention

```
{output}[-{variant}]
```

Il `toolKey` dichiara **cosa produce il tool**. Niente verbi, niente abbreviazioni, niente nomi propri. Tre famiglie:

### Content — `{formato}[-{variante}]`

| toolKey | Output | Variante |
|---------|--------|----------|
| `landing-funnel` | Landing page | Funnel (optin → quiz → VSL) |
| `landing-page` | Landing page | Singola + thank-you |
| `video-script-long-form` | Script video | Long-form (6 step) |
| `video-description` | Descrizione video | — |
| `blog-post` | Articolo blog | — |
| `ad-copy` | Copy pubblicitario | — |

### Asset — `{asset-type}`

Il `toolKey` è **identico all'`AssetType`** prodotto. Il mapping `toolKey → assetType` è 1:1.

| toolKey | AssetType prodotto |
|---------|-------------------|
| `brief` | `brief` |
| `brand-voice` | `brand-voice` |
| `buyer-persona` | `persona` |
| `marketing-angle` | `angle` |

### Analisi — `{dominio}-analysis`

| toolKey | Output |
|---------|--------|
| `ai-overview-analysis` | Analisi presenza competitiva su Google AI Overview |

## Structure

```typescript
// packages/domain/src/generation/tool-definition.ts

type ToolDefinition = {
  toolKey: string;
  name: string;
  description: string;

  // Asset production: if set, the final Artifact will be promoted to this AssetType.
  // Undefined for content tools (landing-funnel, blog-post, etc.) and analysis tools.
  produces?: AssetType;

  // FASE 1 — Acquisizione
  acquisition: {
    userText?:  TextInput[];
    files?:     FileInput[];
    apiCalls?:  ApiCallInput[];
    assets?:    AssetInput[];
  };

  // FASE 2+3 — Elaborazione (1..N step)
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
```

## Esempi

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
  // Single step → automaticamente final
]
```

### Analisi: `ai-overview-analysis`

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

  // Analisi
  'ai-overview-analysis':        aiOverviewAnalysisTool,
};

export function getTool(key: ToolKey): ToolDefinition | undefined {
  return toolRegistry[key];
}
```

## Key Properties

| Proprietà | Significato |
|-----------|-------------|
| **Ultimo step = final** | Posizionale. L'ultimo elemento di `steps[]` produce l'Artifact promovibile |
| **Nessuno `StepType`** | Ogni step è un prompt LLM. Differenza: `enrichment: serial | hybrid` |
| **Nessuno `ArtifactRole`** | `isLastStep(step, steps)` sostituisce il ruolo esplicito |
| **Asset tool: 1:1 mapping** | `toolKey === assetType` — nessuna tabella di mapping necessaria |
| **Varianti esplicite** | `video-script-long-form` vs futuro `video-script-short-form` |
| **Zero abbreviazioni** | Niente `lf`, `tov`, `geo` nel dominio |

## Sources

- [[doodle/APP-CONCEPT]] — Registry-Driven Architecture, tool catalog
- [[doodle/PRD]] — FR-T01 to FR-T11, FR-U01
- [[doodle/STARTUP]] — Tool definitions
- [[doodle/USER-STORIES]] — Tool epics 4-9