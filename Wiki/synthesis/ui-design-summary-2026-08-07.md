---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/frontend
  - wiki/ux
  - wiki/backend-architecture-feed
date_updated: 2026-08-08
source_count: 5
confidence: high
---

# UI Design Summary — Flow App

> Full-stack design reference for backend API and database design.  
> Synthesized from [[UI Component Map]], [[Design Tokens]], [[Frontend Architecture]], [[Gamification UX]].

---

## 1. Component Inventory Status

### 1.1 Status Table — All 37 Components

| # | Component | File | Layer | Status | Description |
|---|-----------|------|-------|--------|-------------|
| 1 | AppShell | `layout/AppShell.tsx` | Layout | ✅ | Root layout: sidebar + header + content + workspace accent injection + theme toggle (relocated from components/layout/) |
| 2 | WorkspaceDashboard | `layout/WorkspaceDashboard.tsx` | Layout | 🟡 | Dashboard view inline in DashboardPage; not yet extracted as standalone component |
| 3 | ToolPageLayout | `layout/ToolPageLayout.tsx` | Layout | ✅ | 3-phase tool wrapper driven by toolPageMachine XState state (325 lines) |
| 4 | WorkspaceCard | `workspace/WorkspaceCard.tsx` | Workspace | ✅ | Card in workspace switcher with accent dot, member count |
| 5 | WorkspaceForm | `workspace/WorkspaceForm.tsx` | Workspace | ⬜ | Create/edit dialog — **ONLY remaining gap** |
| 6 | SessionList | `workspace/SessionList.tsx` | Workspace | ✅ | Live session tracker with tabs (queued/running/completed/failed), 4 state cards |
| 7 | AssetList | `workspace/AssetList.tsx` | Workspace | ✅ | Manageable asset grid with SWR, rename, delete |
| 8 | AssetCoverageBar | `workspace/AssetCoverageBar.tsx` | Workspace | ✅ | Per-asset-type completeness bars with "generate missing" CTAs, ASSET_TOOL_MAP |
| 9 | SetupPanel | `tool/SetupPanel.tsx` | Tool | ✅ | Generic input renderer from ToolDefinition.acquisition; TextField, Select, FileUpload (216 lines) |
| 10 | KnowledgePanel | `tool/KnowledgePanel.tsx` | Tool | ✅ | Asset selection sidebar; max 1 asset per AssetType, SWR-based |
| 11 | ReadinessSnapshot | `tool/ReadinessSnapshot.tsx` | Tool | ✅ | Pre-flight readiness display: ok/missing/optional per input; file + asset awareness |
| 12 | FeedbackPanel | `tool/FeedbackPanel.tsx` | Tool | ✅ | Step-by-step SSE-driven progress cards: completed/active/pending with animations |
| 13 | SessionSummary | `tool/SessionSummary.tsx` | Tool | ✅ | Final result: ReactMarkdown artifact preview + download (.md/.txt/.pdf/.docx) + PromoteButton |
| 14 | ToolCard | `tool/ToolCard.tsx` | Tool | ✅ | Tool shortcut card for dashboard with CardActionArea navigation |
| 15 | AgentCard | `agent-chat/AgentCard.tsx` | Agent Chat | ✅ | Agent selector card |
| 16 | TeamHub | `agent-chat/TeamHub.tsx` | Agent Chat | ✅ | Team hub page: grid + recent conversations |
| 17 | ConversationPage | `agent-chat/ConversationPage.tsx` | Agent Chat | 🟡 | Full chat wrapper in pages/ConversationPage.tsx (292 lines); not componentized |
| 18 | ChatMessageBubble | `agent-chat/ChatMessageBubble.tsx` | Agent Chat | ✅ | Individual message (user/agent roles) |
| 19 | ChatInput | `agent-chat/ChatInput.tsx` | Agent Chat | ✅ | Sticky input composer |
| 20 | AgentContextDrawer | `agent-chat/AgentContextDrawer.tsx` | Agent Chat | ✅ | Assets + sessions info drawer |
| 21 | GamificationZone | `gamification/GamificationZone.tsx` | Gamification | ✅ | Sidebar zone: level, streak, badges, weekly rank (106 lines, SWR-based) |
| 22 | LevelUpBanner | `gamification/LevelUpBanner.tsx` | Gamification | ⚠️ | Embedded in ToastSystem.tsx — not standalone file |
| 23 | BadgeProgressRing | `gamification/BadgeProgressRing.tsx` | Gamification | ✅ | Circular progress toward next badge (SVG stroke-dashoffset) |
| 24 | LuckyBonusSparkle | `gamification/LuckyBonusSparkle.tsx` | Gamification | ⚠️ | Embedded in ToastSystem.tsx — not standalone file |
| 25 | ActivityPulse | `gamification/ActivityPulse.tsx` | Gamification | ✅ | Active member live indicator |
| 26 | SeasonCountdown | `gamification/SeasonCountdown.tsx` | Gamification | ✅ | Seasonal countdown chip |
| 27 | ChallengeVoting | `gamification/ChallengeVoting.tsx` | Gamification | ✅ | Weekly challenge voting UI |
| 28 | StreakModeToggle | `gamification/StreakModeToggle.tsx` | Gamification | ✅ | Daily vs Business days switch |
| 29 | PageHeader | `shared/PageHeader.tsx` | Shared | ✅ | Title + breadcrumb + optional actions slot |
| 30 | EmptyState | `shared/EmptyState.tsx` | Shared | ✅ | No-data state with contextual CTA |
| 31 | ErrorState | `shared/ErrorState.tsx` | Shared | ✅ | Error display with retry, maps ApiClientError.code |
| 32 | LoadingSkeleton | `shared/LoadingSkeleton.tsx` | Shared | ✅ | Shape-matched skeleton per view variant (8 variants) |
| 33 | ConfirmDialog | `shared/ConfirmDialog.tsx` | Shared | ✅ | Destructive action confirmation modal (29 lines) |
| 34 | CompletionBanner | `shared/CompletionBanner.tsx` | Shared | ✅ | Celebratory completion: gradient + celebrationPop animation (48 lines) |
| 35 | QuickGenerateBar | `shared/QuickGenerateBar.tsx` | Shared | ✅ | Top-of-dashboard generation shortcut: Select + CTA (61 lines) |
| 36 | WorkspaceAccentProvider | `shared/WorkspaceAccentProvider.tsx` | Shared | ✅ | Injects `--workspace-accent` CSS var (relocated to theme/WorkspaceAccentProvider.tsx, 46 lines) |
| 37 | PromoteButton | `shared/PromoteButton.tsx` | Shared | ✅ | Standalone Promote-to-Asset action: 4-state machine (idle→confirming→promoting→done) (79 lines) |

### 1.2 Implementation Gap Analysis (2026-08-08)

| Metric | Value |
|--------|-------|
| Total components | 37 |
| ✅ Built | 32 (AppShell, ToolPageLayout, WorkspaceCard, SessionList, AssetList, AssetCoverageBar, SetupPanel, KnowledgePanel, ReadinessSnapshot, FeedbackPanel, SessionSummary, ToolCard, AgentCard, TeamHub, ChatMessageBubble, ChatInput, AgentContextDrawer, GamificationZone, BadgeProgressRing, ActivityPulse, SeasonCountdown, ChallengeVoting, StreakModeToggle, PageHeader, EmptyState, ErrorState, LoadingSkeleton, ConfirmDialog, CompletionBanner, QuickGenerateBar, WorkspaceAccentProvider, PromoteButton) |
| ⚠️ Partial/embedded | 4 (WorkspaceDashboard inline in DashboardPage, ConversationPage in pages/, LevelUpBanner + LuckyBonusSparkle embedded in ToastSystem.tsx) |
| ⬜ Not built | 1 (WorkspaceForm — only remaining gap) |
| Completion rate | **86.5% (32/37)** or **97.3% (36/37 including partials)** |

