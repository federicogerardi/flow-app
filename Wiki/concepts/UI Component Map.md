---
type: concept
tags:
  - wiki/concept
  - wiki/frontend
  - wiki/architecture
date_updated: 2026-07-31
source_count: 6
confidence: high
---

# UI Component Map

> Complete React/MUI component inventory — props, state bindings, MUI internals  
> Extends [[Frontend Architecture]] from 17 → 23 components (6 UX-v1 additions)  
> All components are generic (zero tool-specific). New tool = zero new components.

## Inventory Overview

```
apps/frontend/src/
├── components/
│   ├── layout/                        # 3 components (existing)
│   │   ├── AppShell.tsx
│   │   ├── WorkspaceDashboard.tsx
│   │   └── ToolPageLayout.tsx
│   │
│   ├── workspace/                     # 5 components (was 4, +1)
│   │   ├── WorkspaceCard.tsx
│   │   ├── WorkspaceForm.tsx
│   │   ├── SessionList.tsx
│   │   ├── AssetList.tsx
│   │   └── AssetCoverageBar.tsx       ← UX-v1 addition
│   │
│   ├── tool/                          # 6 components (was 5, +1)
│   │   ├── SetupPanel.tsx
│   │   ├── KnowledgePanel.tsx
│   │   ├── ReadinessSnapshot.tsx
│   │   ├── FeedbackPanel.tsx
│   │   ├── SessionSummary.tsx
│   │   └── ToolCard.tsx               ← UX-v1 addition
│   │
│   └── shared/                        # 9 components (was 5, +4)
│       ├── PageHeader.tsx
│       ├── EmptyState.tsx
│       ├── ErrorState.tsx
│       ├── LoadingSkeleton.tsx
│       ├── ConfirmDialog.tsx
│       ├── CompletionBanner.tsx       ← UX-v1 addition
│       ├── QuickGenerateBar.tsx       ← UX-v1 addition
│       ├── WorkspaceAccentProvider.tsx ← UX-v1 addition
│       └── PromoteButton.tsx          ← UX-v1 addition
│
└── theme/
    ├── index.ts                       # buildTheme(mode)
    ├── tokens.ts                      # palette, typography, spacing
    ├── workspace-accents.ts           # 10 presets + WorkspaceAccent type
    └── ThemeProvider.tsx              # Light/Dark/System context
```

**Total: 23 components + 4 theme files.**  
**Zero tool-specific components.** New tool = 0 new component files.

---

## Layer 1 — Layout Components

### `AppShell.tsx`

Root layout wrapper. Handles sidebar, header, content area, and workspace accent injection.

```typescript
interface AppShellProps {
  children: React.ReactNode;
}

// Internal responsibilities:
// - Renders Sidebar (280px fixed, collapsible on tablet)
// - Injects WorkspaceAccentProvider with current workspace accentColor
// - Handles Light/Dark/System theme toggle
// - Renders bottom nav on mobile (via useBreakpoint)
```

| MUI internal | Usage |
|--------------|-------|
| `Drawer` (permanent/temporary) | Sidebar on desktop/mobile |
| `Box`, `Stack` | Layout primitives |
| `useMediaQuery` | Responsive behavior |
| `Divider` | Sidebar section separators |
| `IconButton` | Theme toggle, settings |

**State bindings:**
- Current workspace from `useWorkspaceContext()`
- Theme mode from `useThemeMode()`
- Navigation active item from `useLocation()` (React Router)

---

### `WorkspaceDashboard.tsx`

Default view when entering a workspace. Composed from sub-sections.

```typescript
interface WorkspaceDashboardProps {
  workspaceId: string;
}

// Sections rendered in order:
// 1. QuickGenerateBar (always visible, workspace-aware)
// 2. InProgress sessions (collapsed if empty)
// 3. ReadyToPromote artifacts (KPI #3 anchor section)
// 4. AssetCoverageBar (asset completeness)
// 5. ToolShortcuts grid (top 4 tools + "Tutti →")
```

**4-state pattern:**
```typescript
const { workspace, sessions, artifacts, assets, loading, error } = useWorkspace(workspaceId);
if (loading) return <LoadingSkeleton variant="dashboard" />;
if (error)   return <ErrorState message={error.message} onRetry={refetch} />;
```

---

### `ToolPageLayout.tsx`

Wraps the 3-phase Tool Page. Derives phase from XState machine state.

