---
type: concept
tags:
  - wiki/concept
  - wiki/generation
  - wiki/howto
date_updated: 2026-08-08
source_count: 7
confidence: high
---

# Creating a New Tool

> Step-by-step guide for adding a new tool to Flow App. Covers domain definition, prompt templates, frontend wiring, copy module, and verification.

## Decision Tree

Before writing any code, answer these questions:

1. **What does it produce?** → determines `toolKey` (see [[Tool as Static Configuration#Naming Convention|naming convention]])
2. **Content, Asset, or Analysis?**
   - **Content**: produces a marketing artifact (landing page, ad copy, blog post) — `produces` is `undefined`
   - **Asset**: produces a reusable workspace asset (brief, brand voice, persona) — `produces` matches `AssetType`
   - **Analysis**: produces a report/insight (AI overview analysis) — `produces` is `undefined`
3. **How many steps?** 1-step (simple extraction) vs N-step (extraction → elaboration → synthesis)
4. **What acquisition data?** Files, text inputs, workspace assets, API calls?
5. **Model tier per step?** `premium`, `balanced`, `light`, or `search`

## Files to Create / Modify

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/domain/src/generation/value-objects/ToolKey.ts` | Modify | Add `toolKey` to `ToolKeyValue` union type + static instance |
| 2 | `packages/domain/src/generation/tools/index.ts` | Modify | Add `ToolDefinition` object + register in `toolRegistry` |
| 3 | `apps/backend/src/prompts/{tool-key}/{step-label}/versions/1.0.0/system.md` | Create | System prompt for each step |
| 4 | `apps/backend/src/prompts/{tool-key}/{step-label}/versions/1.0.0/user.md` | Create | User prompt for each step |
| 5 | `apps/frontend/src/tool-inputs.ts` | Modify | Text + file input definitions (mirrors domain acquisition) |
| 6 | `packages/copy/src/it/tool-page.ts` | Modify (optional) | Only if tool needs unique UI strings beyond what API provides |
| 7 | `Wiki/concepts/Creating a New Tool.md` | Reference | You are here — follow this checklist |

**Files that DO NOT need changes** (generic, work for all tools):
- `SetupPanel.tsx` — renders any `ToolDefinition.acquisition` dynamically
- `ReadinessSnapshot.tsx` — validates any required field
- `SessionPage.tsx` — handles progress + results for any session (canonical post-submit destination)
- `FeedbackPanel.tsx` — shows step progress for any step count (SessionPage-only)
- `SessionSummary.tsx` — renders artifacts + download for any tool (SessionPage-only)
- `ToolPageLayout.tsx` — setup form redirects to SessionPage after submit
- `ToolPage Machine (XState v5)` — one machine, setup-only, all tools

---

## Step 1 — Register the Tool Key

**File**: `packages/domain/src/generation/value-objects/ToolKey.ts`

Add the new key to the `ToolKeyValue` union type and create a static instance:

```typescript
// 1. Add to union type
export type ToolKeyValue =
  | 'landing-funnel'
  // ...existing...
  | 'my-new-tool';     // ← ADD

// 2. Add static instance
static readonly MyNewTool = new ToolKey('my-new-tool');  // ← ADD

// 3. Add to switch in from()
case 'my-new-tool': return ToolKey.MyNewTool;              // ← ADD
```

> **Naming convention**: `{output}[-{variant}]`. No verbs, no abbreviations, no fantasy names. If it produces a landing page: `landing-page`. If it produces a specific variant: `video-script-long-form`. See [[Tool as Static Configuration#Naming Convention]].

---

## Step 2 — Define the Tool

**File**: `packages/domain/src/generation/tools/index.ts`

Create a `ToolDefinition` object and register it in `toolRegistry`. Use the `briefTool` as a reference implementation — it's the only complete tool definition.

### Template: Content Tool (no asset production)

```typescript
const myNewTool: ToolDefinition = {
  toolKey: 'my-new-tool',
  name: 'My New Tool',
  description: 'Describe what this tool produces',
  creditCost: 1,                        // default: 1. Complex (4+ steps, premium models) → 2-3
  // produces is NOT set for content tools

  acquisition: {
    // Text fields the user fills in the SetupPanel
    userText: [
      { key: 'topic', label: 'Topic', required: true, type: 'short', placeholder: 'Enter topic' },
      { key: 'language', label: 'Language', required: false, type: 'select', options: ['it', 'en'] },
    ],
    // File uploads
    files: [
      { key: 'briefing', label: 'Documento briefing', accept: ['.txt', '.md', '.docx'], required: true, description: 'Carica un documento (.txt, .md, .docx)' },
    ],
    // Workspace assets the tool can reference
    assets: [
      { assetType: 'brief', required: false },
      { assetType: 'brand-voice', required: false },
    ],
    // External API calls (e.g., SerpAPI for ai-overview-analysis)
    // apiCalls: [{ source: 'serpapi', config: { engine: 'google' }, cache: { enabled: true, ttlSeconds: 3600 } }],
  },

  steps: [
    {
      order: 1,
      label: 'extraction',              // step label — used as directory name for prompt templates
      enrichment: 'serial',             // serial = receives previous step output only; hybrid = + API data
      prompt: {
        templateId: 'my-new-tool/extraction',  // matches directory path under apps/backend/src/prompts/
        version: '1.0.0',
        model: ModelTier.Balanced,       // balanced (default), premium, light, search
        components: ['output-json/v1'],  // optional: prompt components to inject
      },
      execution: { timeoutMs: 60000, maxRetries: 2 },
    },
    {
      order: 2,
      label: 'generation',
      enrichment: 'serial',
      prompt: {
        templateId: 'my-new-tool/generation',
        version: '1.0.0',
        model: ModelTier.Premium,
        components: ['output-markdown/v1', 'italian-formal/v1'],
      },
      execution: { timeoutMs: 120000, maxRetries: 2 },
    },
  ],
};
```

### Template: Asset Tool (produces a reusable asset)

```typescript
const myAssetTool: ToolDefinition = {
  toolKey: 'brand-voice',               // must match an AssetType value
  name: 'Brand Voice',
  description: 'Estrae il tone of voice da materiali aziendali',
  creditCost: 1,
  produces: 'brand-voice',              // ← declares AssetType this tool creates

  acquisition: {
    userText: [
      { key: 'context', label: 'Contesto', required: false, type: 'long', placeholder: 'Note aggiuntive...' },
    ],
    files: [
      { key: 'material', label: 'Materiale aziendale', accept: ['.txt', '.md', '.docx'], required: true, description: 'Carica documenti aziendali (.txt, .md, .docx)' },
    ],
    // Asset tools typically don't reference other assets (they create them)
  },

  steps: [
    {
      order: 1,
      label: 'extraction',
      enrichment: 'serial',
      prompt: { templateId: 'brand-voice/extraction', version: '1.0.0', model: ModelTier.Premium },
      execution: { timeoutMs: 60000, maxRetries: 2 },
    },
    // Single step = automatically final. Last step in the array produces the promotable Artifact.
  ],
};
```

### Register the Tool

```typescript
export const toolRegistry: Record<ToolKeyValue, ToolDefinition> = {
  // ...existing tools...
  'my-new-tool': myNewTool,             // ← ADD
};
```

> **Important**: Replace the existing stub in `toolRegistry` instead of adding a duplicate. Many tool keys currently map to `blogPostTool` as a placeholder — this must be replaced with your real definition.

### Asset Tools — Special Considerations

Asset tools that **consume** other assets (e.g., `buyer-persona` requires `brief`) have additional requirements beyond the template above:

| Requirement | Detail |
|-------------|--------|
| **SetupPanel auto-selection** | If only one asset of the required type exists in the workspace, `ToolPageLayout` auto-selects it. The user sees a pre-checked radio button, no manual selection needed |
| **No text inputs = zero idempotency variance** | If the tool has no `userText` fields, the idempotency hash depends solely on `selectedAssetIds`. Selecting the same asset always produces the same hash → subsequent submissions return 200 (replayed). Users must delete the stale idempotency key or change asset selection to get a fresh session |
| **Asset tool without `userText`** | Set `userText: []` in the domain definition and `TOOL_INPUTS: []` in the frontend fallback. `ReadinessSnapshot` detects this and shows `noInputsRequired` or `assetsOnly` copy |
| **Workspace assets must be loaded** | `KyselyWorkspaceRepository.findById()` must eagerly load the `assets` table. If assets are not loaded, `AssetResolver.resolve()` rejects all `selectedAssetIds` as invalid (empty `workspace.assets` array) |
| **Frontend cancelled state** | Add `'cancelled'` to `phaseOverride` state type and provide a render block. Replayed cancelled sessions must show the cancelled UI, not "running" |

### Field Reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `toolKey` | `ToolKeyValue` | Yes | Must match a value in the union type |
| `name` | `string` | Yes | Display name (shown in sidebar, page header) |
| `description` | `string` | Yes | Shown in `ToolIntro` before configuration |
| `creditCost` | `number` | No | Defaults to 1. Complex tools (4+ steps, premium models) can cost 2-3 |
| `produces` | `string` | No | AssetType this tool creates. Only for asset tools |
| `defaultComponents` | `string[]` | No | Prompt components applied to every step. Override per-step with `components` |
| `acquisition` | object | Yes | What data the tool collects before starting |
| `acquisition.userText` | `TextInput[]` | No | Text fields rendered in SetupPanel |
| `acquisition.files` | `FileInput[]` | No | File upload zones |
| `acquisition.assets` | `AssetInput[]` | No | Workspace assets the tool can reference |
| `acquisition.apiCalls` | `ApiCallInput[]` | No | External API calls (SerpAPI, etc.) |
| `steps` | `StepDefinition[]` | Yes | 1..N steps. Last step produces the final Artifact |

### Acquisition Field Types

```typescript
// TextInput
{ key: 'fieldName', label: 'Display Label', required: true, type: 'short' | 'long' | 'select', placeholder?: string, options?: string[], description?: string }

// FileInput
{ key: 'fileName', label: 'Display Label', accept: ['.txt', '.md', '.docx'], required: true, description?: string, maxSizeMb?: number }

// AssetInput
{ assetType: 'brief' | 'brand-voice' | 'persona' | 'angle', required: boolean }

// ApiCallInput
{ source: 'serpapi', config: { engine: 'google', feature: 'ai_overview' }, cache: { enabled: true, ttlSeconds: 3600 } }
```

### Model Tier Selection

Model IDs are defined in `apps/backend/src/infrastructure/model-registry.ts`. Verify all model IDs against OpenRouter before deploying:

```bash
curl -s https://openrouter.ai/api/v1/models | python3 -c "
import json, sys
for m in json.load(sys.stdin)['data']:
    if 'claude' in m['id'] or 'gpt-4' in m['id'] or 'gemini' in m['id'] or 'maverick' in m['id']:
        print(m['id'])
"
```

| Tier | Primary Model | Fallback | Use for |
|------|-------------|----------|---------|
| `premium` | `anthropic/claude-sonnet-5` | `openai/gpt-4o` | Creative synthesis, final output generation |
| `balanced` | `openai/gpt-4o-mini` | `google/gemini-2.5-flash` | Structured extraction, intermediate steps (default) |
| `light` | `google/gemini-2.5-flash-lite` | `meta-llama/llama-4-maverick` | Simple classification, low-stakes formatting |
| `search` | `google/gemini-2.5-pro` | `perplexity/sonar-reasoning-pro` | AI overview analysis, web-augmented steps |

> **⚠️ Model deprecation**: OpenRouter model IDs change frequently. Model IDs that worked 3 months ago may return 400 today. Always run the verification command above before deploying a new tool, and update `model-registry.ts` if any model ID is invalid.

---

## Step 3 — Create Prompt Templates

For each step in the `ToolDefinition`, create two files under `apps/backend/src/prompts/`:

```
apps/backend/src/prompts/{tool-key}/{step-label}/versions/1.0.0/
├── system.md    # System prompt — persona, rules, output format
└── user.md      # User prompt — context injection instructions
```

### Directory naming

The path is derived from the tool definition:  
`templateId: 'my-new-tool/extraction'` → `apps/backend/src/prompts/my-new-tool/extraction/versions/1.0.0/`

### System Prompt (`system.md`)

```markdown
You are a [Role Name] specialized in [domain]. Your job is to [task description].

## Task
[Specific instructions about what to produce]

## Rules
1. **Rule 1**: ...
2. **Rule 2**: ...

## Output format
[Format specification — JSON, Markdown, plain text]

## Internal Checklist
Before outputting, verify:
- [ ] Check 1
- [ ] Check 2
- [ ] Output matches format specification

## Examples
[Good vs. Bad examples of expected output]
```

### User Prompt (`user.md`)

```markdown
[Task instruction referencing the context data].

The context contains [description of what data is available].
Use "non disponibile" for any field not found in the source.

Output ONLY the [format]. No preamble, no explanation.
```

### Context injection

The `ContextEnricher` automatically injects acquisition data into the LLM context before the user prompt:

- Text inputs: `[Input - {key}]\n{value}`
- File content: `[File - {key}]\n{content}`
- Previous step output (serial mode): injected as raw text before the current step's user prompt
- API data (hybrid mode): injected alongside previous step output

The user prompt should reference these data sources generically ("the briefing information in the context"). The `ContextEnricher` handles the wiring.

### Version management

- Use semver for versions (`1.0.0`, `1.1.0`, `2.0.0`)
- Create new version directories under `versions/` — never modify existing versions in production
- The `ToolDefinition` references a specific version. Update `version` when a new prompt version is deployed.

### Anti-hallucination guardrails

Every system prompt must include anti-hallucination rules (see [[Brief Tool - Prompt Architecture#Anti-Hallucination Guardrails]]):

- Never invent data, metrics, or entities not present in the source
- Use `"non disponibile"` for missing data
- Mark inferred values with `"(inferred)"`
- Never add promotional or comparative language not in source

---

## Step 4 — Add Frontend Input Definitions

**File**: `apps/frontend/src/tool-inputs.ts`

Add text and file input arrays that mirror the domain `ToolDefinition.acquisition`:

```typescript
// Text inputs — mirrors ToolDefinition.acquisition.userText
const MY_NEW_TOOL_INPUTS: TextInput[] = [
  { key: 'topic', label: 'Topic', required: true, type: 'short' },
  { key: 'language', label: 'Language', required: false, type: 'select', options: ['it', 'en'], placeholder: 'it' },
];

// File inputs — mirrors ToolDefinition.acquisition.files
const MY_NEW_TOOL_FILES: FileInput[] = [
  { key: 'briefing', label: 'Documento briefing', accept: ['.txt', '.md', '.docx'], required: true, description: 'Carica un documento (.txt, .md, .docx)' },
];

// Register in lookup tables
const TOOL_INPUTS: Record<string, TextInput[]> = {
  // ...existing...
  'my-new-tool': MY_NEW_TOOL_INPUTS,   // ← ADD
};

const TOOL_FILES: Record<string, FileInput[]> = {
  // ...existing...
  'my-new-tool': MY_NEW_TOOL_FILES,    // ← ADD (only if tool has file inputs)
};
```

> **Note**: The primary source of truth for input definitions is the domain `ToolDefinition` (served via `GET /api/tools`). These frontend definitions are a **fallback** used when the API is unavailable. They must stay in sync with the domain definition.

---

## Step 5 — Copy Module (Optional)

**File**: `packages/copy/src/it/tool-page.ts`

Only add copy keys if your tool needs UI strings that are NOT provided by the API (labels, placeholders, descriptions all come from `ToolDefinition.acquisition`).

Common cases where copy keys are needed:
- Tool-specific CTA state labels (e.g., "Analizza →" for analysis tools)
- Tool-specific feedback messages beyond the generic ones
- Tool-specific download format labels

```typescript
// packages/copy/src/it/tool-page.ts
export const toolPage = {
  // ...existing...
  myNewTool: {
    cta: {
      submit: 'Genera',              // override generic "Genera" if needed
    },
  },
} as const;
```

Follow the [[Centralized Copy Modules]] governance: no hardcoded strings in components.

---

## Step 6 — Register in Tool Registry (if replacing a stub)

If the new tool replaces an existing stub in `toolRegistry`:

```typescript
// BEFORE (stub)
'tool-key': blogPostTool,

// AFTER (real definition)
'tool-key': myNewTool,
```

The tool is now live — the generic API (`GET /api/tools`, `POST /api/tools/:key/sessions`) automatically picks it up from the registry.

---

## Verification Checklist

Before merging, verify each layer:

### Domain
- [ ] `ToolKey` value is added to the union type
- [ ] `static readonly` instance created
- [ ] `from()` switch case added
- [ ] `ToolDefinition` has correct `toolKey`, `name`, `description`
- [ ] `acquisition` matches what the tool needs (no extra fields, no missing required fields)
- [ ] `steps` are ordered correctly (order: 1, 2, 3...)
- [ ] Last step produces the final output
- [ ] `produces` is set only for asset tools, matches an `AssetType`
- [ ] `creditCost` reflects tool complexity
- [ ] Tool is registered in `toolRegistry` (replaces stub if one exists)
- [ ] `npx tsc --noEmit` passes in `packages/domain`

### Prompt Templates
- [ ] One `system.md` + `user.md` per step
- [ ] Directory path matches `templateId` in `StepDefinition.prompt`
- [ ] Version directory is `1.0.0/`
- [ ] System prompt includes anti-hallucination guardrails
- [ ] User prompt references context data generically (no hardcoded slot names; `ContextEnricher` handles injection)
- [ ] Output format is specified (JSON, Markdown, plain text)
- [ ] Good vs. Bad examples provided for structured extraction steps

### Frontend
- [ ] `tool-inputs.ts` has input definitions matching domain acquisition
- [ ] File inputs registered in `TOOL_FILES` (if applicable)
- [ ] Text inputs registered in `TOOL_INPUTS`
- [ ] No new components needed (SetupPanel/FeedbackPanel/SessionSummary are generic)
- [ ] Copy module has tool-specific keys (only if genuinely needed)
- [ ] `npx tsc --noEmit` passes in `apps/frontend`

### Backend
- [ ] No API changes needed (generic tool API handles all tools)
- [ ] If tool uses `hybrid` enrichment with `apiCalls`, worker must have the API client available
- [ ] `npx tsc --noEmit` passes in `apps/backend`

### Testing
- [ ] `npx vitest run` passes in all packages
- [ ] Smoke test: start a session with the new tool, verify it completes
- [ ] SSE events fire correctly for each step
- [ ] Final artifact is generated and displayed in the frontend

### Wiki
- [ ] Update [[overview#Tool Catalog|Tool Catalog]] with the new tool
- [ ] Update [[index]] if creating new concept pages for the tool
- [ ] Update [[log]] with implementation entry

---

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| `templateId` doesn't match directory | Worker fails with "template not found" | Ensure `my-new-tool/extraction` matches `apps/backend/src/prompts/my-new-tool/extraction/` |
| Missing `ToolKey` union entry | `tsc` error: type not assignable | Add to `ToolKeyValue` union type |
| Stub not replaced | Tool still uses `blogPostTool` definition | Replace in `toolRegistry` |
| `produces` on content tool | Asset promotion shown for non-asset tool | Remove `produces` or set to `undefined` |
| Required file in `tool-inputs.ts` but optional in domain | Readiness mismatch between FE fallback and API | Keep `required` values in sync |
| Hardcoded Italian strings in component | Violates [[Centralized Copy Modules]] | Move to `packages/copy/src/it/` |
| Missing anti-hallucination rules | LLM fabricates data | Add guardrails to system prompt |
| Wrong model tier | Expensive model for simple extraction or weak model for creative synthesis | Review model tier table above |
| **Invalid model ID** | Worker `llm_generate_primary_failed: 400 ... is not a valid model ID` | Run OpenRouter model verification command above; model IDs change frequently |
| **Workspace assets not loaded** | `InvalidAssetSelectionError: [...] not found in workspace` on every session start | `KyselyWorkspaceRepository.findById` must query `assets` table and pass results to `Workspace.reconstitute()` |
| **Asset-only tool replay loop** | `POST → 200` every time, never fresh `201` | Tool with no `userText` has zero idempotency variance — same asset = same hash. User is redirected to the existing session, which shows completion immediately. To force a fresh session, delete stale idempotency keys or change asset selection. |
| **`ON CONFLICT` on wrong column** | `duplicate key violates "assets_pkey"` on rename | `KyselyAssetRepository.save()` must use `ON CONFLICT (id)` not `(workspace_id, asset_type, source_ref)` |

---

## Quick Reference: File Change Count per Tool Type

| Tool type | New files | Modified files | Total |
|-----------|-----------|----------------|-------|
| Simple content (1-2 steps, no API) | 2-4 (prompts) | 3 (ToolKey, registry, tool-inputs) | 5-7 |
| Complex content (3+ steps) | 6-8 (prompts) | 3 (ToolKey, registry, tool-inputs) | 9-11 |
| Asset tool (1 step) | 2 (prompts) | 3 (ToolKey, registry, tool-inputs) | 5 |
| Asset tool (2+ steps) | 4-6 (prompts) | 3 (ToolKey, registry, tool-inputs) | 7-9 |
| Analysis tool (with API) | 4-8 (prompts) | 3 (ToolKey, registry, tool-inputs) | 7-11 |

## Sources

- [[Tool as Static Configuration]] — ToolDefinition structure, naming convention, registry
- [[Tool UX Architecture]] — Generic SetupPanel, FeedbackPanel, DX for adding tools
- [[Brief Tool - Prompt Architecture]] — Reference implementation (content tool)
- [[Content Generation]] — Unified tool model, acquisition → elaboration → output
- [[Centralized Copy Modules]] — No hardcoded strings governance
- [[Persona Generator - Prompt Architecture]] — Reference implementation (asset tool consuming assets)
- [[log]] — 2026-08-06 buyer-persona: lessons learned (idempotency, models, workspace assets, cancelled phase)