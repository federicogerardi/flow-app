---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/ux
  - wiki/frontend
  - wiki/api-design
date_updated: 2026-08-07
source_count: 8
confidence: high
---

# UX Spec Summary — Comprehensive Architecture Handoff

> Synthesized from all UX wiki pages for backend architecture design: API contracts, SSE events, state machines, and component data requirements.  
> **Target audience**: Backend Architect orchestrator.  
> **Sources consolidated**: [[UX Wireframes]], [[Tool UX Architecture]], [[Agent Chat UX]], [[ToolPage Machine (XState v5)]], [[ReadinessSnapshot UI]], [[Session List - Live Status]], [[SessionPage]], [[Gamification UX]]

---

## 1. Wireframe Templates Summary

### Template 1 — AppShell Desktop (1280px+)

| Element | Spec | Layout Rule |
|---------|------|-------------|
| **Sidebar** | `280px` fixed width, full-height | Never collapses; persistent across all desktop views |
| **Logo** | `◈ flow app` at top | Non-interactive branding |
| **Workspace Switcher** | Accent color dot + workspace name + dropdown `▼` | Switching re-injects `--workspace-accent` CSS variable, re-fetches workspace data |
| **Nav items** | `⬡ Home`, `⚡ Tools`, `◐ Sessions`, `◈ Assets`, `👥 Team` (active) | Active state uses `--workspace-accent` highlight |
| **Nav placeholders** | `◫ Templates [soon]`, `≡ Audit Log [soon]` | Non-interactive, greyed out |
| **CTA** | `⚡ Nuova Generazione` button | Full width, `--workspace-accent` background, always visible |
| **Credits bar** | `Credits ████████░░ 245/250` | Fills with `--workspace-accent`; turns `amber` when `<20%` remaining. Reset date below. |
| **Gamification zone** | `L4 Specialist ████████░░` + `🔥 12 · 🏅 6` + `#3 weekly` | 48–56px height, compact, iconic. Entire zone clicks to `/profile`. See Section 7. |
| **User menu** | `[AV] Anna V. ▼` | Bottom of sidebar; opens logout/settings |

### Template 1b — AppShell Mobile (390px)

| Element | Spec | Layout Rule |
|---------|------|-------------|
| **Top bar** | `≡ [Client A — Q3] 🌙 ⚙` | Hamburger, workspace name, theme toggle, settings |
| **Content area** | Full width, scrollable | No sidebar |
| **FAB** | `⚡` Quick Generate | Accent-colored, bottom-right, above tab bar |
| **Bottom tab bar** | `🏠 · ⚡ · ◐ · ◈ · 👥` (5 items) | MUI `BottomNavigation`; Team added as 5th item |
| **Hamburger drawer** | Slides from left; contains ALL sidebar items (nav, credits, gamification, user) | Same data structure as desktop sidebar |

### Template 2 — Workspace Home (Hybrid Dashboard)

**Ordered sections (top to bottom):**

1. **PageHeader**: "Q3 Campaign · Home" + `[+ Nuova Generazione]` CTA
2. **In Progress** (collapses when empty):
   - Running cards: `◐ Blog Post · Step 2/3 · 00:45 [View] [Cancel]`
   - Queued cards: `⌛ Landing Funnel · In coda · posizione 2 [Cancel]`