```typescript
interface ToolPageLayoutProps {
  toolKey: string;
  workspaceId: string;
}

// Phases derived from toolPageMachine via deriveUIState():
// 'setup'      → SetupPanel + KnowledgePanel + ReadinessSnapshot + CTA bar
// 'submitting' → SetupPanel (disabled) + spinner overlay
// 'progress'   → FeedbackPanel
// 'completed'  → SessionSummary + CompletionBanner
// 'failed'     → ErrorState with retry
// 'cancelled'  → SetupPanel (restored inputs)
```

---

## Layer 2 — Workspace Components

### `WorkspaceCard.tsx`

Card in the workspace switcher dropdown or future workspace list.

```typescript
interface WorkspaceCardProps {
  workspace: WorkspaceListItemDTO;
  isActive: boolean;
  onSelect: (id: string) => void;
}
```

| Visual element | MUI | Notes |
|----------------|-----|-------|
| Accent dot | `Box` + CSS var | `background: var(--workspace-accent)` |
| Workspace name | `Typography h6` | `fontFamily: Plus Jakarta Sans` |
| Session count | `Chip` size small | `variant="outlined"` |
| Active indicator | `ListItemButton selected` | Filled background |

---

### `WorkspaceForm.tsx`

Create/edit workspace dialog. Includes accent color picker.

```typescript
interface WorkspaceFormProps {
  open: boolean;
  workspace?: WorkspaceListItemDTO;  // undefined = create mode
  onClose: () => void;
  onSave: (data: { name: string; accentColor: WorkspaceAccent }) => Promise<void>;
}
```

| Field | MUI | Validation |
|-------|-----|------------|
| Workspace name | `TextField` required | minLength 2, maxLength 50 |
| Accent color | 10-dot color picker | Select from `WORKSPACE_ACCENTS` |
| Save CTA | `Button contained primary` | Disabled until valid |

**Color picker implementation:**
```tsx
// Renders 10 circles, click selects accent
{Object.entries(WORKSPACE_ACCENTS).map(([key, hex]) => (
  <Box
    key={key}
    onClick={() => setAccent(key as WorkspaceAccent)}
    sx={{
      width: 24, height: 24, borderRadius: '50%',
      background: hex, cursor: 'pointer',
      border: accent === key ? '2px solid grey.900' : '2px solid transparent',
      transition: 'transform 150ms ease',
      '&:hover': { transform: 'scale(1.2)' },
    }}
  />
))}
```

---

### `SessionList.tsx`

Live session tracker with tabs. Cross-tab resilient via SSE + poll.  
See [[Session List - Live Status]] for full implementation.

```typescript
interface SessionListProps {
  workspaceId: string;
  compact?: boolean;    // true = dashboard widget (3 items max); false = full page
}
```

| Tab | Content | Badge |
|-----|---------|-------|
| In corso | queued + running sessions | count (accent color) |
| Completate | completed sessions, limit 20 | count |
| Fallite | failed sessions, limit 20 | count (error color) |

---

### `AssetList.tsx`

Asset management panel used both in KnowledgePanel and full Asset page.

```typescript
interface AssetListProps {
  workspaceId: string;
  selectable?: boolean;          // KnowledgePanel mode — allows selection
  filterByType?: AssetType;      // pre-filtered
  onSelect?: (ids: string[], byType: Partial<Record<AssetType, string>>) => void;
}
```

---

### `AssetCoverageBar.tsx` ← UX-v1 addition

Visual completeness indicator for workspace assets. Drives awareness of missing assets.

```typescript
interface AssetCoverageBarProps {
  assets: AssetListItemDTO[];
  onGenerateMissing?: (assetType: AssetType) => void;  // CTA for missing types
}
```

```tsx
// Renders one row per AssetType in the known catalog
// ✓ = present (bar fills with --workspace-accent)
// ✗ = missing (empty bar + "Genera →" button)

const ASSET_TYPES: AssetType[] = ['brief', 'brand-voice', 'persona', 'angle', 'ad-copy'];

function AssetCoverageBar({ assets, onGenerateMissing }: AssetCoverageBarProps) {
  const presentTypes = new Set(assets.map(a => a.assetType));

  return (
    <Stack spacing={1}>
      {ASSET_TYPES.map(type => {
        const present = presentTypes.has(type);
        return (
          <Stack key={type} direction="row" alignItems="center" spacing={2}>
            <Typography variant="body2" sx={{ width: 130, flexShrink: 0 }}>
              {assetTypeLabel(type)}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={present ? 100 : 0}
              sx={{
                flex: 1,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'var(--workspace-accent)',
                },
              }}
            />
            {present
              ? <CheckCircleIcon color="success" fontSize="small" />
              : <Button size="small" onClick={() => onGenerateMissing?.(type)}>Genera →</Button>
            }
          </Stack>
        );
      })}
    </Stack>
  );
}
```

