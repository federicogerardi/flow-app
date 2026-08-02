---
type: concept
tags:
  - wiki/concept
  - wiki/architecture
  - wiki/governance
date_updated: 2026-08-02
source_count: 20
confidence: high
---

# DDD Domain Design Rules

> **Authoritative governance reference** — every domain and application code write must comply with these rules. Violations introduce technical debt that compounds across bounded contexts.

These rules emerged from governance audits (Phase 0–9) and the [[synthesis/code-review-2026-08-02|multi-agent code review (41 findings)]]. They encode DDD tactical patterns proven in the codebase and enforced during every domain/application write operation.

---

## Rule 1 — No `as any` to access private fields in domain aggregates

**Pattern**: aggregate roots that use `(entity as any)._privateField` to mutate child entities violate the encapsulation contract. Child entities must expose explicit delegation methods.

```typescript
// ❌ VIOLATION — Workspace.transferOwnership()
(newOwner as any)._role = 'owner';

// ✅ CORRECT — Add explicit delegation on WorkspaceMembership
// In WorkspaceMembership:
_setRoleAsOwner(): void { this._role = MembershipRole.Owner; }
// In Workspace.transferOwnership():
newOwner._setRoleAsOwner();
```

**Rationale**: the aggregate root is the single entry point for mutations, but it should delegate to child entity methods — not bypass encapsulation with type casts. This preserves the child entity's invariants and makes the mutation surface explicit.

**Implemented in**: [[WorkspaceMembership]] — `_setRoleAsOwner()` is the sole internal mutation method for ownership transfer.

**Checklist before writing domain mutation code:**
- [ ] No `as any` cast on `this` or any entity private field
- [ ] Child entity exposes a named method for every mutation the aggregate root needs
- [ ] Field remains `private` (not `public` or `protected`)

---

## Rule 2 — Zero external validation libraries in `packages/domain`

**Pattern**: importing `zod`, `class-validator`, `yup`, or any validation framework into the domain layer couples the domain to infrastructure. Value Objects must validate inline using plain TypeScript.

```typescript
// ❌ VIOLATION — Email.ts
import { z } from 'zod';
const schema = z.string().email();
static create(raw: string): Email { ... schema.safeParse(raw) ... }

// ✅ CORRECT — Inline validation (from [[Email]])
static create(raw: string): Email {
  const normalized = raw.trim().toLowerCase();
  if (!normalized.includes('@') || normalized.length > 255) {
    throw new InvalidEmailError(raw);
  }
  return new Email(normalized);
}
```

**Rationale**: the domain package has `typescript` as its only devDependency. Zero runtime dependencies. Validation libraries are infrastructure concerns — they belong in the application or API layer, not in the domain.

**Implemented in**: all value objects under `packages/domain/src/` — `Email.create()`, `SessionStatus.from()`, `MembershipRole.from()`, `AgentKey.from()`, `UserStatus.from()`, `UserRole.from()`.

**Checklist before writing domain code:**
- [ ] No `import` from `zod` anywhere under `packages/domain/src/`
- [ ] No `import` from any validation library in domain files
- [ ] Validation logic lives in the value object's `static create()` or `private constructor()`
- [ ] Complex validation extracted to a pure function in `packages/domain/src/shared/`

---

## Rule 3 — Every domain and application error must extend `DomainError`

**Pattern**: `throw new Error(...)` in domain aggregates, value objects, or application use cases bypasses the `ErrorMapper → HTTP status` pipeline. All errors that reach the API layer MUST be `DomainError` subclasses with `code` and `retryable`.

```typescript
// ❌ VIOLATION — use case
throw new Error('Workspace not found');

// ❌ VIOLATION — domain file
export class InvalidSessionStateError extends Error { ... }

// ✅ CORRECT
export class WorkspaceNotFoundError extends DomainError {
  readonly code = 'WORKSPACE_NOT_FOUND';
  readonly retryable = false;
  constructor(id: string) { super(`Workspace ${id} not found`); }
}
```

**Rationale**: the `ErrorMapper` in `apps/backend/src/api/error-mapper.ts` maps `DomainError.code` to HTTP status codes. A bare `Error` has no `code` — the mapper can't classify it, and the client gets a generic 500. Every error must be traceable and mappable.

**Base class**: [[packages-domain Structure|`DomainError`]] (`packages/domain/src/shared/domain-error.ts`):

```typescript
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly retryable: boolean;
  readonly details?: unknown;
  constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}
```

**Implemented errors across bounded contexts**:

| Context | Error classes |
|---------|--------------|
| generation | `InvalidSessionStateError`, `InvalidSessionStatusError` |
| workspace | `NotWorkspaceOwnerError`, `NotAWorkspaceMemberError`, `MemberAlreadyExistsError`, `CannotRemoveOwnerError`, `NotAnActiveMemberError` |
| workspace (Membership) | `CannotInviteAsOwnerError`, `InvalidMembershipAcceptError`, `CannotAssignOwnerRoleError` |
| agent-chat | `ConversationArchivedError`, `ConversationAlreadyArchivedError`, `ConversationNotFoundError`, `NotConversationParticipantError` |
| identity | `InvalidCredentialsError`, `UserAlreadyExistsError`, `InvalidEmailError` |

**Common error codes used**:

| Code | HTTP Status | Retryable |
|------|-------------|-----------|
| `VALIDATION_ERROR` | 400 | false |
| `INVALID_STATE` | 409 | false |
| `NOT_FOUND` | 404 | false |
| `FORBIDDEN` | 403 | false |
| `SESSION_NOT_FOUND` | 404 | false |
| `CONVERSATION_NOT_FOUND` | 404 | false |
| `WORKSPACE_NOT_FOUND` | 404 | false |

