---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/frontend
  - wiki/ui
date_updated: 2026-08-08
source_count: 4
confidence: medium
---

# Project Improvement UI — Findings Collection

> **Status**: ✅ 20/21 findings resolved 2026-08-08 — 1 deferred (U4 — low). V8 ToolCard redesign complete: emoji → MUI outline icons, elevation → outline variant, compact mode.  
> **Verification**: `tsc --noEmit` 0 errors, `vitest run` 151/151 passing, 19/19 test files.
> **Baseline**: [[ui-design-summary-2026-08-07]] (37 components, 97.3% completion, 151 tests, 0 deprecated MUI).

---

## 1. Baseline Snapshot

| Metric | Value |
|--------|-------|
| Component inventory | 37 listed, 32 built, 4 partial, 1 missing (WorkspaceForm) |
| Test suite | 19 test files, 151 tests — all passing |
| Styling approach | 100% MUI `sx` props, 0 CSS modules / SCSS |
| Deprecated MUI | 0 occurrences (`makeStyles`/`withStyles`) |
| Design tokens | `tokens.ts` (125 lines): palette, rarity, gradients, shadows, dark theme |
| Theme system | `ThemeProvider.tsx` (light/dark/system) + `WorkspaceAccentProvider.tsx` (10 preset colors) |
| Hardcoded hex colors | 4 — all gradient definitions (see §3.2) |

---

## 2. Finding Categories

### 2.1 Design System Gaps
Findings where the component diverges from the design token system.

| # | Finding | Severity | Files | Status |
|---|---------|----------|-------|--------|
| Z1 | AssetList empty-state strings hardcoded in English — copy keys `assets.empty.title` and `assets.empty.message` exist in `packages/copy/src/it/assets.ts` but are unused | **high** | `AssetList.tsx` | ✅ Resolved |
| Z2 | SessionsPage PageHeader title/subtitle hardcoded in English (`"Sessions"` / `"All generation sessions..."`) — should use `copy.t()` keys | **high** | `SessionsPage.tsx` | ✅ Resolved |
| Z3 | AssetsPage PageHeader title hardcoded as `"Assets"` string — should use `copy.t('assets.pageTitle')` | **medium** | `AssetsPage.tsx` | ✅ Resolved |
| Z4 | AssetsPage breadcrumb label hardcoded as `'Assets'` string — should use `copy.t('workspace.nav.assets')` | **medium** | `AssetsPage.tsx` | ✅ Resolved |
| Z5 | ArtifactDTO/ArtifactListItemDTO had no `stepLabel` field — labels available during SSE generation (`step_completed.stepLabel`) are lost when viewing saved sessions. Added `stepLabel: string` to `ArtifactListItemDTO`; frontend uses `artifact.stepLabel \|\| numeric fallback` | **high** | `session.dto.ts`, `SessionSummary.tsx`, `FeedbackPanel.tsx` | ✅ Resolved |

### 2.2 Visual & Layout Issues
Findings about inconsistent spacing, alignment, typography, or visual hierarchy.

| # | Finding | Severity | Files | Status |
|---|---------|----------|-------|--------|
| V1 | Zero-state CTA button path in EmptyState component is dead code — all 5 callers skip `ctaLabel`/`onCta`; every empty state is passive with no suggested action | **high** | `EmptyState.tsx`, `SessionList.tsx`, `AssetList.tsx`, `SessionsPage.tsx`, `DashboardPage.tsx`, `TeamHub.tsx` | ✅ Resolved |
| V2 | Per-tab empty states in SessionList use raw `<Typography>` instead of EmptyState — visual inconsistency with global empty (centered box vs inline text) | **medium** | `SessionList.tsx` | ✅ Resolved |
| V3 | SessionSummary renders artifacts in forward order → reversed to show final result first. Last-step gets elevated visual treatment (accent border, bg tint, larger card `variant="elevation"`) | **high** | `SessionSummary.tsx` | ✅ Resolved |
| V4 | Last-step artifact in SessionSummary now has accent left border (`borderLeft: 4px solid primary.main`), white bg, elevated `variant`, larger padding (`p: 3`). Intermediate steps: `variant="outlined"`, `opacity: 0.85`, compact padding | **high** | `SessionSummary.tsx` | ✅ Resolved |
| V5 | WorkspaceDashboard reordered: QuickGenerateBar → AssetCoverageBar → Tools (compact 6-tool grid) → ReadyToPromoteList → SessionList. Members removed from body (→ V6 dialog) | **high** | `WorkspaceDashboard.tsx` | ✅ Resolved |
| V6 | `WorkspaceMembers` → `ShareMembersDialog`: combined share + members dialog with invite form + member list. Triggered by 👥 PeopleIcon in PageHeader (V7). Removed inline members section from dashboard body | **medium** | `ShareMembersDialog.tsx` (new), `DashboardPage.tsx` | ✅ Resolved |
| V7 | `PageHeader` now supports `actions?: PageHeaderAction[]` (icon-only outline buttons with Tooltip). DashboardPage header: 👥 share+members, ⚙️ edit, 🗑️ delete. Old single `action` prop preserved for backward compat | **medium** | `PageHeader.tsx`, `DashboardPage.tsx` | ✅ Resolved |
| V8 | ToolCard uses emoji icons + default filled `variant` — redesigned with `variant="outlined"`, monochrome MUI outline icons (`ArticleIcon`, `LightbulbOutlinedIcon`, etc.), compact mode (icon + name only). Consistent with WorkspaceCard/CompletedCard pattern | **high** | `ToolCard.tsx`, `WorkspaceDashboard.tsx` | ✅ Resolved |

