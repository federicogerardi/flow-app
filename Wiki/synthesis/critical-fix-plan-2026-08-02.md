---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/implementation-plan
  - wiki/critical-fix
date_updated: 2026-08-02
confidence: high
status: executed
---

# Critical Findings — Implementation Plan (2026-08-02)

**Source review**: [[code-review-2026-08-02]]
**Roadmap reference**: [[implementation-roadmap-2026-08-01]]
**Scope**: 8 critical findings (C1–C8), 27 files touched, estimated 4–5 hours

---

## Overview

Close all 8 critical findings from the multi-agent code review. Findings span 4 layers:
- **Backend runtime** (C1, C2, C6) — crash risk, data loss, broken API contracts
- **Frontend architecture** (C3, C7, C8) — broken responsive layout, no error recovery, React render violation
- **Design tokens** (C4, C5) — WCAG accessibility failure, static theme

The fixes are grouped into 3 phases by risk and dependency: **Quick Wins** (C1, C4, C5, C8) can all ship in one commit; **Frontend Architecture** (C3, C7) share `AppShell.tsx` and `App.tsx`; **Data Integrity** (C2, C6) touch domain + persistence + API layers.

---

## Files Modified (27 total)

| Phase | Files | Risk |
|-------|-------|------|
| Phase 1: Quick Wins | 4 files (auth-routes, tokens, ThemeProvider, LoginPage) | Low |
| Phase 2: Frontend Architecture | 4 new + 2 modified (ErrorBoundary, AppShell, App.tsx) | Medium |
| Phase 3: Data Integrity | 8–10 files (Session, session-repository, worker, 4–5 API routes, Value Objects) | High |

---

## Phase 1: Quick Wins (C1, C4, C5, C8) — ~30 min

Four independent, single-line fixes. Zero domain changes. Can be committed together.

### C1 — `throw err` → `next(err)` in auth routes

**File**: `apps/backend/src/api/auth/auth-routes.ts`
**Lines**: 62, 91, 119, 134
**Risk**: Low
**Why**: Express 4 non cattura rejections da async handler. `throw err` → unhandled promise rejection, crash del processo.

**Action**:
```typescript
// ❌ Current (x4)
} catch (err) {
  throw err; // Let error handler map domain errors
}

// ✅ Fix
} catch (err) {
  return next(err);
}
```

**Verification**: `curl -X POST http://localhost:3001/api/auth/login -d '{"email":"x","password":"x"}' -H 'Content-Type: application/json'` deve restituire 401 JSON, non hang.

---

### C4 — Contrasto `text.secondary` → WCAG AA

**File**: `apps/frontend/src/theme/tokens.ts`
**Line**: 16
**Risk**: Low
**Why**: `#64748b` su `#f8fafc` = 3.86:1, richiesto ≥4.5:1. Ogni `color="text.secondary"` illeggibile per ipovedenti.

**Action**:
```typescript
// ❌ Current
secondary: '#64748b',

// ✅ Fix
secondary: '#334155',  // slate-700, 7.8:1 contrast on slate-50
```

Nota: il dark theme `secondary: '#94a3b8'` su `#0f172a` ha già ~6.5:1 — nessuna modifica necessaria.

---

### C5 — Tema reattivo all'OS

**File**: `apps/frontend/src/theme/ThemeProvider.tsx`
**Lines**: 9–12
**Risk**: Low
**Why**: `matchMedia` valutato una volta al mount. Mai aggiornato al cambio OS preference.

**Action**:
```typescript
// ❌ Current
export function ThemeProvider({ children }: ThemeProviderProps) {
  const prefersDark = typeof window !== 'undefined'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const currentTheme = prefersDark ? darkTheme : theme;
  // ...
}

// ✅ Fix
import { useMediaQuery } from '@mui/material';

export function ThemeProvider({ children }: ThemeProviderProps) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const currentTheme = prefersDark ? darkTheme : theme;
  // ...
}
```

**Verification**: In Chrome DevTools, toggle `prefers-color-scheme: dark` nel rendering tab — il tema deve cambiare senza refresh.

---

### C8 — `navigate()` in `useEffect`

**File**: `apps/frontend/src/pages/LoginPage.tsx`
**Lines**: 18–21
**Risk**: Low
**Why**: Side effect in render body viola React render-purity. Può rompere hook order.

