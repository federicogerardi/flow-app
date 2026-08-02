---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/code-review
  - wiki/governance
date_updated: 2026-08-02
confidence: high
---

# Code Review — Roadmap Implementata (Fasi 0–9)

**Data**: 2026-08-02
**Ambito**: Intero monorepo — `apps/backend`, `apps/frontend`, `packages/domain`, `packages/contracts`, `packages/infra-db`
**Metodo**: 6 agenti specializzati ([[DDD Domain Design Rules|DDD Expert]], Backend Architect, React Frontend Engineer, Code Simplifier, Type Design Analyzer, UI Designer)
**Riferimento**: [[implementation-roadmap-2026-08-01]]

---

## Riepilogo per Severità

| Severità | Conteggio | Impatto |
|----------|-----------|---------|
| 🔴 Critica | 8 | Crash a runtime, perdita dati, violazioni WCAG bloccanti |
| 🟠 Alta | 10 | Bug funzionali, regressioni, violazioni DDD |
| 🟡 Media | 18 | UX, performance, manutenibilità, accessibilità |
| 🟢 Bassa | 5 | Pulizia codice, consistenza |

---

## 🔴 Critiche — Da Fixare Subito

### C1 — `throw err` in async handler (Express 4)

- **Agente**: Backend Architect + Code Simplifier
- **File**: `apps/backend/src/api/auth/auth-routes.ts:62,90,119,134`
- **Confidence**: 100%

**Problema**: Express 4.21 non cattura promise rejected da async handler. `throw err` nel catch non arriva mai all'error handler middleware. In produzione, l'errore diventa un `unhandledRejection` → crash del processo o hang del client senza risposta.

```typescript
// ❌ auth-routes.ts:62
} catch (err) {
  throw err; // ← Non raggiunge mai errorHandler
}
```

**Fix**: Sostituire con `return next(err)` in tutti e 4 i catch block.

---

### C2 — Artifact mai persistiti nel database

- **Agente**: Backend Architect
- **File**: `apps/backend/src/generation/worker/session-worker.ts:121`, `packages/domain/src/generation/entities/Session.ts:120-173`
- **Confidence**: 100%

**Problema**: `executeStep` crea `ArtifactEntity.create(sessionId, stepIndex, content)` ma:
1. `Session.apply()` non ha un campo `_artifacts` — il caso `ADD_ARTIFACT` incrementa solo `_currentStepIndex`
2. `saveWithLock()` scrive solo la tabella `sessions` — nessun insert in `artifacts`
3. Zero chiamate `insertInto('artifacts')` nell'intero codebase

`GET /api/artifacts/:id` interroga una tabella sempre vuota. Tutto il contenuto generato viene scartato.

**Fix**: Aggiungere `_artifacts: Artifact[]` su `Session`, popolarlo in `apply()`, e fare upsert degli artifact in `saveWithLock()`.

---

### C3 — Drawer `permanent` rompe tablet e mobile

- **Agente**: UI Designer
- **File**: `apps/frontend/src/layout/AppShell.tsx:135-147`
- **Confidence**: 95%

**Problema**: Drawer usa `variant="permanent"` incondizionatamente. Su viewport <1024px, i 280px fissi consumano il 27%+ della larghezza. Su mobile (375px), il drawer occupa il 75% dello schermo. Nessun toggle hamburger. L'app è inutilizzabile su tablet.

**Fix**: Usare `useMediaQuery` per switch tra `permanent` (desktop) e `temporary` (mobile) con toggle IconButton nell'AppBar.

---

### C4 — Colore `text.secondary` fallisce WCAG AA

- **Agente**: UI Designer
- **File**: `apps/frontend/src/theme/tokens.ts:16`
- **Confidence**: 90%

**Problema**: `#64748b` (slate-500) su `#f8fafc` (slate-50) = contrasto **3.86:1**. WCAG AA richiede ≥4.5:1. Ogni `color="text.secondary"` nell'app è illeggibile per utenti ipovedenti: breadcrumb, sottotitoli, timestamp, helper text.