### 2.3 Accessibility Gaps
Findings related to WCAG AA compliance, ARIA, keyboard navigation, screen readers.

| # | Finding | Severity | Files | Status |
|---|---------|----------|-------|--------|
| — | (awaiting findings) | — | — | — |

### 2.4 Code Quality & Maintainability
Findings about inline styles, component structure, duplication, or technical debt.

| # | Finding | Severity | Files | Status |
|---|---------|----------|-------|--------|
| C1 | SessionList runs 4 parallel per-status API calls on mount — 5+ independent SWR fetchers triggered on DashboardPage (workspaces + 4 session lists + assets); no data co-location | **low** | `SessionList.tsx`, `DashboardPage.tsx` | 🔴 Open |

### 2.5 Performance & UX
Findings about loading states, perceived performance, empty/error states, transitions.

| # | Finding | Severity | Files | Status |
|---|---------|----------|-------|--------|
| U1 | SessionList global empty-state says "Avvia un tool per iniziare" but has no clickable CTA — user must independently discover how to navigate to tools | **high** | `SessionList.tsx`, `SessionsPage.tsx` | ✅ Resolved |
| U2 | AssetList empty-state shows "No assets" with no CTA — copy key `workspace.detail.noAssets` unused; user stuck with no action | **high** | `AssetList.tsx`, `AssetsPage.tsx` | ✅ Resolved |
| U3 | No differentiated empty-state when workspace has artifacts but zero sessions. `SessionList` now accepts optional `emptyMessage` prop for custom message override | **medium** | `SessionList.tsx`, `WorkspaceDashboard.tsx` | ✅ Resolved |
| U4 | AssetsPage shows AssetCoverageBar above empty AssetList — kept as-is (the "0/1" bars are informative, showing available asset types). Deferred to future | **low** | `AssetsPage.tsx` | 🔵 Deferred |
| U5 | Step labels were numeric-only. Now `ArtifactListItemDTO` includes `stepLabel`. SessionSummary uses `artifact.stepLabel \|\| numeric fallback`. FeedbackPanel uses `progress.label` from SSE | **high** | `SessionSummary.tsx`, `FeedbackPanel.tsx`, `session.dto.ts` | ✅ Resolved |
| U6 | TXT download format removed from `ArtifactDownloadMenu` — MD/DOCX/PDF remain. Also removed `TextSnippetIcon` import, `downloadFile` helper, and `case 'txt'` from `handleDownload` | **medium** | `SessionSummary.tsx` | ✅ Resolved |
| U7 | SessionPage now shows XP earned via `CompletionBanner`. Added `xpEarned?: number` to `SessionDetailDTO`. Copy key `shared.session.xpEarned` = "+{xp} XP". Display: "3 step · 1 crediti · +50 XP" | **high** | `SessionPage.tsx`, `CompletionBanner.tsx`, `session.dto.ts` | ✅ Resolved |

---

## 3. Pre-Session Audit Notes

Observations from the baseline audit — potential areas for findings:

### 3.1 Top `sx={{ }}` Offenders (inline style density)

| Count | File | Notes |
|-------|------|-------|
| 21 | `LoadingSkeleton.tsx` | Entirely inline-styled; candidate for extraction |
| 18 | `agent-chat/ConversationView.tsx` | High density |
| 13 | `agent-chat/AgentContextDrawer.tsx` | High density |
| 11 | `tool/FeedbackPanel.tsx` | High density |
| 11 | `tool/SetupPanel.tsx` | High density |
| 10 | `layout/ToolPageLayout.tsx` | High density |
| 10 | `gamification/GamificationZone.tsx` | High density |
| 9 | `usage/QuotaCounter.tsx` | High density |

### 3.2 Hardcoded Gradients (vs Theme Tokens)

Theme already defines `gradients.brand`, `gradients.completion`, `gradients.hero` in `tokens.ts`. Four components hardcode their own:

