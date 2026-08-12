---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/frontend
  - wiki/ux
  - wiki/design
date_updated: 2026-08-12
source_count: 6
confidence: high
resolution: pending — plan approved, implementation deferred
---

# Generation UX/UI Refinement Plan

> Post-structural fix: UX flow simplification + UI visual refinement  
> Co-designed by design-ux-architect + design-ui-designer

## Context

After the structural SSE wiring fix ([[synthesis/generation-sse-wiring-remediation-2026-08-12|13 files, ~110 lines]]), the generation flow is functionally correct but has UX/UI inefficiencies: unnecessary redirects, redundant loading states, visual jumps between states, and disconnected progress/results presentation.

## UX Flow Simplification (design-ux-architect)

### Problem: Unnecessary redirect after submit

**Current flow**:
```
ToolPageLayout (setup) → POST → redirect → SessionPage (progress) → SessionPage (results)
```

The redirect causes: page unmount/mount, SSE disconnect/reconnect, stale REST "queued" then SSE "running" visual jump, blocking spinner with no info.

**Proposed: Single-page inline generation**
```
ToolPageLayout (setup) → POST → InlineSessionTracker (prep → progress → results)
           ↑ "Nuova generazione" resets form in-place
```

### Design: InlineSessionTracker component (new)

**File**: `apps/frontend/src/components/tool/InlineSessionTracker.tsx` (new, ~130 lines)

A wrapper component that renders the entire lifecycle on the same page using `useSession`:

```
Phase 1: "Preparazione in corso..." (indeterminate bar, ~1-3s)
    ↓ SSE session_started
Phase 2: <FeedbackPanel /> (step progress, elapsed timer)
    ↓ SSE session_completed
Phase 3: <SessionSummary /> (artifacts, download, promote)
```

**Key behavioral changes**:

| Aspect | Before | After |
|--------|--------|-------|
| Submit → progress | Redirect to new page | Inline component appears on same page |
| Preparation phase | "Generazione in elaborazione" alert on SessionPage | "Preparazione in corso..." bar on tool page |
| Progress phase | FeedbackPanel on separate route | FeedbackPanel on same page, no SSE reconnect |
| Results phase | SessionSummary on separate route | SessionSummary inline below progress |
| New generation | Navigate back to tool page | Dispatch RESET to XState machine, form appears in-place |
| Page refresh | Session lost, must navigate to /sessions/:id | URL carries `?s=sessionId`, InlineSessionTracker resumes via useSession |

### Machine changes: Zero required

The `toolPageMachine` stays with its 5 states. The UI layer changes how it interprets `submitted`:

```typescript
// deriveUIState:
if (v === 'submitted') return 'generating';  // was: 'submitting' (redirect trigger)
```

The `RESET` event in `submitted` state (already added in the structural fix) powers the "Nuova generazione" button.

### Deep-linking strategy

| URL | Behavior |
|-----|----------|
| `/workspaces/:ws/tools/:key` | Setup form (no session) |
| `/workspaces/:ws/tools/:key?s=:sessionId` | Inline session view |
| `/workspaces/:ws/sessions/:sessionId` | Standalone SessionPage (unchanged) |

`replaceState` updates URL without page reload. On page refresh, `?s=` is read from URL params.

### Files changed

| File | Change | Lines |
|------|--------|-------|
| `ToolPageLayout.tsx` | Remove redirect `useEffect`, add `generating` UI state, add URL `replaceState` | -8, +25 |
| `InlineSessionTracker.tsx` | NEW — renders FeedbackPanel → SessionSummary lifecycle | +130 |
| `derive-ui-state.ts` | `'submitted' → 'generating'` | ~2 |
| `derive-ui-state.test.ts` | Update test expectation | ~3 |
| `ToolPageLayout.test.tsx` | Replace `navigate()` assertion with inline UI assertion | ~10 |

**SessionPage.tsx remains untouched** — continues to work for direct navigation, shared links, and cross-tab access.

