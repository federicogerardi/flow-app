---
type: concept
tags:
  - wiki/concept
  - wiki/frontend
  - wiki/ux
date_updated: 2026-08-01
source_count: 7
confidence: high
---

# UX Wireframes

> Deterministic layout specs — desktop (1280px) + mobile (390px) — for all primary templates  
> Benchmark: Forest (gamified satisfaction) · Monday.com (operational clarity)  
> Anti-pattern: bureaucratic density · ambiguous CTAs · silent failures · cold enterprise feel  
> **Templates 1–8**: tool pipeline + workspace. **Templates 9–10**: Agent Chat (see [[Agent Chat UX]])

## Design Direction

| Dimension | Decision | Source |
|-----------|----------|--------|
| Style | Creative modern — energy through hierarchy, not decoration | Q&A #3 |
| Navigation | Hybrid: dashboard home + workflow shortcuts | Q&A #4 |
| Theming | Light/Dark/System + `--workspace-accent` per workspace | Q&A #5 |
| Density | Balanced — state visible, not overwhelming | Q&A #7 |
| Primary CTA | **Generate** — always reachable, always labelled | Q&A #2 |
| Secondary CTA | **Promote to Asset** — prominent on result, never buried | Q&A #2 |
| KPI #3 target | Promote rate ≥35% → result template must make Promote unmissable | Q&A #10 |
| KPI #4 target | Error/retry rate ≤6%/18% → error states must be actionable | Q&A #10 |

---

## Review: Coherence With Existing Architecture

The following decisions from [[Frontend Architecture]] are **preserved and extended**:

| Existing decision | Status | Extension |
|-------------------|--------|-----------|
| MUI v6 as component library | ✅ kept | Aggressive theme override for creative modern |
| 17 total components | ✅ extended to 23 | 6 UX-v1 additions (see [[UI Component Map]]) |
| Workspace-centric routing | ✅ kept | `--workspace-accent` injected per workspace context |
| 4-state loading pattern | ✅ kept | Skeleton → Empty → Error → Data |
| Zero tool-specific components | ✅ kept | New components are generic (not tool-specific) |

**New routing additions** (extends existing `/workspaces/:id/*`):

| Route | View |
|-------|------|
| `/workspaces/:id/assets` | Full-page AssetList |
| `/workspaces/:id/assets/:assetId` | Asset detail — full content view (markdown) |
| `/workspaces/:id/sessions` | Full-page SessionList |
| `/workspaces/:id/team` | Team Hub (Agent Chat entry) |
| `/workspaces/:id/conversations/:conversationId` | Conversation View |
| `/profile` | Player Profile (Template 11) |
| `/templates` | Placeholder (roadmap slot) |
| `/audit` | Placeholder (roadmap slot) |

---

## Template 1 — AppShell Desktop (1280px+)

Fixed sidebar 280px · content area flex-grow · header per-page.