**Checklist before writing domain/application code:**
- [ ] No `throw new Error(` anywhere in `packages/domain/src/`
- [ ] No `throw new Error(` anywhere in `apps/backend/src/application/`
- [ ] Every custom error class extends `DomainError` (not plain `Error`)
- [ ] Every error has an explicit `code` matching a case in `ErrorMapper.toHttpStatus()`

---

## Rule 4 — Value Objects with constrained domains must be classes, not type aliases

**Pattern**: `type SessionStatus = 'a' | 'b' | 'c'` provides zero runtime validation and zero behavior (no `isTerminal()`, no `canTransitionTo()`). If a value has a finite set of valid states or requires validation, it MUST be a class with `private constructor`, `static` factory, and `equals()`.

```typescript
// ❌ VIOLATION — bare type alias
export type MembershipRole = 'owner' | 'editor' | 'viewer';

// ✅ CORRECT — class value object (from [[MembershipRole]])
export type MembershipRoleValue = 'owner' | 'editor' | 'viewer';

export class MembershipRole {
  private constructor(private readonly _value: MembershipRoleValue) {}

  static readonly Owner = new MembershipRole('owner');
  static readonly Editor = new MembershipRole('editor');
  static readonly Viewer = new MembershipRole('viewer');

  static from(value: string): MembershipRole {
    switch (value) {
      case 'owner': return MembershipRole.Owner;
      case 'editor': return MembershipRole.Editor;
      case 'viewer': return MembershipRole.Viewer;
      default: throw new InvalidMembershipRoleError(value);
    }
  }

  equals(other: MembershipRole): boolean { return this._value === other._value; }
  toString(): MembershipRoleValue { return this._value; }
  get value(): MembershipRoleValue { return this._value; }
  get isOwner(): boolean { return this._value === 'owner'; }
  get isEditor(): boolean { return this._value === 'editor'; }
}
```

**Rationale**: class VOs provide:
- Runtime validation in `static from()` — invalid values thrown immediately
- Behavior methods (`isTerminal()`, `isActive()`, `isOwner()`, `isEditor()`) — no scattered `status === 'completed'` checks
- `equals()` for safe comparisons — works with any reference, not just string equality
- `toString()` for serialization — explicit contract for how the value is represented

**Exceptions**: open-ended strings (e.g., `ToolKey` for tool identifiers that may grow unbounded) or truly unconstrained values may remain as type aliases. Document the reason in a comment.

**Implemented class VOs** (16 total across 4 bounded contexts):

| Context | Value Object | States | Key behavior methods |
|---------|-------------|--------|---------------------|
| generation | `SessionStatus` | draft, ready, queued, running, completed, failed, cancelled | `isTerminal()`, `equals()` |
| generation | `ArtifactStatus` | pending, generating, completed, failed | `isTerminal()`, `isComplete()` |
| generation | `ReadinessPolicy` | — | `evaluate(acquisitionData)` |
| generation | `StepNumber` | — | `of(n: number)` |
| generation | `SessionId` | — | `create()`, `equals()` |
| generation | `ArtifactId` | — | `create()`, `equals()` |
| generation | `ArtifactContent` | — | `from(value)`, `toString()` |
| workspace | `MembershipRole` | owner, editor, viewer | `isOwner`, `isEditor`, `isViewer`, `equals()` |
| workspace | `MembershipStatus` | invited, active | `isPending`, `isActive`, `equals()` |
| agent-chat | `ConversationStatus` | active, archived | `isActive`, `isArchived`, `equals()` |
| agent-chat | `MessageRole` | user, agent, system | `isUser`, `isAgent`, `isSystem`, `equals()` |
| agent-chat | `AgentKey` | strategist, copywriter, seo-expert, brand-strategist, analyst, creative-director, research-assistant | `from(value)`, `equals()` |
| identity | `Email` | — | `create(value)` with inline validation |
| identity | `UserRole` | admin, member | `isAdmin`, `isMember`, `equals()` |
| identity | `UserStatus` | active, disabled | `isActive`, `isDisabled`, `equals()` |

**Known debt**: 8 type aliases remain unconverted. See [[synthesis/rule-4-vo-debt|Rule 4 VO Debt]] for the catalog and [[synthesis/phase-9-implementation-plan|Phase 9 plan]] for the conversion roadmap.

**Checklist before writing domain code:**
- [ ] Every value with a finite set of valid states is a class, not a type alias
- [ ] Class has `private constructor` (no `new` from outside)
- [ ] Class has `static` factory (`from()`) or `static readonly` instances
- [ ] Class has `equals(other: T): boolean`

---

## Rule 5 — Repository `save()` persists ONLY the aggregate root and its owned entities

**Pattern**: `SessionRepository.save()` inserting into `idempotency_keys` is a side-effect hidden behind a generic method name. Cross-table operations that are not part of the aggregate's owned entity graph must be separate, explicitly-named methods.

```typescript
// ❌ VIOLATION — save() does two unrelated things
async save(session: Session): Promise<void> {
  await this.db.insertInto('sessions').values(...).execute();
  await this.db.insertInto('idempotency_keys').values(...).execute(); // ← side-effect
}

// ✅ CORRECT — separate methods (from [[SessionRepository]])
async save(session: Session): Promise<void> { /* sessions table + artifacts only */ }
async saveIdempotencyKey(hash: string, sessionId: string): Promise<void> { /* idempotency_keys table */ }
```

**Rationale**: the `save()` method name is generic — consumers expect it to persist the aggregate's owned entity graph. Adding unrelated persistence (idempotency keys, event publishing, audit logs) as side-effects violates the principle of least surprise and makes refactoring dangerous.

**Implemented in**: `SessionRepository` interface ([[SessionRepository]]):