---

## UI Visual Refinement (design-ui-designer)

### Problem: Visual jumps and disconnected surfaces

The current UI has 3-4 sequential loading states with abrupt visual replacements:
- ToolPageLayout "Submitting..." spinner → SessionPage loading skeleton → "Queued" alert → FeedbackPanel

### Solution: Single continuous surface via GenerationSlot wrapper

**File**: `apps/frontend/src/components/tool/GenerationSlot.tsx` (new, ~80 lines)

A wrapper that owns the transition between FeedbackPanel and SessionSummary:

```tsx
<Box sx={{ position: 'relative', minHeight: 200 }}>
  {/* Progress: always in DOM, fades out on completion */}
  <Box sx={{ opacity: isTerminal ? 0 : 1, visibility: isTerminal ? 'hidden' : 'visible',
    transition: 'opacity 400ms ease-out, visibility 0s 400ms' }}>
    <FeedbackPanel ... />
  </Box>

  {/* Completion banner: fades in after progress fades out */}
  {isCompleted && <CompletionBanner animation="fadeSlideUp" />}

  {/* Results: fades in with 300ms stagger after banner */}
  {isCompleted && <SessionSummary animation="fadeSlideUp 300ms delay" />}
</Box>
```

**Accessibility**: FeedbackPanel stays in DOM with `visibility: hidden` (not `display: none`) during transition so screen readers don't lose the live region mid-announcement.

### Enhanced FeedbackPanel states

#### Queued/starting state (unified)

```tsx
if (!progress) {
  const isQueued = status === 'queued' || status === 'draft';

  return (
    <Box textAlign="center" py={4}>
      {totalSteps > 1 && <Chip label={`${totalSteps} steps`} />}
      <LinearProgress width="60%" aria-label="In attesa di elaborazione..." />
      <Typography>{isQueued ? queuedMessage : startingMessage}</Typography>
    </Box>
  );
}
```

This absorbs three separate loading states (ToolPageLayout submitting, SessionPage loading skeleton, SessionPage queued alert) into one unified surface.

#### Side-by-side layout (new `layoutMode` prop)

```
┌─────────────────────────────────────────────────────────┐
│ Progress  2/5                          ◐ 01:23          │
│ ████████░░░░░░░░░░░░░░░░░░ 40%                          │
│                                                         │
│ ┌── Steps (40%) ───────┬── Live Preview (60%) ──────┐   │
│ │ ✅ Step 1: Estrazione │ Questo è il contenuto       │   │
│ │ ◐ Step 2: Analisi     │ generato live dallo step   │   │
│ │ ○ Step 3: Stesura     │ corrente...                 │   │
│ │ ○ Step 4: Revisione   │                             │   │
│ │ ○ Step 5: Finale      │                             │   │
│ └───────────────────────┴─────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

On mobile (`xs`), collapses to stacked via `flexDirection: { xs: 'column', md: 'row' }`.

### Shared animation keyframes

**File**: `apps/frontend/src/shared/animations.ts` (new, ~40 lines)

Extract scattered keyframes from 4 components:

| Keyframe | Use | Duration | Origin |
|----------|-----|----------|--------|
| `slideInFade` | Step indicators (completed) | 300ms | FeedbackPanel (existing) |
| `stepPulse` | Step indicators (active) | 1.5s infinite | FeedbackPanel (existing) |
| `fadeSlideUp` | CompletionBanner, SessionSummary, ErrorState | 500ms | New (centralized) |
| `fadeSlideDown` | FeedbackPanel exit | 400ms | New (centralized) |

All respect `@media (prefers-reduced-motion: reduce) { animation: none; }`.

### Transition timeline (running → completed)

```
t=0     SSE session_completed fires
t=0ms   FeedbackPanel opacity: 1→0 (400ms ease-out)
t=400ms FeedbackPanel visibility: hidden
t=400ms CompletionBanner fadeSlideUp (500ms ease-out)
t=900ms SessionSummary fadeSlideUp (500ms, 300ms delay)
t=1.2s  All animations complete
```

### RunningCard visual alignment

Alignment with FeedbackPanel visual tokens:

| Token | Before | After |
|-------|--------|-------|
| Progress bar height | 6px | **8px** (matches FeedbackPanel) |
| Progress bar radius | 3 | **4** (matches FeedbackPanel) |
| Completed icon | None | **CheckCircleIcon green** (matches FeedbackPanel StepIndicator) |
| Elapsed time | Plain text | **`role="timer"`** (matches FeedbackPanel) |

### CompletionBanner wiring

**File**: `apps/frontend/src/components/shared/CompletionBanner.tsx` (existing, used)

Currently unused — `GenerationSlot` renders it between FeedbackPanel fadeOut and SessionSummary fadeIn. Gradient endpoint `#0E7490` must be verified against WCAG 2.1 AA contrast.