```
┌────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR 280px (fixed)           │ CONTENT AREA (flex-grow, scrollable)  │
│                                 │                                        │
│ ┌─────────────────────────────┐ │ ┌────────────────────────────────────┐ │
│ │  ◈ flow                     │ │ │ PageHeader                         │ │
│ │    app                      │ │ │ Home > Workspace > Page            │ │
│ └─────────────────────────────┘ │ │ [actions]                          │ │
│                                 │ └────────────────────────────────────┘ │
│ ┌─────────────────────────────┐ │                                        │
│ │ ● [Client A — Q3      ▼]    │ │ ┌────────────────────────────────────┐ │
│ │   accent dot = workspace    │ │ │                                    │ │
│ └─────────────────────────────┘ │ │  <route content>                   │ │
│                                 │ │                                    │ │
│  NAV                            │ │                                    │ │
│  ─────────────────────────────  │ └────────────────────────────────────┘ │
│  ⬡  Home                        │                                        │
│  ⚡  Tools                       │                                        │
│  ◐  Sessions                    │                                        │
│  ◈  Assets                      │                                        │
│  👥  Team                        │                                        │
│  ─────────────────────────────  │                                        │
│  ◫  Templates  [soon]           │                                        │
│  ≡  Audit Log  [soon]           │                                        │
│                                 │                                        │
│                                 │                                        │
│  ┌───────────────────────────┐  │                                        │
│  │  ⚡ Nuova Generazione      │  │                                        │
│  └───────────────────────────┘  │                                        │
│  ← accent-colored CTA button    │                                        │
│                                 │                                        │
│  ─────────────────────────────  │                                        │
│  Credits ████████░░  245/250    │                                        │
│  Reset 01/08/2026               │                                        │
│  ─────────────────────────────  │                                        │
│  L4 Specialist  ████████░░      │  ← Gamification Zone                   │
│  🔥 12  ·  🏅 6                 │                                        │
│  #3 weekly ████████░░░          │                                        │
│  ─────────────────────────────  │                                        │
│  [AV]  Anna V.              ▼   │                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**Sidebar rules:**
- Workspace switcher shows accent color dot; switching workspaces re-injects `--workspace-accent`
- "Nuova Generazione" CTA uses `--workspace-accent` as background
- Templates and Audit Log show `[soon]` badge, are non-interactive until released
- Credits bar fills with `--workspace-accent` color; turns amber when <20% remaining

---

## Template 1b — AppShell Mobile (390px)

No sidebar. Bottom tab bar. FAB for primary action.

```
┌─────────────────────────────┐
│ ≡  [Client A — Q3]  🌙  ⚙   │  ← top bar: hamburger · workspace · theme · settings
├─────────────────────────────┤
│                             │
│  <route content>            │
│                             │
│                             │
│                             │
│                             │
│                    ┌──────┐ │
│                    │  ⚡   │ │  ← FAB Quick Generate (accent color)
│                    └──────┘ │
├─────────────────────────────┤
│  🏠    ⚡    ◐    ◈         │  ← bottom nav: Home · Tools · Sessions · Assets
└─────────────────────────────┘
```

**Mobile drawer (hamburger open):**
```
┌─────────────────────────────┐
│ ● [Client A — Q3      ▼]    │
│ ─────────────────────────── │
│ ⬡  Home                     │
│ ⚡  Tools                    │
│ ◐  Sessions                 │
│ ◈  Assets                   │
│ ─────────────────────────── │
│ ◫  Templates  [soon]        │
│ ≡  Audit Log  [soon]        │
│ ─────────────────────────── │
│ Credits ███████░  245/250   │
│ ─────────────────────────── │
│ L4 · 🔥 12 · 🏅 6 · #3 wk  │
│ ─────────────────────────── │
│ [AV]  Anna V.           ▼   │
└─────────────────────────────┘
```

---

## Template 2 — Workspace Home (Dashboard ibrida)

Landing page when entering a workspace. Combines overview + shortcuts.

```
DESKTOP ─────────────────────────────────────────────────────────────────

┌─ PageHeader ──────────────────────────────────────────────────────────┐
│  Q3 Campaign · Home                            [+ Nuova Generazione]   │
└───────────────────────────────────────────────────────────────────────┘

┌─ In Progress ─────────────────────────────────────────────────────────┐
│  [◐ Blog Post · Step 2/3 · 00:45 ─────────────────── [View] [Cancel]] │
│  [⌛ Landing Funnel · In coda · posizione 2 ──────────────── [Cancel]] │
└───────────────────────────────────────────────────────────────────────┘