**Action**:
```typescript
// ❌ Current
if (isAuthenticated) {
  navigate('/dashboard', { replace: true });
  return null;
}

// ✅ Fix — aggiungi import { useEffect } from 'react', poi:
useEffect(() => {
  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
  }
}, [isAuthenticated, navigate]);

if (isAuthenticated) return null;
```

**Verification**: Login con utente già autenticato → deve redirect senza errori console.

---

## Phase 2: Frontend Architecture (C3, C7) — ~1 h

Two changes that share `AppShell.tsx` and `App.tsx`. The ErrorBoundary wraps all routes that share the drawer.

### C7 — ErrorBoundary globale

**File**: `apps/frontend/src/components/ErrorBoundary.tsx` (nuovo)
**Risk**: Medium
**Why**: Un singolo crash in qualsiasi componente smonta l'intero tree → schermo bianco.

**Action**: Creare class component:

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <Typography variant="h4" gutterBottom>Something went wrong</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {this.state.error?.message}
          </Typography>
          <Button variant="contained" onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
```

**File**: `apps/frontend/src/App.tsx` — wrap route elements:

```tsx
import { ErrorBoundary } from './components/ErrorBoundary';

// In Routes:
<Route element={<AuthGuard />}>
  <Route element={<AppShell />}>
    <Route path="/" element={<ErrorBoundary><WorkspaceRedirect /></ErrorBoundary>} />
    <Route path="/dashboard" element={<ErrorBoundary><WorkspaceRedirect /></ErrorBoundary>} />
    <Route path="/workspaces/:workspaceId" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
    <Route path="/workspaces/:workspaceId/tools/:toolKey" element={<ErrorBoundary><ToolPage /></ErrorBoundary>} />
    <Route path="/workspaces/:workspaceId/sessions/:sessionId" element={<ErrorBoundary><SessionPage /></ErrorBoundary>} />
    <Route path="/workspaces/:workspaceId/conversations/:conversationId" element={<ErrorBoundary><ConversationPage /></ErrorBoundary>} />
  </Route>