### New copy keys required

**File**: `packages/copy/src/it/tool-page.ts`

```typescript
'progress.queued':            'In attesa di elaborazione...',
'progress.queuedHint':        'La generazione inizierà a breve.',
'progress.waitingForContent': 'Il contenuto apparirà qui man mano che viene generato...',
'progress.livePreviewAria':   'Anteprima live del contenuto in generazione',
```

---

## Unified Implementation Roadmap

### Phase 1: Shared infrastructure (low risk, no behavioral changes)

| File | Change | Lines |
|------|--------|-------|
| `shared/animations.ts` | NEW — centralized keyframes | +40 |
| `shared/session-utils.ts` | Already exists from structural fix | 0 |
| `packages/copy/src/it/tool-page.ts` | +4 new copy keys | +4 |

### Phase 2: FeedbackPanel enhancements (medium risk, opt-in features)

| File | Change | Lines |
|------|--------|-------|
| `FeedbackPanel.tsx` | +`layoutMode` prop, +`totalSteps` prop, enhanced queued state, side-by-side layout | +55 |
| `RunningCard.tsx` | Visual token alignment (height, radius, icon, role) | +10 |
| `FeedbackPanel.test.tsx` | Tests for queued state, side-by-side mode | +20 |

### Phase 3: GenerationSlot + SessionPage restructure (medium risk)

| File | Change | Lines |
|------|--------|-------|
| `GenerationSlot.tsx` | NEW — crossfade wrapper | +80 |
| `SessionPage.tsx` | Remove LoadingSkeleton/Alert, use GenerationSlot. Simplify to ~120 lines | -60, +30 |
| `GenerationSlot.test.tsx` | NEW — 5 test cases | +60 |
| `SessionPage.test.tsx` | Update vanished assertions | +15 |

### Phase 4: Inline generation on tool page (highest UX impact)

| File | Change | Lines |
|------|--------|-------|
| `InlineSessionTracker.tsx` | NEW — replaces SessionPage redirect with inline lifecycle | +130 |
| `ToolPageLayout.tsx` | Remove redirect, add URL replaceState, add `generating` UI state | -8, +25 |
| `derive-ui-state.ts` | `'submitted' → 'generating'` | ~2 |
| `derive-ui-state.test.ts` | Update expectation | ~3 |
| `ToolPageLayout.test.tsx` | Replace `navigate()` assertion | ~10 |

### Totals

| Category | Count |
|----------|-------|
| New files | 3 (`animations.ts`, `GenerationSlot.tsx`, `InlineSessionTracker.tsx`) |
| Modified files | 9 |
| New tests | ~80 lines (GenerationSlot 60 + FeedbackPanel 20) |
| Copy keys | 4 new |
| Net lines | ~+450 total |

### Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Both tool page AND SessionPage exist for same session → 2 SSE connections | Low | SSE read-only, SSEClient handles cleanup on unmount |
| Page refresh mid-generation → state lost | Low | URL carries `?s=sessionId`, InlineSessionTracker resumes via useSession |
| ToolPageLayout test breakage | High | Update assertion from `navigate()` to inline UI rendering |
| CompletionBanner gradient contrast | Medium | Verify `#0E7490` on white with color-contrast-checker |
| Long-running sessions → user stuck on tool page | Low | SessionPage still exists as fallback; user can navigate away and return |