3. **Pronti da Promuovere** (always first scrollable section → KPI #3 focus):
   - Completed cards with bold `[Promuovi ad Asset]` (contained + accent)
   - `[Scarica] [Visualizza]` secondary actions
4. **Asset Coverage**: per-asset-type progress bar (e.g., `Brand Voice ✓ ████████ 100%`)
   - Missing assets show `[Genera →]` deeplink to tool page
   - Bars fill with `--workspace-accent`
5. **Strumenti Rapidi**: icon grid of tools (`✍️ Blog Post`, `🎬 Video`, `📄 Landing`, `📢 Ad Copy`, `··· Tutti`)

**KPI rules:**
- "Promuovi ad Asset" always `variant="contained"` with `--workspace-accent`
- If no sessions in progress, In Progress section collapses (no empty placeholder)
- Promote rate target ≥35% → result templates must make Promote unmissable

### Template 3 — Tool Page · Phase 1: Setup

| Breakpoint | Layout |
|------------|--------|
| **Desktop** | 3-column: SetupPanel (left, flex-grow) + KnowledgePanel (right sidebar, collapsible) |
| **Mobile** | Single column; KnowledgePanel becomes accordion below SetupPanel |

**Elements (top to bottom):**
1. **Tool Intro**: tool name, description, `[1 credito] [3 step]` chips
2. **SetupPanel**: dynamic input fields rendered from `ToolDefinition.acquisition` (see Section 2)
3. **KnowledgePanel** (desktop right sidebar): asset availability list (`✅ Brand Voice`, `○ Buyer Persona (opz.)`)
4. **ReadinessSnapshot**: per-field status (`✓ Argomento`, `✗ File contesto — richiesto`, `○ Persona — opzionale`). Animated: ✗→✓ green fill when field satisfied.
5. **CTA bar** (sticky bottom): credit cost display + `[Genera ▶]` button

**Setup rules:**
- "Genera" CTA is `disabled` with visible reason until `canSubmit === true`
- CTA bar is sticky at bottom — never requires scroll to find it
- `canSubmit` guard: all required text fields non-empty, all required files uploaded, all required assets selected

### Template 4 — Tool Page · Phase 2: Progress

**Layout**: focused view — no setup form, full attention on execution.

| Element | Spec |
|---------|------|
| **Progress bar** | `Step 2 di 3 ████████████░░░░ 66%` using `LinearProgress` with `--workspace-accent` |
| **Elapsed time** | `Tempo: 00:45` — updates every second |
| **Completed step** | `✅ Step 1 · Analisi SEO Completato · 00:18` — shows first 150 chars of artifact (curiosity driver) |
| **Active step** | `◐ Step 2 · Struttura Articolo` — pulsating skeleton (`@keyframes pulse`) to show liveness |
| **Pending step** | `○ Step 3 · Articolo Finale In attesa` — dimmed, no interaction |
| **Cancel** | `[✕ Annulla]` — visible but secondary (error-colored, not dominant) |

### Template 5 — Tool Page · Phase 3: Result

**Elements (top to bottom):**
1. **Completion Banner**: `✅ Completato in 1:23 · 3 step · 1 credito utilizzato` — subtle confetti animation on first render (CSS `@keyframes`, respects `prefers-reduced-motion`)
2. **Artifact Preview**: title + first ~300 chars + `[Mostra tutto ▼]` expand
3. **Azioni Primarie**:
   - `[⬆ Promuovi a Blog Post Asset]` — **always** `variant="contained"`, accent-colored, **above** download options
   - `[⬇ Scarica .docx] [⬇ Scarica .pdf] [⬇ Scarica .md]`
   - `[↺ Nuova Generazione] [← Torna al Workspace]`

**KPI #3 enforcement:**
- Promote button hidden ONLY if `tool.produces === undefined` (content tools)
- Button is first action, not last — never `outlined` or `text`
- Promote → inline confirmation (no modal) → card fades to "Promosso ✓"

### Template 6 — Session Detail

Full-page view at `/workspaces/:id/sessions/:sessionId`.

| Element | Spec |
|---------|------|
| **PageHeader** | "Q3 Campaign > Sessions > Blog Post · 30/07 14:32" |
| **Status Banner** | `✅ Completato · 3 step · 1:23 · 30/07/2026 14:32` |
| **Timeline** | Horizontal bar: Start ●──────────────────────● Fine, with absolute timestamps |
| **Step list** | Each step shows: timestamp, label, duration, `[Vedi output ▼]` expand |
| **Actions** | `[⬆ Promuovi ad Asset] [⬇ .docx] [⬇ .pdf] [⬇ .md]` |

**Failed variant:**
- Status banner: `❌ Fallito al Step 2 · Struttura Articolo` with error message
- Actions: `[↺ Riprova con gli stessi input] [← Torna alla lista]`

### Template 7 — Assets

**Elements:**
1. **Filter Bar**: type filters (`[Tutti ▼] [Brand Voice] [Brief] [Persona] [Angle] [Ad Copy]`) + source filters (`[Generati] [Caricati] [Manuali]`)
2. **Asset Grid**: every asset type has a card slot
   - Present: name, type badge, source badge, date, first 80 chars, `[View] [Delete]`
   - Missing: `Nessun asset [Genera →]` — deeplinks to tool page

**Rules:**
- Missing asset slots are always shown (coverage visualization) — not just hidden
- "Genera →" deeplinks to tool with workspace pre-selected

### Template 8 — Shared States

Applied to every data-loading context. Three variants:

| State | Visual | Behavior |
|-------|--------|----------|
| **Loading** | Skeleton shapes matching actual layout (not generic bars) | Title skeleton + card skeletons |
| **Empty** | Centered icon + message + **contextual CTA** | Never a dead end. E.g., "Nessuna sessione. Avvia il tuo primo tool." → `[⚡ Nuova Generazione]` |
| **Error** | Centered ⚠ icon + message + **retry action** | `[↺ Riprova]` button; never just a message |

**Skeleton variants:**
```
'dashboard' | 'card-grid' | 'list' | 'tool-page' | 'session-detail'
| 'team-hub' | 'conversation'
```

### Template 11 — Player Profile (`/profile`)

**Elements:**
1. **Level Card**: `L4 · Specialist`, XP bar `████████░░ 2,450/5,000 XP (49%)`, streak: `🔥 12 days · Longest: 18 days`
2. **Badges (6 unlocked)**: 2-col grid, each card shows: emoji, name, rarity label (text), date earned. Uses `rarity.*` design tokens for border color.
3. **In Progress**: greyed-out badge cards with `CircularProgress` rings. `⬤ 8/11 👑 Tool Master` (current/target + badge name + reward)
4. **Stagione Attuale**: seasonal XP total, workspace rank, seasonal badges
5. **Impostazioni**: streak mode toggle — `○ Daily ● Business days (Mon–Fri)` via MUI `Switch`

**Profile page rules:**
- Badge cards: `borderRadius: 8px`, `boxShadow: xs`, 2-col desktop, 2-col mobile
- Rarity labels always present (color is NOT the only indicator)
- 4-state pattern: `LoadingSkeleton variant="profile"` → data

---

## 2. Tool UX Lifecycle

### Complete State → UI Mapping

```
8 Backend Session States → 6 UI States:

draftEmpty    → loading        (no tool loaded)
configuring   → setup          (SetupPanel active, CTA disabled)
ready         → setup          (SetupPanel active, CTA enabled)
submitting    → submitting     (SetupPanel disabled, spinner)
running       → progress       (FeedbackPanel with step cards)
completed     → completed      (SessionSummary with download/promote)
failed        → failed         (ErrorPanel with retry)
cancelled     → cancelled      (SetupPanel restored with preserved inputs)
```

### SetupPanel — Generic Input Renderer

Reads `ToolDefinition.acquisition` — **zero per-tool components**. One file for all 11 tools.

| Input Type | Component | Tool Examples |
|-----------|-----------|---------------|
| `userText` (short) | MUI `TextField` | `ai-overview-analysis` keyword, `blog-post` topic |
| `userText` (long) | MUI `TextField multiline` (minRows=3, maxRows=10) | `ad-copy` product description |
| `userText` (select) | MUI `Select` + `MenuItem[]` | `ad-copy` campaign type, `video-description` language |
| `files` | MUI `DropzoneArea` + `LinearProgress` | `landing-funnel` briefing, `blog-post` context |
| `apiCalls` | `InfoBanner` (informational, no user action) | `ai-overview-analysis` SerpAPI |
| `assets` | `KnowledgePanel` sidebar | All content tools |

**Domain type:**
```typescript
type TextInput = {
  key: string; label: string; required: boolean;
  type?: 'short' | 'long' | 'select';  // default: 'short'
  placeholder?: string; options?: string[]; description?: string;
};
type FileInput = {
  key: string; label: string; accept: string[];  // e.g., ['.txt', '.md', '.docx']
  required: boolean; description?: string; maxSizeMb?: number;  // default: 10
};
```

### FeedbackPanel — Never Silent During Execution

| Step State | Visual | Behavior |
|------------|--------|----------|
| **Pending** (future) | Dimmed card, `○ label In attesa` | No content |
| **Active** (current) | Pulsating skeleton inside card | `◐ label In corso…` text + pulsating animation |
| **Completed** | Green `✓` + first 150 chars of artifact | `ease-out 300ms` animation from skeleton to content |

**SSE events driving FeedbackPanel:**
- `step_completed` → card animates completed, progress bar advances, timer updates
- Global `LinearProgress` with `aria-label="Step {current} of {total}"`
- Elapsed time updates every second

### SessionSummary — Completion View

- Shows full artifact content (ReactMarkdown rendered)
- Download formats: `.docx`, `.pdf`, `.md`
- Promote button: only shown when `tool.produces !== undefined`
- "New generation" button preserves tool selection, resets inputs

### Always-On Information Principle

Every state has a visible informational message. The user **always** knows what's happening:

| State | Message |
|-------|---------|
| `draftEmpty` | "Select a tool to start" |
| `configuring` | SetupPanel with clear labels + real-time readiness |
| `ready` | "Ready to generate" + credit cost visible |
| `submitting` | Spinner + "Starting generation..." + credits deducted |
| `running` | FeedbackPanel with animated step cards |
| `completed` | SessionSummary with preview, download, promote |
| `failed` | ErrorState with actionable message + retry |
| `cancelled` | SetupPanel restored with preserved inputs |

### Developer Experience — Adding a New Tool

**5 files, ~100 lines, ~30 minutes, ZERO new React components:**

1. `packages/domain/src/generation/tools/<tool-name>.tool.ts` (~20 loc) — `ToolDefinition`
2. `apps/backend/src/prompts/<tool-name>/<step-name>/system.md` (~15 loc)
3. `apps/backend/src/prompts/<tool-name>/<step-name>/user.md` (~10 loc)
4. `packages/copy/src/it/tool-page.ts` (~5 loc) — add tool name to dictionary
5. Frontend: **0 loc** — `SetupPanel` + `FeedbackPanel` are fully generic

---

## 3. XState ToolPage Machine

### Full State Diagram

```
draftEmpty ──LOAD──▶ configuring ←──CONFIGURE──┐
                        │                       │
                   canSubmit?                    │
                   (guard)                      │
                        ▼                       │
                      ready ──CONFIGURE─────────┘
                        │
                     SUBMIT
                        ▼
                   submitting ──invoke: submitSession──▶ (onDone) running ──invoke: subscribeToSSE
                        │                                    │
                   (onError)                            STEP_COMPLETED (actions: addArtifact, setProgress)
                        │                               SESSION_COMPLETED → completed
                        ▼                               SESSION_FAILED → failed
                      ready                              CANCEL → cancelled
```

**8 machine states** → **6 UI states** (configuring + ready both render "setup")

### Context Shape

```typescript
interface ToolPageContext {
  tool: ToolDefinition | null;          // Loaded tool definition
  workspaceId: string;                  // Current workspace
  inputs: {
    text: Record<string, string>;       // e.g., { topic: "AI marketing" }
    files: Record<string, File>;        // e.g., { briefing: File }
    selectedAssetIds: string[];         // Selected asset IDs
    selectedAssetsByType: Partial<Record<AssetType, string>>;  // e.g., { 'brand-voice': 'abc123' }
  };
  session: SessionDTO | null;           // Server session after submit
  artifacts: ArtifactDTO[];             // Accumulated step artifacts
  progress: StepProgress | null;        // { current: 2, total: 3, stepLabel: "Struttura" }
  error: { code: string; message: string } | null;
}
```

### Event Catalog

```typescript
type ToolPageEvent =
  | { type: 'LOAD'; tool: ToolDefinition; workspaceId: string }
  | { type: 'CONFIGURE'; inputs: Partial<ToolPageContext['inputs']> }
  | { type: 'SUBMIT' }                                              // User clicks Generate
  | { type: 'CANCEL' }                                              // User cancels during running
  | { type: 'SESSION_STARTED'; session: SessionDTO }                // SSE: session_started
  | { type: 'STEP_COMPLETED'; artifact: ArtifactDTO; progress: StepProgress }  // SSE: step_completed
  | { type: 'SESSION_COMPLETED'; finalArtifact: ArtifactDTO }       // SSE: session_completed
  | { type: 'SESSION_FAILED'; error: { code: string; message: string } }  // SSE: session_failed
  | { type: 'RETRY' }                                               // User clicks Retry
  | { type: 'RESET' };                                              // User clears inputs
```

### Actors

| Actor | Type | Purpose | Lifecycle |
|-------|------|---------|-----------|
| `submitSession` | `fromPromise` | POST `/api/tools/:toolKey/sessions` — starts generation | Promise resolves → `running`; rejects → back to `ready` |
| `subscribeToSSE` | `fromCallback` | GET `/api/sessions/:id/events` — real-time progress | EventSource created on `running` enter, closed on completion/error/cleanup |

**SSE events consumed by frontend:**
| SSE Event | Machine Event | Data |
|-----------|--------------|------|
| `session_started` | `SESSION_STARTED` | `{ session: SessionDTO }` |
| `step_completed` | `STEP_COMPLETED` | `{ artifact: ArtifactDTO, progress: StepProgress }` |
| `session_completed` | `SESSION_COMPLETED` | `{ artifact: ArtifactDTO }` |
| `session_failed` | `SESSION_FAILED` | `{ error: { code, message } }` |
| `onerror` | `SESSION_FAILED` | `{ code: 'SSE_ERROR', message: 'Connection lost' }` |

### Guards

| Guard | Evaluates | Used In |
|-------|-----------|---------|
| `canSubmit` | All required `userText` fields non-empty, all required `files` present, all required `assets` selected by type | `configuring` → `ready` transition |
| `isStillDraft` | No text inputs AND no file inputs configured | `configuring` → `draftEmpty` (RESET) |

**`canSubmit` detail**: mirrors backend `ReadinessPolicy` exactly — same predicates, same reason codes. Required assets evaluated by `assetType` (`selectedAssetsByType[assetType]`), not generic count.

### State → CTA Mapping Table

| Machine State | UI State | CTA Button | Button State | Panel Rendered |
|--------------|----------|-----------|-------------|----------------|
| `draftEmpty` | `loading` | — (spinner) | — | Loading |
| `configuring` | `setup` | "Configure" | **disabled** (with visible reason) | SetupPanel |
| `ready` | `setup` | "Generate" | **enabled** | SetupPanel + KnowledgePanel |
| `submitting` | `submitting` | — (spinner) | — | SetupPanel (disabled) |
| `running` | `progress` | "Cancel" | enabled (secondary) | FeedbackPanel |
| `completed` | `completed` | "Download" + "New" | enabled | SessionSummary |
| `failed` | `failed` | "Retry" | enabled | ErrorPanel |
| `cancelled` | `cancelled` | "Retry" | enabled | SetupPanel (restored) |

### React Integration Pattern

```typescript
const [state, send] = useMachine(toolPageMachine);
const uiState = deriveUIState(state);  // 8→6 mapping

// Render based on uiState:
{uiState === 'setup'     && <SetupPanel ... />}
{uiState === 'progress'  && <FeedbackPanel ... />}
{uiState === 'completed' && <SessionSummary ... />}
{uiState === 'failed'    && <ErrorPanel ... />}
```

### Component Tree

```
ToolPage
├── KnowledgePanel           # Asset selection sidebar (right on desktop)
│   └── AssetCard[]
├── SetupPanel               # Dynamic input fields + file upload
│   ├── TextField[]          # userText inputs (short)
│   ├── TextareaAutosize[]   # userText inputs (long)
│   ├── Select[]             # userText inputs (select)
│   ├── FileUpload[]         # file inputs (DropzoneArea)
│   ├── ReadinessSnapshot    # Pre-flight validation display
│   └── SubmitButton         # CTA (disabled/enabled via canSubmit)
├── FeedbackPanel            # Step progress (running)
│   ├── ProgressBar          # LinearProgress overall
│   └── StepCard[]           # Per-step cards (completed/active/pending)
├── SessionSummary           # Final result
│   ├── ArtifactPreview      # ReactMarkdown rendered
│   ├── PromoteButton        # Only if tool.produces !== undefined
│   └── DownloadButton[]     # .docx, .pdf, .md
└── ErrorPanel               # Error state
    ├── ErrorMessage
    └── RetryButton
```

---

## 4. Session Tracking UX

### SessionCard 4-State System

| State | Card Component | Visual Treatment | Available Actions |
|-------|---------------|------------------|-------------------|
| **Queued** | `QueuedCard` | `opacity: 0.7`, ⌛ icon, queue position display | `[Cancel]` |
| **Running** | `RunningCard` | `borderLeft: 3px solid primary.main`, ◐ chip, `LinearProgress`, last artifact preview (150 chars) | `[View progress]` `[Cancel]` |
| **Completed** | `CompletedCard` | Standard card, ✅, duration, artifact preview (150 chars) | `[View]` `[Download]` `[Promote to Asset]` (if promotable) |
| **Failed** | `FailedCard` | `borderLeft: 3px solid error.main`, ❌, error message, failed step | `[Retry]` |

### Cross-Tab Resilience with `useLiveSession`

```typescript
function useLiveSession(sessionId: string | null): { liveSession: LiveSession | null }
```

**Behavior:**
1. **On mount with sessionId**: calls `api.getSession(sessionId)` to catch up after tab reopen
2. **Subscribes to SSE**: `sseClient.connect(sessionId, { onStep, onCompleted, onFailed })`
3. **On step**: updates `currentStepIndex`, `currentStepLabel`, `lastArtifactPreview`
4. **On completed**: re-fetches full session from API to get final state
5. **On failed**: sets `status: 'failed'`, `errorMessage`
6. **Cleanup**: unsubscribes on unmount or sessionId change

**LiveSession shape:**
```typescript
type LiveSession = SessionListItemDTO & {
  currentStepIndex?: number;
  currentStepLabel?: string;
  elapsedSeconds?: number;
  lastArtifactPreview?: string;
  errorMessage?: string;
};
```

### SSE Integration with Poll Fallback

| Strategy | Trigger | Interval | Data Source |
|----------|---------|----------|-------------|
| **SSE** (primary) | Active subscriptions for running/queued sessions | Real-time | `GET /api/sessions/:id/events` |
| **API poll** (fallback) | SSE unavailable or on mount | 30 seconds | `GET /api/sessions?workspaceId=X&status=Y` |

**SessionList polling:**
```typescript
// On mount and every 30s:
const [queued, running, completed, failed] = await Promise.all([
  api.listSessions({ workspaceId, status: 'queued' }),
  api.listSessions({ workspaceId, status: 'running' }),
  api.listSessions({ workspaceId, status: 'completed', limit: 20 }),
  api.listSessions({ workspaceId, status: 'failed', limit: 20 }),
]);
```

### Queue Position Display

**Algorithm**: jobs sorted by BullMQ enqueue timestamp, rank = index + 1.

```
⌛ Waiting — Queue position: 2
```

**Performance note**: for high-throughput queues, use Redis sorted-set rank strategy instead of O(n log n) array sort.

### Backend Contract — SessionListItemDTO

```typescript
interface SessionListItemDTO {
  id: string;
  toolKey: string;
  workspaceId: string;
  status: 'queued' | 'draft' | 'ready' | 'running' | 'completed' | 'failed' | 'cancelled';
  stepCount: number;
  currentStepIndex?: number;        // running only
  currentStepLabel?: string;        // running only
  queuePosition?: number;           // queued only
  lastArtifactId?: string;
  lastArtifactPreview?: string;     // first 150 chars
  elapsedSeconds?: number;          // running
  durationSeconds?: number;         // completed
  errorMessage?: string;            // failed
  failedAtStep?: number;            // failed
  isPromotable?: boolean;           // tool.produces !== undefined
  createdAt: string;
  completedAt?: string;
}
```

### SessionPage (`/workspaces/:id/sessions/:sessionId`)

**State guards (render order):**
1. `if (loading)` → `<LoadingSkeleton />`
2. `if (error)` → `<ErrorState message={error.message} />`
3. `if (!session)` → `<LoadingSkeleton />` (defensive)

**Critical bug documented**: `loading` must be initialized to `true` in `useSession`. If initialized to `false`, the component renders with `session = null` before API call, crashes on `startedAt`/`completedAt` property access.

**Component structure:**
```
SessionPage
├── PageHeader: "Session: {toolName}"
├── Alert (interrupted: queued/draft/ready)
├── Card: Status + Metadata
│   ├── Status chip (color-coded)
│   ├── Cancel button (running only, with local `cancelling` state)
│   ├── Steps count / Duration / Created date
│   ├── FeedbackPanel (running: progress bar + step label)
│   └── ErrorState (failed: error message + retry CTA)
├── CompletionBanner (completed only)
└── SessionSummary (completed: artifact list + download/promote)
```

**Duration calculation:**
```typescript
const startedAt = session?.startedAt ?? null;
const completedAt = session?.completedAt ?? null;
const durationMs = startedAt && completedAt
  ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
  : null;
// Displayed only when durationMs > 0
```

**Breadcrumbs**: Home → `/workspaces/{workspaceId}` → Sessions → `/workspaces/{workspaceId}/sessions` → Session: `{toolKey}`

---

## 5. Agent Chat UX

### Conversation Privacy Model

Conversations are **user-scoped** — private to their creator:
- Agent grid: identical for all workspace members (7 agents)
- Recent conversations: only current user's conversations
- Conversation detail: only accessible if `conversation.userId === currentUser.id`
- Agent Context Drawer: identical for all (shared assets/sessions)

### Team Hub Template (Desktop)

```
PageHeader: "Q3 Campaign > Team"
Hero Banner: "👥 Il tuo team marketing virtuale — 7 specialisti con accesso completo agli asset"

Agent Grid (3 columns at 1280px+, 2 at 768-1279px, 2 mobile):
  7 agent cards:
    🎯 Strategist · Senior Marketing Strategist · [Inizia chat →]
    ✍️ Copywriter  · Senior B2B Copywriter        · [Inizia chat →]
    🔍 SEO Specialist · SEO & Content Strategist   · [Inizia chat →]
    📢 Ads Specialist · Performance Marketing      · [Inizia chat →]
    📊 Analyst · Marketing Data Analyst            · [Inizia chat →]
    🎨 Creative Dir. · Creative Director           · [Inizia chat →]
    📧 Email Marketer · Email Marketing Specialist · [Inizia chat →]

Le tue Conversazioni (user-scoped):
  ✍️ Copywriter  "Scrivi 3 headline per landing page…" 2h [Riprendi]
  🎯 Strategist  "Analisi competitor per Q3 campaign"  1gg [Riprendi]
```

**AgentCard**: `cursor: pointer`, hover `translateY(-3px)`, accent glow `box-shadow: var(--shadow-accent)`. "Inizia chat →" always creates new conversation (never reopens existing).

### Conversation View Template

**Desktop layout**: existing sidebar (visible) + conversation area (flex-grow).

```
ConvHeader:
  ← Q3 Campaign > Team
  ✍️ Copywriter          [ⓘ Assets]
  Senior B2B Copywriter

MessageList (scrollable, fills space):
  ─── Oggi, 12:28 ─── (date separator)
  [User bubble] right-aligned, accent-light bg, radius: 16px 16px 4px 16px
  [Agent bubble] left-aligned, bg: paper, border: divider, radius: 16px 16px 16px 4px
    - Agent emoji top-left
    - ReactMarkdown rendered
    - Streaming: blinking ▌ cursor appended
    - Token count in footer: "Claude Sonnet 4 · 247 tok"
    - Timestamp below each bubble

ChatInput (sticky bottom):
  Multiline TextField, maxRows=6, maxLength=4000
  Shift+Enter = newline, Enter = send
  Send button: disabled + grey (empty), accent (has text), disabled (streaming)
  "Shift+Enter per andare a capo" + char counter
```

**Mobile**: compact header, no sidebar, sticky input at bottom.

### Chat Interaction Patterns

| Pattern | Behavior |
|---------|----------|
| **Send message** | `Enter` sends, `Shift+Enter` adds newline. Input clears after send. |
| **Streaming response** | Blinking `▌` cursor appended. Input disabled. Token counter updates every 5 tokens. |
| **Scroll lock** | Auto-scroll disabled while user scrolls up. "↓ 1 nuovo messaggio" badge appears. Click → scroll to bottom. |
| **Agent typing** | While `sending` (waiting for first token): pulsing `◐◐◐` (3 animated dots). |
| **Markdown render** | Agent messages via `ReactMarkdown` + `remark-gfm`. Code blocks use `fontFamilyMono`. |
| **Suggested questions** | Empty state only. Click chip → fills input + auto-sends. |
| **New chat from card** | API call to create conversation → navigate to `/conversations/:id`. No intermediate step. |
| **Resume conversation** | Click "Riprendi" → navigate to existing `conversationId`. |
| **Archive** | `[···]` in ConvHeader → "Archivia conversazione" → `ConfirmDialog` → archive + redirect to Team Hub. |
| **Error recovery** | Stream fails → error toast `variant="error"` + "Riprova" button re-sends last user message. |

### Chat State Machine (XState)

```typescript
type ChatState = 'idle' | 'sending' | 'streaming' | 'error';

type ChatContext = {
  messages: Message[];
  currentInput: string;
  streamingContent: string;   // accumulates tokens during SSE
  error: string | null;
};
```

| State | ChatInput | Send Button | Visual |
|-------|-----------|-------------|--------|
| `idle` | Enabled | Disabled (no text) / Enabled (has text) | Normal |
| `sending` | Disabled, placeholder "Risposta in arrivo…" | Disabled | Pulsing agent bubble `◐◐◐` |
| `streaming` | Disabled, placeholder "Risposta in arrivo…" | Disabled | Blinking `▌` cursor, token counter |
| `error` | Enabled | Enabled | Error toast + "Riprova" button |

### AgentContextDrawer

Slide-in panel (320px, right on desktop; bottom sheet on mobile). Triggered by `[ⓘ Assets]` button in ConvHeader.

**Contents:**
- Asset list: present (`✅` + first 100 chars + `[Vedi →]`) / missing (`✗` + `[Genera →]`)
- Recent sessions (last 3 in workspace, shared context)
- `[ⓘ Assets]` button shows badge with count of available assets

### Component Inventory (23 → 29)

**6 new components:**
1. `AgentCard` — Card with hover lift, emoji avatar, name, role, description, "Inizia chat" CTA
2. `TeamHub` — Agent grid + recent conversations section
3. `ConversationPage` — Chat layout: header + message list + input (manages Chat XState)
4. `ChatMessageBubble` — User/agent bubble with markdown rendering and streaming cursor
5. `ChatInput` — Multiline input with send behavior and char counter
6. `AgentContextDrawer` — Slide-in drawer showing agent-visible assets

### New Routes

```
/workspaces/:id/team                           → TeamHub
/workspaces/:id/conversations/:conversationId  → ConversationPage
```

### Scroll Management

```typescript
const isAtBottom = scrollEl.scrollHeight - scrollEl.scrollTop <= scrollEl.clientHeight + 80;
if (isAtBottom) scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' });
```

### New Skeleton Variants

```typescript
'team-hub'       // agent grid (7 cards) + recent conversations
'conversation'   // 3 message bubbles (alternating user/agent)
```

---

## 6. Interaction Patterns

| Pattern | Full Behavior |
|---------|--------------|
| **Workspace switch** | Re-injects `--workspace-accent` CSS variable; re-fetches workspace data; sidebar accent dot updates color; workspace-specific routes reload |
| **Session complete** | Confetti micro-animation (CSS `@keyframes`, one-shot on mount). Respects `prefers-reduced-motion: reduce` → `animation: none` |
| **Readiness fill** | Readiness row animates `✗→✓` with green fill when field becomes satisfied. CSS transition on background-color and icon swap. |
| **Promote confirm** | Inline confirmation expands within card — **no modal**. Confirms with accent `variant="contained"` button. Card fades to "Promosso ✓" after confirmation. |
| **Step complete** | Step card animates from skeleton to content with `ease-out 300ms`. Shows first 150 chars of artifact. Previous completed steps remain visible. |
| **Error state** | Two-layer: toast notification (bottom-left, system channel) + ErrorState component replaces content area. Toast auto-dismisses 5s; ErrorState persists until retry. |
| **CTA disabled** | **Never silently disabled** — always accompanied by visible reason. `ReadinessSnapshot` shows exactly which fields are missing. Reason codes: `missing_text`, `missing_file`, `missing_asset`, `missing_workspace`. |
| **Cancel session** | Visible but secondary button (error-colored, not dominant). During running: immediately transitions to `cancelled` state. Preserves all inputs. |
| **Retry flow** | `completed`/`failed`/`cancelled` → RETRY → `ready` or `submitting`. Preserves inputs, clears artifacts. `failed` retry goes directly to `submitting`. |

### CTA Policy Summary

| Rule | Implementation |
|------|---------------|
| Primary CTA ("Generate") | Always reachable, always labelled, sticky at bottom |
| Secondary CTA ("Promote to Asset") | Prominent on result, never buried, always `variant="contained"` |
| Disabled CTAs | Never silent — `ReadinessSnapshot` shows exact reason |
| Cancel | Visible but secondary (error-colored, not dominant) |

---

## 7. Gamification UX Interaction Model

### 9 Psychological Triggers With UX Manifestations

| # | Trigger | UX Manifestation | Backend Requirement |
|---|---------|-----------------|---------------------|
| 1 | **Goal Gradient** (80%+) | XP bar intensifies: glow + "Only {remaining} XP to {nextLevel}" | `levelProgress` prop from profile API |
| 2 | **Variable Rewards** | 10% chance "lucky bonus" on any XP event (2× XP). Sparkle toast animation (`@keyframes sparkle 600ms`). Toast: "✨ Lucky Bonus! +100 XP". Never announced as feature. | `XPCalculator` random check; `xp_transactions.source = 'lucky_bonus'` |
| 3 | **Social Proof** | "Activity pulse" in workspace header: `⚡ Marco is generating`. Ambient, accent at 50% opacity. Shows users active in last 15 min. | `GET /api/workspaces/:id/activity` → `{ activeUsers: [{ name, lastAction, actionType }] }` (poll 60s or SSE) |
| 4 | **Endowment Effect** | Streak hover: "🔥 12-day streak · Longest: 18 days · Next: 30 days → 💎 Unstoppable (+100 crediti)". End-of-day nudge (22:00-23:59 UTC, no activity): amber toast "Keep your streak alive", dismissible, max once/day. | Streak data from `GET /api/me/profile`; nudge is client-side only |
| 5 | **Zeigarnik Effect** | Badge progress rings (greyed-out, `CircularProgress`) for 1-2 badges closest to completion. Only on full profile page. | `GET /api/me/profile` includes `badgeProgress: [{ badgeKey, current, target }]` |
| 6 | **Autonomy** | Monday challenge voting: 2-3 options, first vote wins. Tag: "Scelto dal team". | `POST /api/workspaces/:id/challenges/vote` with `{ challengeKey }` |
| 7 | **Reciprocity** | Badge unlock uses "gift" language: "🎁 First Light — 10 crediti extra per continuare a creare [Start →]". Duration: 5s. One-click CTA capitalizes on peak motivation. | Copy change — frontend only |
| 8 | **Fresh Start Effect** | Monday reset: "Nuova settimana, nuovi obiettivi — let's build". First page load of new week (Monday UTC). Dismissible. If streak lost: "Fresh start". | Client-side date check only |
| 9 | **Scarcity** | Season countdown (final 7 days): "❄️ Winter Sprint ends in 5 days · 2 badges still unlockable". Dismissible, expandable to show unlockable badges. | Computed from `SeasonId` + current date |

### Notification Cadence

| Trigger | Type | Duration | Channel | Rule |
|---------|------|----------|---------|------|
| Session completed | XP Toast | 3s | Gamification (bottom-center) | "+50 XP · Level 4 Expert" |
| Artifact promoted | XP Toast | 3s | Gamification (bottom-center) | "+100 XP · Promotion bonus!" |
| Lucky bonus | XP Toast | 4s | Gamification (bottom-center) | "✨ Lucky Bonus! +100 XP" — sparkle animation |
| Agent message | **No toast** | — | — | Too frequent |
| Level-up | Celebratory Banner | 4s auto-dismiss | Top of content area | "🎉 Level 5 — Expert! ████████░░ 2,500/5,000 XP" — uses `gradients.brand`, plays once per level-up |
| Badge unlock | Celebratory Toast | 5s | Gamification (bottom-center) | "🎁 Badge Name! (rarity border) — reward description [View badge] [Start →]" |
| Streak nudge | Ambient Toast | Dismissible | Ambient (top-right) | Amber, "Keep your streak alive", 22:00-23:59 UTC only, max once/day |
| Streak broken | **Never** | — | — | User discovers organically |
| Other users' achievements | **Never** | — | — | No public broadcast |
| Challenge contribution | **Never** | — | — | Only final completion gets team toast |

### Dual XP Within 2s Rule

If two XP events fire within 2 seconds, combine into single toast: `"+150 XP · Session + Promotion"`.

### 3-Tier Toast Priority System

| Channel | Anchor | Max Visible | Purpose | Examples |
|---------|--------|-------------|---------|----------|
| **System** | `bottom-left` | 3 | Errors, saves, deletes | Network error, session saved |
| **Gamification** | `bottom-center` | 1 | XP, badges, lucky bonus | "+50 XP", "🎁 Badge unlocked" |
| **Ambient** | `top-right` | 1 | Streak nudge, activity pulse | "Keep your streak alive" |

### Sidebar Gamification Zone

```
L4 Specialist  ████████░░     ← Level + XP bar (role="progressbar")
🔥 12  ·  🏅 6                 ← Streak + badge count (emoji aria-hidden, aria-label on wrapper)
#3 weekly ████████░░░          ← Weekly rank (hidden if 0 XP this week)
```

| Element | Display | When Hidden |
|---------|---------|-------------|
| Level + bar | Always | Never |
| Streak | `🔥 {count}` | If streak = 0 |
| Badge count | `🏅 {count}` | If badges = 0 |
| Weekly rank | `#{rank} weekly` + bar | If 0 XP this week |

**Click target**: entire zone → `/profile`. Accessibility: `role="button"`, `tabIndex={0}`, `aria-label="View your profile: Level 4 Specialist, 12-day streak, 6 badges"`.

**What does NOT go in sidebar**: individual badge icons, XP number, challenge status, season countdown.

### Business-Day Streak Option

```
Settings > Gamification:
  Streak mode: ○ Daily (default)  ● Business days (Mon–Fri)
```

- **Daily**: every calendar day (UTC), weekends count
- **Business days**: Mon–Fri only. Sat–Sun are "free" — don't advance streak but don't break it
- `player_profiles.streak_mode VARCHAR(20) DEFAULT 'daily'`
- `PlayerProfile.recordActivity()` checks mode before streak logic

### Anti-Patterns — Explicitly Rejected

| ❌ Anti-Pattern | Why Rejected |
|----------------|-------------|
| Streak freeze (pay to preserve) | Monetizes motivation, erodes trust |
| Leaderboard with absolute XP | Toxic competition in B2B context |
| XP decay for inactivity | B2B has legitimate breaks (vacation, project cycles) |
| Public badge broadcast | Creates performative anxiety |
| Multi-channel notifications | Each extra channel reduces all channels' impact |
| Forced weekend engagement | Business-day streak option prevents this |

---

## 8. Shared State Patterns

### 4-State Pattern (Every Data-Fetching View)

```
Loading → Empty → Error → Data
```

**Rules:**
1. Every view that fetches data implements all 4 states
2. Empty state always has a **contextual CTA** — never a dead end
3. Error state always has a **retry action** — never just a message
4. Skeleton shapes match the actual data layout (not generic bars)
5. `loading` state must be initialized to `true` (bug: initialized to `false` causes null-reference crashes)

### Skeleton Variants Specification

| Variant | Layout |
|---------|--------|
| `dashboard` | Title skeleton + card grid skeletons (3-4 cards) |
| `card-grid` | 3-4 card skeletons in grid |
| `list` | 5-6 row skeletons |
| `tool-page` | Tool intro skeleton + field skeletons + readiness skeleton |
| `session-detail` | Status banner skeleton + timeline skeleton |
| `team-hub` | Agent grid (7 cards) + recent conversations skeleton |
| `conversation` | 3 message bubbles (alternating user/agent shapes) |
| `profile` | Level card skeleton + badge grid skeleton + in-progress skeleton |

### Empty State CTAs (Contextual)

| Context | Message | CTA |
|---------|---------|-----|
| Session List | "Nessuna sessione. Avvia il tuo primo tool per iniziare." | `[⚡ Nuova Generazione]` |
| Assets | "Nessun asset" per missing slot | `[Genera →]` (deeplink to tool) |
| Conversations | Empty state: large agent avatar + greeting + suggested questions | Click chips to auto-send |
| Recent Conversations (Team Hub) | **Section hidden entirely** (user just landed) | — |

### Error State Retry Actions

| Context | Action |
|---------|--------|
| Session fetch failure | `[↺ Riprova]` re-fetches from API |
| Session generation failure | `[↺ Riprova con gli stessi input]` re-submits preserved inputs |
| Chat stream failure | Error toast + `[Riprova]` re-sends last user message |
| SSE disconnect | `SESSION_FAILED` event with `code: 'SSE_ERROR'` → error state with retry |

---

## 9. Accessibility

### WCAG 2.1 AA Target

| Area | Requirement | Implementation |
|------|-------------|---------------|
| **Keyboard navigation** | All interactive elements focusable and operable via keyboard | `Tab` between form fields, suggested question chips; `Enter`/`Space` on buttons; `Escape` closes drawers/modals |
| **Skip link** | Skip to main content | First focusable element, visible on focus |
| **Screen reader** | All dynamic content announced | See aria-live regions below |
| **Color** | Never the only differentiator | Badge rarity includes text label; `ReadinessSnapshot` uses icons + text, not just red/green |
| **Motion** | Respect user preference | `prefers-reduced-motion: reduce` → `animation: none` on confetti, sparkle, skeleton pulse, step card transitions |
| **Touch targets** | Minimum 44×44px | Sidebar gamification zone 280×56px; FAB 56×56px; send button minimum 44px |

### Aria-Live Regions

| Component | Role | aria-live | Purpose |
|-----------|------|-----------|---------|
| `FeedbackPanel` | `status` | `polite` | Step progress updates |
| `ReadinessSnapshot` | `status` | `polite` | Field readiness changes |
| XP Toast | `status` | `polite` | XP earned announcements |
| Level-up Banner | `status` | `polite` | Level-up celebration |
| Badge Toast | `status` | `polite` | Badge unlock announcements |
| Chat MessageList | `log` | `polite` | Streaming messages |
| Agent streaming bubble | — | `polite` | Streaming token updates |

### Per-Template Keyboard Requirements

| Template | Keyboard Behavior |
|----------|------------------|
| **AppShell Desktop** | Tab through nav items; workspace switcher openable via Enter/Space; gamification zone clickable via Enter/Space |
| **AppShell Mobile** | Hamburger opens via Enter; tab bar navigable |
| **Tool Page Setup** | Tab between form fields; file upload triggerable via Enter/Space; Submit via Enter when focus in last field |
| **Tool Page Progress** | Cancel button focusable via Tab |
| **Tool Page Result** | Tab between download format buttons, promote; Enter/Space to activate |
| **Agent Chat** | Tab between suggested question chips; Enter to select/auto-send; Tab to send button; Shift+Enter for newline in input |
| **Session List** | Tab between SessionCards; Tab to action buttons within each card |
| **Player Profile** | Tab through badge cards; Enter/Space to expand badge details; Tab to streak mode toggle |

### Accessibility Attributes — Per Component

**Sidebar:**
- XP bar: `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`
- Streak: `aria-hidden="true"` on 🔥 emoji, `aria-label="Streak: 12 giorni"` on wrapper
- Badge count: `aria-hidden="true"` on 🏅 emoji, `aria-label="6 badge sbloccati"` on wrapper
- Gamification zone: `role="button"`, `tabIndex={0}`, full `aria-label` with level + streak + badges

**Chat:**
- Message list: `role="log"`, `aria-live="polite"`, `aria-label="Conversazione con {agent.name}"`
- Send button: `aria-label="Invia messaggio"`
- Agent avatar emoji: `aria-hidden="true"`
- Agent cards: `aria-label="{agent.name}, {agent.role}. {agent.shortDescription}"`
- Drawer: `aria-labelledby` pointing to drawer title
- Suggested questions: `role="list"` container, `role="listitem"` on each chip

**Step cards:**
- `aria-label="{step.label}: {completed | in progress | waiting}"`

**Badge cards:**
- Text rarity label present: "Common", "Rare", "Epic", "Legendary"
- Badge progress ring: `role="progressbar"`, `aria-valuenow={current}`, `aria-valuemax={target}`

---

## Sources

- [[UX Wireframes]] — 11 templates, design direction, interaction patterns
- [[Tool UX Architecture]] — 4-phase lifecycle, SetupPanel, FeedbackPanel, developer experience
- [[Agent Chat UX]] — Conversation privacy, Team Hub, Conversation View, 6 new components
- [[ToolPage Machine (XState v5)]] — 8 states, context, events, actors, guards, state→UI mapping
- [[ReadinessSnapshot UI]] — Pre-flight validation, reason codes, determinism contract
- [[Session List - Live Status]] — 4 SessionCard states, useLiveSession, SSE+poll, queue position
- [[SessionPage]] — Full-page detail, state guards, duration calc, component structure
- [[Gamification UX]] — 9 triggers, notification cadence, 3-tier toasts, sidebar zone, anti-patterns