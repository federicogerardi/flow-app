---
type: concept
tags:
  - wiki/concept
  - wiki/frontend
date_updated: 2026-07-30
source_count: 0
confidence: high
---

# ReadinessSnapshot UI

> Frontend component displaying what's missing before generation can start  
> `apps/frontend/src/components/ReadinessSnapshot.tsx`

## Principle

The [[ToolPage Machine (XState v5)|toolPageMachine]] evaluates readiness via the `canSubmit` guard. The UI renders the result as a human-readable snapshot — showing what's configured, what's missing, and what's optional. This replaces generic disabled buttons with actionable guidance.

## Component

```tsx
// apps/frontend/src/components/ReadinessSnapshot.tsx

import type { ToolDefinition } from '@flow-app/contracts';
import type { ToolPageContext } from '../machines/tool-page-machine';

interface Props {
  tool: ToolDefinition;
  inputs: ToolPageContext['inputs'];
  canSubmit: boolean;
}

function ReadinessSnapshot({ tool, inputs, canSubmit }: Props) {
  const items = buildReadinessItems(tool, inputs);

  return (
    <div className="readiness-snapshot" role="status" aria-live="polite">
      <h3>Ready to generate?</h3>
      <ul className="readiness-list">
        {items.map((item) => (
          <li
            key={item.key}
            className={`readiness-item ${item.status}`}
            aria-label={`${item.label}: ${item.status === 'ok' ? 'configured' : item.status === 'missing' ? 'required, missing' : 'optional'}`}
          >
            <span className={`readiness-icon ${item.status}`}>
              {item.status === 'ok' ? '✓' : item.status === 'missing' ? '✗' : '○'}
            </span>
            <span className="readiness-label">{item.label}</span>
            {item.status === 'missing' && (
              <span className="readiness-hint">Required — {item.hint}</span>
            )}
          </li>
        ))}
      </ul>
      {canSubmit && (
        <p className="readiness-all-set">All required inputs configured. Ready to generate.</p>
      )}
    </div>
  );
}

interface ReadinessItem {
  key: string;
  label: string;
  status: 'ok' | 'missing' | 'optional';
  hint?: string;
}

function buildReadinessItems(
  tool: ToolDefinition,
  inputs: ToolPageContext['inputs']
): ReadinessItem[] {
  const items: ReadinessItem[] = [];

  // Text inputs
  for (const t of tool.acquisition.userText ?? []) {
    const hasValue = inputs.text[t.key]?.trim();
    items.push({
      key: `text:${t.key}`,
      label: t.label,
      status: t.required ? (hasValue ? 'ok' : 'missing') : 'optional',
      hint: t.required ? 'Enter a value' : undefined,
    });
  }

  // File inputs
  for (const f of tool.acquisition.files ?? []) {
    const hasFile = !!inputs.files[f.key];
    items.push({
      key: `file:${f.key}`,
      label: f.label,
      status: f.required ? (hasFile ? 'ok' : 'missing') : 'optional',
      hint: f.required ? 'Upload a file' : undefined,
    });
  }

  // Asset inputs
  for (const a of tool.acquisition.assets ?? []) {
    const hasAsset = inputs.selectedAssetIds.length > 0;
    items.push({
      key: `asset:${a.assetType}`,
      label: `${assetTypeLabel(a.assetType)} asset`,
      status: a.required ? (hasAsset ? 'ok' : 'missing') : 'optional',
      hint: a.required ? 'Select an asset or create one' : undefined,
    });
  }

  return items;
}

function assetTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'brief': 'Brief',
    'brand-voice': 'Brand Voice',
    'persona': 'Buyer Persona',
    'angle': 'Marketing Angle',
    'ad-copy': 'Ad Copy',
  };
  return labels[type] ?? type;
}
```

## States

| State | Visual |
|-------|--------|
| All required OK | All rows ✓ green, "Ready to generate" message, submit enabled |
| Missing required | ✗ red rows with hints, submit disabled |
| All optional | ○ gray rows, submit enabled (no required inputs) |

## Integration in ToolPage

```tsx
// Inside ToolPage component (see ToolPage Machine page)

{uiState === 'setup' && (
  <>
    <KnowledgePanel
      tool={state.context.tool!}
      selectedAssetIds={state.context.inputs.selectedAssetIds}
      onChange={(ids) => send({ type: 'CONFIGURE', inputs: { selectedAssetIds: ids } })}
    />
    <SetupPanel
      tool={state.context.tool!}
      inputs={state.context.inputs}
      onChange={(inputs) => send({ type: 'CONFIGURE', inputs })}
    />
    <ReadinessSnapshot
      tool={state.context.tool!}
      inputs={state.context.inputs}
      canSubmit={state.matches('ready')}
    />
    <Button
      onClick={() => send({ type: 'SUBMIT' })}
      disabled={!state.can({ type: 'SUBMIT' })}
    >
      Generate
    </Button>
  </>
)}
```

## Reason Codes

The `ReadinessSnapshot` surfaces the same reason codes that the backend `ReadinessPolicy` uses — consistency across FE/BE:

| Reason | Display |
|--------|---------|
| Missing text input | "Required — Enter a value" |
| Missing file | "Required — Upload a file" |
| Missing asset | "Required — Select a [AssetType] asset or create one" |
| No workspace selected | "Select a workspace first" (handled by workspace picker) |

## Sources

- [[ReadinessPolicy]] — backend domain VO
- [[ToolPage Machine (XState v5)]] — canSubmit guard and integration point
- [[Tool as Static Configuration]] — ToolDefinition.acquisition shape
- [[sources/PRD]] — FR-U02 (Readiness Snapshot with reason codes)