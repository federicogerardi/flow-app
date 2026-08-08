---
type: concept
tags:
  - wiki/concept
  - wiki/frontend
  - wiki/generation
date_updated: 2026-08-08
source_count: 7
confidence: high
---

# Tool UX Architecture

> Centralized, reusable — new tool = configuration, not code  
> Zero cognitive weight for users, zero friction for developers

> **2026-08-08 simplification**: the tool page is now setup-only. After submitting, the user is redirected to [[SessionPage]] (`/sessions/[id]`) for progress tracking and results. This eliminates SSE-duplication between `ToolPageLayout` and `SessionPage`. [[SessionPage]] is the single canonical view for session lifecycle.

## Principle

Every tool is the **same experience** with different inputs. The user never asks "what's happening?" or "what do I need?". The developer adds a tool by writing a config file, not a component.

```
Tool UX = Standardized Setup → Redirect to SessionPage for progress + results
```

---

## The SetupPanel — Generic Input Renderer

`SetupPanel` reads `ToolDefinition.acquisition` and renders the correct fields. No per-tool components. One file, 11 tools.

### Input Type → Component Mapping

```typescript
// apps/frontend/src/components/tool/SetupPanel.tsx

function SetupPanel({ tool, inputs, onChange }: Props) {
  return (
    <Stack spacing={3}>
      {/* Dynamic: renders from ToolDefinition, not hardcoded */}
      {tool.acquisition.userText?.map(field => (
        <TextField
          key={field.key}
          label={field.label}
          required={field.required}
          value={inputs.text[field.key] ?? ''}
          onChange={e => onChange({ text: { [field.key]: e.target.value } })}
          helperText={field.required && !inputs.text[field.key]?.trim()
            ? copy.t('toolPage.readiness.missingText')
            : undefined}
        />
      ))}

      {tool.acquisition.files?.map(field => (
        <FileUpload
          key={field.key}
          label={field.label}
          accept={field.accept}
          required={field.required}
          file={inputs.files[field.key]}
          onChange={file => onChange({ files: { [field.key]: file } })}
        />
      ))}

      {tool.acquisition.apiCalls && tool.acquisition.apiCalls.length > 0 && (
        <InfoBanner>
          This tool uses data from external APIs ({tool.acquisition.apiCalls.map(c => c.source).join(', ')}).
          Data will be acquired when generation starts.
        </InfoBanner>
      )}
    </Stack>
  );
}
```

### Input Types Supported

| Input Type | Component | Tool examples |
|-----------|-----------|---------------|
| `userText` (short) | MUI `TextField` | `ai-overview-analysis` keyword, `blog-post` topic |
| `userText` (long) | MUI `TextareaAutosize` | `ad-copy` product description |
| `userText` (select) | MUI `Select` | `ad-copy` campaign type, `video-description` language |
| `files` | MUI `DropzoneArea` + `LinearProgress` | `landing-funnel` briefing, `blog-post` context file |
| `apiCalls` | `InfoBanner` (informational, no user action) | `ai-overview-analysis` SerpAPI |
| `assets` | `KnowledgePanel` sidebar | All content tools |

---

## Always-On Information — State Transparency

The user **always** knows what is happening. Every state has a visible informational message.

### State → Information Mapping