## Sources

- [[synthesis/generation-sse-wiring-remediation-2026-08-12]] — Structural SSE fix (prerequisite)
- [[ToolPage Machine (XState v5)]] — Machine driving tool page lifecycle
- [[Tool UX Architecture]] — Tool page UX spec
- [[Frontend Architecture]] — Component inventory and routing
- [[Session List - Live Status]] — SessionList card components
- [[API Client + SSE Client]] — SSE consumption hooks

---

## Engineering Review — Corrections and Improvements

> Review pass: codice sorgente verificato, 7 spazi di miglioramento identificati.

### Correction 1: `derive-ui-state.ts` non esiste come file separato

Il piano fase 4 cita `derive-ui-state.ts` e `derive-ui-state.test.ts` come file da modificare. **La funzione `deriveUIState` è inlined in `ToolPageLayout.tsx` righe 21-29**, non è un modulo separato. Il piano deve aggiornare la tabella file fase 4:

```
❌ derive-ui-state.ts → ~2 lines
❌ derive-ui-state.test.ts → ~3 lines

✅ ToolPageLayout.tsx riga 27: 'submitted' → 'submitting' cambia in 'generating'
   (già incluso nell'entry ToolPageLayout della tabella — nessun file aggiuntivo)
```

**Impact**: riduzione di 2 file dal conteggio totale.

---

### Improvement 1: Eliminare il loading flash in InlineSessionTracker

Il piano prevede che `InlineSessionTracker` chiami `useSession(sessionId)` che parte con `loading: true` — mostrando un breve spinner prima di avere dati. Ma `state.context.session` nel machine context **già contiene il `SessionDTO` completo** restituito dalla risposta POST. Non è necessaria una seconda REST call al mount.

**Fix**: passare `initialSession` come prop a `InlineSessionTracker` e usarla per il seed iniziale di `useSession`:

```tsx
// ToolPageLayout.tsx — nella generazione UI:
{uiState === 'generating' && session?.id && (
  <InlineSessionTracker
    sessionId={session.id}
    initialSession={session}   // ← dalla machine context, già disponibile
    ...
  />
)}
```

```tsx
// InlineSessionTracker.tsx — hook call:
const { session: liveSession, progress, stepArtifacts, loading, error } =
  useSession(sessionId, props.initialSession);   // ← seed iniziale

// useSession hook — aggiunta del parametro opzionale:
export function useSession(
  sessionId: string | null,
  initialData?: SessionDTO,   // ← nuovo parametro opzionale
) {
  const [session, setSession] = useState<SessionDTO | null>(initialData ?? null);
  const [loading, setLoading] = useState(initialData == null);  // ← false se già abbiamo dati
```

**UX impact**: zero flash "Preparazione in corso..." tra submit e tracker. Il tracker appare già con status `queued`/`running` corretto.

**Blast radius**: `useSession` in `hooks.ts` (+2 righe opzionali), `InlineSessionTracker.tsx` (+1 prop).

---

### Improvement 2: Fix del live preview nel layout side-by-side (bug)

Il piano propone di mostrare il contenuto dello step attivo nel pannello destro con:

```tsx
// ❌ Proposto dal UI designer — ERRATO
const activeArtifact = artifacts.find(a => a.stepNumber === progress.current + 1);
```

`progress.current` è il numero di step **completati** (es. `1` dopo il primo step). `progress.current + 1` punta all'artifact dello step successivo — che non esiste ancora perché è in corso. Il risultato è sempre `undefined`, il pannello mostrerebbe sempre "Il contenuto apparirà qui...".

**Fix**: mostrare l'**ultimo artifact completato** (il più recente disponibile):