```typescript
export interface SessionRepository {
  findById(id: string): Promise<Session | null>;
  findByIdempotencyKeyHash(hash: string): Promise<Session | null>;
  findByWorkspace(workspaceId: string, filters?: SessionFilters): Promise<Session[]>;
  save(session: Session): Promise<void>;                    // Aggregate root + owned entities only
  saveWithLock(session: Session, expectedVersion: number): Promise<void>;  // Optimistic locking variant
  saveIdempotencyKey(hash: string, sessionId: string): Promise<void>;      // Cross-cutting: separate method
  saveSnapshot(sessionId: string, snapshot: string): Promise<void>;         // Cross-cutting: separate method
  loadSnapshot(sessionId: string): Promise<string | null>;                  // Cross-cutting: separate method
}
```

**Aggregate-owned entity graph per context**:

| Aggregate Root | Owned Entities | Persisted in `save()` |
|---------------|---------------|----------------------|
| `Session` | `Artifact[]` (1:N) | `sessions` + `artifacts` tables |
| `Workspace` | `WorkspaceMembership[]` (1:N) | `workspaces` + `workspace_memberships` tables |
| `Conversation` | `Message[]` (1:N) | `conversations` + `messages` tables |
| `User` | `OAuthAccount[]` (1:N) | `users` + `oauth_accounts` tables |

**Checklist before writing repository code:**
- [ ] `save()` method touches ONLY the aggregate root table + owned entity tables (1:N within the aggregate boundary)
- [ ] Cross-cutting tables (idempotency, events, audit logs) have their own dedicated methods
- [ ] Method name clearly communicates what is being persisted

---

## Rule 6 — Factory methods follow canonical naming

**Pattern**: inconsistent factory naming across aggregates — `Session.create()`, `Conversation.start()`, `Message.user()/agent()/system()`. Use `create()` for all aggregate root instantiation from business input.

| Entity type | Factory method | Purpose |
|-------------|---------------|---------|
| Aggregate root | `static create(...)` | New entity from business input (generates ID) |
| Aggregate root | `static reconstitute(...)` | Hydration from persistence (takes existing ID) |
| Child entity (aggregate-owned) | `static create(...)` | New entity from business input |
| Child entity (aggregate-owned) | `static reconstitute(...)` | Hydration from persistence |
| Child entity (role-specific) | `static user(...)`, `static agent(...)` | Specialized factory with role-dependent defaults |

**Rationale**: canonical naming makes the codebase scannable. Any developer knows that `X.create()` produces a new entity and `X.reconstitute()` hydrates from storage. `reconstitute()` accepts all fields verbatim — no validation, no defaults. The database is the source of truth; rehydration should not second-guess what was persisted.

**Implemented factory methods across aggregates**:

| Aggregate | `static create()` params | `static reconstitute()` params |
|-----------|--------------------------|-------------------------------|
| `Session` | `toolKey, workspaceId, userId, idempotencyKeyHash` | all fields verbatim (13 params) |
| `Artifact` | `sessionId, stepNumber, content` | all fields verbatim (6 params) |
| `Workspace` | `name, createdBy` | all fields verbatim (6 params) |
| `WorkspaceMembership` | `static invite(userId, workspaceId, role, invitedBy)` | all fields verbatim (7 params) |
| `Conversation` | `workspaceId, userId, agentKey` | all fields verbatim (9 params) |

**Known violations** (logged in [[synthesis/code-review-2026-08-02]] — H1, H2, resolved in [[synthesis/high-fix-plan-2026-08-02]]):

| File | Current | Should be | Status |
|------|---------|-----------|--------|
| `Conversation.ts:63` | `static start(...)` | `static create(...)` | ✅ Resolved (H1) |
| `User.ts:32,37` | `static register(...)` + `static fromOAuth(...)` | `static create(...)` | ✅ Resolved (H2) |

**Checklist before writing domain code:**
- [ ] Every aggregate root has exactly one `static create()` and one `static reconstitute()`
- [ ] No custom factory names on aggregate roots (no `start()`, `begin()`, `init()`)
- [ ] `reconstitute()` accepts all fields verbatim (no validation, no defaults) — the database is the source of truth

---

## Pattern 7 — Aggregate Root Design

**Pattern**: every aggregate root follows a consistent structural template derived from the codebase's four implemented aggregates (`Session`, `Workspace`, `Conversation`, `User`).

### Canonical template

```typescript
export class AggregateRoot {
  // --- Private mutable state ---
  private _field: Type;
  private _childEntities: ChildEntity[];
  private _version: number;  // Optimistic locking

  // --- Private constructor ---
  // Accepts ALL fields. No defaults, no validation — just assignment.
  private constructor(
    readonly id: string,           // Identifier, never changes
    readonly immutableField: Type, // Immutable after creation
    // ... all other fields
  ) { ... }

  // --- Factory: new entity from business input ---
  static create(businessInput: Input): AggregateRoot {
    const id = randomUUID();  // Generates ID internally
    return new AggregateRoot(id, /* defaults for new entity */);
  }

  // --- Factory: hydrate from persistence ---
  static reconstitute(/* all fields verbatim */): AggregateRoot {
    return new AggregateRoot(/* pass-through, no change */);
  }

  // --- Business methods (mutate state, return domain events) ---
  doSomething(input: Input): DomainEvent {
    // 1. Validate preconditions
    // 2. Mutate private state
    // 3. Increment _version
    // 4. Return domain event (or null if internal transition)
  }

  // --- Query methods (read-only, no side effects) ---
  canDoSomething(userId: string): boolean { ... }
  getSomething(): ReadonlyArray<ChildEntity> { ... }

  // --- Getters for private mutable state ---
  get field(): Type { return this._field; }
  get version(): number { return this._version; }
}
```

### Key principles