```
┌──────────────────┬──────────────────────────────────────────────────────────┐
│ ToolPage State   │ What the user sees                                        │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ draftEmpty       │ Loading spinner. "Loading tool..."                        │
│ configuring      │ SetupPanel active. Clear labels. Readiness snapshot       │
│ ready            │ "Ready to generate" + credit cost visible                 │
│ submitting       │ Spinner + "Starting generation..."                        │
│ submitted        │ Redirect → [[SessionPage]]: FeedbackPanel (running) or    │
│                  │ CompletionBanner + SessionSummary (completed)             │
└──────────────────┴──────────────────────────────────────────────────────────┘

┌──────────────────┬──────────────────────────────────────────────────────────┐
│ SessionPage      │ What the user sees                                        │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ queued/draft     │ Friendly "Generazione in elaborazione" alert             │
│ running          │ FeedbackPanel with animated step cards. Never silent.     │
│ completed        │ CompletionBanner + SessionSummary with download, promote  │
│ failed           │ ErrorState with actionable message + retry CTA            │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

### FeedbackPanel — Never Silent (now SessionPage-only)

During execution, the `FeedbackPanel` (rendered in [[SessionPage]]) always shows updated information:

```tsx
function FeedbackPanel({ artifacts, progress }: Props) {
  return (
    <Stack spacing={2} role="status" aria-live="polite">
      {/* Global progress */}
      <LinearProgress
        variant="determinate"
        value={progress ? (progress.current / progress.total) * 100 : 0}
        aria-label={`Step ${progress?.current} of ${progress?.total}`}
      />

      {/* Step cards — completed animate in, current pulses, future are dimmed */}
      {steps.map((step, i) => {
        const artifact = artifacts[i];
        const isCurrent = i === artifacts.length;
        const isDone = !!artifact;
        const isFuture = i > artifacts.length;

        return (
          <StepCard
            key={step.order}
            step={step}
            status={isDone ? 'completed' : isCurrent ? 'active' : 'pending'}
            aria-label={`${step.label}: ${isDone ? 'completed' : isCurrent ? 'in progress' : 'waiting'}`}
          >
            {isCurrent && (
              <Typography variant="body2" color="text.secondary">
                {copy.t('toolPage.feedback.stepInProgress', { label: step.label })}
              </Typography>
            )}
            {isDone && (
              <Typography variant="body2" color="success.main">
                ✓ Completed
              </Typography>
            )}
          </StepCard>
        );
      })}

      {/* Elapsed time */}
      <Typography variant="caption" color="text.secondary">
        Time elapsed: {elapsed}
      </Typography>
    </Stack>
  );
}
```

**Principle**: every state change emits a message. SSE receives `step_completed` → card animates, progress bar advances, timer updates. The user never asks "is it stuck?".

---

## Tool Lifecycle — User Perspective

```
1. ENTER TOOL                       2. CONFIGURE                         3. REDIRECT → SessionPage
┌─────────────────────┐             ┌─────────────────────┐             ┌─────────────────────┐
│ Sidebar: Blog Post   │             │ Topic: [___________] │             │ /sessions/[id]       │
│                      │             │ File:  [Upload 📎]   │             │                      │
│ What it produces:    │  ──fill──▶  │                      │  ──click──▶ │ See progress +       │
│ SEO blog article     │             │ Credit cost: 1        │  "Generate" │ results in the       │
│                      │             │                      │             │ canonical session    │
│ 3 steps:             │             │ [Generate] ← enabled  │             │ page                 │
│ SEO → Outline → Post │             │                      │             │                      │
└─────────────────────┘             └─────────────────────┘             └─────────────────────┘

4. RESULT (SessionPage)
┌──────────────────────────────────────────────────────────┐
│ ✅ Completed in 1:23                                      │
│                                                           │
│ # Article Title                                           │
│ Lorem ipsum dolor sit amet...                             │
│                                                           │
│ [Download .docx] [Download .pdf] [Download .md]           │
│ [Promote to Asset]  ← if tool.produces !== undefined      │
│ [Nuova generazione] ← back to tool setup                  │
└──────────────────────────────────────────────────────────┘
```

---

## Developer Experience — Adding a Tool

New tool = **5 files, ~100 lines, ~30 minutes**. No new React components.

```
1. packages/domain/src/generation/tools/new-tool.tool.ts   (~20 loc)
   → ToolDefinition: acquisition + steps + creditCost + produces

2. apps/backend/src/prompts/new-tool/step-name/system.md    (~15 loc)
3. apps/backend/src/prompts/new-tool/step-name/user.md      (~10 loc)
   → Prompt template for each step

4. packages/copy/src/it/tool-page.ts                        (~5 loc)
   → Add toolName to a dictionary (if different from the default)

5. apps/frontend/src/...                                    (0 loc)
    → No frontend files. SetupPanel is generic. Progress/results handled by [[SessionPage]].
```

### Example: `campaign-report` (hypothetical new tool)

```typescript
// 1. packages/domain/src/generation/tools/campaign-report.tool.ts