```tsx
// ✅ Corretto
const latestCompletedArtifact = artifacts.length > 0
  ? artifacts[artifacts.length - 1]
  : null;

// Label aggiornato:
<Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
  {copy.t('toolPage.progress.lastCompletedStep', { step: String(latestCompletedArtifact?.stepNumber) })}
</Typography>
```

Copy key aggiuntiva: `'progress.lastCompletedStep': 'Ultimo step completato ({step})'`.

**UX impact**: il pannello destro mostra contenuto reale durante la generazione invece di un placeholder permanente.

---

### Improvement 3: Cancel button in InlineSessionTracker (gap critico)

Il piano non menziona un cancel button per l'inline generation. Nella sessione corrente il cancel è in `SessionPage` — ma se l'utente non viene reindirizzato lì, perde la capacità di annullare una generazione in corso.

**Fix**: aggiungere cancel button in `InlineSessionTracker` quando `status === 'running'`:

```tsx
// InlineSessionTracker.tsx — nella fase running:
{isRunning && (
  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
    <Button
      variant="outlined"
      color="error"
      size="small"
      startIcon={<CancelIcon />}
      onClick={handleCancel}
      disabled={cancelling}
      aria-label={copy.t('toolPage.cta.cancel')}
    >
      {cancelling ? copy.t('shared.actions.cancelling') : copy.t('shared.actions.cancel')}
    </Button>
  </Box>
)}
```

`handleCancel` chiama `api.cancelSession(sessionId)` — lo stesso pattern di `SessionPage.tsx:47-57`.

**UX impact**: l'utente mantiene il controllo sulla generazione senza dover navigare a SessionPage.

---

### Improvement 4: Pulizia URL su RESET

Il piano aggiorna l'URL a `?s=sessionId` via `replaceState` dopo il submit, ma non pulisce il parametro quando l'utente clicca "Nuova generazione" (che invia `RESET` al machine). Al mount successivo, il componente vedrebbe `?s=vecchioId` nell'URL e renderebbe il vecchio `InlineSessionTracker` prima che il machine si reinizializzi.

**Fix**: aggiungere un effect che pulisce l'URL quando il machine torna a un state non-submitted:

```tsx
// ToolPageLayout.tsx — effetto URL:
useEffect(() => {
  if (state.matches('submitted') && session?.id) {
    const query = replayed ? `?s=${session.id}&replayed=true` : `?s=${session.id}`;
    window.history.replaceState(null, '', `${window.location.pathname}${query}`);
  }
  // Pulisci ?s= quando il machine lascia submitted (RESET)
  if (!state.matches('submitted') && !state.matches('submitting')) {
    const url = new URL(window.location.href);
    if (url.searchParams.has('s')) {
      url.searchParams.delete('s');
      url.searchParams.delete('replayed');
      window.history.replaceState(null, '', url.pathname);
    }
  }
}, [state, session?.id, workspaceId, replayed]);
```

**UX impact**: back button e refresh si comportano correttamente dopo "Nuova generazione".

---

### Improvement 5: Toast "Generazione avviata" via ToastSystem esteso

Il `ToastSystem` esistente ha solo `showLevelUp` e `showLuckyBonus`. Per implementare la "conferma preparazione da notifica toast" richiesta, serve un tipo di toast generico `showInfo`. Il pattern è già consolidato — aggiungere un terzo tipo è minimo:

```tsx
// ToastSystem.tsx — aggiungere:
interface Toast {
  id: number;
  type: 'level-up' | 'lucky-bonus' | 'info';   // ← aggiunto
  data: { level?: number; label?: string; amount?: number; message?: string };
}

interface ToastContextValue {
  showLevelUp: ...;
  showLuckyBonus: ...;
  showInfo: (message: string, duration?: number) => void;  // ← aggiunto
}

const showInfo = useCallback((message: string, duration = 3000) => {
  const id = nextId++;
  setToasts((prev) => [...prev, { id, type: 'info', data: { message } }]);
  setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
}, []);

// Render nel ToastProvider:
t.type === 'info' && (
  <Alert key={t.id} severity="success" variant="filled" sx={{ mb: 1 }}>
    {t.data.message}
  </Alert>
)
```