1. **`private constructor`** — no external `new`. All instantiation goes through `create()` or `reconstitute()`.
2. **`_version`** — every aggregate root carries a version for optimistic locking. Incremented on every mutation.
3. **Business methods return `DomainEvent | null`** — internal transitions (`CONFIGURE`, `QUEUE`) return null. Cross-context events (`SessionCompleted`) return a domain event for the application layer to publish.
4. **`ReadonlyArray<T>` for child collections** — prevents external mutation of the aggregate's internal collection. Mutations go through business methods.

### Aggregate-specific patterns

**Session** uses a domain-owned state machine via `SessionLifecycle`:

```typescript
apply(event: SessionEvent): DomainEvent | null {
  const nextState = SessionLifecycle.getValidTransition(this._status, event.type);
  if (!nextState) throw new InvalidSessionStateError(this._status, event.type);
  this._status = nextState;
  this._version++;
  // switch on event.type to apply side effects
}
```

**Workspace** guards owner-only operations with `assertIsOwner()`:

```typescript
private assertIsOwner(userId: string): void {
  if (!this.isOwner(userId)) {
    throw new NotWorkspaceOwnerError(userId, this.workspaceId);
  }
}
```

**Conversation** auto-generates a title from the first user message:

```typescript
addMessage(message: Message): DomainEvent {
  if (!this._title && message.role.isUser) {
    this._title = message.content.slice(0, 80) + (message.content.length > 80 ? '...' : '');
  }
  // ...
}
```

**Implemented in**: `Session.apply()`, `Workspace.inviteMember()`, `Workspace.acceptInvitation()`, `Workspace.transferOwnership()`, `Conversation.addMessage()`, `Conversation.archive()`.

---

## Pattern 8 — Domain Events as Immutable DTOs

**Domain events** are immutable facts about something that happened in the domain. They are the primary mechanism for communication **between bounded contexts** without coupling them directly.

**Interface** (`packages/domain/src/shared/domain-event.ts`):
```typescript
export interface DomainEvent {
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
}
```

**Pattern**: events are plain classes implementing `DomainEvent`. No behavior — just data. They carry all information the consumer needs so no callback to the source aggregate is required.

```typescript
// packages/domain/src/generation/domain-events/SessionCompleted.ts
export class SessionCompleted implements DomainEvent {
  readonly eventType = 'SessionCompleted';
  readonly occurredAt = new Date();
  constructor(
    readonly aggregateId: string,
    readonly sessionId: string,
    readonly workspaceId: string,
    readonly userId: string,
    readonly toolKey: string,
    readonly finalArtifactId: string,
  ) {}
}
```

**Event emitting**: aggregate business methods return `DomainEvent | null`. The application layer (use cases) publishes them through the `DomainEventBus`.

**Catalog**: see [[Domain Events]] and [[Domain Events Catalog]] for the full list of events, publishers, and consumers.

**Implemented events** (12 total):

| Event | Emitted by | Consumed by |
|-------|-----------|-------------|
| `SessionStarted` | `Session` | UI (SSE) |
| `StepCompleted` | `Session` | UI (SSE) |
| `SessionCompleted` | `Session` | Workspace (asset promotion), Usage (credits) |
| `SessionFailed` | `Session` | UI (SSE) |
| `SessionCancelled` | `Session` | UI (SSE) |
| `MemberInvited` | `Workspace` | Notification system |
| `MemberJoined` | `Workspace` | UI |
| `MemberRemoved` | `Workspace` | UI |
| `OwnershipTransferred` | `Workspace` | UI |
| `ConversationStarted` | `Conversation` | UI (SSE) |
| `MessageAdded` | `Conversation` | Agent response trigger, UI (SSE) |
| `ConversationArchived` | `Conversation` | UI |

---

## Pattern 9 — Repository Interface Contracts

**Repository interfaces** live in `packages/domain/src/<context>/repositories/`. They define **what** persistence operations the domain needs, in domain language. Implementations live in `packages/infra-db/src/repositories/`.

**Canonical structure**:

```typescript
export interface AggregateRepository {
  findById(id: string): Promise<Aggregate | null>;
  save(aggregate: Aggregate): Promise<void>;                    // Full save
  saveWithLock(aggregate: Aggregate, expectedVersion: number): Promise<void>;  // Optimistic
  // Domain-specific queries go here
}
```

**Query methods express domain intent**, not SQL:
- `findByWorkspace(workspaceId, filters?)` — not `findWhere({ workspaceId })`
- `findByIdempotencyKeyHash(hash)` — not `findByHash(hash)`
- `findByOwner(userId)` — not `findWhere({ createdBy: userId })`

**Optimistic locking**: `saveWithLock()` takes `expectedVersion` and the repository checks `WHERE version = ?`. If `numUpdatedRows === 0`, it throws `ConcurrencyError extends DomainError`.

**Implemented repository interfaces**: [[SessionRepository]], [[WorkspaceRepository]], `ConversationRepository`, `UserRepository`.

**Checklist before writing repository code:**
- [ ] Interface lives in `packages/domain/src/<context>/repositories/`
- [ ] Method names express domain intent, not SQL mechanics
- [ ] Implementation lives in `packages/infra-db/src/repositories/`
- [ ] `saveWithLock()` uses optimistic locking pattern (`WHERE version = ?`, throw `ConcurrencyError` on 0 rows)

---

## Pattern 10 — Cross-Context References via Shared Value Objects

**Contexts reference each other via shared Value Objects (IDs)**, never through direct entity imports. This prevents tight coupling between bounded contexts.

```typescript
// ✅ Cross-context reference: WorkspaceId is a shared VO
// packages/domain/src/generation/entities/Session.ts
class Session {
  constructor(
    readonly workspaceId: string,  // Reference by ID, not import of Workspace entity
  ) {}
}
```

**Shared identifiers**:

| Shared ID | Defined in | Used by |
|-----------|-----------|---------|
| `workspaceId` (string) | `workspace/` | `generation/`, `agent-chat/` |
| `userId` (string) | `identity/` | `workspace/`, `generation/`, `agent-chat/` |