---

## Layer 3 — Tool Components

### `SetupPanel.tsx`

Generic input renderer. Reads `ToolDefinition.acquisition`, renders fields.  
See [[Tool UX Architecture]] for full implementation.

```typescript
interface SetupPanelProps {
  tool: ToolDefinition;
  inputs: ToolPageContext['inputs'];
  onChange: (inputs: Partial<ToolPageContext['inputs']>) => void;
  disabled?: boolean;    // true during 'submitting' state
}
```

| Input type | MUI component |
|-----------|---------------|
| `userText` short | `TextField` |
| `userText` long | `TextField multiline` |
| `userText` select | `Select` + `MenuItem` |
| `files` | `FileUpload` (custom, wraps `input[type=file]`) |
| `apiCalls` | `Alert` severity="info" (informational only) |

---

### `KnowledgePanel.tsx`

Asset selection sidebar. Shown during setup phase.

```typescript
interface KnowledgePanelProps {
  tool: ToolDefinition;
  workspaceId: string;
  selectedAssetIds: string[];
  selectedAssetsByType: Partial<Record<AssetType, string>>;
  onChange: (data: { ids: string[]; byType: Partial<Record<AssetType, string>> }) => void;
}
```

**Selection rule:** only one asset per `assetType` can be selected at a time.

```tsx
function handleSelect(asset: AssetListItemDTO, checked: boolean) {
  if (checked) {
    onChange({
      ids: [...selectedAssetIds.filter(id => {
        const existing = assets.find(a => a.id === id);
        return existing?.assetType !== asset.assetType;  // deselect same type
      }), asset.id],
      byType: { ...selectedAssetsByType, [asset.assetType]: asset.id },
    });
  } else {
    onChange({
      ids: selectedAssetIds.filter(id => id !== asset.id),
      byType: { ...selectedAssetsByType, [asset.assetType]: undefined },
    });
  }
}
```

---

### `ReadinessSnapshot.tsx`

Pre-flight readiness display. See [[ReadinessSnapshot UI]] for full implementation.

```typescript
interface ReadinessSnapshotProps {
  tool: ToolDefinition;
  inputs: ToolPageContext['inputs'];
  canSubmit: boolean;
}
```

| Status | Icon | Color |
|--------|------|-------|
| `ok` | `✓` | `success.main` |
| `missing` | `✗` | `error.main` |
| `optional` | `○` | `grey.400` |

---

### `FeedbackPanel.tsx`

Step-by-step progress during generation. SSE-driven.  
See [[Tool UX Architecture]] for full implementation.

```typescript
interface FeedbackPanelProps {
  steps: StepDefinition[];      // from ToolDefinition (total expected)
  artifacts: ArtifactDTO[];     // completed steps
  progress: StepProgress | null;
  onCancel: () => void;
}
```

| Step state | Visual | Animation |
|-----------|--------|-----------|
| `completed` | ✅ green card + artifact preview | `slideInFade 300ms` |
| `active` | ◐ pulsing skeleton | `stepPulse 1.5s infinite` |
| `pending` | ○ dimmed card | none |

---

### `SessionSummary.tsx`

Final result view. Contains artifact preview and action buttons.

```typescript
interface SessionSummaryProps {
  session: SessionDetailDTO;
  artifacts: ArtifactDTO[];
  tool: ToolDefinition;
  onDownload: (artifactId: string, format: 'md' | 'txt' | 'docx' | 'pdf') => void;
  onRetry: () => void;
  onNewGeneration: () => void;
}
```

**Promote button rule:** `PromoteButton` is rendered if `tool.produces !== undefined`.  
Promote button is **always** `variant="contained"` with `--workspace-accent`.

---

### `ToolCard.tsx` ← UX-v1 addition

Tool shortcut card for the dashboard "Strumenti Rapidi" section.

```typescript
interface ToolCardProps {
  tool: ToolDefinition;
  workspaceId: string;
  onClick: (toolKey: string) => void;
}
```