**Fix**: Sostituire con `#334155` (slate-700, 7.8:1 ✅).

---

### C5 — Tema mai reattivo al cambio OS preference

- **Agente**: UI Designer + Frontend Engineer
- **File**: `apps/frontend/src/theme/ThemeProvider.tsx:10-12`
- **Confidence**: 95%

**Problema**: `prefersDark` è valutato una volta al mount. Se l'utente cambia dark/light mode a livello OS, l'app non si aggiorna senza refresh manuale.

**Fix**: Usare `useMediaQuery('(prefers-color-scheme: dark)')` di MUI, che è reattivo.

---

### C6 — Value Object serializzati direttamente in JSON API

- **Agente**: Type Design Analyzer
- **File**: `apps/backend/src/api/generation.ts:24,125`, `apps/backend/src/api/workspaces.ts:68,137`, `apps/backend/src/api/agent-chat.ts:38,100`
- **Confidence**: 88%

**Problema**: I domain entity vengono passati direttamente a `res.json()`. I Value Object come `SessionStatus`, `ToolKey`, `MembershipRole` sono classi con campo privato `_value`. `JSON.stringify` serializza la proprietà privata:

```json
// ❌ Realtà a runtime:
{ "status": { "_value": "running" }, "toolKey": { "_value": "blog-post" } }

// ✅ Atteso:
{ "status": "running", "toolKey": "blog-post" }
```

**Fix**: Aggiungere `toJSON()` a ogni Value Object o chiamare `.toString()` / `.value` nella mappatura delle response.

---

### C7 — Nessun Error Boundary nell'intera app

- **Agente**: Frontend Engineer
- **File**: Tutti — nessun componente `ErrorBoundary`
- **Confidence**: 95%

**Problema**: Un singolo errore non catturato in qualsiasi componente (es. crash in `SessionPage` per dati SSE malformati) smonta l'intero React tree → schermo bianco. Nessun fallback UI, nessun recovery.

**Fix**: Creare `ErrorBoundary` come class component con `getDerivedStateFromError` e wrappare ogni route element.

---

### C8 — `navigate()` in fase di render (React)

- **Agente**: Frontend Engineer
- **File**: `apps/frontend/src/pages/LoginPage.tsx:18-21`
- **Confidence**: 95%

**Problema**: `navigate()` è chiamato direttamente nel render body, non in `useEffect`. Viola il contratto di purezza del render in React 19 Strict Mode. Se `isAuthenticated` cambia tra render, gli hook `useState` successivi vengono saltati.

```typescript
// ❌ Side effect nel render body
if (isAuthenticated) {
  navigate('/dashboard', { replace: true });
  return null;
}
```

**Fix**: Spostare in `useEffect(() => { if (isAuthenticated) navigate('/dashboard') }, [isAuthenticated, navigate])`.

---

## 🟠 Alta Priorità

### H1 — `Conversation.start()` — nome factory non canonico

- **Agente**: DDD Expert
- **File**: `packages/domain/src/agent-chat/entities/Conversation.ts:63`
- **Regola**: [[DDD Domain Design Rules|Rule 6]] — "No custom factory names on aggregate roots"
- **Confidence**: 95%

```typescript
// ❌ Nome esplicitamente vietato dalla regola
static start(workspaceId: string, userId: string, agentKey: AgentKey): Conversation {
```

**Fix**: Rinominare in `static create(...)`. Aggiornare il chiamante in `apps/backend/src/application/agent-chat/start-conversation.usecase.ts:20`.

---

### H2 — `User.register()` / `User.fromOAuth()` — due factory invece di `create()`

- **Agente**: DDD Expert
- **File**: `packages/domain/src/identity/User.ts:32,37`
- **Regola**: [[DDD Domain Design Rules|Rule 6]] — "Every aggregate root has exactly one `static create()`"
- **Confidence**: 90%