┌─ Pronti da Promuovere ── (KPI #3 focus area) ─────────────────────────┐
│                                                                         │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │ ✅ Video Script              │  │ ✅ Blog Post                     │  │
│  │ Completato 1h fa            │  │ Completato 3h fa                 │  │
│  │ "Ecco come usare l'AI per…" │  │ "10 strategie per il B2B…"      │  │
│  │                             │  │                                  │  │
│  │ [Promuovi ad Asset] ← bold  │  │ [Promuovi ad Asset] ← bold      │  │
│  │ [Scarica]  [Visualizza]     │  │ [Scarica]  [Visualizza]         │  │
│  └─────────────────────────────┘  └─────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘

┌─ Asset Coverage ──────────────────────────────────────────────────────┐
│  Brand Voice    ✓  ████████████████████  100%                          │
│  Brief          ✓  ████████████████████  100%                          │
│  Buyer Persona  ✗  ░░░░░░░░░░░░░░░░░░░░    0%  [Genera →]             │
│  Angle          ✗  ░░░░░░░░░░░░░░░░░░░░    0%  [Genera →]             │
└───────────────────────────────────────────────────────────────────────┘

┌─ Strumenti Rapidi ────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │  ✍️        │  │  🎬       │  │  📄       │  │  📢       │  │  ···   │  │
│  │ Blog Post │  │  Video   │  │ Landing  │  │ Ad Copy  │  │ Tutti  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
└───────────────────────────────────────────────────────────────────────┘

MOBILE ──────────────────────────────────────────────────────────────────

┌─────────────────────────────┐
│ Q3 Campaign · Home          │
├─────────────────────────────┤
│ IN CORSO (2)                │
│ ◐ Blog Post · Step 2/3      │
│ ⌛ Landing Funnel · Coda 2   │
├─────────────────────────────┤
│ PRONTI DA PROMUOVERE (2)    │
│ ┌───────────────────────────┐│
│ │ ✅ Video Script           ││
│ │ [Promuovi] [Scarica]      ││
│ └───────────────────────────┘│
│ ┌───────────────────────────┐│
│ │ ✅ Blog Post              ││
│ │ [Promuovi] [Scarica]      ││
│ └───────────────────────────┘│
├─────────────────────────────┤
│ ASSET COVERAGE              │
│ Brand Voice  ✓              │
│ Brief        ✓              │
│ Persona      ✗ [Genera]     │
│ Angle        ✗ [Genera]     │
├─────────────────────────────┤
│ STRUMENTI                   │
│ [Blog] [Video] [Landing]    │
│ [Ad Copy] [Tutti →]         │
└─────────────────────────────┘
```

**Layout rules:**
- "Pronti da Promuovere" is **always the first scrollable section** after in-progress sessions — this directly drives KPI #3
- "Promuovi ad Asset" button uses `variant="contained"` with `--workspace-accent`, not muted
- If no sessions in progress, the In Progress section collapses (not empty placeholder)
- Asset Coverage bars fill with `--workspace-accent` color for completed assets

---

## Template 3 — Tool Page · Phase 1: Setup

Three-column on desktop (knowledge panel sidebar), single-column on mobile.

```
DESKTOP ─────────────────────────────────────────────────────────────────

┌─ PageHeader ──────────────────────────────────────────────────────────┐
│  Q3 Campaign > Tools > Blog Post                                        │
└───────────────────────────────────────────────────────────────────────┘

┌─ Tool Intro ──────────────────────────────────────────────────────────┐
│  ✍️  Blog Post                                                           │
│  Articolo SEO ottimizzato in 3 step · [1 credito] [3 step]             │
└───────────────────────────────────────────────────────────────────────┘

┌─ Setup Area ─────────────────────────┐  ┌─ Knowledge Panel ───────────┐
│                                      │  │                             │
│  Argomento *                         │  │  Asset disponibili          │
│  ┌──────────────────────────────┐    │  │  ─────────────────────────  │
│  │ es. "AI nel marketing B2B"   │    │  │  ✅ Brand Voice             │
│  └──────────────────────────────┘    │  │  ✅ Brief                   │
│                                      │  │  ○ Buyer Persona (opz.)     │
│  File di Contesto                    │  │  ○ Angle (opz.)             │
│  ┌──────────────────────────────┐    │  │                             │
│  │  📎 Trascina o clicca        │    │  │                             │
│  │     .txt .md .docx max 10MB  │    │  │                             │
│  └──────────────────────────────┘    │  │                             │
│                                      │  └─────────────────────────────┘
│  ┌─ Readiness ────────────────────┐  │
│  │  ✓ Argomento — configurato     │  │
│  │  ✗ File contesto — richiesto   │  │
│  │  ○ Buyer Persona — opzionale   │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌─ CTA bar (sticky bottom) ──────┐  │
│  │  Costo: 1 credito              │  │
│  │  [Genera ▶]  ← disabled        │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘

MOBILE ──────────────────────────────────────────────────────────────────

┌─────────────────────────────┐
│ Blog Post                   │
│ 1 credito · 3 step          │
├─────────────────────────────┤
│ Argomento *                 │
│ [_____________________]     │
│                             │
│ File di Contesto            │
│ [📎 Carica file]             │
│                             │
│ Asset  ▼ (collapsible)      │
│ ✅ Brand Voice              │
│ ✅ Brief                    │
│ ○ Persona  ○ Angle          │
│                             │
│ Readiness                   │
│ ✓ Argomento                 │
│ ✗ File — richiesto          │
├─────────────────────────────┤
│ 1 credito  [Genera ▶]       │  ← sticky footer
└─────────────────────────────┘
```

**Setup rules:**
- "Genera" CTA is `disabled` with visible reason until `canSubmit === true`
- CTA bar is sticky at bottom — never requires scroll to find it
- KnowledgePanel collapses to accordion on mobile
- ReadinessSnapshot items animate green (✓) when field is filled

---

## Template 4 — Tool Page · Phase 2: Progress

Focused view — no setup form. Full attention on execution.

```
DESKTOP ─────────────────────────────────────────────────────────────────

┌─ PageHeader ──────────────────────────────────────────────────────────┐
│  Q3 Campaign > Blog Post > In corso                    [✕ Annulla]     │
└───────────────────────────────────────────────────────────────────────┘

┌─ Progress Global ─────────────────────────────────────────────────────┐
│  Step 2 di 3  ████████████████████████░░░░░░░░  66%                    │
│  Tempo: 00:45                                                           │
└───────────────────────────────────────────────────────────────────────┘

┌─ Step Cards ──────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ ✅  Step 1 · Analisi SEO                      Completato · 00:18  │  │
│  │     "Parole chiave ad alto volume identificate: AI, marketing…"  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ ◐  Step 2 · Struttura Articolo              In corso… · pulsante  │  │
│  │    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░ (pulsating skeleton)             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ ○  Step 3 · Articolo Finale                              In attesa│  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└───────────────────────────────────────────────────────────────────────┘

MOBILE ──────────────────────────────────────────────────────────────────

┌─────────────────────────────┐
│ Blog Post · In corso  [✕]   │
├─────────────────────────────┤
│ Step 2/3  ████████░░░  66%  │
│ Tempo: 00:45                │
├─────────────────────────────┤
│ ✅ Analisi SEO  00:18       │
│   "Parole chiave…"          │
│                             │
│ ◐ Struttura Articolo        │
│   ░░░░░░░░░░░░░░░           │
│                             │
│ ○ Articolo Finale           │
│   In attesa                 │
└─────────────────────────────┘
```

**Progress rules:**
- Completed steps show first 150 chars of artifact (curiosity driver, Forest-like reward)
- Active step has pulsating skeleton to show liveness
- Progress bar uses `--workspace-accent`
- Elapsed time updates every second
- "Annulla" is visible but secondary (error-colored, not dominant)

---

## Template 5 — Tool Page · Phase 3: Result

Completion state — the most satisfaction-driven screen. KPI #3 pivot.

```
DESKTOP ─────────────────────────────────────────────────────────────────

┌─ PageHeader ──────────────────────────────────────────────────────────┐
│  Q3 Campaign > Blog Post > Risultato                                    │
└───────────────────────────────────────────────────────────────────────┘

┌─ Completion Banner (celebratory) ─────────────────────────────────────┐
│  ✅  Completato in 1:23  ·  3 step  ·  1 credito utilizzato            │
│      (subtle confetti animation on first render)                       │
└───────────────────────────────────────────────────────────────────────┘

┌─ Artifact Preview ────────────────────────────────────────────────────┐
│  # AI nel Marketing B2B: 10 Strategie per il 2026                      │
│                                                                         │
│  L'intelligenza artificiale sta trasformando il modo in cui le         │
│  aziende B2B acquisiscono clienti. In questo articolo…                 │
│  [Mostra tutto ▼]                                                       │
└───────────────────────────────────────────────────────────────────────┘

┌─ Azioni Primarie ─────────────────────────────────────────────────────┐
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  ⬆  Promuovi a Blog Post Asset         ← contained, accent CTA  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  [⬇ Scarica .docx]  [⬇ Scarica .pdf]  [⬇ Scarica .md]               │
│                                                                         │
│  [↺ Nuova Generazione]  [← Torna al Workspace]                         │
│                                                                         │
└───────────────────────────────────────────────────────────────────────┘

MOBILE ──────────────────────────────────────────────────────────────────

┌─────────────────────────────┐
│ ✅ Completato in 1:23       │
├─────────────────────────────┤
│ # AI nel Marketing B2B      │
│ L'intelligenza artificiale  │
│ sta trasformando…           │
│ [Mostra tutto ▼]            │
├─────────────────────────────┤
│ [⬆ Promuovi ad Asset]       │  ← full-width, accent
│                             │
│ [⬇ .docx] [⬇ .pdf] [⬇ .md] │
│                             │
│ [↺ Nuova generazione]       │
└─────────────────────────────┘
```

**Result rules (KPI #3 enforcement):**
- "Promuovi ad Asset" is **always** `variant="contained"` — never `outlined` or `text`
- The button is **above** the download options (first action, not last)
- If `tool.produces === undefined`, the Promote button is hidden (content tools)
- Completion banner animation plays once on mount (CSS `@keyframes`, respects `prefers-reduced-motion`)
- Promote → opens inline confirmation with asset name, then fades card to "Promosso ✓"

---

## Template 6 — Session Detail

Full-page view accessible from SessionList "View" CTA.

```
┌─ PageHeader ──────────────────────────────────────────────────────────┐
│  Q3 Campaign > Sessions > Blog Post · 30/07 14:32                      │
└───────────────────────────────────────────────────────────────────────┘

┌─ Status Banner ───────────────────────────────────────────────────────┐
│  ✅ Completato · 3 step · 1:23 · 30/07/2026 14:32                      │
└───────────────────────────────────────────────────────────────────────┘

┌─ Timeline ────────────────────────────────────────────────────────────┐
│  ●──────────────────────────────────────────────────────── ●           │
│  Start                                                   Fine           │
│  14:30:52                                             14:32:15          │
│                                                                         │
│  ✅ 14:30:52  Step 1 · Analisi SEO                             00:18   │
│               └ [Vedi output ▼]                                         │
│  ✅ 14:31:10  Step 2 · Struttura Articolo                      00:42   │
│               └ [Vedi output ▼]                                         │
│  ✅ 14:31:52  Step 3 · Articolo Finale                         00:23   │
│               └ [Vedi output ▼]                                         │
└───────────────────────────────────────────────────────────────────────┘

┌─ Azioni ──────────────────────────────────────────────────────────────┐
│  [⬆ Promuovi ad Asset]  [⬇ Scarica .docx]  [⬇ .pdf]  [⬇ .md]       │
└───────────────────────────────────────────────────────────────────────┘

── Failed state variant ─────────────────────────────────────────────────

┌─ Status Banner (error) ───────────────────────────────────────────────┐
│  ❌ Fallito al Step 2 · Struttura Articolo                              │
│  Errore: Il servizio LLM non ha risposto entro il timeout.             │
└───────────────────────────────────────────────────────────────────────┘

┌─ Azioni (error) ──────────────────────────────────────────────────────┐
│  [↺ Riprova con gli stessi input]  [← Torna alla lista]               │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Template 7 — Assets

Full-page asset management with filter and grid.

```
┌─ PageHeader ──────────────────────────────────────────────────────────┐
│  Q3 Campaign > Assets                                  [+ Nuovo Asset]  │
└───────────────────────────────────────────────────────────────────────┘

┌─ Filter Bar ──────────────────────────────────────────────────────────┐
│  [Tutti ▼]  [Brand Voice]  [Brief]  [Persona]  [Angle]  [Ad Copy]      │
│  [Generati]  [Caricati]  [Manuali]                                      │
└───────────────────────────────────────────────────────────────────────┘

┌─ Asset Grid ──────────────────────────────────────────────────────────┐
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐  │
│  │ 🎙 Brand Voice     │  │ 📋 Brief           │  │ 👤 Buyer Persona  │  │
│  │ Generato · 28/07  │  │ Caricato · 25/07  │  │                   │  │
│  │                   │  │                   │  │   Nessun asset    │  │
│  │ "Il tono di…"     │  │ "Campagna Q3…"    │  │   [Genera →]      │  │
│  │                   │  │                   │  │                   │  │
│  │ [View] [Delete]   │  │ [View] [Delete]   │  │                   │  │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘  │
│                                                                         │
│  ┌───────────────────┐  ┌───────────────────┐                          │
│  │ 🎯 Angle           │  │ 📢 Ad Copy        │                          │
│  │                   │  │                   │                          │
│  │   Nessun asset    │  │   Nessun asset    │                          │
│  │   [Genera →]      │  │   [Genera →]      │                          │
│  └───────────────────┘  └───────────────────┘                          │
└───────────────────────────────────────────────────────────────────────┘
```

**Assets rules:**
- Missing asset slots are shown with [Genera →] CTA (not just "empty")
- Each asset type always shows a card slot, even if empty (coverage visualisation)
- "Genera →" deeplinks to the corresponding tool page with workspace pre-selected

---

## Template 8 — Shared States

Applied to every data-loading context.

```
── Loading (Skeleton) ───────────────────────────────────────────────────

┌──────────────────────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░  (title skeleton)                            │
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │
│  │ ░░░░░░░░░░░░░░░░ │  │ ░░░░░░░░░░░░░░░░ │  │ ░░░░░░░░░░░░░░░░ │    │
│  │ ░░░░░░░░░░       │  │ ░░░░░░░░░░       │  │ ░░░░░░░░░░       │    │
│  │ ░░░░░░           │  │ ░░░░░░           │  │ ░░░░░░           │    │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘

── Empty ────────────────────────────────────────────────────────────────

┌──────────────────────────────────────────────────────────────────────┐
│                                                                        │
│                          [ 📭 icon ]                                   │
│                                                                        │
│              Nessuna sessione                                          │
│              Avvia il tuo primo tool per iniziare                      │
│                                                                        │
│                  [⚡ Nuova Generazione]                                │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘

── Error ────────────────────────────────────────────────────────────────

┌──────────────────────────────────────────────────────────────────────┐
│                                                                        │
│                          [ ⚠ icon ]                                   │
│                                                                        │
│              Errore di caricamento                                     │
│              Controlla la connessione e riprova                        │
│                                                                        │
│                  [↺ Riprova]                                           │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

**Shared state rules:**
- Every view that fetches data implements all 4 states: loading → empty → error → data
- Empty state always has a **contextual CTA** — never a dead end
- Error state always has a **retry action** — never just a message
- Skeleton shapes match the actual data layout (not generic bars)

---

## Interaction Patterns

| Pattern | Behaviour |
|---------|-----------|
| **Workspace switch** | Re-injects `--workspace-accent`; re-fetches workspace data; sidebar accent dot updates |
| **Session complete** | Confetti micro-animation (one-shot, `prefers-reduced-motion` respected) |
| **Readiness fill** | Readiness row animates ✗→✓ with green fill when field is satisfied |
| **Promote confirm** | Inline confirmation expands in card (no modal); confirms with accent button |
| **Step complete** | Step card animates from skeleton to content with `ease-out 300ms` |
| **Error state** | Toast notification (bottom-left) + ErrorState component replace content |
| **CTA disabled** | Never silently disabled — always accompanied by visible reason |

---

## Template 11 — Player Profile (`/profile`)

Full-page gamification profile. Accessible from sidebar gamification zone click.

```
DESKTOP ─────────────────────────────────────────────────────────────────

┌─ PageHeader ──────────────────────────────────────────────────────────┐
│  Profile                                                                 │
└───────────────────────────────────────────────────────────────────────┘

┌─ Level Card ──────────────────────────────────────────────────────────┐
│                                                                         │
│  L4 · Specialist                                                        │
│  ██████████████████████████████░░░░░░░  2,450 / 5,000 XP  (49%)        │
│                                                                         │
│  🔥 Current streak: 12 days    ·    Longest streak: 18 days            │
│                                                                         │
└───────────────────────────────────────────────────────────────────────┘

┌─ Badges (6 unlocked) ─────────────────────────────────────────────────┐
│                                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│  │ ⭐        │ │ 🏗️        │ │ 🔥        │ │ 🧭        │                  │
│  │First Light│ │Getting    │ │Weekly     │ │Tool       │                  │
│  │Common     │ │Started    │ │Warrior    │ │Explorer   │                  │
│  │12/07/26   │ │Rare       │ │Rare       │ │Rare       │                  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                  │
│  ┌──────────┐ ┌──────────┐                                             │
│  │ 🤖        │ │ 🎯        │                                             │
│  │AI Appren. │ │Brand Ready│                                             │
│  │Rare       │ │Rare       │                                             │
│  │15/07/26   │ │20/07/26   │                                             │
│  └──────────┘ └──────────┘                                             │
│                                                                         │
└───────────────────────────────────────────────────────────────────────┘

┌─ In Progress ─────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐                                    │
│  │  ⬤ 8/11       │  │  ⬤ 82/100    │                                    │
│  │  👑           │  │  ⚡           │                                    │
│  │ Tool Master  │  │ Power User   │                                    │
│  │ Epic  +50 cr │  │ Legendary    │                                    │
│  │              │  │    +100 cr   │                                    │
│  └──────────────┘  └──────────────┘                                    │
│                                                                         │
└───────────────────────────────────────────────────────────────────────┘

┌─ Stagione Attuale — Summer Scale Q3 2026 ─────────────────────────────┐
│                                                                         │
│  XP stagionale: 1,240    ·    Rank workspace Q3 Campaign: #2           │
│                                                                         │
│  Badge stagionali:                                                      │
│  ┌──────────┐                                                           │
│  │ ❄️        │                                                           │
│  │Frostbite  │                                                           │
│  │Q1 2026    │                                                           │
│  └──────────┘                                                           │
│                                                                         │
└───────────────────────────────────────────────────────────────────────┘

┌─ Impostazioni ────────────────────────────────────────────────────────┐
│                                                                         │
│  Streak mode:  ○ Daily    ● Business days (Mon–Fri)                    │
│                                                                         │
└───────────────────────────────────────────────────────────────────────┘


MOBILE ──────────────────────────────────────────────────────────────────

┌─────────────────────────────┐
│ Profile                     │
├─────────────────────────────┤
│ L4 · Specialist             │
│ ████████████████░░  49%     │
│ 🔥 12 days · Longest 18     │
├─────────────────────────────┤
│ BADGES (6)                  │
│ ┌─────────┐ ┌─────────┐    │
│ │ ⭐       │ │ 🏗️       │    │
│ │First    │ │Getting  │    │
│ │Light    │ │Started  │    │
│ │Common   │ │Rare     │    │
│ └─────────┘ └─────────┘    │
│ ┌─────────┐ ┌─────────┐    │
│ │ 🔥       │ │ 🧭       │    │
│ │Weekly   │ │Tool     │    │
│ │Warrior  │ │Explorer │    │
│ └─────────┘ └─────────┘    │
├─────────────────────────────┤
│ IN PROGRESS                 │
│ ⬤ 8/11  👑 Tool Master     │
│ ⬤ 82/100 ⚡ Power User     │
├─────────────────────────────┤
│ Q3 Summer Scale             │
│ 1,240 XP · #2 in workspace  │
├─────────────────────────────┤
│ ○ Daily  ● Business days    │
└─────────────────────────────┘
```

**Profile page rules:**
- Badge cards: 2 columns on desktop (4 per row), 2 columns on mobile. `borderRadius: md (8px)`, `boxShadow: xs`.
- Badge cards use `rarity.*` tokens for border color. Text label below badge name.
- In-progress badges: greyed-out card with `CircularProgress` ring. `variant="determinate"`, `size={40}`, `thickness={3}`.
- Streak mode toggle: MUI `Switch` + `FormControlLabel`. Change takes effect next streak day.
- Page uses 4-state pattern: `LoadingSkeleton variant="profile"` → data.

## Sources

- [[Frontend Architecture]] — component inventory and routing
- [[Tool UX Architecture]] — 4-phase lifecycle, always-on information pattern
- [[ToolPage Machine (XState v5)]] — state derivation and CTA policy
- [[Tool UX Architecture]] — readiness reason codes and display contract
- [[Session List - Live Status]] — session card states
- [[sources/PRD]] — FR-U01 to FR-U11 (UI functional requirements)
- [[Agent Chat UX]] — Templates 9–10: Team Hub and Conversation View (full wireframe specs)