---

## Pattern 11 — Barrel Exports and Package Boundaries

**Every context exposes a clean `index.ts`.** No consumer imports from internal paths.

```typescript
// ✅ Correct
import { Session, Artifact, SessionRepository } from '@flow-app/domain/generation';

// ❌ Wrong
import { Session } from '@flow-app/domain/generation/entities/Session';
```

**Package boundaries**: `packages/domain` has zero runtime dependencies (only `typescript` as devDependency). It is imported by all other packages but never imports from them.

```
packages/domain ← packages/contracts    (reads types)
                 ← packages/infra-db     (implements repository interfaces)
                 ← apps/backend          (uses entities, VOs, domain services)
                 ← apps/frontend         (uses types via contracts)
```

See [[packages-domain Structure]] for the complete file tree and dependency rules.

---

## Pattern 12 — Domain Services for Cross-Entity Logic

**Domain services** encapsulate business logic that doesn't naturally belong to a single entity. They are stateless, pure functions operating on domain objects.

**Currently implemented**: `ContextEnricher` (`generation/domain-services/ContextEnricher.ts`) — assembles prompt context using serial or hybrid strategy depending on tool configuration.

```typescript
class ContextEnricher {
  enrich(input: EnrichmentInput): EnrichedContext {
    // Pure logic: no I/O, no side effects
    // Operates on domain objects (StepDefinition, Artifact, AcquisitionData)
  }
}
```

**When to create a domain service** vs putting logic in an entity:
- **Entity method**: the logic operates primarily on the entity's own state
- **Domain service**: the logic spans multiple entities, requires external domain data, or is a standalone algorithm

---

## Pattern 13 — Domain-Owned State Machine (SessionLifecycle)

**The domain defines states, valid transitions, and what each state means.** The application layer (XState) imports this definition and adds runtime concerns (actors, invocations, persistence). The domain never depends on the workflow engine.

### Architecture

```
┌── packages/domain ──────────────────────┐
│  SessionLifecycle (pure data)            │  ← single source of truth
│  → states, transitions, final states    │
│  → getValidTransition(status, event)    │
└────────────────┬────────────────────────┘
                 │ imports
                 ▼
┌── apps/backend ─────────────────────────┐
│  sessionMachine (XState v5)              │  ← runtime engine
│  → actors (invoke LLM, persist)         │
│  → guards (ReadinessPolicy delegate)    │
│  → actions (publish events)             │
└─────────────────────────────────────────┘
```

**Rationale**: before Pattern B was applied (2026-07-31), XState defined states/transitions itself and Session had duplicate guard methods. This caused drift — the domain and XState disagreed on what states existed. Now `SessionLifecycle` is the single source; XState imports it and adds only runtime concerns.

### Implementation

```typescript
// packages/domain/src/generation/session-lifecycle.ts

const SessionLifecycle = {
  initialState: 'draft',

  states: {
    draft:     { transitions: { CONFIGURE: 'ready' } },
    ready:     { transitions: { QUEUE: 'queued', CANCEL: 'cancelled' } },
    queued:    { transitions: { WORKER_PICKUP: 'running', CANCEL: 'cancelled' } },
    running:   { transitions: { ADD_ARTIFACT: 'running', COMPLETE: 'completed', FAIL: 'failed', CANCEL: 'cancelled' } },
    completed: { isFinal: true },
    failed:    { isFinal: true },
    cancelled: { isFinal: true },
  },

  getValidTransition(current: SessionStatus, event: SessionEventType): SessionStatus | null {
    const state = this.states[current.toString()];
    return state?.transitions?.[event] ?? null;
  },
};
```

### Startup validation (fail-fast)

At application boot, verify XState states and transitions match `SessionLifecycle`:

```typescript
// apps/backend/src/generation/machines/validate-lifecycle.ts

function validateXStateMatchesDomain(): void {
  for (const state of Object.keys(SessionLifecycle.states)) {
    if (!(state in sessionMachine.config.states!)) {
      throw new Error(`FATAL: XState machine missing state "${state}"`);
    }
  }
  for (const [stateName, stateDef] of Object.entries(SessionLifecycle.states)) {
    if ('transitions' in stateDef) {
      for (const eventName of Object.keys(stateDef.transitions)) {
        if (!(eventName in ((sessionMachine.config.states! as any)[stateName].on ?? {}))) {
          throw new Error(`FATAL: XState missing transition "${stateName} → ${eventName}"`);
        }
      }
    }
  }
}
```

**The server refuses to start** if states or transitions drift. This catches misalignment at deploy time, not at runtime when a user hits an undefined state.

### Key design decisions

| Decision | Description |
|----------|-------------|
| **Domain-owned lifecycle** | `SessionLifecycle` in `packages/domain` is the single source of truth |
| **Single entry point** | `Session.apply(event)` is the only way to change state — validates via `SessionLifecycle.getValidTransition()` then mutates |
| **Guard delegation** | XState `canQueue` delegates to `ReadinessPolicy.evaluate()` (domain VO) — no business logic in guards |
| **Actor injection** | `executeStep` and `persistSession` are injected via `machine.provide()` — no closure captures |
| **Startup validation** | `validateXStateMatchesDomain()` runs on boot — fails fast on drift |
| **Async persistence as invoke** | Persistence is an `invoke` state, not an async action — crash-safe via snapshot resume |

**Implemented in**: [[Session Machine (XState v5)]], `session-lifecycle.ts`, `Session.apply()`, `validate-lifecycle.ts`.

---

## Pattern 14 — Two-Layer Permission Enforcement

**Domain enforces business rules; middleware short-circuits invalid requests.** The domain is the ultimate authority (all callers — HTTP, CLI, worker, test — are subject to the same rules). Middleware adds a performance optimization at the HTTP boundary by rejecting requests before they reach use cases.