**Extras not in wiki inventory:** QueuedCard, RunningCard, CompletedCard, FailedCard, RenameAssetDialog (workspace sub-cards); AssetPicker, PromoteDialog (shared); ToastSystem (gamification); QuotaCounter (quota); AuthLayout, ErrorBoundary (components root); SessionsPage (pages).

**Critical path remaining gap:**
- **WorkspaceForm** — Create/edit workspace dialog with color picker. Only missing component.

**Relocations from wiki-specified paths:**
- AppShell: `components/layout/` → `layout/AppShell.tsx`
- WorkspaceAccentProvider: `components/shared/` → `theme/WorkspaceAccentProvider.tsx`

**Test coverage:** 17 unit tests (AuthContext, AuthGuard, OAuthCallback, AuthLayout, EmptyState, ErrorBoundary, ErrorState, LoadingSkeleton, PageHeader, ToolPageLayout, QueuedCard, SessionCards, derive-ui-state, tool-page-machine, DashboardPage, LoginPage, RegisterPage) + 2 E2E Playwright specs (session-list, tool-page).

---

## 2. Design System Reference

### 2.1 Complete Color Token Table

#### 2.1.1 Brand Palette

| Token | Value | CSS Var (conceptual) | Usage |
|-------|-------|---------------------|-------|
| `brand.50` | `#EFF6FF` | — | Subtle blue background |
| `brand.100` | `#DBEAFE` | — | Selected state |
| `brand.200` | `#BFDBFE` | — | Hover state |
| `brand.300` | `#93C5FD` | — | Focus ring |
| `brand.400` | `#60A5FA` | — | Light primary |
| `brand.500` | `#2563EB` | `primary.main` | **Primary CTA, links, active states** |
| `brand.600` | `#1D4ED8` | — | Hover dark |
| `brand.700` | `#1E40AF` | `primary.dark` | Active/pressed |
| `brand.800` | `#1E3A8A` | — | Deep accent |
| `brand.900` | `#1E3060` | — | Deepest accent |

#### 2.1.2 Generation / Asset Palette (Purple)

| Token | Value | CSS Var | Usage |
|-------|-------|---------|-------|
| `generation.50` | `#F5F3FF` | — | Subtle purple bg |
| `generation.100` | `#EDE9FE` | — | Asset tag bg |
| `generation.200` | `#DDD6FE` | — | — |
| `generation.300` | `#C4B5FD` | — | — |
| `generation.400` | `#A78BFA` | `secondary.light` | Light secondary |
| `generation.500` | `#7C3AED` | `secondary.main` | **Asset/promotion accent** |
| `generation.600` | `#6D28D9` | — | Hover dark |
| `generation.700` | `#5B21B6` | `secondary.dark` | Active/pressed |
| `generation.800` | `#4C1D95` | — | — |
| `generation.900` | `#3B0764` | — | — |

#### 2.1.3 Semantic Palette

| Token | Main | Light | Dark | ContrastText |
|-------|------|-------|------|-------------|
| `success` | `#059669` | `#D1FAE5` | `#065F46` | `#fff` |
| `warning` | `#D97706` | `#FEF3C7` | `#92400E` | `#fff` |
| `error` | `#DC2626` | `#FEE2E2` | `#991B1B` | `#fff` |
| `info` | `#0891B2` | `#CFFAFE` | `#164E63` | `#fff` |

#### 2.1.4 Rarity Palette (Gamification)

| Tier | Border | Background | Text |
|------|--------|------------|------|
| **Common** | `#9CA3AF` | `#F3F4F6` | `#374151` |
| **Rare** | `#3B82F6` | `#EFF6FF` | `#1E40AF` |
| **Epic** | `#7C3AED` | `#F5F3FF` | `#5B21B6` |
| **Legendary** | `#D97706` | `#FFFBEB` | `#92400E` |

#### 2.1.5 Neutral Grey Palette

| Token | Value | Usage |
|-------|-------|-------|
| `grey.50` | `#F9FAFB` | Page background (light mode) |
| `grey.100` | `#F3F4F6` | Card background (light mode) |
| `grey.200` | `#E5E7EB` | Borders, dividers |
| `grey.300` | `#D1D5DB` | — |
| `grey.400` | `#9CA3AF` | Placeholder text, disabled |
| `grey.500` | `#6B7280` | Secondary text |
| `grey.600` | `#4B5563` | — |
| `grey.700` | `#374151` | — |
| `grey.800` | `#1F2937` | — |
| `grey.900` | `#111827` | Primary text (light mode) |

### 2.2 Workspace Accent System

10 preset accent colors, stored as `workspace.accentColor` (string enum in DB). Runtime-injected via `WorkspaceAccentProvider` which sets CSS custom properties on `document.documentElement`.

| Key | Hex Value |
|-----|-----------|
| `blue` (default) | `#2563EB` |
| `purple` | `#7C3AED` |
| `emerald` | `#059669` |
| `rose` | `#E11D48` |
| `amber` | `#D97706` |
| `teal` | `#0891B2` |
| `orange` | `#EA580C` |
| `indigo` | `#4F46E5` |
| `pink` | `#DB2777` |
| `lime` | `#65A30D` |

**Runtime injection mechanism:**
```typescript
document.documentElement.style.setProperty('--workspace-accent', accentHex);
document.documentElement.style.setProperty('--workspace-accent-light', hexToRgba(accentHex, 0.12));
```

**CSS usage targets:**
- Sidebar CTA button: `background-color: var(--workspace-accent)`
- Asset coverage bar fill: `background-color: var(--workspace-accent)`
- `MuiLinearProgress-bar`: `background-color: var(--workspace-accent)`
- Workspace accent dot: `background-color: var(--workspace-accent)` (8×8px circle)
- QuickGenerateBar border: `border: 1.5px solid var(--workspace-accent)`
- QuickGenerateBar background: `background: var(--workspace-accent-light)`
- PromoteButton: `background: var(--workspace-accent)`
- Focus rings: `borderColor: var(--workspace-accent, #2563EB)`
- ToolCard hover glow: `boxShadow: '0 0 0 2px var(--workspace-accent-light)'`

### 2.3 Typography System

#### 2.3.1 Font Families

| Token | Stack | Usage |
|-------|-------|-------|
| `fontFamily` | `"Inter", "Helvetica", "Arial", sans-serif` | Body text, UI, forms, descriptions |
| `fontFamilyDisplay` | `"Plus Jakarta Sans", "Inter", "Helvetica", sans-serif` | Headings, display, workspace names |
| `fontFamilyMono` | `"JetBrains Mono", "Fira Code", monospace` | Code, step numbers, technical output |