</Route>
```

---

### C3 — Drawer responsive (permanent → temporary su mobile)

**File**: `apps/frontend/src/layout/AppShell.tsx`
**Lines**: 135–147
**Risk**: Medium
**Why**: `variant="permanent"` incondizionato rompe tablet/mobile (<1024px).

**Action**:
1. Aggiungere `useMediaQuery` e `useState` per `mobileOpen`
2. Aggiungere `IconButton` hamburger nell'AppBar (visibile solo quando `!isDesktop`)
3. Switch `variant` e `open` nel Drawer

```tsx
import { useMediaQuery, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import type { Theme } from '@mui/material';

// In AppShell:
const isDesktop = useMediaQuery((t: Theme) => t.breakpoints.up('md'));
const [mobileOpen, setMobileOpen] = useState(false);

// Nell'AppBar, prima dello spacer:
{!isDesktop && (
  <IconButton
    color="inherit"
    edge="start"
    onClick={() => setMobileOpen(!mobileOpen)}
    sx={{ mr: 1 }}
  >
    <MenuIcon />
  </IconButton>
)}

// Drawer:
<Drawer
  variant={isDesktop ? 'permanent' : 'temporary'}
  open={isDesktop || mobileOpen}
  onClose={() => setMobileOpen(false)}
  ModalProps={{ keepMounted: true }}
  sx={{ ... }}
>
```

**Verification**: Riduci viewport a 375px → hamburger appare, drawer si apre/chiude. Torna a 1200px → drawer permanente.

---

## Phase 3: Data Integrity (C2, C6) — ~2 h

Toccano il domain model + persistence + worker + API layer. Da fare in ordine (C2 dipende da modifiche a Session che C6 potrebbe usare).

### C2 — Artifact persistence

**3 sotto-step, ordinati per dipendenza:**

#### C2a — Aggiungere `_artifacts` al Session aggregate

**File**: `packages/domain/src/generation/entities/Session.ts`

1. Importare `Artifact` entity (da `../entities/Artifact` — verifica esistenza)
2. Aggiungere campo `private _artifacts: Artifact[]` nel costruttore, inizializzato a `[]`
3. Aggiungere parametro `artifacts: Artifact[] = []` a `reconstitute()`
4. Aggiungere getter `get artifacts(): readonly Artifact[] { return this._artifacts; }`
5. Nel case `'ADD_ARTIFACT'` di `apply()`: pushare `event.artifact` in `this._artifacts`

```typescript
// In ADD_ARTIFACT case:
case 'ADD_ARTIFACT':
  this._currentStepIndex++;
  this._artifacts.push(event.artifact);
  return null;
```

**Dipendenza**: Verificare che `SessionEvent` discriminated union abbia `artifact` nel tipo `ADD_ARTIFACT`. Se il tipo `ADD_ARTIFACT` attuale non ha il campo, aggiungerlo:

```typescript
// In session-lifecycle.ts o dove è definito SessionEvent:
type SessionEvent =
  | { type: 'ADD_ARTIFACT'; artifact: Artifact; }
  | ...
```

#### C2b — Persistere gli artifact in `saveWithLock()`

**File**: `packages/infra-db/src/repositories/session-repository.ts`

Aggiungere upsert degli artifact dopo l'UPDATE della sessione (linea 141), nello stesso metodo:

```typescript
// Dopo il controllo ConcurrencyError (line 155), prima della chiusura:
if (session.artifacts.length > 0) {
  for (const artifact of session.artifacts) {
    await this.db
      .insertInto('artifacts')
      .values({
        session_id: artifact.sessionId,
        step_number: artifact.stepNumber,
        content: artifact.content,
        status: artifact.status.value,
      })
      .onConflict((oc) =>
        oc.columns(['session_id', 'step_number']).doUpdateSet({
          content: artifact.content,
          status: artifact.status.value,
        }),
      )
      .execute();
  }
}
```

**Nota**: Verificare la struttura di `Artifact` entity (`sessionId`, `stepNumber`, `content`, `status`). I nomi dei campi potrebbero differire.

#### C2c — Leggere gli artifact nel `findById()`

**File**: `packages/infra-db/src/repositories/session-repository.ts`

Aggiungere query per caricare gli artifact insieme alla sessione, così che `Session.reconstitute()` riceva l'array:

```typescript
const artifactRows = await this.db
  .selectFrom('artifacts')
  .selectAll()
  .where('session_id', '=', id)
  .orderBy('step_number', 'asc')
  .execute();

const artifacts = artifactRows.map((r) =>
  Artifact.reconstitute(r.id, r.session_id, r.step_number, r.content, ArtifactStatus.from(r.status))
);
```

Passare `artifacts` a `Session.reconstitute(...)`.

**Nota**: Verificare i nomi esatti dei campi in `artifacts` (migration 004: `id, session_id, step_number, content, status, created_at`).

**Verification**: Avviare una sessione di generazione → `GET /api/sessions/:id` deve includere `artifacts: [...]`. `GET /api/artifacts/:id` deve restituire dati reali.

---

### C6 — Value Object serializzati direttamente in JSON

**Problema**: I VO (`SessionStatus`, `ToolKey`, `MembershipRole`, `MembershipStatus`, `ConversationStatus`) sono classi con campo privato `_value`. `JSON.stringify` serializza `{ "_value": "running" }` invece di `"running"`.

**Due approcci possibili:**

**Opzione A — `toJSON()` (preferita, ~10 VO da toccare)**:
Aggiungere metodo `toJSON()` a ogni Value Object. JSON.stringify lo chiama automaticamente.

```typescript
// In ogni VO (es. SessionStatus):
toJSON(): string {
  return this._value;
}
```

**Opzione B — `.toString()` esplicito nelle API (~5 route file)**:
Chiamare `.toString()` o `.value` nella mappatura delle response.

Scelgo **Opzione B** perché:
- Non modifica il domain layer (i VO sono puri, `toJSON()` introduce un'opinione di serializzazione nel dominio)
- Le API sono il livello di presentazione — è lì che si decide il formato
- Il fix è localizzato: 5 file, ~12 punti di modifica

#### C6a — `generation.ts` listSessions + getSession

**File**: `apps/backend/src/api/generation.ts`

```typescript
// ❌ Linee 24, 26, 125, 127 — VOs serializzati direttamente
toolKey: s.toolKey,
status: s.status,

// ✅ Fix
toolKey: s.toolKey.toString(),
status: s.status.toString(),
```

#### C6b — `workspaces.ts` getWorkspace + listMembers

**File**: `apps/backend/src/api/workspaces.ts`

```typescript
// ❌ Linee 68, 69, 137 — MembershipRole e MembershipStatus serializzati
role: m.role,
status: m.status,

// ✅ Fix
role: m.role.toString(),
status: m.status.toString(),
```

#### C6c — `agent-chat.ts` listConversations + getConversation

**File**: `apps/backend/src/api/agent-chat.ts`

```typescript
// ❌ Linee 38, 100 — ConversationStatus serializzato
status: c.status,

// ✅ Fix
status: c.status.toString(),
```

**Verification**: Chiamare ogni endpoint e verificare che il JSON restituito abbia stringhe, non oggetti `{"_value": "..."}`.

```bash
curl http://localhost:3001/api/sessions | jq '.data[0].status'   # deve essere "running", non {"_value":"running"}
curl http://localhost:3001/api/workspaces/:id | jq '.members[0].role'  # deve essere "owner", non {"_value":"owner"}
```

---

## Execution Order

```
Phase 1 (commit: `fix: critical C1+C4+C5+C8 — runtime crash + a11y + react render`)
  ├── C1: auth-routes.ts — throw err → next(err) (4 lines)
  ├── C4: tokens.ts — #64748b → #334155 (1 line)
  ├── C5: ThemeProvider.tsx — useMediaQuery (3 lines)
  └── C8: LoginPage.tsx — navigate in useEffect (5 lines)

Phase 2 (commit: `fix: critical C3+C7 — responsive drawer + error boundaries`)
  ├── C7: ErrorBoundary.tsx (new file, ~45 lines)
  ├── C7: App.tsx — wrap routes with ErrorBoundary (6 lines)
  └── C3: AppShell.tsx — responsive drawer (20 lines)

Phase 3 (commit: `fix: critical C2+C6 — artifact persistence + VO serialization`)
  ├── C2a: Session.ts — _artifacts field + ADD_ARTIFACT case
  ├── C2a: session-lifecycle.ts — ADD_ARTIFACT event type (se necessario)
  ├── C2b: session-repository.ts — artifact upsert in saveWithLock()
  ├── C2c: session-repository.ts — artifact load in findById()
  ├── C6a: generation.ts — .toString() su toolKey + status (4 points)
  ├── C6b: workspaces.ts — .toString() su role + status (4 points)
  ├── C6c: agent-chat.ts — .toString() su status (2 points)
  └── Regenerate DB types: `npm run db:types` (se il type generator lo supporta)
```

---

## Risks & Mitigations

| Risk | Probability | Mitigation |
|------|------------|------------|
| C2: `Artifact` entity non esporta `reconstitute()` | Medium | Verificare prima di iniziare. Se non esiste, usare il costruttore pubblico o aggiungere `reconstitute()`. |
| C2: `SessionEvent` type non ha campo `artifact` su `ADD_ARTIFACT` | High | Aggiungere il campo al type. Verificare tutti i producer dell'evento (worker, use case) — devono passare `artifact`. |
| C3: MUI `useMediaQuery` non disponibile in tests | Low | Non ci sono test frontend. Nessun impatto. |
| C6: `toString()` non esiste su qualche VO | Low | Phase 9 ha verificato che tutti i VO hanno `toString()` o `.value` getter. |
| C7: ErrorBoundary cattura errori di routing | Low | React Router errori sono gestiti internamente. ErrorBoundary non interferisce. |

---

## Success Criteria

- [x] `curl POST /api/auth/login` con credenziali invalide → 401 JSON (non hang, non crash)
- [x] `text.secondary` contrasto ≥ 4.5:1 in light mode
- [x] Cambio OS dark/light mode → tema si aggiorna senza refresh
- [x] Utente già autenticato → LoginPage redirect senza errori console React
- [x] Drawer responsive: hamburger su mobile, permanente su desktop
- [x] Crash in SessionPage → mostra ErrorBoundary fallback, non schermo bianco
- [x] Sessione completata → `GET /api/sessions/:id` include `artifacts: [...]`
- [x] `GET /api/artifacts/:id` restituisce dati reali (non 404)
- [x] `GET /api/sessions` → `status` è `"running"` (non `{"_value":"running"}`)
- [x] `GET /api/workspaces/:id` → `members[].role` è `"owner"` (non `{"_value":"owner"}`)
- [x] Typecheck 0 errori, build backend ✅, build frontend ✅
- [x] Domain tests passano (8/8)

---

## Sources

- [[code-review-2026-08-02]]
- [[implementation-roadmap-2026-08-01]]
- [[DDD Domain Design Rules]]
- [[Session Machine (XState v5)]]
- [[Design Tokens]]