```typescript
static register(email: Email, passwordHash: string): User { ... }
static fromOAuth(email: Email): User { ... }
```

**Fix**: Unificare in `static create(email: Email, opts?: { passwordHash?: string }): User`.

---

### H3 — `ModelTier` type alias invece di classe

- **Agente**: DDD Expert
- **File**: `packages/domain/src/generation/tools/tool-definition.ts:3`
- **Regola**: [[DDD Domain Design Rules|Rule 4]] — valori con dominio finito devono essere classi
- **Confidence**: 95%

```typescript
// ❌ 4 valori finiti, zero runtime validation
export type ModelTier = 'premium' | 'balanced' | 'light' | 'search';
```

**Fix**: Convertire in classe con `private constructor`, `static readonly` istanze, `static from()`, `equals()`. Pattern già usato da `ToolKey`, `AgentKey`, etc.

---

### H4 — `saveWithLock()` senza transazione

- **Agente**: Backend Architect
- **File**: `packages/infra-db/src/repositories/workspace-repository.ts:104-153`
- **Confidence**: 90%

**Problema**: UPDATE ottimistico su `workspaces` + INSERT/UPDATE multipli su `workspace_memberships` senza `BEGIN/COMMIT`. Se l'update workspace riesce ma un insert membership fallisce, il workspace è aggiornato ma i membri sono corrotti.

**Fix**: Wrappare entrambe le operazioni in `db.transaction().execute(async (trx) => {...})`.

---

### H5 — `throw new Error()` nel worker bypassa DomainError

- **Agente**: Backend Architect + Code Simplifier
- **File**: `apps/backend/src/generation/worker/session-worker.ts:54,57,66`, `apps/backend/src/infrastructure/model-registry.ts:34`
- **Regola**: [[DDD Domain Design Rules|Rule 3]]
- **Confidence**: 90%

```typescript
// ❌ Bare Error — nessun code, nessun retryable, non arriva a ErrorMapper
if (!session) throw new Error(`Session ${sessionId} not found`);
if (!tool) throw new Error(`Tool ${session.toolKey} not found`);
```