**Font loading (index.html):**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
```
**Subsets**: Latin only. Reduces bundle ~40KB.

#### 2.3.2 Typography Scale

| Token | Font Size | Font Family | Weight | Line Height | Usage |
|-------|-----------|-------------|--------|-------------|-------|
| `displayLg` | `2.25rem` (36px) | Plus Jakarta Sans | 700 | 1.2 | Hero headings |
| `displayMd` | `1.875rem` (30px) | Plus Jakarta Sans | 700 | 1.25 | Workspace name headers |
| `displaySm` | `1.5rem` (24px) | Plus Jakarta Sans | 600 | 1.3 | Page titles |
| `h4` | `1.5rem` (24px) | Plus Jakarta Sans | 600 | 1.35 | Page titles |
| `h5` | `1.25rem` (20px) | Plus Jakarta Sans | 600 | 1.4 | Section headers |
| `h6` | `1.125rem` (18px) | Plus Jakarta Sans | 600 | 1.4 | Card titles |
| `body1` | `1rem` (16px) | Inter | 400 | 1.6 | Body text |
| `body2` | `0.875rem` (14px) | Inter | 400 | 1.55 | Secondary body |
| `caption` | `0.75rem` (12px) | Inter | 400 | 1.5 | Labels, timestamps |
| `button` | `0.875rem` (14px) | Inter | 500 | — | Button text |
| `mono` | `0.875rem` (14px) | JetBrains Mono | 400 | 1.6 | Code/output |

#### 2.3.3 Contrast Compliance

| Combination | Contrast Ratio | WCAG Level |
|-------------|---------------|------------|
| `grey.900` (#111827) on `grey.50` (#F9FAFB) | 16.7:1 | AAA ✅ |
| `grey.900` (#111827) on `grey.100` (#F3F4F6) | 14.2:1 | AAA ✅ |
| `brand.500` (#2563EB) on `grey.50` (#F9FAFB) | 4.7:1 | AA ✅ |
| `brand.500` (#2563EB) on `#FFFFFF` | 4.7:1 | AA ✅ |
| `success.main` (#059669) on `#FFFFFF` | 4.6:1 | AA ✅ |
| `error.main` (#DC2626) on `#FFFFFF` | 5.1:1 | AA ✅ |

**Target**: WCAG 2.1 AA fully. AAA selectively on `h4`–`h6` and body text on default backgrounds.

### 2.4 Spacing Grid

**Base unit**: 8px. All spacing via `theme.spacing(n)`.

| Semantic Alias | Raw Value | `theme.spacing()` | Usage |
|---------------|-----------|-------------------|-------|
| `space.1` | 4px | `spacing(0.5)` | Tight inline gap |
| `space.2` | 8px | `spacing(1)` | Field gap |
| `space.3` | 12px | `spacing(1.5)` | Compact padding |
| `space.4` | 16px | `spacing(2)` | Standard padding |
| `space.6` | 24px | `spacing(3)` | Card padding |
| `space.8` | 32px | `spacing(4)` | Section gap |
| `space.12` | 48px | `spacing(6)` | Section top margin |
| `space.16` | 64px | `spacing(8)` | Page top padding |
| `space.24` | 96px | `spacing(12)` | Hero sections |

**Key component spacing values:**
- ToolCard: `p: 2` (16px padding), `gap: 1` (8px gap)
- QuickGenerateBar: `p: 2.5` (20px padding), `gap: 2` (16px gap)
- CompletionBanner: `p: 2` (16px padding)
- AssetCoverageBar: `spacing={1}` (4px vertical), `spacing={2}` (16px horizontal)
- PromoteButton Alert: `mt: 1` (8px top margin)
- Sidebar width: 280px fixed

### 2.5 Elevation / Shadows (6 Levels)

| Token | CSS Value | Usage |
|-------|-----------|-------|
| `none` | `none` | Flat elements |
| `xs` | `0 1px 2px 0 rgba(0,0,0,0.05)` | Subtle elevation |
| `sm` | `0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)` | Default card |
| `md` | `0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)` | Card hover |
| `lg` | `0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05)` | Modals, panels |
| `xl` | `0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.05)` | Elevated dialogs |
| `inner` | `inset 0 2px 4px 0 rgba(0,0,0,0.06)` | Inset states |
| `accent` | `0 0 0 3px var(--workspace-accent-light)` | Active/focus glow |

**Card hover pattern:**
```css
.MuiCard-root { box-shadow: var(--shadow-sm); transition: box-shadow 200ms ease, transform 200ms ease; }
.MuiCard-root:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
```

**Button shadow pattern:**
```css
containedPrimary: box-shadow: '0 1px 3px rgba(37,99,235,0.3)';
containedPrimary:hover: box-shadow: '0 4px 12px rgba(37,99,235,0.4)';
```

### 2.6 Border Radius (6 Tokens)

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | `4px` | Chips, badges, small elements |
| `sm` | `6px` | Buttons, input chips |
| `md` | `8px` | Cards, inputs (default `shape.borderRadius`) |
| `lg` | `12px` | Modals, panels, cards (MUI Card override) |
| `xl` | `16px` | Hero cards |
| `full` | `9999px` | Pills, avatars |

**MUI component-specific overrides:**
- `MuiButton`: `borderRadius: 6` (sm)
- `MuiCard`: `borderRadius: 12` (lg)
- `MuiLinearProgress`: `borderRadius: 4` (xs)
- `MuiTextField OutlinedInput`: `borderRadius: 8` (md)
- `MuiChip`: `borderRadius: 6` (sm)
- `MuiTooltip`: `borderRadius: 6` (sm)
- `MuiSkeleton`: `borderRadius: 6` (sm)

### 2.7 Transitions & Animations

#### 2.7.1 Duration Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `fast` | `150ms` | Hover effects, focus transitions |
| `normal` | `250ms` | Default transitions |
| `slow` | `400ms` | Entrance animations, banners |

#### 2.7.2 Easing Tokens

| Token | CSS Value | Character |
|-------|-----------|-----------|
| `ease` | `ease` | Default |
| `easeIn` | `cubic-bezier(0.4, 0, 1, 1)` | Entering |
| `easeOut` | `cubic-bezier(0, 0, 0.2, 1)` | Exiting |
| `easeInOut` | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard |
| `spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Slight overshoot (creative accent) |

#### 2.7.3 Keyframes

**`slideInFade`** — Step completion card entrance (300ms):
```css
@keyframes slideInFade {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

**`celebrationPop`** — Completion celebration (400ms ease-out):
```css
@keyframes celebrationPop {
  0%   { transform: scale(0.95); opacity: 0.8; }
  60%  { transform: scale(1.03); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}
```

**`stepPulse`** — Active step indicator (1.5s infinite):
```css
@keyframes stepPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}
```

**`sparkle`** — Lucky bonus critical hit (600ms):
```css
@keyframes sparkle {
  0%   { opacity: 0; transform: scale(0.8) rotate(-5deg); }
  50%  { opacity: 1; transform: scale(1.1) rotate(3deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}
```

#### 2.7.4 Reduced Motion Overrides

```css
@media (prefers-reduced-motion: reduce) {
  @keyframes slideInFade    { from { opacity: 0; } to { opacity: 1; } }
  @keyframes celebrationPop { from { opacity: 0; } to { opacity: 1; } }
  @keyframes stepPulse      { 0%, 100% { opacity: 1; } }
  @keyframes sparkle        { from { opacity: 1; } to { opacity: 1; } }
}
```

**Component-level guard example:**
```tsx
sx={{
  animation: 'celebrationPop 400ms ease-out',
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
}}
```

### 2.8 Gradient Tokens

| Token | CSS Value | Usage |
|-------|-----------|-------|
| `gradients.brand` | `linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)` | Level-up banners, hero sections |
| `gradients.completion` | `linear-gradient(135deg, #059669 0%, #0891B2 100%)` | CompletionBanner |
| `gradients.hero` | `linear-gradient(135deg, #1E40AF 0%, #6D28D9 100%)` | Hero page sections |

### 2.9 Dark Mode Overrides

| Category | Light Mode | Dark Mode |
|----------|-----------|-----------|
| **Background default** | `#F9FAFB` | `#0F172A` (deep navy) |
| **Background paper** | `#FFFFFF` | `#1E293B` |
| **Background elevated** | — | `#263548` |
| **Text primary** | `#111827` | `#F1F5F9` |
| **Text secondary** | `#6B7280` | `#94A3B8` |
| **Text disabled** | `#9CA3AF` | `#475569` |
| **Divider** | `#E5E7EB` | `#334155` |
| **Border** | same as divider | `#334155` |
| **Brand 500** | `#2563EB` | `#3B82F6` |
| **Brand 400 (hover)** | `#60A5FA` | `#60A5FA` |
| **Grey 50** | `#F9FAFB` | `#1E293B` |
| **Grey 100** | `#F3F4F6` | `#263548` |
| **Grey 200** | `#E5E7EB` | `#334155` |
| **Grey 900** | `#111827` | `#F1F5F9` |

**Dark mode rarity overrides:**

| Tier | Border | Background | Text |
|------|--------|------------|------|
| Common | `#6B7280` | `#1F2937` | `#D1D5DB` |
| Rare | `#60A5FA` | `#1E3A8A` | `#DBEAFE` |
| Epic | `#A78BFA` | `#312E81` | `#DDD6FE` |
| Legendary | `#FBBF24` | `#78350F` | `#FEF3C7` |

### 2.10 Theme Context & System Preference

```typescript
type ThemeMode = 'light' | 'dark' | 'system';

// Resolved mode:
// 'system' → window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
// 'light'  → light
// 'dark'   → dark

// Stored in localStorage key: 'theme-mode'
// Wrapped via MuiThemeProvider + CssBaseline
```

### 2.11 MUI Component Style Overrides (Complete)

| Component | Override | Value |
|-----------|----------|-------|
| **MuiButton** root | `borderRadius` | `6` |
| | `fontWeight` | `500` |
| | `textTransform` | `none` |
| | `transition` | `all 150ms ease` |
| | `&:hover` | `transform: translateY(-1px)` |
| | `&:active` | `transform: translateY(0)` |
| | `defaultProps.disableElevation` | `true` |
| **MuiButton** containedPrimary | `boxShadow` | `0 1px 3px rgba(37,99,235,0.3)` |
| | `&:hover boxShadow` | `0 4px 12px rgba(37,99,235,0.4)` |
| **MuiCard** root | `borderRadius` | `12` |
| | `border` | `1px solid` borderColor |
| | `boxShadow` | `0 1px 3px rgba(0,0,0,0.06)` |
| | `transition` | `box-shadow 200ms ease, transform 200ms ease` |
| | `&:hover boxShadow` | `0 4px 6px rgba(0,0,0,0.08)` |
| | `&:hover transform` | `translateY(-2px)` |
| **MuiLinearProgress** root | `borderRadius` | `4` |
| | `height` | `6px` |
| | `backgroundColor` | light: `#E5E7EB` / dark: `#334155` |
| **MuiLinearProgress** bar | `borderRadius` | `4` |
| **MuiTextField** focused | `borderColor` | `var(--workspace-accent, #2563EB)` |
| | `borderWidth` | `2` |
| | `borderRadius` | `8` |
| **MuiChip** root | `borderRadius` | `6` |
| | `fontWeight` | `500` |
| **MuiTooltip** tooltip | `borderRadius` | `6` |
| | `fontSize` | `0.75rem` |
| **MuiSkeleton** root | `borderRadius` | `6` |
| | `backgroundColor` | light: `rgba(0,0,0,0.06)` / dark: `rgba(255,255,255,0.06)` |
| | `defaultProps.animation` | `"wave"` |
| **MuiTab** root | `textTransform` | `none` |
| | `fontWeight` | `500` |
| | `minHeight` | `40` |

---

## 3. Layout Architecture

### 3.1 AppShell Structure

```
AppShell
┌──────────────────────────────────────────────────────────────────┐
│ Sidebar (280px fixed, collapsible on tablet) │ Content Area (flex) │
│                                               │                    │
│ ┌─────────────────────────────────┐   ┌───────┴──────────────────┐ │
│ │ Workspace Selector (dropdown)    │   │ PageHeader                │ │
│ │ [Q3 Campaign ▼]                  │   │ Breadcrumb > Title        │ │
│ └─────────────────────────────────┘   │ [Actions slot]            │ │
│                                       └──────────────────────────┘ │
│ ┌─────────────────────────────────┐                                │
│ │ Tools (navigation list)           │   ┌──────────────────────────┐│
│ │ ○ Blog Post                       │   │                          ││
│ │ ○ Landing Funnel                  │   │   Content Area            ││
│ │ ○ Video Script                    │   │   (Dashboard or ToolPage) ││
│ │ ○ ... (all registered tools)      │   │                          ││
│ └─────────────────────────────────┘   │                          ││
│                                       └──────────────────────────┘│
│ ─────────────────────────────────                                 │
│ ┌─ QuickGenerateBar ─────────────┐                                 │
│ │ ⚡ Nuova Generazione             │                                 │
│ └────────────────────────────────┘                                 │
│ ─────────────────────────────────                                 │
│ ┌─ Workspace Info ───────────────┐                                 │
│ │ Credits: 245/250                │                                 │
│ │ Reset: 01/08/2026               │                                 │
│ └────────────────────────────────┘                                 │
│ ─────────────────────────────────                                 │
│ ┌─ Gamification Zone (48-56px) ──┐    ← Phase 11                   │
│ │ L4 Specialist  ████████░░       │                                 │
│ │ 🔥 12  ·  🏅 6                 │                                 │
│ │ #3 weekly ████████░░░          │                                 │
│ └────────────────────────────────┘                                 │
│ ─────────────────────────────────                                 │
│ ┌─ User Menu (bottom) ───────────┐                                 │
│ │ [AV] Anna V.              ▼     │                                 │
│ └────────────────────────────────┘                                 │
└──────────────────────────────────────────────────────────────────┘
```

**Sidebar rules:**
- 280px fixed width on desktop
- Collapsible on tablet (via `useMediaQuery`)
- `Drawer` permanent on desktop, temporary on mobile
- Workspace accent dot: 8×8px, `border-radius: 50%`, `background: var(--workspace-accent)`
- Divider between sections
- Skip-to-content link before sidebar (accessibility)

**MUI components used in AppShell:**
- `Drawer` (permanent/temporary) — sidebar container
- `Box`, `Stack` — layout primitives
- `useMediaQuery` — responsive detection
- `Divider` — section separators
- `IconButton` — theme toggle, settings

**State bindings:**
- Current workspace: `useWorkspaceContext()`
- Theme mode: `useThemeMode()`
- Navigation: `useLocation()` (React Router)
- Workspace accent: `WorkspaceAccentProvider` wraps all content

### 3.2 Mobile Layout

- **Bottom navigation bar**: Replaces sidebar navigation
- **Hamburger drawer**: Access to full sidebar via temporary `Drawer`
- **FAB (Floating Action Button)**: Quick generate action
- Gamification zone moves into hamburger drawer, below credits
- Sidebar zone click target: 280×56px (well exceeds 44×44px minimum)

### 3.3 Routing Table

| Route | View | Component | Status |
|-------|------|-----------|--------|
| `/` | Redirect to first workspace or dashboard | — | ✅ Built |
| `/workspaces/:workspaceId` | Workspace dashboard | `WorkspaceDashboard` | 🟡 Partial |
| `/workspaces/:workspaceId/tools/:toolKey` | Tool page (3-phase flow) | `ToolPageLayout` | ⬜ Not built |
| `/workspaces/:workspaceId/sessions/:sessionId` | Session detail | `SessionPage` | 🟡 Partial |
| `/workspaces/:workspaceId/conversations/:conversationId` | Agent conversation | `ConversationPage` | 🟡 Partial |
| `/workspaces/:workspaceId/assets` | Asset management (Knowledge Panel full page) | `AssetsPage` | ⬜ Not built |
| `/workspaces/:workspaceId/assets/:assetId` | Asset detail — full content view | `AssetDetailPage` | ⬜ Not built |
| `/workspaces/:workspaceId/team` | Team management | `TeamPage` | ⬜ Not built |
| `/workspaces/:workspaceId/templates` | Template management | `TemplatesPage` | ⬜ Not built |
| `/workspaces/:workspaceId/audit` | Audit log | `AuditPage` | ⬜ Not built |
| `/profile` | Player profile (gamification, stats) | `ProfilePage` | ⬜ Not built |
| `/login` | Authentication | `LoginPage` | ✅ Built |
| `/register` | Registration | `RegisterPage` | ✅ Built |
| `/admin/*` | Admin pages | Admin shell | ⬜ Not built |

**Key routing principle**: Every route has `workspaceId`. Tools, sessions, assets, conversations are all scoped to workspace.

---

## 4. Component Architecture — By Layer

### 4.1 Layer 1 — Layout Components (3)

#### 4.1.1 `AppShell.tsx`

```typescript
interface AppShellProps {
  children: React.ReactNode;
}
```

| MUI Internal | Usage |
|--------------|-------|
| `Drawer` (permanent/temporary) | Sidebar on desktop/mobile |
| `Box`, `Stack` | Layout primitives |
| `useMediaQuery` | Responsive breakpoints |
| `Divider` | Sidebar section separators |
| `IconButton` | Theme toggle, settings |
| `SkipToContent` | Accessibility skip link |

**State bindings**: `useWorkspaceContext()`, `useThemeMode()`, `useLocation()` (React Router)

**Key behaviors:**
- Wraps `WorkspaceAccentProvider` around content
- Handles light/dark/system theme toggle (persisted to localStorage `'theme-mode'`)
- 280px fixed sidebar with collapse on tablet

**Accessibility:** `<SkipToContent>` before sidebar, semantic `<nav>`/`<main>`, `aria-current="page"` on active nav items

**Status:** ✅ Built (basic)

---

#### 4.1.2 `WorkspaceDashboard.tsx`

```typescript
interface WorkspaceDashboardProps {
  workspaceId: string;
}
```

**Section order:**
1. `QuickGenerateBar` — always visible, workspace-aware
2. In-progress sessions (collapsed if empty)
3. Ready-to-Promote artifacts (KPI #3 anchor)
4. `AssetCoverageBar` — asset completeness indicator
5. ToolShortcuts grid (top 4 tools + "Tutti →")

**4-state pattern:**
```typescript
const { workspace, sessions, artifacts, assets, loading, error } = useWorkspace(workspaceId);
if (loading) return <LoadingSkeleton variant="dashboard" />;
if (error)   return <ErrorState message={error.message} onRetry={refetch} />;
```

**Status:** 🟡 Partial (appears inline in DashboardPage)

---

#### 4.1.3 `ToolPageLayout.tsx`

```typescript
interface ToolPageLayoutProps {
  toolKey: string;
  workspaceId: string;
}
```

**Phase derivation from XState (toolPageMachine via deriveUIState()):**

| XState State | UI Phase | Components Rendered |
|-------------|----------|-------------------|
| `configuring` | `setup` | SetupPanel + KnowledgePanel + ReadinessSnapshot + CTA bar |
| `submitting` | `submitting` | SetupPanel (disabled) + spinner overlay |
| `generating` | `progress` | FeedbackPanel |
| `completed` | `completed` | SessionSummary + CompletionBanner |
| `failed` | `failed` | ErrorState with retry |
| `cancelled` | `cancelled` | SetupPanel (restored inputs) |
| `idle` | — | Initial state |

**State binding:** Primary driver = `toolPageMachine` (XState v5)

**Status:** ⬜ Not built

---

### 4.2 Layer 2 — Workspace Components (5)

#### 4.2.1 `WorkspaceCard.tsx`

```typescript
interface WorkspaceCardProps {
  workspace: WorkspaceListItemDTO;
  isActive: boolean;
  onSelect: (id: string) => void;
}
```

| Visual Element | MUI Component | Notes |
|---------------|---------------|-------|
| Accent dot | `Box` + CSS var | `background: var(--workspace-accent)` |
| Workspace name | `Typography` (h6) | `fontFamily: Plus Jakarta Sans` |
| Session count | `Chip` size="small" | `variant="outlined"` |
| Active indicator | `ListItemButton` selected | Filled background |

**Status:** ⬜ Not built

---

#### 4.2.2 `WorkspaceForm.tsx`

```typescript
interface WorkspaceFormProps {
  open: boolean;
  workspace?: WorkspaceListItemDTO;  // undefined = create mode
  onClose: () => void;
  onSave: (data: { name: string; accentColor: WorkspaceAccent }) => Promise<void>;
}
```

| Field | MUI Component | Validation |
|-------|--------------|------------|
| Workspace name | `TextField` required | `minLength: 2`, `maxLength: 50` |
| Accent color | 10-dot color picker | Select from `WORKSPACE_ACCENTS` |
| Save CTA | `Button contained primary` | Disabled until valid |

**Color picker implementation:**
- 10 circles at 24×24px, `borderRadius: '50%'`
- `background: hex` from `WORKSPACE_ACCENTS`
- Selected: `border: 2px solid grey.900`
- Hover: `transform: scale(1.2)`
- Transition: `transform 150ms ease`

**Status:** ⬜ Not built

---

#### 4.2.3 `SessionList.tsx`

```typescript
interface SessionListProps {
  workspaceId: string;
  compact?: boolean;    // true = dashboard widget (3 max); false = full page
}
```

| Tab | Content | Badge |
|-----|---------|-------|
| `In corso` | queued + running sessions | count (accent color) |
| `Completate` | completed, limit 20 | count |
| `Fallite` | failed, limit 20 | count (error color) |

**State binding:** `useLiveSession` hook + `api.listSessions` (SWR)
**Live update:** Cross-tab resilient via SSE + poll

**Status:** 🟡 Partial (appears inline in DashboardPage)

---

#### 4.2.4 `AssetList.tsx`

```typescript
interface AssetListProps {
  workspaceId: string;
  selectable?: boolean;          // KnowledgePanel mode — enables selection
  filterByType?: AssetType;      // pre-filter to one asset type
  onSelect?: (ids: string[], byType: Partial<Record<AssetType, string>>) => void;
}
```

**State binding:** `useAssets` hook + `api.listAssets` (SWR)

**Status:** ⬜ Not built

---

#### 4.2.5 `AssetCoverageBar.tsx` (UX-v1)

```typescript
interface AssetCoverageBarProps {
  assets: AssetListItemDTO[];
  onGenerateMissing?: (assetType: AssetType) => void;
}
```

**Known asset types:** `['brief', 'brand-voice', 'persona', 'angle', 'ad-copy']`

**Rendering logic:**
- One row per `AssetType`
- Present: `LinearProgress` filled to 100% with `--workspace-accent` + `CheckCircleIcon color="success"`
- Missing: `LinearProgress` at 0% + `Button size="small"` "Genera →"

**MUI components:** `Stack`, `Typography`, `LinearProgress`, `CheckCircleIcon`, `Button`

**Status:** ⬜ Not built

---

### 4.3 Layer 3 — Tool Components (6)

#### 4.3.1 `SetupPanel.tsx`

```typescript
interface SetupPanelProps {
  tool: ToolDefinition;
  inputs: ToolPageContext['inputs'];
  onChange: (inputs: Partial<ToolPageContext['inputs']>) => void;
  disabled?: boolean;    // true during 'submitting' state
}
```

| Acquisition Input Type | MUI Component |
|------------------------|---------------|
| `userText` (short) | `TextField` |
| `userText` (long) | `TextField multiline` |
| `userText` (select) | `Select` + `MenuItem` |
| `files` | `FileUpload` (custom, wraps `input[type=file]`) |
| `apiCalls` | `Alert severity="info"` (informational only) |

**State binding:** Sends `CONFIGURE` event to `toolPageMachine`

**Status:** ⬜ Not built

---

#### 4.3.2 `KnowledgePanel.tsx`

```typescript
interface KnowledgePanelProps {
  tool: ToolDefinition;
  workspaceId: string;
  selectedAssetIds: string[];
  selectedAssetsByType: Partial<Record<AssetType, string>>;
  onChange: (data: { ids: string[]; byType: Partial<Record<AssetType, string>> }) => void;
}
```

**Selection rule:** Max 1 asset per `assetType`. Selecting a new asset of the same type deselects the previous one.

**State binding:** Sends `CONFIGURE` event to `toolPageMachine`; data via `api.listAssets` (SWR)

**Status:** ⬜ Not built

---

#### 4.3.3 `ReadinessSnapshot.tsx`

```typescript
interface ReadinessSnapshotProps {
  tool: ToolDefinition;
  inputs: ToolPageContext['inputs'];
  canSubmit: boolean;
}
```

| Status | Icon | Color |
|--------|------|-------|
| `ok` | `✓` | `success.main` (#059669) |
| `missing` | `✗` | `error.main` (#DC2626) |
| `optional` | `○` | `grey.400` (#9CA3AF) |

**Accessibility:** `role="status" aria-live="polite"`

**Status:** ⬜ Not built

---

#### 4.3.4 `FeedbackPanel.tsx`

```typescript
interface FeedbackPanelProps {
  steps: StepDefinition[];      // from ToolDefinition (total expected)
  artifacts: ArtifactDTO[];     // completed steps
  progress: StepProgress | null;
  onCancel: () => void;
}
```

| Step State | Visual | Animation |
|-----------|--------|-----------|
| `completed` | ✅ Green card + artifact preview | `slideInFade` (300ms) |
| `active` | ◐ Pulsing skeleton | `stepPulse` (1.5s infinite) |
| `pending` | ○ Dimmed card | none |

**State binding:** Reads `artifacts`, `progress` from `toolPageMachine` (XState v5)
**Live update:** SSE-driven
**Accessibility:** `role="status" aria-live="polite"`

**Status:** ⬜ Not built

---

#### 4.3.5 `SessionSummary.tsx`

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

**Promote button rule:** Rendered if `tool.produces !== undefined`. Always `variant="contained"` with `--workspace-accent`.
**Download formats:** `md`, `txt`, `docx`, `pdf`
**State binding:** Reads `artifacts` from `toolPageMachine` (XState v5)

**Status:** ⬜ Not built

---

#### 4.3.6 `ToolCard.tsx` (UX-v1)

```typescript
interface ToolCardProps {
  tool: ToolDefinition;
  workspaceId: string;
  onClick: (toolKey: string) => void;
}
```

**Visual treatment:**
- `Card` with `minWidth: 96`, `p: 2`, flex column, centered
- Emoji heading (from `TOOL_EMOJI` map): `Typography h4`, `aria-hidden`
- Tool name: `Typography caption`, centered, `fontWeight: 500`
- Hover: `borderColor: var(--workspace-accent)`, glow `boxShadow: '0 0 0 2px var(--workspace-accent-light)'`, `transform: translateY(-3px)`
- Transition: `all 150ms ease`

**Tool emoji map** (11 entries):
`blog-post: ✍️`, `video-script-long-form: 🎬`, `landing-funnel: 📄`, `landing-page: 🖥`, `video-description: 📝`, `ad-copy: 📢`, `brief: 📋`, `brand-voice: 🎙`, `buyer-persona: 👤`, `marketing-angle: 🎯`, `ai-overview-analysis: 🔍`

**Accessibility:** `aria-hidden` on emoji, `aria-label` on card

**Status:** ⬜ Not built

---

### 4.4 Layer 4 — Shared Components (9)

#### 4.4.1 `PageHeader.tsx`

```typescript
interface PageHeaderProps {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;    // buttons or dropdowns
}
```
**Status:** ✅ Built

---

#### 4.4.2 `EmptyState.tsx`

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
**Rule:** Never a dead end — always provides a contextual CTA.
**Status:** ✅ Built

---

#### 4.4.3 `ErrorState.tsx`

```typescript
interface ErrorStateProps {
  message: string;
  code?: string;          // error code for display (developer context)
  onRetry: () => void;
}
```
**Rule:** Maps `ApiClientError.code` to user-friendly message. Always has retry.
**Status:** ✅ Built

---

#### 4.4.4 `LoadingSkeleton.tsx`

```typescript
type SkeletonVariant = 
  | 'dashboard' 
  | 'card-grid' 
  | 'list' 
  | 'tool-page' 
  | 'session-detail' 
  | 'team-hub' 
  | 'conversation' 
  | 'profile';

interface LoadingSkeletonProps {
  variant: SkeletonVariant;
  count?: number;    // for list/card-grid variants
}
```

**8 skeleton variants, shape-matched per view.**
**Status:** ✅ Built

---

#### 4.4.5 `ConfirmDialog.tsx`

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

**Accessibility:** `MuiDialog` handles focus lock natively.
**Status:** ⬜ Not built

---

#### 4.4.6 `CompletionBanner.tsx` (UX-v1)

```typescript
interface CompletionBannerProps {
  durationSeconds: number;
  stepCount: number;
  creditCost: number;
}
```

**Visual treatment:**
- `p: 2`, `borderRadius: 2` (8px)
- Background: `gradients.completion` = `linear-gradient(135deg, #059669 0%, #0891B2 100%)`
- Color: white
- Animation: `celebrationPop 400ms ease-out`
- Content: ✅ emoji + "Completato in {duration}" + "{stepCount} step · {creditCost} crediti"
- Reduced motion: `animation: none`

**Accessibility:** `@media (prefers-reduced-motion: reduce)` disables animation.

**Status:** ⬜ Not built

---

#### 4.4.7 `QuickGenerateBar.tsx` (UX-v1)

```typescript
interface QuickGenerateBarProps {
  workspaceId: string;
  onNavigate: (toolKey: string) => void;
}
```

**Visual treatment:**
- `p: 2.5` (20px), `borderRadius: 2` (8px)
- Background: `var(--workspace-accent-light, #EFF6FF)`
- Border: `1.5px solid var(--workspace-accent, #2563EB)`
- Layout: `display: flex`, `gap: 2`, `alignItems: center`, `flexWrap: wrap`

**Content:**
- `Select` (size="small", `minWidth: 180`) — dropdown of all registered tools
- `Button contained` with `startIcon={<BoltIcon />}` — "Nuova Generazione"
- Button: `background: var(--workspace-accent)`, hover: `filter: brightness(0.9)`

**Status:** ⬜ Not built

---

#### 4.4.8 `WorkspaceAccentProvider.tsx` (UX-v1)

```typescript
interface WorkspaceAccentProviderProps {
  accentKey: WorkspaceAccent;
  children: React.ReactNode;
}
```

**Implementation:**
```typescript
useEffect(() => {
  document.documentElement.style.setProperty('--workspace-accent', accentHex);
  document.documentElement.style.setProperty('--workspace-accent-light', hexToRgba(accentHex, 0.12));
}, [accentHex]);
```

**Mounting:** Inside `AppShell`, wraps all content. Replaces on workspace switch.
**Status:** ⬜ Not built

---

#### 4.4.9 `PromoteButton.tsx` (UX-v1)

```typescript
interface PromoteButtonProps {
  sessionId: string;
  artifactId: string;
  assetType: AssetType;          // from tool.produces
  workspaceId: string;
  onPromoted?: () => void;
}
```

**4-state machine (local useState):**

| State | Visual |
|-------|--------|
| `idle` | `Button contained` with `startIcon={<ArrowUpwardIcon />}`, text "Promuovi a {assetType}" |
| `confirming` | Same button + `Collapse` expands below with `Alert severity="info"` + "Annulla"/"Conferma" buttons |
| `loading` | Button text "Promozione…", disabled |
| `done` | `Chip icon={<CheckCircleIcon />}` color="success" variant="outlined", label "Promosso a {assetType}" |

**Visual:** `background: var(--workspace-accent)`, hover: `filter: brightness(0.92)`
**API call:** `api.promoteArtifact(artifactId, workspaceId)`
**State binding:** Local `useState` only

**Status:** ⬜ Not built

---

### 4.5 Layer 5 — Agent Chat Components (6)

All deferred. See [[Agent Chat UX]] for full specs. Brief:

| Component | Props | Description |
|-----------|-------|-------------|
| `AgentCard` | `agent: AgentDefinition`, `workspaceId: string`, `onSelect: (agentId: string) => void` | Agent selector card |
| `TeamHub` | `workspaceId: string` | Grid + recent conversations |
| `ConversationPage` | `workspaceId: string`, `conversationId: string` | Full chat wrapper |
| `ChatMessageBubble` | `message: MessageDTO`, `role: 'user' \| 'agent'` | Individual message |
| `ChatInput` | `conversationId: string`, `disabled?: boolean`, `onSend: (text: string) => void` | Sticky composer |
| `AgentContextDrawer` | `workspaceId: string`, `agentId: string`, `open: boolean`, `onClose: () => void` | Assets + sessions drawer |

---

### 4.6 State Management Bindings

| Component | XState Machine | React Hook | SWR/Query |
|-----------|---------------|------------|-----------|
| `ToolPageLayout` | `toolPageMachine` (primary) | — | — |
| `SetupPanel` | sends `CONFIGURE` | — | — |
| `FeedbackPanel` | reads `artifacts`, `progress` | — | — |
| `SessionSummary` | reads `artifacts` | — | — |
| `KnowledgePanel` | sends `CONFIGURE` | — | `api.listAssets` |
| `SessionList` | — | `useLiveSession` | `api.listSessions` |
| `WorkspaceDashboard` | — | `useWorkspace` | `api.getWorkspace` |
| `AssetList` | — | `useAssets` | `api.listAssets` |
| `PromoteButton` | — | local `useState` | `api.promoteArtifact` |

---

## 5. Gamification Visual System

All 8 gamification components deferred to Phase 11. See [[Gamification UX]] for full behavioral specs.

### 5.1 Sidebar Gamification Zone Design

**Location:** Below credits bar, above user menu. 48–56px height. Compact.

```
┌─────────────────────────────┐
│  L4 Specialist  ████████░░  │  ← Level label + MUI LinearProgress
│  🔥 12  ·  🏅 6             │  ← Streak + badge count (icons only)
│  #3 weekly ████████░░░      │  ← Rank (only if active this week)
└─────────────────────────────┘
```

| Element | Display | When Hidden |
|---------|---------|-------------|
| Level + bar | `L4 Specialist ████████░░` | Never |
| Streak | `🔥 12` | If streak = 0 |
| Badge count | `🏅 6` | If badges = 0 |
| Weekly rank | `#3 weekly ████████░░░` | If 0 XP this week |

**Click target:** Entire zone (280×48-56px) → navigates to `/profile`. Wrapper with `role="button"`, `tabIndex={0}`, `aria-label`.

**Excluded from sidebar:**
- Individual badge icons (too noisy for 280px)
- XP number (private — bar is enough)
- Challenge status (lives in workspace dashboard)
- Season countdown (lives in workspace header)

**Goal Gradient (80%+ progress):**
- Bar color shifts from accent to brighter with subtle glow: `box-shadow: 0 0 8px var(--workspace-accent-light)`
- Micro-label appears: *"Only {remaining} XP to {nextLevel}"*
- Pure CSS conditional on `levelProgress` prop — no backend changes

### 5.2 Toast Priority System (3 Channels)

Three nested `SnackbarProvider` instances with different anchor positions:

| Channel | Anchor | Max Visible | Examples |
|---------|--------|-------------|----------|
| **System** | `bottom-left` | 3 | Errors, save confirmations, delete confirmations |
| **Gamification** | `bottom-center` | 1 | XP earned, badge unlock, lucky bonus |
| **Ambient** | `top-right` | 1 | Streak nudge, activity pulse, challenge completed |

**XP Toast Rules:**
- Session completed: *"+50 XP · Level 4 Expert"* — 3s
- Artifact promoted: *"+100 XP · Promotion bonus!"* — 3s
- Lucky bonus: *"✨ Lucky Bonus! +100 XP"* — 4s
- Agent message: *No toast* (too frequent)
- **Collision rule:** If 2 XP events fire within 2s, combine: *"+150 XP · Session + Promotion"*

**What NEVER gets a notification:**
- Streak broken (discover organically)
- Other users' achievements (no public broadcast)
- Challenge contribution (only final completion)

### 5.3 Level-Up Banner Design

```typescript
// Non-blocking banner at top of content area (not a toast)
// Auto-dismisses after 4s or on click
// Background: gradients.brand = linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)
// Content: "🎉 Level 5 — Expert!" + progress bar + "[Continue]"
// Accessibility: role="status", aria-live="polite"
```

### 5.4 Badge Unlock Toast

```
🎁 Tool Master! (epic — purple border)
You've used all 11 tools — 50 crediti extra
[View badge]  [Start generating →]
```
- 5 second duration
- Rarity-based color treatment (border matches rarity tier)
- One-click CTA capitalizes on peak motivation
- Copy uses "gift" framing (reciprocity trigger)

### 5.5 Rarity Visual Treatment

Applied to badge cards on profile page and badge unlock toasts.

| Tier | Border | Background | Text | Label |
|------|--------|------------|------|-------|
| **Common** | `#9CA3AF` | `#F3F4F6` | `#374151` | "Common" |
| **Rare** | `#3B82F6` | `#EFF6FF` | `#1E40AF` | "Rare" |
| **Epic** | `#7C3AED` | `#F5F3FF` | `#5B21B6` | "Epic" |
| **Legendary** | `#D97706` | `#FFFBEB` | `#92400E` | "Legendary" |

**Rule:** Always include text label below badge name. Never rely on color alone.

**Dark mode variants** (for completeness):
| Tier | Border | Background | Text |
|------|--------|------------|------|
| Common | `#6B7280` | `#1F2937` | `#D1D5DB` |
| Rare | `#60A5FA` | `#1E3A8A` | `#DBEAFE` |
| Epic | `#A78BFA` | `#312E81` | `#DDD6FE` |
| Legendary | `#FBBF24` | `#78350F` | `#FEF3C7` |

### 5.6 Animation Specifications for Gamification

| Component | Animation | Duration | Trigger |
|-----------|-----------|----------|---------|
| `LuckyBonusSparkle` | `sparkle` keyframe (scale+rotate) | 600ms | 10% random critical hit |
| `LevelUpBanner` | `celebrationPop` (scale) | 400ms ease-out | Level-up event |
| `BadgeProgressRing` | SVG `stroke-dashoffset` animated | 800ms ease-out | On mount |
| `ActivityPulse` | `stepPulse` (opacity) | 1.5s infinite | Active members detected |
| Sidebar XP bar (80%+) | Glow: `box-shadow: 0 0 8px var(--workspace-accent-light)` | Continuous | `levelProgress ≥ 80%` |

### 5.7 Streak Nudge

- Appears at 22:00–23:59 UTC if no activity recorded
- Amber toast (NOT red — not alarmist): *"🔶 Keep your 12-day streak alive — Generate anything before midnight [Dismiss]"*
- Max once per day
- Does NOT appear if on vacation/away mode
- Client-side date check + streak data from `GET /api/me/profile`

### 5.8 Business-Day Streak Option

```
Settings > Gamification:
  Streak mode: ○ Daily (default)  ● Business days (Mon–Fri)
```

- **Daily**: counts every calendar day (UTC), weekends count
- **Business days**: Mon–Fri only; Sat–Sun are "free" (don't advance but don't break)
- DB: `player_profiles.streak_mode VARCHAR(20) DEFAULT 'daily'`

### 5.9 Psychological Triggers Summary

| # | Trigger | UI Implementation |
|---|---------|-------------------|
| 1 | Goal Gradient | Sidebar bar intensifies at 80%+ with glow + micro-label |
| 2 | Variable Rewards | 10% random "Lucky Bonus" double XP with sparkle toast |
| 3 | Social Proof | ActivityPulse showing active team members |
| 4 | Endowment Effect | Streak hover reveals what's at stake + end-of-day nudge |
| 5 | Zeigarnik Effect | BadgeProgressRing showing badges closest to completion |
| 6 | Autonomy | ChallengeVoting — team votes on weekly challenge |
| 7 | Reciprocity | Badge unlock uses "gift" language, not transactional |
| 8 | Fresh Start Effect | Monday micro-moment: "Nuova settimana, nuovi obiettivi" |
| 9 | Scarcity | SeasonCountdown in final 7 days: "2 badges still unlockable" |

### 5.10 Explicitly Rejected Anti-Patterns

| ❌ Anti-Pattern | Rejection Reason |
|----------------|-----------------|
| Streak freeze (pay to preserve) | Monetizes motivation, erodes trust |
| Leaderboard with absolute XP | Toxic competition in B2B context |
| XP decay for inactivity | B2B has legitimate breaks |
| Public badge broadcast | Creates performative anxiety |
| Multi-channel notifications | Reduces all channels' impact |
| Forced weekend engagement | Business-day streak option prevents this |

---

## 6. Accessibility Compliance

### 6.1 Target Standard

**WCAG 2.1 AA fully. AAA selectively** on `h4`, `h5`, `h6`, and body text on default backgrounds.

### 6.2 Keyboard Navigation

| Requirement | Implementation |
|-------------|---------------|
| All interactive elements keyboard operable | MUI handles tab order |
| Focus visible | MUI `focusVisible` style on all interactive elements |
| Focus trap in dialogs | `MuiDialog` handles focus lock natively |
| Skip-to-content link | `SkipToContent` before sidebar in `AppShell` |
| Sidebar zone clickable | `role="button"`, `tabIndex={0}`, `onKeyDown` for Enter/Space |
| ToolCard | `aria-label` on card, emoji `aria-hidden` |

### 6.3 Screen Reader Support

| Component | Implementation |
|-----------|---------------|
| Navigation | `<nav>` element on sidebar, `aria-current="page"` on active items |
| Content area | `<main>` element |
| Dashboard panels | `<section>` elements |
| FeedbackPanel | `role="status" aria-live="polite"` |
| ReadinessSnapshot | `role="status" aria-live="polite"` |
| XP progress bar | `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"` |
| Badge progress ring | `role="progressbar"` with `aria-valuenow={current}`, `aria-valuemax={target}` |
| Sidebar streak | `aria-hidden="true"` on emoji + `aria-label="Streak: 12 giorni"` on wrapper |
| Sidebar badge count | `aria-hidden="true"` on emoji + `aria-label="6 badge sbloccati"` on wrapper |
| Level-up banner | `role="status" aria-live="polite"` |
| XP toast | `role="status" aria-live="polite"` (MUI Snackbar default) |
| Badge unlock toast | `role="status" aria-live="polite"` (MUI Snackbar default) |
| Icons | `aria-label` on all meaningful icons |
| AssetCoverageBar | `aria-valuenow` on `LinearProgress` |

### 6.4 Color Contrast Compliance

| Element | Combination | Ratio | Level |
|---------|-------------|-------|-------|
| Primary text (light) | `grey.900` on `grey.50` | 16.7:1 | AAA ✅ |
| Card text (light) | `grey.900` on `grey.100` | 14.2:1 | AAA ✅ |
| Primary CTA | `brand.500` (#2563EB) on `#fff` | 4.7:1 | AA ✅ |
| Primary link | `brand.500` on `grey.50` | 4.7:1 | AA ✅ |
| Success CTA | `success.main` (#059669) on `#fff` | 4.6:1 | AA ✅ |
| Error text | `error.main` (#DC2626) on `#fff` | 5.1:1 | AA ✅ |

### 6.5 Color-Not-Only Rule

All semantic states use icon + text, never rely on color alone:
- Error states: `ErrorState` shows icon + error message
- ReadinessSnapshot: `✓`/`✗`/`○` icons + color + text labels
- Rarity badges: Include text label ("Common", "Rare", "Epic", "Legendary")
- Step states: Icon + color + text label per step

### 6.6 Motion Respect

| Component | Implementation |
|-----------|---------------|
| All `@keyframes` | `@media (prefers-reduced-motion: reduce)` overrides to `animation: none` or `opacity` only |
| `slideInFade` | Reduced: `from { opacity: 0 } to { opacity: 1 }` |
| `celebrationPop` | Reduced: `from { opacity: 0 } to { opacity: 1 }` |
| `stepPulse` | Reduced: static opacity |
| `sparkle` | Reduced: static opacity |
| `CompletionBanner` | Component-level `@media (prefers-reduced-motion: reduce) { animation: none }` |
| Hover transitions | CSS `transition` — not affected by reduced motion (no motion, just visual change) |

### 6.7 Touch Targets

| Element | Minimum Size | Current |
|---------|-------------|---------|
| All interactive elements | 44×44px | MUI buttons, inputs meet this |
| Sidebar gamification zone | 44×44px | 280×48-56px ✅ |
| Color picker dots | — | 24×24px (OK — they're in a larger clickable area) |

### 6.8 Semantic HTML

| Element | HTML Tag |
|---------|----------|
| Sidebar | `<nav>` |
| Content area | `<main>` |
| Dashboard panels | `<section>` |
| Page titles | `<h1>` (via PageHeader) |
| Card titles | `<h2>`/`<h3>` (via MUI Typography) |

---

## 7. Implementation Priority (2026-08-08)

### 7.1 Current Status vs Target

| Layer | Target | Built | Gap |
|-------|--------|-------|-----|
| Layout | 3 | 2 | WorkspaceDashboard 🟡 (extract from DashboardPage) |
| Workspace | 5 | 4 | WorkspaceForm ⬜ (only remaining gap) |
| Tool | 6 | 6 | ✅ All built |
| Agent Chat | 6 | 5 | ConversationPage 🟡 (componentize) |
| Gamification | 8 | 6+2 | LevelUpBanner, LuckyBonusSparkle embedded in ToastSystem |
| Shared | 9 | 8 | ✅ All built (+ WorkspaceAccentProvider relocated to theme/) |
| **Total** | **37** | **32** | **1 missing + 4 partial** |

### 7.2 Remaining Work (Single Phase)

**Only gap — WorkspaceForm:**
1. `WorkspaceForm` — Create/edit workspace dialog with 10-dot color picker

**Extract from inline (nice-to-have):**
2. `WorkspaceDashboard` — Extract from DashboardPage inline to standalone component
3. `ConversationPage` — Componentize from pages/ to components/agent-chat/

**Cleanup:**
4. Verify LevelUpBanner + LuckyBonusSparkle should remain in ToastSystem or be extracted

### 7.3 Backend Dependencies by Component

| Component | Backend Needs |
|-----------|--------------|
| `WorkspaceAccentProvider` | `workspace.accentColor` field in workspace response |
| `SetupPanel` | `ToolDefinition.acquisition` field schema |
| `KnowledgePanel` | `GET /api/assets` — list with type filter |
| `FeedbackPanel` | SSE endpoint for generation progress; `StepProgress` DTO |
| `SessionSummary` | `GET /api/sessions/:id` with artifacts; downloadable artifact URLs |
| `SessionList` | `GET /api/sessions` with status filter/pagination |
| `AssetList` / `AssetCoverageBar` | `GET /api/assets` with type grouping |
| `PromoteButton` | `POST /api/assets/:id/promote` |
| `GamificationZone` | `GET /api/me/profile` — XP, level, streak, badge count, weekly rank |
| `ActivityPulse` | `GET /api/workspaces/:id/activity` (poll 60s or SSE) |
| `BadgeProgressRing` | `GET /api/me/profile` — `badgeProgress: [{ badgeKey, current, target }]` |
| `ChallengeVoting` | `POST /api/workspaces/:id/challenges/vote` |
| `SeasonCountdown` | `SeasonId` from profile + server date |
| `StreakModeToggle` | `player_profiles.streak_mode` field (VARCHAR(20) DEFAULT 'daily') |

---

## Sources

- [[UI Component Map]] — 37-component inventory, prop interfaces, MUI internals, state bindings
- [[Design Tokens]] — Complete MUI v6 theme, color system, typography, spacing, shadows, animations
- [[Frontend Architecture]] — Layout architecture, routing, 4-state pattern, accessibility
- [[Gamification UX]] — 8 gamification components, 9 psychological triggers, toast system, anti-patterns