### Architecture

```
HTTP Request
    │
    ▼
┌── Middleware (application layer) ────────┐
│  requireWorkspaceRole('owner', 'editor') │  ← Gate: reject early if role insufficient
│  → loads Workspace, checks membership   │
│  → 403 if unauthorized                  │
└────────────────┬────────────────────────┘
                 │ passes
                 ▼
┌── Use Case (application layer) ─────────┐
│  InviteMemberUseCase                    │  ← Orchestration only
└────────────────┬────────────────────────┘
                 │
                 ▼
┌── Domain (packages/domain) ─────────────┐
│  Workspace.inviteMember()               │  ← Ultimate enforcement
│    → assertIsOwner(invitedBy)           │     throws NotWorkspaceOwnerError
│    → checks MemberAlreadyExists         │     throws MemberAlreadyExistsError
│    → creates WorkspaceMembership        │
│    → returns MemberInvited event        │
└─────────────────────────────────────────┘
```

### Rationale

The domain layer enforces rules for **all callers equally**. Whether the call comes from an HTTP handler, a BullMQ worker, a CLI script, or a test — the same `Workspace.inviteMember()` method runs the same `assertIsOwner()` check. No caller can bypass permissions.

The middleware layer is a **performance optimization**: it avoids loading the aggregate and executing the use case when the HTTP caller clearly lacks permission. But it is never the sole enforcer — if middleware is bypassed (e.g., worker calls use case directly), the domain still throws.

### Route guard mapping

```
GET    /api/workspaces/:id              → requireWorkspaceRole('owner', 'editor', 'viewer')
PUT    /api/workspaces/:id              → requireWorkspaceRole('owner')
DELETE /api/workspaces/:id              → requireWorkspaceRole('owner')
POST   /api/workspaces/:id/assets       → requireWorkspaceRole('owner', 'editor')
PUT    /api/workspaces/:wid/assets/:aid → requireWorkspaceRole('owner', 'editor')
DELETE /api/workspaces/:wid/assets/:aid → requireWorkspaceRole('owner', 'editor')
POST   /api/workspaces/:id/invitations  → requireWorkspaceRole('owner')
DELETE /api/workspaces/:id/members/:uid → requireWorkspaceRole('owner')
PUT    /api/workspaces/:id/members/:uid/role → requireWorkspaceRole('owner')
POST   /api/workspaces/:id/transfer-ownership → requireWorkspaceRole('owner')
```

**Admin bypass**: users with `role === 'admin'` skip workspace-level permission checks entirely — handled in middleware, not domain.

**Implemented in**: [[Workspace]] (domain: `assertIsOwner()`, `isMember()`, `canEdit()`, `canView()`), [[Workspace Permissions]] (middleware: `requireWorkspaceRole()`).

---

## Pattern 15 — Value Object as Business Rule Encapsulation

**Value Objects can carry behavior beyond simple validation — they encapsulate business rules that would otherwise leak into application services or workflow guards.**

### Example: ReadinessPolicy

Before `ReadinessPolicy`, the "is this session ready to queue?" logic was duplicated in two places:
1. `StartSessionUseCase.validateReadiness()` — inline logic checking required inputs
2. XState `canQueue` guard — same logic, different expression

Both were wrong: business logic in the application/workflow layer.

```typescript
// ❌ BEFORE — business logic leaked into application layer
private validateReadiness(tool, data) {
  const missing = [];
  for (const input of tool.acquisition.files ?? []) {
    if (input.required && !data.fileContents[input.key]) {
      missing.push(input);
    }
  }
  // ... duplicated in XState guard too
}

// ✅ AFTER — business rule encapsulated in domain VO
const policy = ReadinessPolicy.from(tool);
const result = policy.evaluate(acquisitionData);
if (!result.isReady) throw new ReadinessError(result.missing);
```

**`ReadinessPolicy`** (`packages/domain/src/generation/value-objects/ReadinessPolicy.ts`):

```typescript
class ReadinessPolicy {
  private constructor(private readonly tool: ToolDefinition) {}

  static from(tool: ToolDefinition): ReadinessPolicy {
    return new ReadinessPolicy(tool);
  }

  evaluate(data: AcquisitionData): ReadinessResult {
    const missing: MissingInput[] = [];

    for (const input of this.tool.acquisition.userText ?? []) {
      if (input.required && !data.userInputs[input.key]) {
        missing.push({ type: 'text', key: input.key, label: input.label });
      }
    }
    for (const input of this.tool.acquisition.files ?? []) {
      if (input.required && !data.fileContents[input.key]) {
        missing.push({ type: 'file', key: input.key, label: input.label });
      }
    }
    for (const input of this.tool.acquisition.assets ?? []) {
      if (input.required && !data.resolvedAssets.has(input.assetType)) {
        missing.push({ type: 'asset', key: input.assetType, label: input.assetType });
      }
    }

    return missing.length === 0
      ? ReadinessResult.ready()
      : ReadinessResult.notReady(missing);
  }
}
```

**Key properties**:
- **Pure function** — `evaluate()` is deterministic (same tool + same data → same result)
- **Zero I/O** — no database calls, no API calls, no file access
- **Single source of truth** — used by both `StartSessionUseCase` and XState `canQueue` guard
- **No infrastructure dependency** — lives in `packages/domain` with zero imports from infrastructure

**When to encapsulate business rules in a VO vs an entity method vs a domain service**:

| Location | When |
|----------|------|
| **Entity method** | The rule operates on the entity's own private state |
| **Value Object** | The rule is stateless, deterministic, and reusable across multiple callers |
| **Domain service** | The rule spans multiple entity types or requires orchestration |