```tsx
function ToolCard({ tool, workspaceId, onClick }: ToolCardProps) {
  return (
    <Card
      onClick={() => onClick(tool.toolKey)}
      sx={{
        cursor: 'pointer',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        minWidth: 96,
        transition: 'all 150ms ease',
        '&:hover': {
          borderColor: 'var(--workspace-accent)',
          boxShadow: '0 0 0 2px var(--workspace-accent-light)',
          transform: 'translateY(-3px)',
        },
      }}
    >
      <Typography variant="h4" component="span" aria-hidden>
        {toolEmoji(tool.toolKey)}
      </Typography>
      <Typography variant="caption" textAlign="center" fontWeight={500}>
        {tool.name}
      </Typography>
    </Card>
  );
}

// toolEmoji maps toolKey → emoji (presentational only, not in copy module)
const TOOL_EMOJI: Record<string, string> = {
  'blog-post':                '✍️',
  'video-script-long-form':   '🎬',
  'landing-funnel':           '📄',
  'landing-page':             '🖥',
  'video-description':        '📝',
  'ad-copy':                  '📢',
  'brief':                    '📋',
  'brand-voice':              '🎙',
  'buyer-persona':            '👤',
  'marketing-angle':          '🎯',
  'ai-overview-analysis':     '🔍',
};
```

---

## Layer 4 — Shared Components

### `PageHeader.tsx`

Consistent page titles + breadcrumb + optional action slot.

```typescript
interface PageHeaderProps {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;    // buttons or dropdowns
}
```

---

### `EmptyState.tsx`

No-data state with contextual CTA. Never a dead end.

```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'contained' | 'outlined';
  };
}
```

---

### `ErrorState.tsx`

Error display with retry. Maps `ApiClientError.code` to user-friendly message.

```typescript
interface ErrorStateProps {
  message: string;
  code?: string;          // error code for display (developer context)
  onRetry: () => void;
}
```

---

### `LoadingSkeleton.tsx`

Shape-matched skeleton per view variant.

```typescript
type SkeletonVariant = 'dashboard' | 'card-grid' | 'list' | 'tool-page' | 'session-detail';

interface LoadingSkeletonProps {
  variant: SkeletonVariant;
  count?: number;    // for list/card-grid variants
}
```

---

### `ConfirmDialog.tsx`

Destructive action confirmation modal.

```typescript
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;    // default: "Elimina"
  onConfirm: () => void;
  onCancel: () => void;
  severity?: 'error' | 'warning';
}
```

---

### `CompletionBanner.tsx` ← UX-v1 addition

Celebratory completion state. One-shot animation on mount.

```typescript
interface CompletionBannerProps {
  durationSeconds: number;
  stepCount: number;
  creditCost: number;
}
```

```tsx
function CompletionBanner({ durationSeconds, stepCount, creditCost }: CompletionBannerProps) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #059669 0%, #0891B2 100%)',
        color: 'white',
        animation: 'celebrationPop 400ms ease-out',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="h5" component="span">✅</Typography>
        <Stack>
          <Typography variant="h6" fontWeight={700}>
            Completato in {formatDuration(durationSeconds)}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {stepCount} step · {creditCost} {creditCost === 1 ? 'credito' : 'crediti'}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
```

---

### `QuickGenerateBar.tsx` ← UX-v1 addition

Top-of-dashboard generation shortcut. Accepts tool selection inline.

```typescript
interface QuickGenerateBarProps {
  workspaceId: string;
  onNavigate: (toolKey: string) => void;
}
```

```tsx
function QuickGenerateBar({ workspaceId, onNavigate }: QuickGenerateBarProps) {
  const [selected, setSelected] = useState<string>('blog-post');

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2,
        background: 'var(--workspace-accent-light, #EFF6FF)',
        border: '1.5px solid var(--workspace-accent, #2563EB)',
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <Select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        size="small"
        sx={{ minWidth: 180 }}
      >
        {Object.values(toolRegistry).map(t => (
          <MenuItem key={t.toolKey} value={t.toolKey}>{t.name}</MenuItem>
        ))}
      </Select>

      <Button
        variant="contained"
        onClick={() => onNavigate(selected)}
        sx={{
          background: 'var(--workspace-accent)',
          '&:hover': { filter: 'brightness(0.9)' },
        }}
        startIcon={<BoltIcon />}
      >
        Nuova Generazione
      </Button>
    </Box>
  );
}
```

---

### `WorkspaceAccentProvider.tsx` ← UX-v1 addition

Injects `--workspace-accent` CSS variable at workspace level.  
See [[Design Tokens]] for full implementation.

