---
type: concept
tags:
  - wiki/concept
  - wiki/architecture
date_updated: 2026-07-30
source_count: 4
confidence: high
---

# Domain Events Catalog

> Authoritative reference for all domain events in Flow App

## Architecture

Domain events are **immutable DTOs** defined in `packages/domain`. They are published by aggregate roots and consumed by handlers in `apps/backend`. The `DomainEventBus` (in-process, fire-and-forget) delivers them to subscribers.

```
Aggregate Root                  DomainEventBus                  Handlers
──────────────                  ──────────────                  ────────
Session.complete()              eventBus.publish()              PromoteToAssetUseCase
  └── new SessionCompleted ───▶ SessionCompleted ────────────▶  ConsumeCreditsUseCase
                                                                UI progress (SSE)
```

## Event Index

| Event | Emitter | Consumers | Payload |
|-------|---------|-----------|---------|
| `SessionStarted` | [[Session]] | UI (SSE), Monitoring | sessionId, toolKey, workspaceId, userId |
| `StepCompleted` | [[Session]] | UI (SSE progress) | sessionId, stepNumber, stepLabel, artifactId |
| `SessionCompleted` | [[Session]] | [[Asset Promotion]], [[Usage & Quota]], UI | sessionId, workspaceId, userId, toolKey, finalArtifact |
| `SessionFailed` | [[Session]] | UI, Monitoring | sessionId, stepNumber, errorCode, errorMessage |
| `SessionCancelled` | [[Session]] | UI | sessionId, cancelledAt |
| `AssetCreated` | [[Workspace]] | UI (Knowledge Panel) | workspaceId, assetId, assetType |
| `AssetUpdated` | [[Workspace]] | UI | workspaceId, assetId, assetType |
| `QuotaExceeded` | [[Quota]] | UI, Session gate | userId, period, limit, consumed |
| `CreditConsumed` | [[Quota]] | Audit trail | userId, amount, sessionId |

---

## Event Definitions

### `SessionStarted`

```typescript
// packages/domain/src/generation/domain-events/SessionStarted.ts

class SessionStarted implements DomainEvent {
  readonly eventType = 'SessionStarted';
  readonly occurredAt: DateTime;

  constructor(
    readonly sessionId: SessionId,
    readonly toolKey: ToolKey,
    readonly workspaceId: WorkspaceId,
    readonly userId: UserId,
  ) {}
}
```

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `sessionId` | `SessionId` | Identificativo sessione |
| `toolKey` | `ToolKey` | Riferimento al [[Tool as Static Configuration|ToolDefinition]] |
| `workspaceId` | `WorkspaceId` | Workspace proprietario |
| `userId` | `UserId` | Utente che ha avviato la generazione |

**Trigger**: `Session.start()` — transizione `ready → running`

**Consumers**:
- UI: avvia connessione SSE per progresso real-time
- Monitoring: traccia inizio job

---

### `StepCompleted`

```typescript
class StepCompleted implements DomainEvent {
  readonly eventType = 'StepCompleted';
  readonly occurredAt: DateTime;

  constructor(
    readonly sessionId: SessionId,
    readonly stepNumber: StepNumber,
    readonly stepLabel: string,
    readonly artifactId: ArtifactId,
    readonly isLast: boolean,
  ) {}
}
```

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `sessionId` | `SessionId` | Sessione corrente |
| `stepNumber` | `StepNumber` | Ordinale dello step completato |
| `stepLabel` | `string` | Etichetta human-readable |
| `artifactId` | `ArtifactId` | Artifact prodotto |
| `isLast` | `boolean` | È l'ultimo step? (prepara UI alla chiusura) |

**Trigger**: `Session.addArtifact(artifact)` — dopo ogni step completato

**Consumers**:
- UI: aggiorna progress bar, mostra card step completato

---

### `SessionCompleted`

