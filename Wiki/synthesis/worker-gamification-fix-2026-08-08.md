---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/generation
  - wiki/backend
date_updated: 2026-08-08
confidence: high
status: implemented
---

# Worker Gamification Fix — Implementation Plan

> Fix two bugs discovered during session diagnostics (2026-08-08): (1) worker crashes when re-processing terminal sessions, (2) credits consumed + XP awarded for failed/cancelled sessions.

## Findings

### F1 — Worker crash su sessione terminale

`session-worker.ts:70-71` applica `QUEUE` e `WORKER_PICKUP` a qualsiasi sessione caricata dal DB. Ma `SessionLifecycle` definisce `cancelled` come stato finale senza transizioni valide. Se il worker carica una sessione `cancelled`, `session.apply({ type: 'QUEUE' })` lancia `InvalidSessionStateError`.

```
DB: status=cancelled → worker: apply(QUEUE) → InvalidSessionStateError → job retry → dead-letter
```

L'API `startSession` già previene l'accodamento per sessioni terminali (`isTerminal()`), ma il guard nel worker è comunque necessario per edge case (retry BullMQ di job vecchi, race condition).

### F2 — XP e crediti assegnati per sessioni non completate

`session-worker.ts:246-247` controlla `snapshot.status === 'done'` per decidere se consumare crediti e assegnare XP. In XState v5, `snapshot.status === 'done'` è vero per QUALSIASI stato finale — `completed`, `failed`, E `cancelled` (tutti e tre hanno `type: 'final'` nella macchina).

```typescript
// session-machine.ts
completed: { type: 'final' },   // → done ✅ (corretto)
failed:    { type: 'final' },   // → done ❌ (non dovrebbe assegnare XP)
cancelled: { type: 'final' },   // → done ❌ (non dovrebbe assegnare XP)
```

Inoltre, la macchina a stati **non chiama mai `session.apply({ type: 'FAIL' })`** quando transita a `failed` — il `session.status` rimane `running` anche dopo che la macchina ha raggiunto `failed`. L'unico modo per rilevare lo stato reale è `snapshot.value`.

Il bug si manifesta anche sull'SSE: `session_completed` viene pubblicato per TUTTI gli stati finali, incluso `failed` e `cancelled`.

## Root Cause Analysis

| Componente | Problema | Impatto |
|---|---|---|
| `session-worker.ts:70` | `apply(QUEUE)` su sessione terminale → crash | Job dead-letter, sessione non ri-processabile |
| `session-worker.ts:247` | `snapshot.status === 'done'` non discrimina tra completed/failed/cancelled | Crediti persi, XP inflazionato |
| `session-worker.ts:228` | SSE `session_completed` pubblicato per ogni stato finale | Frontend vede "completed" anche per sessioni fallite |
| `session-machine.ts:114,122` | Transizioni `onError → #session.failed` senza action `apply(FAIL)` | Session aggregate mai aggiornato a `failed` |

## Architecture Changes

Nessuna modifica architetturale. Fix puntuali in un singolo file. La macchina a stati è corretta (tre stati finali distinti) — il worker semplicemente non li gestiva correttamente.

## Implementation Steps

### Phase 1: Terminal state guard (1 file, 8 lines)

**File**: `apps/backend/src/generation/worker/session-worker.ts`
**Location**: dopo linea 64 (`if (!session) throw ...`)

```typescript
const session = await deps.sessionRepo.findById(sessionId);
if (!session) throw new SessionNotFoundError(sessionId);

// ADD: skip processing if session is already in a terminal state.
// Replayed terminated sessions cannot accept QUEUE/WORKER_PICKUP events.
if (session.status.isTerminal()) {
  log.warn(
    { status: session.status.toString(), version: session.version },
    'job_skipped_terminal_session',
  );
  return;
}
```

**Casi coperti**: `completed`, `failed`, `cancelled` (tutti i valori dove `isTerminal() === true`).

