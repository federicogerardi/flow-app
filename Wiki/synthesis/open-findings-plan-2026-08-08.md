---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/remediation-plan
  - wiki/frontend
date_updated: 2026-08-08
source_count: 3
confidence: high
---

# Open Findings — Remediation Plan

> Post-implementation sweep: 3 categories of open findings not addressed in the [remaining gaps plan](synthesis/remaining-gaps-plan-2026-08-08.md).  
> 55 Copy Rule violations, 2 embedded components, 2 missing test files, 1 operational deployment.

---

## Inventory — 4 Gaps

| # | Category | Count | Impact | Effort |
|---|---|---|---|---|
| 1 | **Copy module violations** | 55 strings across 8 files | Accessibility, i18n readiness, brand consistency | ~3h |
| 2 | **Embedded gamification components** | 2 (LevelUpBanner, LuckyBonusSparkle) | Reusability, tree-shaking, test isolation | ~1h |
| 3 | **Missing component tests** | 2 (WorkspaceForm, ReadyToPromoteList) | Regression coverage for new components | ~1.5h |
| 4 | **Migration deployment** | 1 SQL file | accentColor not live | Ops |

---

## Gap 1 — Copy Module Violations (55 strings, 8 files)

### Summary by file

| File | Count | Severity |
|------|-------|----------|
| `ConversationView.tsx` | 26 | 🟡 Medium |
| `AppShell.tsx` | 13 | 🔴 High (aria-labels) |
| `WorkspaceMembers.tsx` | 7 | 🔴 High (dialog labels) |
| `SessionList.tsx` | 3 | 🟡 Medium |
| `DashboardPage.tsx` | 3 | 🔴 High (1 Italian!) |
| `CompletedCard.tsx` | 2 | 🟢 Low |
| `PromoteButton.tsx` | 1 | 🟢 Low |
| `ChatInput.tsx` | 3 | 🟡 Medium |

### Breakdown by type

| Type | Count | Examples |
|------|-------|----------|
| Aria-labels | 8 | `"Open menu"`, `"Close menu"`, `"User menu"`, `"Remove member"`, `"Main navigation"` |
| Button/Dialog text | 9 | `"Invite"`, `"Invite Member"`, `"Email"`, `"Role"`, `"Editor"`, `"Viewer"`, `"Modifica"` (IT) |
| Empty states | 4 | `"No sessions in progress"`, `"No completed sessions"`, `"No failed sessions"`, `"Ask me anything..."` |
| Suggested questions | 21 | 18 agent-specific + 3 fallback |
| Confirmation/status | 3 | `"Promote to asset?"`, `"Deleting "..." will remove..."`, `"Delete workspace"` |
| Nav UI chrome | 5 | `"Tools"`, `"soon"`, `"flow app"`, `"Logout"`, `"Skip to content"` |
| Accessibility strings | 2 | `"Toggle theme"`, `"Theme: "` |
| Pluralization | 2 | `"step"`/`"s"` (English-coupled) |
| Formatting | 2 | `"Conversation with ..."`, `"s"`/`"m"` (duration units) |

### Plan of attack

