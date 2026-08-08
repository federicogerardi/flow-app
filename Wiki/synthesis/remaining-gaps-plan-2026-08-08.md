---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/frontend
  - wiki/implementation-plan
date_updated: 2026-08-08
source_count: 6
confidence: high
---

# Remaining Gaps — Aggressive Plan (v2)

> Post-audit plan: 2 high-priority gaps (WorkspaceForm, Ready to Promote) + 2 low-priority cleanups (WorkspaceDashboard extraction, ConversationPage componentization).  
> Audit: [[synthesis/ui-design-summary-2026-08-07|UI Design Summary]] claimed 22%; actual is 86% after filesystem verification (2026-08-08).

---

## Overview

32/37 wiki-inventoried components are built. Two gaps remain worth closing: `WorkspaceForm` (only unbuilt component) and the `Ready to Promote` section (KPI #3 anchor). Two mechanical cleanups: extract `WorkspaceDashboard` from the 289-line `DashboardPage`, and componentize `ConversationPage`.

**Aggressive strategy**: merge steps that touch the same file. Eliminate intermediate PRs. Ship as 2 commits (backend + frontend). 1 day of focused work.

---

## Gap Summary

| # | Gap | Current | Target | Time |
|---|---|---|---|---|
| 1 | **WorkspaceForm** | Inline `Dialog + TextField` in AppShell, no accent | Reusable component, 10-dot color picker | 2h |
| 2 | **Ready to Promote** | DashboardPage has no promote section | KPI #3 anchor: completed sessions + PromoteButton | 1h |
| 3 | **WorkspaceDashboard** | 289-line DashboardPage monolith | Thin wrapper + WorkspaceDashboard component | 1.5h |
| 4 | **ConversationPage** | 292-line page in `pages/` | `ConversationView` in `components/agent-chat/` | 1.5h |
| **Total** | | | | **~6h (1 day)** |

---

## Execution — Single Day, 3 Batches

```
Batch 1 — Backend + independent components (morning, parallelizable)
═══════════════════════════════════════════════════════════════════════
  A  Backend: migration + contract + API route (1 PR)
  B  WorkspaceForm component (new file, mock onSave)
  C  ReadyToPromoteList component (new file, all deps exist)
  D  ConversationView extraction + ConversationPage thin-out (2 files)

Batch 2 — Dashboard refactor (afternoon, sequential)
═════════════════════════════════════════════════════
  E  WorkspaceDashboard extraction + wire ReadyToPromoteList + thin DashboardPage

Batch 3 — Final wiring (after Batch 1A + 2E land)
═══════════════════════════════════════════════════
  F  API client update + wire WorkspaceForm into AppShell + DashboardPage
```

**Critical path**: A → F (backend must exist before frontend wires it). Everything else is independent. Batch 2 depends on Batch 1C (ReadyToPromoteList must exist to wire into dashboard).

---

## Batch 1 — Backend + Independent Components

### A — Backend: accentColor (single PR, 3 files)

**Files**: migration + `packages/contracts/src/workspace/workspace.dto.ts` + `apps/backend/src/api/workspaces.ts`

1. Migration: `ALTER TABLE workspaces ADD COLUMN accent_color VARCHAR(7) NOT NULL DEFAULT '#2563eb';`
2. Contract: add `accentColor: WorkspaceAccent` to `WorkspaceDTO` + type alias
3. API: accept `accentColor` in `POST /api/workspaces` (optional, default `'blue'`); add `PATCH /api/workspaces/:id` accepting `{ name?, accentColor? }`
- Risk: Low — additive column with default, optional request field

### B — WorkspaceForm component (new file, ~120 lines)

**File**: `apps/frontend/src/components/workspace/WorkspaceForm.tsx`

```typescript
interface WorkspaceFormProps {
  open: boolean;
  workspace?: WorkspaceDTO;  // undefined = create mode
  onClose: () => void;
  onSave: (data: { name: string; accentColor: string }) => Promise<void>;
}
```

- `TextField` for name: `required`, `minLength: 2`, `maxLength: 50`
- 10-dot color picker: 24×24px circles from `WORKSPACE_ACCENTS` (already exported from `WorkspaceAccentProvider`), selected = `border: 2px solid grey.900`, hover = `scale(1.2)`
- Pre-selects `workspace.accentColor` in edit mode, defaults to `'blue'` in create mode
- Save button: `disabled` until name valid
- MUI: `Dialog`, `DialogTitle`, `DialogContent`, `DialogActions`, `TextField`, `Box`, `Button`
- Copy keys: `workspace.form.createTitle` = "Nuovo Workspace", `workspace.form.editTitle` = "Modifica Workspace", `workspace.form.accentLabel` = "Colore accento"
- Can be built + tested standalone with mock `onSave` — no backend dependency

### C — ReadyToPromoteList component (new file, ~100 lines)

**File**: `apps/frontend/src/components/workspace/ReadyToPromoteList.tsx`

```typescript
interface ReadyToPromoteListProps {
  workspaceId: string;
}
```

- Fetch: `api.listSessions({ workspaceId, status: 'completed', limit: 10 })`, filter client-side `isPromotable`
- Section header: "Pronti da Promuovere" + count badge
- List of `CompletedCard` with `onPromote` → `PromoteButton` (4-state: idle→confirming→promoting→done)
- Each card: artifact preview (150 chars), `[Promuovi ad Asset]` (contained + `--workspace-accent`), `[Scarica]`, `[Visualizza]`
- Collapses completely when empty
- Copy keys: `workspace.dashboard.readyToPromote` = "Pronti da Promuovere", `workspace.dashboard.promoteHint` = "Promuovi ad Asset per renderlo disponibile come contesto"
- **Zero new dependencies**: `CompletedCard`, `PromoteButton`, `api.listSessions`, `api.promoteArtifact` all exist

### D — ConversationView extraction + ConversationPage thin-out (2 files)

**New file**: `apps/frontend/src/components/agent-chat/ConversationView.tsx` (~180 lines)

```typescript
interface ConversationViewProps {
  conversationId: string;
  messages: MessageDTO[];
  onSend: (text: string) => void;
  streamingContent: string;
  isStreaming: boolean;
  isLoading: boolean;
}
```

- Extract from `pages/ConversationPage.tsx`: `Card` + `MessageList` + `ChatInput` + typing indicator + empty state + scroll-lock badge
- Enables reuse in Team Hub preview, AgentContextDrawer

**Modified file**: `apps/frontend/src/pages/ConversationPage.tsx` — reduce to routing + SWR + `<ConversationView>` (~60 lines)

---

## Batch 2 — Dashboard Refactor (sequential, after 1C)

### E — WorkspaceDashboard extraction + wire + thin DashboardPage

**New file**: `apps/frontend/src/components/workspace/WorkspaceDashboard.tsx` (~80 lines)

```typescript
interface WorkspaceDashboardProps {
  workspaceId: string;
  workspaceName: string;
  onRename: () => void;
}
```

Extract from `DashboardPage.tsx`, section order:
1. `QuickGenerateBar`
2. `SessionList` (In Progress) — collapses when empty
3. `ReadyToPromoteList` ← NEW, from Batch 1C
4. `AssetCoverageBar`
5. Tool grid (`ToolCard` × N)
6. `WorkspaceMembers`

**Modified file**: `apps/frontend/src/pages/DashboardPage.tsx` — reduce to PageHeader + `<WorkspaceDashboard>` + rename/delete dialogs + SWR (~60 lines)

---

## Batch 3 — Final Wiring (after 1A + 2E)

### F — API client + wire WorkspaceForm

**Modified file**: `apps/frontend/src/api/client.ts`
- Update `createWorkspace(name, accentColor?)` → sends `{ name, accentColor }`
- Add `updateWorkspace(id, { name?, accentColor? })`

**Modified file**: `apps/frontend/src/layout/AppShell.tsx`
- Replace inline creation `Dialog` (lines ~369-389) with `<WorkspaceForm>`
- `handleCreate` passes `accentColor`; on success calls `setAccent(accentColor)` for immediate CSS var injection

**Modified file**: `apps/frontend/src/pages/DashboardPage.tsx` (already thinned in 2E)
- Replace rename `Dialog` with `<WorkspaceForm workspace={currentWorkspace}>` in edit mode
- `handleRename` calls `api.updateWorkspace()` with `accentColor`

---

## Files Summary

### New files (4)

| File | Batch | Lines |
|------|-------|-------|
| `apps/frontend/src/components/workspace/WorkspaceForm.tsx` | 1B | ~120 |
| `apps/frontend/src/components/workspace/ReadyToPromoteList.tsx` | 1C | ~100 |
| `apps/frontend/src/components/workspace/WorkspaceDashboard.tsx` | 2E | ~80 |
| `apps/frontend/src/components/agent-chat/ConversationView.tsx` | 1D | ~180 |

### Modified files (7)

| File | Batch | Change |
|------|-------|--------|
| `packages/infra-db/migrations/NNN_add_workspace_accent.sql` | 1A | +`accent_color` column |
| `packages/contracts/src/workspace/workspace.dto.ts` | 1A | +`accentColor` field |
| `apps/backend/src/api/workspaces.ts` | 1A | +`accentColor` in POST, +PATCH route |
| `apps/frontend/src/api/client.ts` | 3F | +`accentColor` param, +`updateWorkspace()` |
| `apps/frontend/src/layout/AppShell.tsx` | 3F | Replace inline Dialog → `<WorkspaceForm>` |
| `apps/frontend/src/pages/DashboardPage.tsx` | 2E+3F | Extract dashboard, wire ReadyToPromoteList + WorkspaceForm |
| `apps/frontend/src/pages/ConversationPage.tsx` | 1D | Thin wrapper → `<ConversationView>` |

---

## Success Criteria

- [ ] `WorkspaceForm` renders 10-dot color picker, selection/hover states correct
- [ ] Create workspace → `accentColor` persists → CSS var injected immediately
- [ ] Edit workspace → accent pre-selected, change persists
- [ ] `ReadyToPromoteList` shows completed promotable sessions with `PromoteButton`
- [ ] "Promuovi ad Asset" = `variant="contained"` + `--workspace-accent`, above download
- [ ] `ReadyToPromoteList` collapses when empty
- [ ] `WorkspaceDashboard` is a reusable component, `DashboardPage` is ~60 lines
- [ ] `ConversationView` importable standalone
- [ ] All existing tests pass + new tests for `WorkspaceForm` and `ReadyToPromoteList`

---

## Sources

- [[synthesis/ui-design-summary-2026-08-07]] — 37-component spec, WorkspaceForm §4.2.2, Dashboard §4.1.2
- [[UX Wireframes]] — Template 2 (Workspace Home) with Ready to Promote wireframe
- [[UI Component Map]] — Component inventory, state bindings, MUI internals
- [[Frontend Architecture]] — Layout architecture, routing, state patterns
- [[Tool UX Architecture]] — PromoteButton contract, CTA policy
- [[Design Tokens]] — `--workspace-accent` CSS var, `WORKSPACE_ACCENTS` constant