**Caso NON coperto**: sessioni dove la macchina ha raggiunto `failed` senza applicare `FAIL` all'aggregato. In quel caso `session.status` rimane `running` → `isTerminal() === false` → il worker riprova la sessione, la macchina transita di nuovo a `failed`, il job viene riprocessato fino al limite di retry BullMQ. Questo è accettabile: un retry genuino potrebbe avere successo.

### Phase 2: SSE + gamification condizionale (1 file, ~40 lines changed)

**File**: `apps/backend/src/generation/worker/session-worker.ts`
**Location**: sostituisce linee 219-267

**Before:**
```typescript
// Persist final session state BEFORE publishing session_completed.
await deps.sessionRepo.save(session);
log.info({ status: session.status.toString(), version: session.version }, 'session_persisted');

// Manually publish session_completed via SSE — after DB is consistent
const finalArtifact = session.artifacts[session.artifacts.length - 1];
deps.eventBridge.publish(sessionId, {
  event: 'session_completed',
  data: { ... },
});

// Gamification: award XP on successful session completion
const snapshot = actor.getSnapshot();
if (snapshot.status === 'done') {   // ❌ true anche per failed e cancelled
  await deps.consumeCreditsUC.execute(...);
  deps.gamificationEventPublisher.publishSessionCompleted(...);
}
```

**After:**
```typescript
// Persist final session state BEFORE publishing SSE events.
await deps.sessionRepo.save(session);
log.info({ status: session.status.toString(), version: session.version }, 'session_persisted');

const finalMachineState = String(actor.getSnapshot().value);

// Publish correct SSE event based on machine's actual final state
if (finalMachineState === 'completed') {
  const finalArtifact = session.artifacts[session.artifacts.length - 1];
  deps.eventBridge.publish(sessionId, {
    event: 'session_completed',
    data: {
      sessionId,
      status: 'completed',
      finalArtifact: finalArtifact ? {
        id: finalArtifact.artifactId,
        stepNumber: finalArtifact.stepNumber,
        status: finalArtifact.status.toString(),
        createdAt: finalArtifact.createdAt?.toISOString() ?? new Date().toISOString(),
        sessionId: finalArtifact.sessionId,
        content: finalArtifact.content,
      } : undefined,
      completedAt: session.completedAt?.toISOString(),
    },
  });
} else if (finalMachineState === 'failed') {
  deps.eventBridge.publish(sessionId, {
    event: 'session_failed',
    data: {
      sessionId,
      status: 'failed',
      error: {
        code: session.errorCode ?? 'SESSION_FAILED',
        message: session.errorMessage ?? 'Session processing failed',
      },
    },
  });
}
// cancelled → no SSE event (cancel API already handled it)

// Gamification + credits: only for genuinely completed sessions
if (finalMachineState === 'completed') {
  try {
    await deps.consumeCreditsUC.execute({
      userId: session.userId,
      sessionId,
      toolKey: session.toolKey.value,
    });
  } catch (error) {
    log.error({ error, sessionId }, 'credits_consumption_failed');
  }

  deps.gamificationEventPublisher.publishSessionCompleted(
    sessionId,
    session.workspaceId,
    session.userId,
    session.toolKey.value,
  ).catch(() => { /* fire-and-forget */ });
}
```

### Perché `actor.getSnapshot().value` e non `session.status.value`

La macchina a stati XState non chiama `session.apply({ type: 'FAIL' })` quando transita a `failed` tramite `onError`. L'aggregato `Session` rimane in stato `running`. L'unica fonte affidabile per lo stato finale della macchina è `snapshot.value` (che restituisce `'completed'`, `'failed'`, o `'cancelled'`).

Per `completed`, il machine chiama `session.apply({ type: 'COMPLETE' })` tramite l'action `completeSession` → `session.status.value === 'completed'` coincide con `snapshot.value`.

Per `failed`, il machine transita senza action → `session.status.value` rimane `'running'` ma `snapshot.value === 'failed'`.