All violations are mechanical replacements with `copy.t()` keys. One-time cost: add copy keys to the appropriate module file, then replace each string. **No behavioral changes, no test impact** (the copy module test mock pattern returns the key itself — see Copy Module Rule #2).

#### Step 1 — Add copy keys (~10 min)

Add 30+ new keys across 4 copy module files:

**`packages/copy/src/it/shared.ts`** — aria-labels, generic UI chrome:
```
shared.actions.invite = 'Invita'
shared.actions.logout = 'Logout'
shared.form.email = 'Email'
shared.form.role = 'Ruolo'
shared.members.editor = 'Editor'
shared.members.viewer = 'Viewer'
shared.aria.openMenu = 'Apri menu'
shared.aria.closeMenu = 'Chiudi menu'
shared.aria.userMenu = 'Menu utente'
shared.aria.toggleTheme = 'Cambia tema'
shared.aria.mainNavigation = 'Navigazione principale'
shared.aria.expandSidebar = 'Espandi sidebar'
shared.aria.collapseSidebar = 'Comprimi sidebar'
shared.aria.removeMember = 'Rimuovi membro'
shared.wcag.skipToContent = 'Vai al contenuto'
shared.label.soon = 'presto'
shared.label.tools = 'Strumenti'
shared.label.theme = 'Tema'
shared.label.deleteWarning = 'L\'eliminazione di "{name}" rimuoverà tutti gli asset, sessioni e conversazioni. Questa azione non può essere annullata.'
```

**`packages/copy/src/it/workspace.ts`** — workspace-specific:
```
workspace.detail.deleteWarning = 'L\'eliminazione di "{name}" rimuoverà...'
workspace.sessions.emptyInProgress = 'Nessuna sessione in corso'
workspace.sessions.emptyCompleted = 'Nessuna sessione completata'
workspace.sessions.emptyFailed = 'Nessuna sessione fallita'
```

**`packages/copy/src/it/conversations.ts`** — conversation UI:
```
conversations.emptyState = 'Chiedimi qualsiasi cosa...'
conversations.emptyStateDescription = 'Ask me anything about your marketing needs. I have full access to your workspace assets.'
conversations.suggestedLabel = 'Domande suggerite'
conversations.suggested.strategist.[0] = '...'
conversations.suggested.strategist.[1] = '...'
...
conversations.aria.label = 'Conversazione con {agentName}'
```

**`packages/copy/src/it/notifications.ts`** — promote confirmation:
```
notifications.asset.promoteConfirm = 'Promuovere ad asset?'
```

#### Step 2 — Replace in 8 files (~2h)

| File | Replacements | Complexity |
|------|-------------|------------|
| `AppShell.tsx` | 13 | Medium — full-file rewrite (390 lines) |
| `WorkspaceMembers.tsx` | 7 | Easy — full-file rewrite (120 lines) |
| `SessionList.tsx` | 3 | Easy — 3 targeted edits |
| `DashboardPage.tsx` | 3 | Easy — 3 targeted edits |
| `CompletedCard.tsx` | 2 | Easy — 1 targeted edit |
| `PromoteButton.tsx` | 1 | Easy — 1 targeted edit |
| `ConversationView.tsx` | 26 | Hard — SUGGESTED_QUESTIONS map restructure, plus empty state |
| `ChatInput.tsx` | 3 | Easy — 3 targeted edits |

#### Step 3 — Verify (~30 min)

- `tsc --noEmit` across all packages
- `vitest run` across frontend (140 tests)
- Grep for remaining hardcoded strings in modified files

---

## Gap 2 — Embedded Gamification Components (2 components)

### Background

`LevelUpBanner` and `LuckyBonusSparkle` both live inside `ToastSystem.tsx` (127 lines). The wiki marks them as ⚠️ "embedded, not standalone". They render conditionally within the ToastSystem component and are not importable independently.

### Plan

**Extract into `components/gamification/` as named exports:**

| File | Action | Lines |
|------|--------|-------|
| `components/gamification/LevelUpBanner.tsx` | Extract from ToastSystem.tsx | ~40 |
| `components/gamification/LuckyBonusSparkle.tsx` | Extract from ToastSystem.tsx | ~35 |
| `components/gamification/ToastSystem.tsx` | Import and use extracted components | ~50 (from 127) |

**Risk**: Low — pure extraction. ToastSystem.tsx currently renders them inline; after extraction they become imported children. No behavioral change.

---

## Gap 3 — Missing Component Tests (2 test files)

### Background

`WorkspaceForm.tsx` (112 lines) and `ReadyToPromoteList.tsx` (65 lines) were created in the previous plan with zero test coverage.

### Plan

**`WorkspaceForm.test.tsx`** — ~10 tests
- Renders create dialog with title "Nuovo Workspace"
- Renders edit dialog with title "Modifica Workspace" when workspace prop provided
- Pre-fills name from workspace prop in edit mode
- Pre-selects accentColor from workspace prop in edit mode
- 10 color dots rendered
- Color dot selection updates aria-checked state
- Save button disabled when name < 2 chars
- Save button disabled when name > 50 chars
- Calls onSave with { name, accentColor } on submit
- Enter key submits valid form
- Shows loading state during save

**`ReadyToPromoteList.test.tsx`** — ~8 tests
- Renders "Pronti da Promuovere" heading with count
- Filters non-promotable sessions out
- Returns null when no promotable sessions exist
- Renders CompletedCard per promotable session
- Calls api.promoteArtifact on promote click
- Mutates SWR cache after successful promotion
- Loading state renders skeleton
- View button navigates to session detail

**Copy module mock** (per Copy Rule #2):
```typescript
vi.mock('@flow-app/copy', () => ({
  copy: { t: (key: string) => key },
}));
```

**Effort**: ~1.5h. Pattern is well-established (17 existing test files).

---

## Gap 4 — Migration Deployment (Ops)

### Background

`packages/infra-db/migrations/013_workspace_accent.sql` exists locally but hasn't been run. The `accentColor` feature works client-side (WorkspaceAccentProvider defaults to `#2563eb`) but won't persist across page reloads until the migration runs.

### Action

Run `013_workspace_accent.sql` against the target database. No code changes. Verification:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'workspaces' AND column_name = 'accent_color';
```

---

## Execution Order

```
Batch 1 — Independent (parallel, ~2h)
├── Gap 1: Add copy keys to copy module files
├── Gap 1: Replace strings in ConversationView.tsx + ChatInput.tsx (29 strings, 2 files)
├── Gap 2: Extract LevelUpBanner + LuckyBonusSparkle from ToastSystem
└── Gap 3: Write WorkspaceForm.test.tsx + ReadyToPromoteList.test.tsx

Batch 2 — Sequential on shared files (~1.5h)
├── Gap 1: Replace strings in AppShell.tsx (13 strings)
├── Gap 1: Replace strings in WorkspaceMembers.tsx (7 strings)
├── Gap 1: Replace strings in SessionList.tsx (3 strings)
├── Gap 1: Replace strings in DashboardPage.tsx (3 strings, incl. Italian 'Modifica')
├── Gap 1: Replace strings in CompletedCard.tsx (2 strings)
└── Gap 1: Replace strings in PromoteButton.tsx (1 string)

Batch 3 — Verification (~30 min)
├── tsc --noEmit all packages
├── vitest run frontend + backend
└── rg for remaining hardcoded strings

Batch 4 — Ops
└── Run 013_workspace_accent.sql migration
```

---

## Total Estimated Effort

| Gap | Effort |
|-----|--------|
| 1 — Copy violations | **3h** |
| 2 — Embedded gamification | **1h** |
| 3 — Component tests | **1.5h** |
| 4 — Migration deploy | **0.25h** |
| **Total** | **~5.75h (1 day)** |

---

## Success Criteria

- [ ] 0 hardcoded user-facing strings in `apps/frontend/src/components/` (grep for `"[A-Z]"` on `<Typography>`, `label=`, `aria-label=`)
- [ ] `LevelUpBanner` importable as `import { LevelUpBanner } from '...'`
- [ ] `LuckyBonusSparkle` importable as `import { LuckyBonusSparkle } from '...'`
- [ ] `ToastSystem.tsx` reduced to <50 lines (orchestrator only)
- [ ] `WorkspaceForm.test.tsx` — 10+ tests, all pass
- [ ] `ReadyToPromoteList.test.tsx` — 8+ tests, all pass
- [ ] `013_workspace_accent.sql` applied — `accent_color` column exists in `workspaces`

---

## Sources

- [[synthesis/remaining-gaps-plan-2026-08-08]] — previous implementation plan
- [[synthesis/ui-design-summary-2026-08-07]] — 37-component spec
- [[UI Component Map]] — component status tracking