```typescript
class SessionCompleted implements DomainEvent {
  readonly eventType = 'SessionCompleted';
  readonly occurredAt: DateTime;

  constructor(
    readonly sessionId: SessionId,
    readonly toolKey: ToolKey,
    readonly workspaceId: WorkspaceId,
    readonly userId: UserId,
    readonly finalArtifact: {
      readonly artifactId: ArtifactId;
      readonly content: ArtifactContent;
    },
  ) {}
}
```

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `sessionId` | `SessionId` | Sessione completata |
| `toolKey` | `ToolKey` | Tool usato (per determinare se promovibile) |
| `workspaceId` | `WorkspaceId` | Workspace di destinazione |
| `userId` | `UserId` | Utente (per consumo crediti) |
| `finalArtifact` | `{ artifactId, content }` | Artifact finale (solo id + contenuto, non l'intero oggetto) |

**Trigger**: `Session.complete()` — ultimo step terminato con successo

**Consumers**:

| Handler | Azione |
|---------|--------|
| `PromoteToAssetUseCase` | Se `toolKey` è un asset tool, chiama `Workspace.addAsset()` |
| `ConsumeCreditsUseCase` | Chiama `Quota.consume()` per dedurre crediti |
| UI (SSE) | Notifica completamento, abilita download e pulsante promozione |

**Cross-context contract**: il payload deve contenere tutto ciò che serve ai consumer. Nessun consumer deve chiamare `SessionRepository.findById()` — l'evento è autosufficiente.

---

### `SessionFailed`

```typescript
class SessionFailed implements DomainEvent {
  readonly eventType = 'SessionFailed';
  readonly occurredAt: DateTime;

  constructor(
    readonly sessionId: SessionId,
    readonly toolKey: ToolKey,
    readonly failedAtStep: StepNumber,
    readonly errorCode: string,
    readonly errorMessage: string,
  ) {}
}
```

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `sessionId` | `SessionId` | Sessione fallita |
| `toolKey` | `ToolKey` | Tool in esecuzione |
| `failedAtStep` | `StepNumber` | Step in cui si è verificato l'errore |
| `errorCode` | `string` | Codice errore (es. `LLM_TIMEOUT`, `API_RATE_LIMITED`) |
| `errorMessage` | `string` | Messaggio human-readable per UI |

**Trigger**: Errore in qualsiasi step (LLM timeout, API down, parsing fallito)

**Consumers**:
- UI: mostra errore con messaggio azionabile e pulsante retry
- Monitoring: alert se error rate > soglia

---

### `SessionCancelled`

```typescript
class SessionCancelled implements DomainEvent {
  readonly eventType = 'SessionCancelled';
  readonly occurredAt: DateTime;

  constructor(
    readonly sessionId: SessionId,
    readonly cancelledAtStep: StepNumber,
  ) {}
}
```

**Trigger**: Utente chiama cancel durante `running`

**Consumers**: UI (rimuove progress indicator)

---

### `AssetCreated`

```typescript
class AssetCreated implements DomainEvent {
  readonly eventType = 'AssetCreated';
  readonly occurredAt: DateTime;

  constructor(
    readonly workspaceId: WorkspaceId,
    readonly assetId: AssetId,
    readonly assetType: AssetType,
    readonly source: AssetSource,
  ) {}
}
```

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `workspaceId` | `WorkspaceId` | Workspace contenitore |
| `assetId` | `AssetId` | Nuovo asset |
| `assetType` | `AssetType` | Tipo (brief, brand-voice, persona, angle) |
| `source` | `AssetSource` | `generated` | `uploaded` | `manual` |

**Trigger**: `Workspace.addAsset()` — dopo creazione asset

**Consumers**:
- UI: aggiorna Knowledge Panel, mostra notifica

---

### `AssetUpdated`

```typescript
class AssetUpdated implements DomainEvent {
  readonly eventType = 'AssetUpdated';
  readonly occurredAt: DateTime;

  constructor(
    readonly workspaceId: WorkspaceId,
    readonly assetId: AssetId,
    readonly assetType: AssetType,
  ) {}
}
```

**Trigger**: Contenuto asset modificato

**Consumers**: UI (refresh Knowledge Panel)

---

### `QuotaExceeded`

```typescript
class QuotaExceeded implements DomainEvent {
  readonly eventType = 'QuotaExceeded';
  readonly occurredAt: DateTime;

  constructor(
    readonly userId: UserId,
    readonly period: QuotaPeriod,
    readonly limit: CreditAmount,
    readonly consumed: CreditAmount,
  ) {}
}
```

**Trigger**: `Quota.consume()` quando `consumed >= limit`

**Consumers**:
- UI: blocca pulsante "Genera", mostra avviso quota esaurita
- Notification: email/alert admin

---

### `CreditConsumed`

```typescript
class CreditConsumed implements DomainEvent {
  readonly eventType = 'CreditConsumed';
  readonly occurredAt: DateTime;

  constructor(
    readonly userId: UserId,
    readonly amount: CreditAmount,
    readonly sessionId: SessionId,
    readonly remaining: CreditAmount,
  ) {}
}
```

**Trigger**: `Quota.consume()` dopo deduzione credito

**Consumers**:
- UI: aggiorna counter crediti in workspace
- Audit trail: `quota_history` in PostgreSQL

---

## Event Flow — Sequenza completa

```
SessionMachine (XState)
│
├── ready → running
│   └── publish SessionStarted
│         ├── UI: apri SSE
│         └── Monitoring: traccia job
│
├── running: executingStep → stepCompleted (× N-1)
│   └── publish StepCompleted × (N-1)
│         └── UI: aggiorna progress bar
│
├── running: executingStep → stepCompleted (ultimo step)
│   ├── publish StepCompleted (isLast: true)
│   │     └── UI: step finale completato
│   └── publish SessionCompleted
│         ├── PromoteToAssetUseCase
│         │     └── Workspace.addAsset()
│         │           └── publish AssetCreated
│         │                 └── UI: aggiorna Knowledge Panel
│         ├── ConsumeCreditsUseCase
│         │     └── Quota.consume()
│         │           ├── publish CreditConsumed
│         │           │     └── UI: aggiorna counter
│         │           └── (se quota esaurita) publish QuotaExceeded
│         │                 └── UI: blocca nuove generazioni
│         └── UI: mostra risultato finale, download
│
└── (errore)
    └── publish SessionFailed
          └── UI: mostra errore + retry
```

---

## Implementation

### Base Interface

```typescript
// packages/domain/src/shared/domain-event.ts

interface DomainEvent {
  readonly eventType: string;
  readonly occurredAt: DateTime;
}
```

### EventBus

```typescript
// apps/backend/src/infrastructure/event-bus.ts

class DomainEventBus {
  private handlers = new Map<string, EventHandler[]>();

  publish<T extends DomainEvent>(event: T): void {
    const handlers = this.handlers.get(event.eventType) ?? [];
    for (const handler of handlers) {
      void (handler as EventHandler<T>)(event).catch(err =>
        logger.error({ err, eventType: event.eventType }, 'EventHandler failed')
      );
    }
  }

  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...existing, handler]);
  }
}

export const eventBus = new DomainEventBus();
```

### Subscription Bootstrap

```typescript
// apps/backend/src/application/handlers/bootstrap.ts

export function bootstrapEventHandlers(): void {
  eventBus.subscribe('SessionCompleted', async (e: SessionCompleted) => {
    await promoteToAssetUseCase.execute(e);
  });

  eventBus.subscribe('SessionCompleted', async (e: SessionCompleted) => {
    await consumeCreditsUseCase.execute(e);
  });
}
```

## Rules

1. **Eventi sono DTO immutabili** — nessuna logica, solo dati
2. **Payload autosufficiente** — il consumer non deve mai chiamare repository per completare l'informazione
3. **Fire-and-forget** — il publisher non aspetta i consumer. Se un handler fallisce, logga e continua
4. **Nessun ordinamento garantito** — due handler dello stesso evento possono eseguire in qualsiasi ordine
5. **Eventi nel dominio, bus nell'application layer** — `packages/domain` definisce le classi, `apps/backend` le consegna

## Sources

- [[doodle/APP-CONCEPT]] — BE-Driven workflow, event bridge
- [[doodle/PRD]] — Idempotency, audit trail, observability
- [[doodle/STARTUP]] — Domain rules
- [[doodle/USER-STORIES]] — SSE progress, real-time updates