**Fix**: Creare `SessionNotFoundError extends DomainError` (il code `SESSION_NOT_FOUND` è già mappato nell'ErrorMapper ma è dead code) e usarlo.

---

### H6 — Token OAuth valido scartato dopo login Google

- **Agente**: Frontend Engineer
- **File**: `apps/frontend/src/auth/AuthContext.tsx:86-108`, `apps/frontend/src/auth/OAuthCallback.tsx:20-25`
- **Confidence**: 90%

**Problema**: Dopo OAuth, `OAuthCallback` salva il token in memoria e naviga a `/dashboard`. `AuthProvider` monta, `trySilentRefresh()` chiama `POST /api/auth/refresh` — ma il cookie httpOnly potrebbe non essere ancora settato. Refresh fallisce → `user` resta `null` → `isAuthenticated = false` → `AuthGuard` redirect a `/login`. L'utente ha completato OAuth con successo ma viene buttato fuori.

**Fix**: Se il refresh cookie fallisce ma esiste già un access token in memoria (messo da `OAuthCallback`), usarlo per chiamare `GET /api/auth/me` e popolare l'utente.

---

### H7 — `useSession()` senza error state

- **Agente**: Frontend Engineer
- **File**: `apps/frontend/src/api/hooks.ts:20-24`
- **Confidence**: 90%

**Problema**: L'hook non ha uno stato `error`. Se `api.getSession()` fallisce, la promise rejection è unhandled (nessun `.catch()`), `loading` va a `false`, `session` resta `null`, e la UI mostra `<LoadingSkeleton />` per sempre.

**Fix**: Aggiungere `const [error, setError] = useState<Error | null>(null)` e `.catch(setError)`.

---

### H8 — ToolPage mostra sempre gli stessi input

- **Agente**: UI Designer
- **File**: `apps/frontend/src/pages/ToolPage.tsx:53-67`
- **Confidence**: 85%

**Problema**: I campi "Topic" e "Language" sono hardcoded per ogni tool. Per "Ad Copy" servono `platform`, `audience`, `goal`. Per "Brief" servono `objective`, `company`, `product`. L'utente vede sempre i campi sbagliati.

**Fix**: Definire uno schema di input per tool in un file condiviso e renderizzare i campi dinamicamente.

---

### H9 — `countStalled()` conta job retry-exhausted, non stalled

- **Agente**: Backend Architect
- **File**: `apps/backend/src/generation/worker/health-monitor.ts:170-173`
- **Confidence**: 90%

**Problema**: Il metodo cerca job con `attemptsMade >= maxAttempts` in tutti gli stati — questi sono job che hanno esaurito i retry, non job stalled (worker morto mentre processava). I veri job stalled vengono spostati da BullMQ in `waiting` e non vengono rilevati.

**Fix**: Ascoltare l'evento `'stalled'` del Worker BullMQ e mantenere un contatore, oppure filtrare per `attemptsMade > 0 && finishedOn === undefined` nello stato `waiting`.

---

### H10 — `default: return null` sopprime exhaustiveness check

- **Agente**: Type Design Analyzer
- **File**: `packages/domain/src/generation/entities/Session.ts:170`
- **Confidence**: 95%

```typescript
switch (event.type) {
  // ... tutti i 7 casi gestiti
  default:
    return null; // ❌ Sopprime il controllo del compilatore
}
```

**Fix**: Sostituire con `default: { const _exhaustive: never = event; return _exhaustive; }`.

---

## 🟡 Media Priorità

| # | Agente | Issue | File | Conf. |
|---|--------|-------|------|-------|
| M1 | Frontend | `window.location.href` hard redirect distrugge React tree + cache SWR | `client.ts:140` | 90% |
| M2 | Frontend | Errori `sendMessage()` silenziati — zero feedback utente | `ConversationPage.tsx:38` | 90% |
| M3 | Frontend | `WorkspaceRedirect` senza error/empty state — loading infinito | `App.tsx:14` | 85% |
| M4 | Frontend | Zero attributi ARIA espliciti in tutta l'app | Tutti i file | 85% |
| M5 | Frontend | Nessun code splitting — tutte le pagine caricate eager | `App.tsx` | 85% |
| M6 | UI Designer | Status chip colori inconsistenti Dashboard vs SessionPage | `DashboardPage.tsx:111`, `SessionPage.tsx:14` | 88% |
| M7 | UI Designer | Bubble messaggi agent invisibili (contrasto 1:1 su bianco) | `ConversationPage.tsx:88` | 90% |
| M8 | UI Designer | "Retry" hardcoded in inglese — rompe pattern `copy.t()` | `ErrorState.tsx:18` | 90% |
| M9 | UI Designer | Workspace Select senza ARIA label | `AppShell.tsx:152` | 85% |
| M10 | UI Designer | Nessun focus management post-navigazione SPA | Multiple pages | 82% |
| M11 | UI Designer | `h4` non definito nel tema — fallback MUI silenzioso | `DashboardPage.tsx:63`, `tokens.ts` | 85% |
| M12 | Backend | `queueDepth` conta solo `waiting` — ignora `active` + `delayed` | `health-monitor.ts:76` | 95% |
| M13 | Backend | SSE `subscribe()` race condition — eventi persi senza warning | `job-event-bridge.ts:62` | 85% |
| M14 | Backend | N+1 query in `findByMember()` | `workspace-repository.ts:44` | 85% |
| M15 | Simplifier | Membership sync duplicato in `save()` e `saveWithLock()` | `workspace-repository.ts:79,130` | 90% |
| M16 | Simplifier | Pattern optimistic locking duplicato in 2 repository | `session-repository.ts:126`, `workspace-repository.ts:104` | 85% |
| M17 | Simplifier | Dynamic import in hot path del worker | `session-worker.ts:81` | 85% |
| M18 | Type Design | `Identifier<T>.equals()` permette cross-type equality | `identifier.ts:4` | 90% |

---

## 🟢 Bassa Priorità

| # | Agente | Issue | File | Conf. |
|---|--------|-------|------|-------|
| L1 | Backend | Access token in query string OAuth callback — loggato da proxy | `auth-routes.ts:199` | 80% |
| L2 | Simplifier | Admin routes catch → `res.status(500).json()` invece di `next(err)` | `admin.ts:50,70` | 80% |
| L3 | Simplifier | Due path divergenti in `listSessions` (repository vs raw SQL) | `generation.ts:13-52` | 80% |
| L4 | Type Design | `ApiError` duplicato in `contracts/` — file morto | `contracts/src/shared.ts` | 95% |
| L5 | Type Design | Frontend DTO divergono da `@flow-app/contracts` — status come `string` | `client.ts:6-76` | 82% |

---

## Cosa Funziona Bene

- **Locking ottimistico**: pattern `WHERE version = ?` + `numUpdatedRows === 0n` corretto in entrambi i repository
- **Token rotation**: refresh token ruota correttamente (vecchia sessione cancellata prima di emetterne una nuova)
- **Token store**: module-level, mai localStorage — pattern corretto
- **API client 401 retry-once**: strutturalmente giusto
- **SSE client**: lifecycle corretto, cleanup su disconnect, auto-close su eventi terminali
- **Structured logging**: Pino child logger con `sessionId`, `jobId`, `correlationId`
- **MUI v6 Grid2** con `size` prop — pattern corretto in tutto il frontend
- **React Router v7**: import canonico da `"react-router"`
- **Phase 9 DDD Remediation**: 8 type alias → classi, zero `throw new Error` nel dominio, zero `as any` nei domain file
- **ErrorMapper**: mappa correttamente tutti i DomainError a HTTP status

---

## Ordine di Intervento Raccomandato

1. **C1** — `throw err` → `next(err)` in `auth-routes.ts` (4 righe, previene crash)
2. **C2** — Persistenza artifact (aggiungere tabella/campo + scrittura repository)
3. **C6** — `toJSON()` sui Value Object o serializzazione esplicita nelle API
4. **C3, C4, C5** — Drawer responsive + contrasto colori + tema reattivo
5. **C7, C8** — Error Boundaries + `navigate()` in `useEffect`
6. **H1-H3** — Factory DDD canonici (`Conversation.start()` → `create()`, `User.register()`/`fromOAuth()` → `create()`, `ModelTier` → classe)
7. **H4-H5** — Transazione in `saveWithLock()` + DomainError nel worker
8. **H6** — Fix flusso OAuth (token in-memory se refresh cookie fallisce)
9. **M1-M18** — Debito tecnico schedulabile, priorità a M4 (ARIA), M6 (status chip), M12 (queueDepth)

### Piani di Remediation

- **Critici**: [[critical-fix-plan-2026-08-02]] — tutti e 8 eseguiti ✅
- **Alta severità**: [[high-fix-plan-2026-08-02]] — tutti e 10 eseguiti ✅

---

## Sources

- [[implementation-roadmap-2026-08-01]]
- [[DDD Domain Design Rules]]
- [[Session Machine (XState v5)]]
- [[LLM Gateway - OpenRouter]]
- [[Auth Dependencies]]
- [[Auth Middleware]]
- [[Workspace Sharing]]
- [[Workspace Permissions]]
- [[phase-9-implementation-plan]]
- [[frontend-mvp-plan-2026-08-01]]
- [[phase-8-real-auth-plan]]
- [[Design Tokens]]
- [[API Contract Baseline v1]]
- [[Quality Gate Matrix]]