**Utilizzo in ToolPageLayout** quando la macchina entra in `submitted`:

```tsx
const { showInfo } = useToast();

useEffect(() => {
  if (state.matches('submitted')) {
    showInfo(copy.t('toolPage.generation.started'));  // "Generazione avviata"
  }
}, [state.matches('submitted')]);
```

Copy key: `'toolPage.generation.started': 'Generazione avviata'`.

**UX impact**: feedback immediato nell'angolo dello schermo al momento del click — l'utente percepisce l'azione registrata prima che il UI cambi.

---

### Improvement 6: GenerationSlot — overflow fix per posizionamento

Il piano usa `position: absolute; inset: 0` per nascondere FeedbackPanel durante la crossfade. Questo collassa l'altezza del container parent (che ha solo `minHeight: 200`) mentre i risultati si renderizzano — l'utente potrebbe vedere un salto di layout durante il fade-in di SessionSummary.

**Fix più pulito**: usare il **CSS grid trick** per la transizione di altezza senza `position: absolute`:

```tsx
// ✅ Invece di position: absolute + inset: 0:
<Box
  sx={{
    display: 'grid',
    gridTemplateRows: isTerminal ? '0fr' : '1fr',
    overflow: 'hidden',
    transition: 'grid-template-rows 400ms ease-out',
    opacity: isTerminal ? 0 : 1,
    transition: 'grid-template-rows 400ms ease-out, opacity 400ms ease-out',
    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
  }}
>
  <Box sx={{ minHeight: 0, overflow: 'hidden' }}>
    <FeedbackPanel ... />
  </Box>
</Box>
```

Questo collassa FeedbackPanel a `height: 0` animato mentre la opacity scende — nessun salto di layout perché il flow document si riduce gradualmente.

**Note**: il `aria-live` rimane funzionale perché l'elemento è nel DOM ma con `visibility` gestito dall'opacity. Per screen reader sicuri, aggiungere `aria-hidden={isTerminal}` sull'outer Box.

**UX impact**: transizione completamento senza layout jump.

---

### Risk Resolved: CompletionBanner gradient contrast

Il piano marca il contrasto di `#0E7490` su bianco come "Medium risk da verificare". **Verifica eseguita**: rapporto `5.36:1` → **WCAG 2.1 AA PASS** (normale e grassetto). Il rischio è risolto — nessuna modifica necessaria alla palette CompletionBanner.

---

### Riepilogo correzioni e impatto

| # | Tipo | File impattato | UX impact |
|---|------|---------------|-----------|
| C1 | Correzione | tabella roadmap fase 4 | Rimozione 2 file non esistenti |
| I1 | Improvement | `hooks.ts` (+2), `InlineSessionTracker.tsx` (+1 prop) | Elimina loading flash post-submit |
| I2 | Bug fix | `FeedbackPanel.tsx` — live preview logic | Preview mostra contenuto reale |
| I3 | Improvement | `InlineSessionTracker.tsx` (+cancel) | Utente può annullare inline |
| I4 | Improvement | `ToolPageLayout.tsx` (~10 lines) | URL corretta dopo RESET |
| I5 | Improvement | `ToastSystem.tsx` (+showInfo), `tool-page.ts` (+1 key) | Feedback immediato su submit |
| I6 | Improvement | `GenerationSlot.tsx` — grid trick | No layout jump in crossfade |
| R1 | Risk closed | nessuno — solo documentazione | Contrasto gradient verificato |

**Net delta rispetto al piano originale**: +4 file modificati (hooks.ts, InlineSessionTracker, ToolPageLayout, ToastSystem), -2 file fantasma (derive-ui-state.ts e test), +1 copy key. Nessuna variazione alle fasi o all'architettura.