**Implemented in**: [[ReadinessPolicy]], `SessionStatus.isTerminal()`, `MembershipRole.isOwner/isEditor/isViewer`, `ConversationStatus.isActive/isArchived`.

---

## Pattern 16 — Aggregate Transaction Boundaries by Team Size

**Aggregate design decisions are driven by business invariants and expected concurrency, not by data modeling convenience.** The key question: *"Does this entity change independently, or must it change atomically with the aggregate root?"*

### Example: WorkspaceMembership inside Workspace

`WorkspaceMembership` lives **inside** the `Workspace` aggregate root. This means all membership operations — invite, accept, remove, role change, transfer ownership — are transactional with the workspace.

```
Workspace (Aggregate Root)
├── WorkspaceMembership[]     ← 1:N, transactional with workspace
│     ├── userId
│     ├── role: owner | editor | viewer
│     └── status: invited | active
└── Asset[]                   ← 1:N (planned, not yet implemented)
```

**Rationale**: for small B2B teams (2–10 members), membership changes are infrequent and low-concurrency. Embedding memberships in the workspace aggregate:
- Guarantees consistency (invite + role change in one transaction)
- Avoids eventual consistency complexity (no saga/orchestration needed)
- Simplifies repository (`save()` persists workspace + memberships together)

**If team size grows** (50+ members, frequent concurrent membership changes), the aggregate would be split: `WorkspaceMembership` becomes its own aggregate root with eventual consistency via domain events. This is a deliberate design decision, not an oversight.

### Design rule

| Factor | Embed in aggregate | Separate aggregate |
|--------|-------------------|-------------------|
| Expected cardinality | 1–20 | 50+ |
| Concurrency on child | Low (<1 change/hour) | High (many changes/second) |
| Invariant | Must be atomically consistent with root | Eventually consistent is acceptable |
| Transaction scope | Same DB transaction | Separate transaction + domain event |

### Aggregate boundaries matrix

| Aggregate Root | Owned Entities | Cardinality | Rationale |
|---------------|---------------|-------------|-----------|
| `Session` | `Artifact[]` | 1–10 | Artifacts are created sequentially, never modified independently |
| `Workspace` | `WorkspaceMembership[]` | 2–10 | Membership changes are infrequent in B2B teams |
| `Conversation` | `Message[]` | 1–100+ | Messages are append-only, never modified after creation |
| `User` | `OAuthAccount[]` | 1–5 | OAuth accounts are linked at registration, rarely change |

**Decision to revisit** when any aggregate's child collection exceeds 50 entities or experiences concurrent mutations from multiple actors.

**Implemented in**: [[Workspace]] (memberships as owned entities), [[Workspace Sharing]] (team size rationale).

---

## Pattern 17 — Snapshot-Based Crash Recovery

**Long-running processes persist their state after every transition.** If the process crashes, it resumes from the last persisted snapshot — no duplicate work, no lost progress.

### Architecture

```
Worker processing Step 3 of 4 → crashes
    │
    ▼
BullMQ retries job (attempt 2)
    │
    ▼
Worker loads Session + snapshot from DB
    │
    ▼
Actor resumes from Step 3, not Step 1
    │
    ▼
No duplicate work, no lost progress
```

### Implementation

```typescript
// apps/backend/src/generation/worker/session-worker.ts

async function processSessionJob(job, deps): Promise<void> {
  const session = await deps.sessionRepo.findById(sessionId);

  // Try to resume from persisted snapshot
  const snapshot = await deps.sessionRepo.loadSnapshot(sessionId);

  const machine = deps.buildMachine({ processStepUC, sessionRepo });
  const actor = snapshot
    ? createActor(machine, { snapshot: JSON.parse(snapshot) })
    : createActor(machine, { input: { session, tool } });

  // Persist snapshot on every state change
  actor.subscribe(async (state) => {
    await deps.sessionRepo.saveSnapshot(sessionId, JSON.stringify(state));
  });

  actor.start();
  // ...
}
```

**Repository interface** (cross-cutting, separate from `save()` — per Rule 5):

```typescript
// packages/domain/src/generation/repositories/SessionRepository.ts
export interface SessionRepository {
  // ...
  saveSnapshot(sessionId: string, snapshot: string): Promise<void>;   // Cross-cutting
  loadSnapshot(sessionId: string): Promise<string | null>;            // Cross-cutting
}
```

### Why snapshots, not event sourcing

Event sourcing replays all events to reconstruct state. Snapshots store the entire XState state object at a point in time. For this use case, snapshots are simpler:
- Single read to resume (not N event replays)
- No event store or projection needed
- XState natively supports snapshot serialization/deserialization

**Implemented in**: [[BullMQ Worker Wiring]] (`session_snapshots` table, `saveSnapshot()`/`loadSnapshot()` methods), `SessionRepository` interface.

---

## Pattern 18 — Idempotency as a Domain Value Object

**The idempotency key is a first-class domain concept, not an infrastructure detail.** It lives in `packages/domain` as a Value Object with its own format, generation rules, and invariants.

### Domain definition

```typescript
// packages/domain/src/generation/value-objects/IdempotencyKey.ts

class IdempotencyKey {
  private constructor(readonly hash: string) {}

  static generate(params: IdempotencyKeyParams): IdempotencyKey {
    const components = [
      params.userId,
      params.workspaceId,
      params.toolKey,
      params.inputHash,           // hash of all user inputs
      params.templateVersions,    // hash of (stepLabel:version) pairs
    ].join('|');
    return new IdempotencyKey(sha256(components));
  }
}
```

### Key format

```
{userId}:{workspaceId}:{toolKey}:{contentHash}:{templateVersionsHash}
```

**Why the prompt version is included**: changing the template version changes generation behavior. If the version were excluded, retrying with identical inputs after a template update would silently return old artifacts. Including the version ensures "same inputs → same behavior → same result."