Per `cancelled`, il machine riceve l'event `CANCEL` (dal worker o dal cancel API). Nel worker, `session.apply({ type: 'CANCEL' })` non viene mai chiamato — viene chiamato solo dall'API `cancelSession`. Quindi nel worker, `session.status.value` potrebbe essere `'running'` anche se `snapshot.value === 'cancelled'`.

## Testing Strategy

**File**: `apps/backend/src/generation/__tests__/session-worker.test.ts`

### Test attuali da preservare:
1. Worker creation with correct queue name ✅
2. Happy path: process job → LLM called → event published ✅
3. SessionNotFoundError thrown when session missing ✅
4. REDIS_URL not set → InfrastructureError ✅

### Nuovi test (7):

| # | Test | Setup | Assertion |
|---|------|-------|-----------|
| T1 | Worker skips completed session | `session.status.isTerminal() → true` | `llmGateway.generate` NOT called, NO events published, worker returns without error |
| T2 | Worker skips cancelled session | `session.status.isTerminal() → true`, `status = cancelled` | Worker returns without error, no side effects |
| T3 | Credits NOT consumed for cancelled state | Machine reaches `cancelled` via CANCEL event | `consumeCreditsUC.execute` NOT called, `publishSessionCompleted` NOT called |
| T4 | Credits NOT consumed for failed state | Machine reaches `failed` via `onError` transition | `consumeCreditsUC.execute` NOT called, `publishSessionCompleted` NOT called |
| T5 | SSE session_failed for failed state | Machine reaches `failed` | `eventBridge.publish` called with `event: 'session_failed'` |
| T6 | SSE session_completed for completed state | Happy path completes | `eventBridge.publish` called with `event: 'session_completed'` |
| T7 | Credits + XP awarded for completed state | Happy path completes | `consumeCreditsUC.execute` called, `publishSessionCompleted` called |

### Mock updates needed:
- `session.status.isTerminal()` method on mock
- `session.status.toString()` method on mock  
- Machine snapshot with `snapshot.value` reflecting final state
- Optional: `session.errorCode` / `session.errorMessage` getters

## Risks & Mitigations

| Rischio | Mitigazione |
|---------|------------|
| `snapshot.value` restituisce oggetto annidato invece di stringa | La macchina ha `id: 'session'` e gli stati finali sono root-level (`completed`, `failed`, `cancelled`). `#session.failed` all'interno di stati annidati si risolve alla root. `String(snapshot.value)` converte in ogni caso. |
| Comportamento diverso tra `onError` vs eccezione non catturata | L'`onError` fa transitare la macchina a `failed` senza throw → il worker la tratta come completamento normale. Le eccezioni non catturate vanno nel `catch` block (che già pubblica `session_failed` correttamente). Nessuna sovrapposizione. |
| `session.errorCode`/`errorMessage` null in stato `failed` | Usati con fallback: `session.errorCode ?? 'SESSION_FAILED'` e `session.errorMessage ?? 'Session processing failed'` |
| `finalArtifact` undefined per sessioni senza artifact | Guard esistente: `finalArtifact ? { ... } : undefined` |

## Success Criteria
- [ ] Worker returns without error for terminal (`isTerminal() === true`) sessions
- [ ] Credits NOT consumed for `failed` or `cancelled` machine states
- [ ] XP NOT awarded for `failed` or `cancelled` machine states
- [ ] `session_failed` SSE event published when machine reaches `failed`
- [ ] `session_completed` SSE event published ONLY when machine reaches `completed`
- [ ] No SSE event published when machine reaches `cancelled`
- [ ] Happy path: completed sessions still get credits + XP + `session_completed` SSE
- [ ] All 4 existing tests pass + 7 new tests pass
- [ ] `tsc --noEmit` clean in `apps/backend`

## Related

- [[Worker-Finding-2026-08-08]] — Root cause analysis from session diagnostics
- [[Session Machine (XState v5)]] — Backend state machine (source of the 3 final states)
- [[Gamification]] — XP system affected by F2
- [[Usage & Quota]] — Credit system affected by F2