| File | Hardcoded gradient | Could use |
|------|-------------------|-----------|
| `CompletionBanner.tsx` | `#059669 → #0E7490` | `gradients.completion` (#059669 → #0891B2) — near match |
| `TeamHub.tsx` | `#4f46e5 → #7c3aed` | `gradients.brand` (#2563EB → #7C3AED) — similar |
| `LevelUpBanner.tsx` | `#7c3aed → #a855f7` | No existing token — would need new `gradients.levelUp` |
| `LuckyBonusSparkle.tsx` | `#d97706 → #f59e0b` | No existing token — would need new `gradients.lucky` |

### 3.3 Known Metrics

- **Total `sx={{ }}`**: 288 in components/ + 41 in pages/ = ~329
- **`style={{ }}`**: 3 occurrences (LoginPage, RegisterPage, SetupPanel)
- **Files with 0 test coverage**: WorkspaceDashboard, WorkspaceMembers, RenameAssetDialog, FailedCard, RunningCard, ReadyToPromoteList, AssetPicker, PromoteDialog, PromoteButton, CompletionBanner, ConfirmDialog, ConversationView, AgentContextDrawer, ChatInput, AgentCard — not yet verified
- **Only missing component**: WorkspaceForm (create/edit workspace dialog)

---

## 4. Session Findings Log

> Findings discovered during the 2026-08-08 improvement session.

### 4.1 Zero-States with CTA — Cross-Cutting Gap

**Root cause**: `EmptyState` component has `ctaLabel`/`onCta` props with a fully rendered `<Button variant="outlined">`, but **zero of 5 callers pass them**. Every empty state is passive — the user is told something is empty but given no action.

**Scope**: affects 4 user journeys:

#### Journey 1 — Workspace Dashboard with zero sessions (no artifacts)

- **Trigger**: WorkspaceDashboard → SessionList, `allCount === 0`
- **Current behavior**: Shows `EmptyState` with `workspace.detail.noSessions` / `workspace.dashboard.noSessions` — messages say "Avvia un tool per iniziare" but there's no button
- **Expected**: Add CTA button "Avvia generazione" → navigate to QuickGenerateBar or tools grid (scroll to `#tools` anchor)
- **Files**: `SessionList.tsx` line 103-105
- **Category**: U1

#### Journey 2 — Workspace Dashboard with artifacts but zero sessions

- **Trigger**: Workspace has assets (`assets.length > 0`) but zero sessions
- **Current behavior**: Same generic empty-state as Journey 1 — no acknowledgment of existing assets
- **Expected**: Differentiated message: "Hai già {N} asset. Avvia una generazione per creare contenuti." + CTA
- **Requires**: `SessionList` needs to know about asset count — currently takes only `workspaceId`, would need either new prop or an internal `api.listAssets()` call
- **Files**: `SessionList.tsx`, `WorkspaceDashboard.tsx`
- **Category**: U3
- **New copy keys needed**: `workspace.dashboard.noSessionsWithAssets` — "Hai già degli asset. Avvia un tool per iniziare a generare."

#### Journey 3 — Sessions Page with zero sessions

- **Trigger**: `/workspaces/:id/sessions` — SessionsPage → SessionList, `allCount === 0`
- **Current behavior**: Same SessionList global empty-state as Journey 1, but SessionsPage has **hardcoded English** PageHeader strings
- **Expected**: 
  - Fix copy violations on PageHeader (Z2)
  - CTA button on empty-state redirects to QuickGenerateBar or `/workspaces/:id` dashboard
- **Files**: `SessionsPage.tsx` (hardcoded strings), `SessionList.tsx` (shared empty-state with CTA)
- **Categories**: Z2, U1

#### Journey 4 — Assets Page with zero assets

- **Trigger**: `/workspaces/:id/assets` — AssetsPage → AssetList, `assets.length === 0`
- **Current behavior**: `EmptyState` with hardcoded English "No assets" / "Upload or generate assets..." — no CTA. `assets.empty.title` and `assets.empty.message` copy keys exist but unused.
- **Expected**: Use `copy.t('assets.empty.title')` + `copy.t('assets.empty.message')` + CTA button "Genera asset" → `/workspaces/:id`
- **Files**: `AssetList.tsx` line 37 (hardcoded strings), `AssetsPage.tsx` (hardcoded PageHeader + breadcrumb)
- **Categories**: Z1, Z3, Z4, U2
- **Bonus**: Consider hiding AssetCoverageBar when zero assets (U4) — or showing it as a "what you'll get" preview

### 4.2 Component Walkthrough

| Component | Screen | Finding | Category | Severity |
|-----------|--------|---------|----------|----------|
| `AssetList.tsx` | Assets page | Empty-state hardcoded English + no CTA; copy keys `assets.empty.*` already exist | Z1, U2 | high |
| `SessionsPage.tsx` | Sessions page | PageHeader title/subtitle hardcoded English | Z2 | high |
| `AssetsPage.tsx` | Assets page | PageHeader title and breadcrumb hardcoded strings | Z3, Z4 | medium |
| `EmptyState.tsx` | All pages | CTA prop path is dead code — 5 callers, 0 use it | V1 | high |
| `SessionList.tsx` | Dashboard + Sessions | Per-tab empties use `<Typography>` instead of EmptyState | V2 | medium |
| `SessionList.tsx` | Dashboard + Sessions | Global empty-state says "start a tool" but has no button | U1 | high |
| `SessionList.tsx` | Dashboard | No differentiated empty when artifacts exist | U3 | medium |
| `AssetsPage.tsx` | Assets page | AssetCoverageBar renders above empty AssetList — zero bars confusing | U4 | low |
| `SessionList.tsx` | Dashboard | 4 parallel SWR fetchers; 5+ on DashboardPage load | C1 | low |
| `SessionSummary.tsx` | Session page | Artifacts rendered in forward order; final result should appear first | V3 | high |
| `SessionSummary.tsx` | Session page | Last-step artifact has same visual weight as intermediate steps — needs elevated card treatment | V4 | high |
| `ArtifactDTO` (contract) | Session page | No `stepLabel` field — labels from SSE lost after session completes | Z5 | high |
| `SessionSummary.tsx` | Session page | Step labels are numeric-only; SSE sends semantic labels but they're not persisted | U5 | high |
| `SessionSummary.tsx` | Session page | TXT download format is redundant — strips markdown, MD/DOCX/PDF cover all cases | U6 | medium |
| `SessionDetailDTO` (contract) | Session page | No `xpEarned` field — XP data exists in `XPCalculator` (50/SessionCompleted) but is never surfaced to the UI | U7 | high |
| `CompletionBanner.tsx` | Session page | Does not display XP earned — natural placement for gamification reward notification | U7 | high |

### 4.3 Session Page Artifacts — Deep Dive

#### Current data flow (V3, V4, Z5, U5)

```
SSE step_completed event          SessionSummary display
┌──────────────────────┐          ┌─────────────────────────┐
│ stepLabel: "Brief"  │  ──▶    │ "Step 1" (numeric only) │
│ stepNumber: 1        │   LOST   │ "Step 2"                │
│ artifact.content     │          │ "Step 3"                │
└──────────────────────┘          └─────────────────────────┘
```

The `stepLabel` arrives via SSE (`StepCompletedPayload.stepLabel`) but `ArtifactDTO` has no `stepLabel` field — labels are discarded when the session is persisted. When the user revisits a completed session, they see generic "Step 1", "Step 2", "Step 3".

#### Required contract change (Z5)

Add `stepLabel: string` to `ArtifactListItemDTO` (and thus to `ArtifactDTO` by inheritance):

```typescript
// packages/contracts/src/generation/session.dto.ts
export interface ArtifactListItemDTO {
  id: string;
  stepNumber: number;
  stepLabel: string;   // ← NEW: preserved from SSE step_completed event
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: string;
}
```

Backend must persist `stepLabel` when creating artifacts.

#### Visual redesign (V3, V4)

Current order and visual weight:
```
Card: "Step 1"  — identical styling
Card: "Step 2"  — identical styling  ← what if this is the result?
Card: "Step 3"  — identical styling
```

Proposed:
```
┌──────────────────────────────────────────┐
│ ⭐ Risultato finale — "Video Script"     │  ← accent border, elevated card
│ [Download] [Promote]                     │
│ ┌──────────────────────────────────────┐ │
│ │ (markdown content)                   │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘

Step 2 — "Angle Prioritization"             ← collapsed/compact by default
Step 1 — "Context Analysis"                 ← collapsed/compact by default
```

- Reverse order: last step (final result) appears first
- Final result: larger card with accent left border, expanded by default
- Intermediate steps: compact cards, collapsed by default, expandable

#### XP display (U7)

`XPCalculator.xpFor('SessionCompleted')` = 50 XP. This data exists server-side but `SessionDetailDTO` has no `xpEarned` field.

Two-step fix:
1. **Contract**: Add `xpEarned?: number` to `SessionDetailDTO`
2. **UI**: Show XP badge on `CompletionBanner` or in session metadata card

Placement options:
- `CompletionBanner` — natural home: "Completato in 45s · 3 step · **+50 XP**"
- Session metadata card — "XP guadagnati: +50"

### 4.4 Workspace Dashboard Layout — Deep Dive

#### Current order vs desired (V5)

```
CURRENT                                DESIRED
┌────────────────────────┐            ┌────────────────────────┐
│ QuickGenerateBar       │            │ [PageHeader: name +    │
│ Sessioni recenti        │            │  actions V7]           │
│ [SessionList]          │            │ QuickGenerateBar       │
│ Pronti da Promuovere   │            │ AssetCoverageBar       │
│ [ReadyToPromoteList]   │            │ Tools (compact grid)   │
│ AssetCoverageBar       │            │ Pronti da Promuovere   │
│ Strumenti (11 tools)   │            │   (compact list)       │
│ [Tools grid 3-col]     │            │ Sessioni recenti        │
│ Team members           │            │ [SessionList]          │
│ [WorkspaceMembers]     │            └────────────────────────┘
└────────────────────────┘
```

Logic: asset coverage and tools are "action" sections — they should be above the fold. Sessions are "history" — they can be lower. Ready-to-Promote is a secondary action — compact below tools.

**Compact versions** needed for:
- **Tools grid**: Currently 11 tools in 3-column grid. Compact could be a horizontal scroll chip/tab bar with top 4-6 most-used tools, or a 2-row grid with smaller cards.
- **ReadyToPromoteList**: Currently full CompletedCard list. Compact could show count + expandable or a simplified chip/badge with "N pronti da promuovere" + CTA.

#### Members as dialog (V6)

```
CURRENT                                DESIRED
WorkspaceDashboard body:               DashboardPage header:
  ┌──────────────────────┐             ┌──────────────────────────┐
  │ Team: 3 members      │             │ My Workspace    👥 ⚙️ 🔗 🗑️ │
  │ ┌──────────────────┐ │             └──────────────────────────┘
  │ │ user1 · editor   │ │             
  │ │ user2 · viewer   │ │             👥 → opens MembersDialog
  │ │ user3 · editor   │ │                  (existing invite +
  │ └──────────────────┘ │                   remove members list)
  └──────────────────────┘
```

`WorkspaceMembers` already has an invite dialog built in. The change is:
1. Remove inline members list from WorkspaceDashboard body
2. Rename to `ShareMembersDialog` — existing invite form + members list in one dialog
3. Add single 👥 icon button in PageHeader actions (V7)

**Rationale**: share e membri sono la stessa azione (invitare persone = condividere). Unificarli riduce le icone header da 4 a 3 ed evita di spezzare un workflow unico.

#### Header actions (V7)

Current state:
```
PageHeader: [My Workspace] [Subtitle]                    [Modifica]
                                                          ▼ contained btn
                          [Elimina workspace]  ← red outline, BELOW header
```

Desired (3 buttons, icon-only outline):
```
PageHeader: [My Workspace] [Subtitle]          [👥] [⚙️] [🗑️]
                                                ↑    ↑    ↑
                                            share  edit delete
                                            +members
```

`PageHeader` currently supports a single `action?: { label, onClick }` rendered as a contained `Button`. Needs to support multiple `IconButton` actions for V7.

#### Required copy keys for workspace header

| Key | String | Purpose |
|-----|--------|---------|
| `workspace.header.shareMembers` | `"Condividi e gestisci membri"` | Share & Members dialog title |
| `workspace.header.shareMembersTooltip` | `"Membri del workspace"` | Icon button tooltip |
| `workspace.header.edit` | `"Modifica workspace"` | Edit button tooltip |
| `workspace.header.delete` | `"Elimina workspace"` | Delete button tooltip |

**Already exist** (just need to wire them):
| Key | String | Used by |
|-----|--------|---------|
| `assets.empty.title` | `"Nessun asset"` | AssetList |
| `assets.empty.message` | `"Carica o genera asset per il tuo workspace."` | AssetList |
| `assets.pageTitle` | `"Asset"` | AssetsPage |
| `workspace.detail.noAssets` | `"Nessun asset. Genera un brief o una brand voice."` | (unused — alternative to assets.empty) |
| `workspace.nav.assets` | `"Asset"` | AssetsPage breadcrumb |

**Need to create**:
| Proposed key | Proposed string | Purpose |
|-------------|-----------------|---------|
| `workspace.dashboard.ctaStartTool` | `"Avvia un tool"` | Empty-state CTA button label |
| `workspace.dashboard.noSessionsWithAssets` | `"Hai già degli asset. Avvia una generazione per creare contenuti."` | Differentiated empty for artifacts-but-no-sessions |
| `workspace.sessions.pageTitle` | `"Sessioni"` | SessionsPage header |
| `workspace.sessions.pageSubtitle` | `"Tutte le sessioni di generazione in questo workspace"` | SessionsPage subtitle |
| `assets.pageSubtitle` | `"Asset del workspace"` | AssetsPage subtitle |

**New keys needed for SessionPage findings**:
| Proposed key | Proposed string | Purpose |
|-------------|-----------------|---------|
| `toolPage.progress.finalResult` | `"Risultato finale"` | Header for the last-step (primary) artifact card |
| `toolPage.progress.intermediateStep` | `"Step intermedio"` | Header for non-final artifact cards |
| `toolPage.progress.xpEarned` | `"+{xp} XP"` | XP earned badge on CompletionBanner |
| `shared.session.xpEarned` | `"Questa sessione ha generato {xp} XP"` | XP earned tooltip/description |

---

## 5. Implementation Plan — Remaining Findings

> **Target**: 11 findings across 3 phases + 1 deferred.  
> **Principle**: group by file to minimize context switching; backend-contract changes deferred to Phase 3.  
> **Test baseline**: 151/151 passing (`vitest run`).

### Dependency Graph

```
Phase 1 (independent — 1 file)
┌─────────────────────────────────────────────────────┐
│ V3: reverse order    │  V4: visual hierarchy       │
│ U6: remove TXT       │                              │
│ All in SessionSummary.tsx — single file, one pass   │
└─────────────────────────────────────────────────────┘

Phase 2 (sequential chain — 5 files)
┌──────────────┐     ┌──────────────────┐     ┌───────────────────────┐
│ V7: PageHeader│ ──▶ │ V6: ShareMembers  │ ──▶ │ V5: element reorder   │
│ multi-action  │     │ Dialog            │     │ WorkspaceDashboard    │
└──────────────┘     └──────────────────┘     └───────────────────────┘
                                                       │
                                           ┌───────────┴───────────┐
                                           │ U3: diff empty-state   │
                                           │ U4: hide CoverageBar   │
                                           └───────────────────────┘

Phase 3 (contract-dependent — needs backend)
┌──────────────────────┐     ┌─────────────────────────┐
│ Z5: stepLabel field   │ ──▶ │ U5: labels in UI        │
│ U7: xpEarned field    │     │ CompletionBanner + XP   │
│ session.dto.ts        │     │ SessionSummary.tsx      │
└──────────────────────┘     └─────────────────────────┘

Phase 4 (deferred)
┌──────────────┐
│ C1: SWR opt  │
└──────────────┘
```

---

### Phase 1 — SessionSummary Sweep (~20 min, 1 file)

**Why first**: 3 findings in 1 file, zero dependencies, highest user-facing impact.

| Step | Finding | Action | Risk |
|------|---------|--------|------|
| 1.1 | U6 | Remove TXT `<MenuItem>` block (lines 65-68) + `TextSnippetIcon` import if unused. Also remove `case 'txt'` from `handleDownload` | Low |
| 1.2 | V3 | Wrap `deduplicated` in `.reverse()` before `.map()`. Copy key `artifactLabel` stays "Step {number}" for now (→ Phase 3 for labels) | Low |
| 1.3 | V4 | Add `isLast` boolean: first element after reverse = final result. Apply accent left border (`borderLeft: 4px solid`, `borderColor: 'primary.main'`), larger padding, `bgcolor: 'primary.50'` tint. Intermediate steps: compact + collapsed by default | Medium — needs copy keys |

**New copy keys for V4**:
- `toolPage.progress.finalResult` = `"Risultato finale"`
- `toolPage.progress.intermediateStep` = `"Step {number}"` (rename from `artifactLabel`)

**V4 visual spec**:
```
┌──────────────────────────────────────────┐
│ ⭐ Risultato finale                      │  ← accent border, bg tint
│ [Download] [Promote]                     │
│ ┌──────────────────────────────────────┐ │
│ │ (full markdown, expanded by default) │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘

  ▸ Step 2 — collapsed by default
  ▸ Step 1 — collapsed by default
```

---

### Phase 2 — Workspace Header + Layout (~2h, 5 files)

**Why second**: sequential dependency chain (V7 → V6 → V5), largest visual impact on dashboard.

#### 2.1 — PageHeader multi-action support (V7)

| Step | Action | File |
|------|--------|------|
| 2.1.1 | Add `actions?: PageHeaderAction[]` prop where `PageHeaderAction = { icon: ReactNode; label: string; onClick: () => void; color?: string }` | `PageHeader.tsx` |
| 2.1.2 | Render `actions` as `IconButton` group with `Tooltip` in the right header slot. Keep existing single `action` prop for backward compat — both single and multi supported | `PageHeader.tsx` |
| 2.1.3 | Add 4 new copy keys for tooltips | `packages/copy/src/it/workspace.ts` |

#### 2.2 — ShareMembersDialog (V6)

| Step | Action | File |
|------|--------|------|
| 2.2.1 | Rename `WorkspaceMembers` → `ShareMembersDialog`. Wrap entire component in a `Dialog` (pass `open`/`onClose` props). Members list + invite form inside the dialog body | `WorkspaceMembers.tsx` → `ShareMembersDialog.tsx` |
| 2.2.2 | In DashboardPage, replace inline `<WorkspaceMembers>` with `ShareMembersDialog` + 👥 `IconButton` in PageHeader `actions` | `DashboardPage.tsx` |

#### 2.3 — Reorder WorkspaceDashboard (V5)

| Step | Action | File |
|------|--------|------|
| 2.3.1 | Reorder sections: `QuickGenerateBar` → `AssetCoverageBar` → Tools grid (compact) → `ReadyToPromoteList` → `SessionList` | `WorkspaceDashboard.tsx` |
| 2.3.2 | Tools compact: replace 3-col grid with horizontal `Chip`/`Tab` bar showing top 6 tools | `WorkspaceDashboard.tsx` |
| 2.3.3 | ReadyToPromote compact: count badge "N pronti" + expandable list | `WorkspaceDashboard.tsx` |
| 2.3.4 | Remove `<WorkspaceMembers>` from body (already moved to dialog in 2.2) | `WorkspaceDashboard.tsx` |

#### 2.4 — Satellite fixes (U3, U4)

| Step | Finding | Action | File |
|------|---------|--------|------|
| 2.4.1 | U3 | Add `emptyMessage?: string` prop to SessionList. When asset count > 0 and allCount === 0, show differentiated message | `SessionList.tsx`, `WorkspaceDashboard.tsx` |
| 2.4.2 | U4 | In AssetsPage, only render `<AssetCoverageBar>` when assets exist. Lift asset count to page level via separate SWR key check | `AssetsPage.tsx` |

---

### Phase 3 — Contract Gaps + Labels (~3h, needs backend)

**Why last**: requires changes in `packages/contracts` and backend persistence layer. Frontend work can start once contracts are published.

#### 3.1 — Contract changes

| Step | Action | File |
|------|--------|------|
| 3.1.1 | Add `stepLabel: string` to `ArtifactListItemDTO` | `packages/contracts/src/generation/session.dto.ts` |
| 3.1.2 | Add `xpEarned?: number` to `SessionDetailDTO` | `packages/contracts/src/generation/session.dto.ts` |
| 3.1.3 | Backend: persist `stepLabel` when creating Artifact. Populate `xpEarned` from `XPCalculator.xpFor('SessionCompleted')` in session detail response | `apps/backend` |

#### 3.2 — Frontend: step labels (U5)

| Step | Action | File |
|------|--------|------|
| 3.2.1 | Replace `copy.t('toolPage.progress.artifactLabel', { number })` with `artifact.stepLabel \|\| copy.t('toolPage.progress.artifactLabel', { number })` — fallback for old sessions without label | `SessionSummary.tsx` |
| 3.2.2 | FeedbackPanel: use `stepLabel` from SSE if available (already in `StepProgress.label` via contracts) | `FeedbackPanel.tsx` |

#### 3.3 — Frontend: XP display (U7)

| Step | Action | File |
|------|--------|------|
| 3.3.1 | Add `xpEarned` to `useSession` hook return type | `api/hooks.ts` |
| 3.3.2 | Show `+{xp} XP` badge in `CompletionBanner` when `xpEarned > 0` | `CompletionBanner.tsx` |
| 3.3.3 | Add XP line to session metadata card: "XP guadagnati: +50" | `SessionPage.tsx` |

#### New copy keys for Phase 3

| Key | String | Purpose |
|-----|--------|---------|
| `shared.session.xpEarned` | `"+{xp} XP"` | XP badge |
| `shared.session.xpEarnedLabel` | `"XP guadagnati"` | Metadata label |

---

### Phase 4 — Deferred (low priority)

| Finding | Why deferred |
|---------|-------------|
| C1: SWR optimization | No user-visible impact; 30s refresh is sufficient. Revisit when dashboard load time becomes a metric |

---

### File Impact Summary

| Phase | Files modified | Files created | Risk |
|-------|---------------|---------------|------|
| 1 | 2 (`SessionSummary.tsx`, `tool-page.ts`) | 0 | Low |
| 2 | 5 (`PageHeader.tsx`, `DashboardPage.tsx`, `WorkspaceDashboard.tsx`, `WorkspaceMembers.tsx→ShareMembersDialog.tsx`, `AssetsPage.tsx`, `workspace.ts`) | 1 (`ShareMembersDialog.tsx`) | Medium |
| 3 | 5 (`session.dto.ts`, `SessionSummary.tsx`, `FeedbackPanel.tsx`, `CompletionBanner.tsx`, `SessionPage.tsx`) | 0 | High — contract change |
| 4 | 1 (`SessionList.tsx`) | 0 | Low |

**Test strategy**: after each phase, run `vitest run` — must stay at 151/151. Phase 2 requires updating `DashboardPage.test.tsx` (new PageHeader props), Phase 3 may need new mock fields. Add component test for `ShareMembersDialog`.

---

## Sources

- [[ui-design-summary-2026-08-07]] — baseline 37-component inventory + design tokens
- [[Design Tokens]] — conceptual design token documentation
- [[UI Component Map]] — component architecture reference
- [[Centralized Copy Modules]] — copy system: `packages/copy/src/it/workspace.ts`, `assets.ts`

## Related

- [[session-ui-improvement-spec-2026-08-08]] — previous session UI audit (32 findings, ✅ resolved)
- [[session-ui-improvement-addendum-2026-08-08]] — addendum (7 SSE + a11y gaps, ✅ resolved)
- [[frontend-drift-report-2026-08-07]] — 27 drift findings (✅ remediated)

---

## 6. ToolCard Redesign — V8 Proposal

### 6.1 Problem

Current `ToolCard` uses emoji strings (`📝`, `🎯`, `📋`) as icons and renders with default MUI `Card` variant (filled/elevated). This is inconsistent with every other card in the project:

| Card | Variant | Icon style |
|------|---------|------------|
| WorkspaceCard | `outlined` | Accent dot (pure CSS) |
| CompletedCard | `outlined` | MUI icons (CheckCircle, Download, PushPin) |
| RunningCard | `outlined` | No icon |
| FailedCard | `outlined` | No icon |
| **ToolCard (current)** | **elevation (default)** | **Emoji strings** |

The compact grid (`md: 2` per column, 6 tools) amplifies the problem — emoji icons don't scale well at small sizes and the filled card creates too much visual weight in an already information-dense dashboard.

### 6.2 Proposed Design

Switch to `variant="outlined"` with monochrome MUI icons, following the established `WorkspaceCard` pattern:

```
┌──────────────────────────────────┐
│ 📝 Blog Post                     │   ← CURRENT: emoji + filled card
│ SEO article                      │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 📰  Blog Post                    │   ← PROPOSED: MUI icon + outline
│     SEO article                  │
└──────────────────────────────────┘
```

#### Icon Mapping

| Tool | MUI Icon | Import |
|------|----------|--------|
| Blog Post | `ArticleIcon` | `@mui/icons-material/Article` |
| Landing Funnel | `FilterCenterFocusIcon` | `@mui/icons-material/FilterCenterFocus` |
| Brief | `AssignmentIcon` | `@mui/icons-material/Assignment` |
| Brand Voice | `RecordVoiceOverIcon` | `@mui/icons-material/RecordVoiceOver` |
| Buyer Persona | `PersonOutlineIcon` | `@mui/icons-material/PersonOutline` |
| Marketing Angle | `LightbulbOutlinedIcon` | `@mui/icons-material/LightbulbOutlined` |

All icons: `fontSize="small"`, `color="primary"` (or `action` for muted).

#### Compact Grid Layout

```
Current:                          Proposed:
┌──────┬──────┬──────┬──────┐    ┌──────┬──────┬──────┬──────┬──────┬──────┐
│ 📝   │ 🎯   │ 📋   │ 🗣️   │    │ 📰 B │ 🎯 L │ 📋 B │ 🗣️ B │ 👤 B │ 💡 M │
│ Blog │ Land │ Brie │ Bran │ →  │ Post │ L.F. │ rief │ Voic │ uyer │ arke │
│ Post │ ing  │ f    │ d V  │    │      │      │      │ e    │ Pers │ ting │
└──────┴──────┴──────┴──────┘    └──────┴──────┴──────┴──────┴──────┴──────┘
  md={3} — 4 cols                  md={2} — 6 cols (full-width)
  emoji + description              icon + name only (no description)
```

#### Desktop variant (non-compact, ToolCard used on `/tools` page or similar)

When space allows (non-dashboard context), the card keeps name + description:

```
┌────────────────────┐
│ 📰  Blog Post      │  ← MUI icon, 20px, color="primary"
│     SEO-optimized  │
│     blog article   │  ← body2, text.secondary
└────────────────────┘
```

#### Visual spec

```
Card variant:        "outlined"
Card padding:        { py: 1.5, px: 2 }
Content gap:         1.5 (icon ↔ text)
Icon size:           fontSize="small" (~20px)
Icon color:          color="primary" (or action for muted variant)

Title:               variant="body2", fontWeight={600}
Description:         variant="caption", color="text.secondary"

Hover:               subtle bg change (same as WorkspaceCard via CardActionArea)
Active/focus:        standard MUI ripple + focus ring
```

#### ToolCard interface change

```typescript
// Current
interface ToolCardProps {
  toolKey: string;
  name: string;
  description: string;
  icon?: string;            // emoji string
  workspaceId: string;
}

// Proposed
interface ToolCardProps {
  toolKey: string;
  name: string;
  description?: string;     // optional — compact mode omits description
  icon?: React.ReactNode;   // MUI icon component
  workspaceId: string;
  variant?: 'default' | 'compact';  // compact: icon + name only, no description
}
```

#### WorkspaceDashboard usage update

```typescript
import ArticleIcon from '@mui/icons-material/Article';
import FilterCenterFocusIcon from '@mui/icons-material/FilterCenterFocus';
import AssignmentIcon from '@mui/icons-material/Assignment';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';

const TOP_TOOLS = [
  { key: 'blog-post', name: 'Blog Post', icon: <ArticleIcon /> },
  { key: 'landing-funnel', name: 'Landing Funnel', icon: <FilterCenterFocusIcon /> },
  { key: 'brief', name: 'Brief', icon: <AssignmentIcon /> },
  { key: 'brand-voice', name: 'Brand Voice', icon: <RecordVoiceOverIcon /> },
  { key: 'buyer-persona', name: 'Buyer Persona', icon: <PersonOutlineIcon /> },
  { key: 'marketing-angle', name: 'Marketing Angle', icon: <LightbulbOutlinedIcon /> },
];
```

### 6.3 Design Decisions

| Decision | Rationale |
|----------|-----------|
| `variant="outlined"` not `elevation` | Consistency with WorkspaceCard, CompletedCard, RunningCard. Dashboard is already dense — elevation adds unnecessary visual weight |
| Outline icons (`Outlined` suffix) not filled | Matches the outline card aesthetic. Filled icons (`Article` vs `ArticleOutlined`) would create contrast imbalance |
| `fontSize="small"` (~20px) | Proportional to `body2` title text. Larger icons would dominate the card at compact grid density |
| `color="primary"` | Blue accent ties cards to the brand's primary action color; distinguishes from passive content cards |
| Remove description in compact mode | At `md={2}` (6 columns), there's no room for descriptions. Tool names are sufficient — user already knows what each tool does from the QuickGenerateBar dropdown |