export const campaignReportTool: ToolDefinition = {
  toolKey: 'campaign-report',
  name: 'Campaign Report',
  description: 'Genera un report di campagna marketing da dati CSV e brief.',
  creditCost: 2,        // complex tool = more credits
  produces: undefined,  // content tool = non produce asset

  acquisition: {
    userText: [
      { key: 'campaignName', label: 'Nome campagna', required: true, type: 'short' },
      { key: 'period',       label: 'Periodo',        required: true, type: 'select',
        options: ['Ultimo mese', 'Ultimo trimestre', 'Ultimo anno'] },
    ],
    files: [
      { key: 'csvData',  label: 'Dati CSV',      accept: ['.csv'],        required: true },
      { key: 'briefing', label: 'Brief campagna', accept: ['.txt','.md'],  required: false },
    ],
    assets: [
      { assetType: 'brand-voice', required: false },
    ],
  },

  steps: [
    { order: 1, label: 'Analisi Dati',      enrichment: 'serial', prompt: { template: 'campaign-report/analyze',  model: 'balanced' } },
    { order: 2, label: 'Insight Extraction', enrichment: 'serial', prompt: { template: 'campaign-report/insights', model: 'premium'  } },
    { order: 3, label: 'Report Finale',     enrichment: 'serial', prompt: { template: 'campaign-report/report',    model: 'premium'  } },
  ],
};

// 5. packages/domain/src/generation/tools/index.ts
export const toolRegistry = {
  // ...existing tools...
  'campaign-report': campaignReportTool,
};
```

**Done.** SetupPanel automatically renders Campaign Name (text), Period (select), CSV Data (file upload), Brief (optional file upload), Brand Voice (Knowledge Panel). FeedbackPanel shows 3 step cards with progress bar. SessionSummary shows the result with download. Zero new UI code.

---

## Input Field Types

```typescript
// packages/domain/src/generation/tool-definition.ts

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
  accept: string[];                      // ['.txt', '.md', '.docx']
  required: boolean;
  description?: string;
  maxSizeMb?: number;                    // default: 10
};
```

### SetupPanel Field Rendering Logic

```typescript
function renderField(field: TextInput, value: string, onChange: (v: string) => void) {
  switch (field.type ?? 'short') {
    case 'short':
      return <TextField label={field.label} required={field.required}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder} helperText={field.description} />;

    case 'long':
      return <TextField label={field.label} required={field.required}
        value={value} onChange={e => onChange(e.target.value)}
        multiline minRows={3} maxRows={10}
        placeholder={field.placeholder} helperText={field.description} />;

    case 'select':
      return <FormControl required={field.required}>
        <InputLabel>{field.label}</InputLabel>
        <Select value={value} onChange={e => onChange(e.target.value)} label={field.label}>
          {field.options?.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
        </Select>
        {field.description && <FormHelperText>{field.description}</FormHelperText>}
      </FormControl>;
  }
}
```

---

## Tool Metadata Display

Before the user starts configuring, the tool shows what it produces:

```tsx
// Shown when tool is selected but no inputs configured yet
function ToolIntro({ tool }: { tool: ToolDefinition }) {
  return (
    <Card>
      <Typography variant="h5">{tool.name}</Typography>
      <Typography variant="body1" color="text.secondary">{tool.description}</Typography>

      <Stack direction="row" spacing={2} mt={2}>
        <Chip label={`${tool.steps.length} steps`} size="small" />
        {tool.creditCost && tool.creditCost > 1 && (
          <Chip label={`${tool.creditCost} credits`} size="small" color="warning" />
        )}
        {tool.produces && (
          <Chip label={`Produces: ${assetTypeLabel(tool.produces)}`} size="small" color="secondary" />
        )}
      </Stack>
    </Card>
  );
}
```

---

## Sources

- [[Tool as Static Configuration]] — ToolDefinition structure
- [[ToolPage Machine (XState v5)]] — State machine driving the UX
- [[Frontend Architecture]] — Component inventory and layout
- [[ReadinessSnapshot UI]] — Pre-flight validation display
- [[Asset Promotion]] — Promote button in SessionSummary
- [[Session List - Live Status]] — Cross-tab live session tracking
- [[sources/USER-STORIES]] — US-T01 to US-T10, US-GF01 to US-GF04