```typescript
interface WorkspaceAccentProviderProps {
  accentKey: WorkspaceAccent;
  children: React.ReactNode;
}
```

**Mounted inside `AppShell`**, wraps all content. Replaces when workspace switches.

---

### `PromoteButton.tsx` ← UX-v1 addition

Standalone Promote-to-Asset action. Always `variant="contained"` with accent color.

```typescript
interface PromoteButtonProps {
  sessionId: string;
  artifactId: string;
  assetType: AssetType;          // from tool.produces
  workspaceId: string;
  onPromoted?: () => void;
}
```

```tsx
function PromoteButton({ sessionId, artifactId, assetType, workspaceId, onPromoted }: PromoteButtonProps) {
  const [state, setState] = useState<'idle' | 'confirming' | 'loading' | 'done'>('idle');

  if (state === 'done') {
    return (
      <Chip
        icon={<CheckCircleIcon />}
        label={`Promosso a ${assetTypeLabel(assetType)}`}
        color="success"
        variant="outlined"
      />
    );
  }

  return (
    <>
      <Button
        variant="contained"
        onClick={() => setState('confirming')}
        disabled={state === 'loading'}
        startIcon={<ArrowUpwardIcon />}
        sx={{
          background: 'var(--workspace-accent)',
          '&:hover': { filter: 'brightness(0.92)' },
        }}
      >
        {state === 'loading' ? 'Promozione…' : `Promuovi a ${assetTypeLabel(assetType)}`}
      </Button>

      {/* Inline confirm — expands below button, no modal */}
      <Collapse in={state === 'confirming'}>
        <Alert severity="info" sx={{ mt: 1 }}
          action={
            <Stack direction="row" spacing={1}>
              <Button size="small" color="inherit" onClick={() => setState('idle')}>Annulla</Button>
              <Button size="small" variant="contained" color="success"
                onClick={async () => {
                  setState('loading');
                  await api.promoteArtifact(artifactId, workspaceId);
                  setState('done');
                  onPromoted?.();
                }}>
                Conferma
              </Button>
            </Stack>
          }
        >
          Salva il risultato come asset "{assetTypeLabel(assetType)}" nel workspace.
        </Alert>
      </Collapse>
    </>
  );
}
```

---

## State Management Bindings

| Component | XState | React Hook | SWR/Query |
|-----------|--------|------------|-----------|
| `ToolPageLayout` | `toolPageMachine` (primary) | — | — |
| `SetupPanel` | sends `CONFIGURE` | — | — |
| `FeedbackPanel` | reads `artifacts`, `progress` | — | — |
| `SessionSummary` | reads `artifacts` | — | — |
| `SessionList` | — | `useLiveSession` | `api.listSessions` |
| `WorkspaceDashboard` | — | `useWorkspace` | `api.getWorkspace` |
| `AssetList` | — | `useAssets` | `api.listAssets` |
| `KnowledgePanel` | sends `CONFIGURE` | — | `api.listAssets` |
| `PromoteButton` | — | local `useState` | `api.promoteArtifact` |

---

## Accessibility Summary

| Component | WCAG requirement | Implementation |
|-----------|-----------------|----------------|
| All interactive elements | Keyboard operable | MUI handles tab order; `focusVisible` on all |
| `FeedbackPanel` | Live region | `role="status" aria-live="polite"` |
| `ReadinessSnapshot` | Live region | `role="status" aria-live="polite"` |
| `ToolCard` | Non-text content | `aria-hidden` on emoji; `aria-label` on card |
| `AssetCoverageBar` | Progress | `aria-valuenow` on `LinearProgress` |
| `CompletionBanner` | Motion | `prefers-reduced-motion` disables animation |
| `ConfirmDialog` | Focus trap | `MuiDialog` handles focus lock natively |
| Error icons | Color not only | Icon + text, never red color alone |
| `AppShell` sidebar | Skip link | `SkipToContent` before sidebar |

**Target:** WCAG 2.1 AA fully. AAA selectively on `h4`, `h5`, `h6`, body text on default backgrounds.

---

## Sources

- [[Frontend Architecture]] — original 17-component inventory and routing
- [[Tool UX Architecture]] — SetupPanel, FeedbackPanel, KnowledgePanel contracts
- [[ToolPage Machine (XState v5)]] — state machine bindings and CTA policy
- [[ReadinessSnapshot UI]] — readiness display and asset-by-type check
- [[Session List - Live Status]] — SessionCard live states
- [[Design Tokens]] — visual tokens consumed by all components