### Separation from persistence

The idempotency key is generated in the domain layer (`IdempotencyKey.generate()`), but persistence is an infrastructure concern. The repository exposes a dedicated method (per Rule 5):

```typescript
// Repository interface — domain layer
saveIdempotencyKey(hash: string, sessionId: string): Promise<void>;

// Usage in StartSessionUseCase — application layer
const session = Session.create(toolKey, workspaceId, userId, key.hash);
await this.sessionRepo.save(session);                        // Aggregate
await this.sessionRepo.saveIdempotencyKey(key.hash, sessionId); // Cross-cutting
```

### Atomic claim

The claim must be atomic — no race condition between check and insert. Two implementations:
- **Redis** (primary): `SET key value NX EX 86400` — atomic "set if not exists"
- **PostgreSQL** (fallback): `INSERT INTO idempotency_keys ON CONFLICT DO NOTHING` in a transaction

**Temporal**: 24h Redis TTL, 7d PostgreSQL retention with hourly cleanup job.

**Implemented in**: [[Idempotency]], `SessionRepository.saveIdempotencyKey()`.

---

## Pattern 19 — Fail-Fast Startup Validation

**At application boot, verify all domain–infrastructure integration points.** If any validation fails, the server refuses to start — preventing silent runtime failures.

### Validations at startup

| Validation | Source | Failure mode |
|-----------|--------|-------------|
| XState states match `SessionLifecycle` | [[Session Machine (XState v5)]] | Missing state → `FATAL: XState machine missing state` |
| XState transitions match domain | [[Session Machine (XState v5)]] | Missing transition → `FATAL: XState missing transition` |
| All `ToolDefinition` templates exist | [[Prompt Versioning]] | Missing template → server refuses to start |
| Prompt version symlinks resolve | [[Prompt Versioning]] | Broken symlink → server refuses to start |
| All referenced prompt components exist | [[Prompt Components]] | Missing component → server refuses to start |
| Production env disallows `latest` | [[Prompt Versioning]] | Dev-only flag in production → server refuses to start |

### Rationale

Drift between domain and infrastructure is the most common source of production bugs. A template moved on disk won't fail until a user clicks "Generate" — by then, it's a production incident. Startup validation catches these at deploy time.

**Pattern**: every integration point between domain definitions and runtime infrastructure must have a startup validation check. The check:
1. Runs synchronously at boot (before `app.listen()`)
2. Fails fast with an explicit error message naming the mismatch
3. Prevents the server from accepting traffic until resolved

**Implemented in**: `validateXStateMatchesDomain()` ([[Session Machine (XState v5)|session machine startup validation]]), prompt template existence checks ([[Prompt Versioning|prompt versioning startup validation]]).

---

## Governance and Enforcement

These rules are enforced by:
1. **CLAUDE.md** — agent system prompt includes all 6 core rules as mandatory checks
2. **Code review** — [[synthesis/code-review-2026-08-02]] identified 4 DDD violations (H1–H3, H10). All resolved via [[synthesis/high-fix-plan-2026-08-02]] (✅).
3. **Phase 9 remediation** — [[synthesis/rule-4-vo-debt|8 type-alias VOs]] converted to classes, zero `throw new Error` in domain, zero `as any` in domain files
4. **CI** — typecheck (`tsc --noEmit`) runs on every PR; domain errors without proper `DomainError` extension cause compile failures

### Quick reference: anti-patterns to avoid

| Anti-pattern | Example | Should be |
|-------------|---------|-----------|
| Anemic domain model | Entity with only getters/setters | Entity with business methods |
| Fat services | Use case contains business logic | Logic lives in domain entities/VOs |
| Primitive obsession | `status: string` everywhere | `SessionStatus` class with behavior |
| Validation in application layer | `if (email.includes('@'))` in use case | `Email.create()` in domain |
| Direct entity import across contexts | `import { Workspace } from '../workspace/...'` in Session | Reference by ID string |
| Bare `throw new Error()` | `throw new Error('not found')` | `throw new XNotFoundError extends DomainError` |

---

## Sources

- [[sources/APP-CONCEPT]] — Monorepo structure, domain boundaries
- [[sources/PRD]] — NFR-M02 (domain isolation), FR-W01 to FR-W05
- [[sources/STARTUP]] — Domain model, API design
- [[sources/USER-STORIES]] — All epics, cross-context flows
- [[packages-domain Structure]] — Complete file tree, dependency rules, barrel exports
- [[Domain Events]] — Event architecture, delivery semantics, outbox pattern
- [[Domain Events Catalog]] — Full event reference with schemas and subscribers
- [[Application Services]] — Use case patterns, orchestration flow
- [[synthesis/code-review-2026-08-02]] — 41 findings including 4 DDD violations (H1–H3, H10)
- [[synthesis/high-fix-plan-2026-08-02]] — Remediation plan for H1–H10
- [[synthesis/critical-fix-plan-2026-08-02]] — Critical findings remediation (C1–C8)
- [[synthesis/rule-4-vo-debt]] — 8 type-alias VOs catalogued with conversion roadmap
- [[synthesis/phase-9-implementation-plan]] — Phase 9 DDD remediation targets
- [[Session Machine (XState v5)]] — Domain-owned state machine, startup validation (Pattern 13, 19)
- [[Workspace Permissions]] — Two-layer enforcement, permission matrix (Pattern 14)
- [[ReadinessPolicy]] — VO as business rule encapsulation (Pattern 15)
- [[Workspace Sharing]] — Aggregate transaction boundaries (Pattern 16)
- [[BullMQ Worker Wiring]] — Snapshot-based crash recovery (Pattern 17)
- [[Idempotency]] — IdempotencyKey as domain VO, atomic claim (Pattern 18)
- [[Prompt Versioning]] — Fail-fast startup validation (Pattern 19)