---
type: schema
tags:
  - wiki/schema
---

# CLAUDE.md — Flow App (Flow App)

This file contains instructions for LLM agents working in this Obsidian vault. It defines how to interact with the codebase, documentation, and the LLM wiki.

## Project Context

Flow App is an AI-powered content generation platform for B2B marketing teams. It transforms contextual inputs into structured marketing artifacts through deterministic, traceable multi-step LLM pipelines.

**Monorepo structure**: `apps/backend`, `apps/frontend`, `packages/contracts`, `packages/domain`, `packages/infra-db`

**Key technology**: Node.js, React 19, XState v5, Kysely, PostgreSQL, Redis, BullMQ.

---

## Git Branch Policy

### Permanent Branches

| Branch | Scopo | Protezione | Push diretto |
|--------|-------|------------|--------------|
| `main` | Always releasable, produzione | Status checks + linear history | ❌ Solo PR |
| `staging` | Validation pre-prod | Status checks | ❌ Solo PR |
| `dev` | Fast feedback, sviluppo | Nessuna | ✅ Consentito |

### Working Rules

1. **Mai lavorare direttamente su `main` o `staging`**.
2. Tutte le feature/fix partono da `dev` o da branch dedicati.
3. Il flusso è: `feature/*` → `dev` → `staging` → `main`.
4. Dopo ogni merge PR, i branch downstream si sincronizzano automaticamente (`branch-sync.yml`).

### Pre-Session Branch Verification

Prima di iniziare qualsiasi lavoro, verificare:

```bash
# 1. Verifica branch corrente
git branch --show-current

# 2. NON deve essere main o staging
# Se lo è, switcha su dev
git checkout dev

# 3. Allinea dev con upstream
git pull origin dev

# 4. Crea branch di lavoro
git checkout -b feature/<scope>-<short-name>
```

**Regola**: se il branch corrente è `main` o `staging`, STOPPARE e chiedere conferma prima di procedere.

### Wiki Alignment Before Commit

**Ogni commit di codice deve essere preceduto dall'allineamento del Wiki.** Il codice non deve mai essere pushato se il Wiki (`Wiki/`) non riflette le attività svolte nello stage corrente.

**Pre-commit checklist:**

1. Verificare che tutte le modifiche al codice abbiano un corrispettivo nel Wiki:
   - Nuove entità/aggregate → pagina in `Wiki/entities/` o aggiornamento di pagina esistente
   - Nuovi concetti/pattern → pagina in `Wiki/concepts/` o aggiornamento di pagina esistente
   - Modifiche architetturali → aggiornamento di `Wiki/overview.md`
   - Nuove dipendenze/infrastruttura → aggiornamento delle pagine concettuali rilevanti
2. Aggiornare `Wiki/index.md` se sono state aggiunte/modificate pagine
3. Aggiornare `Wiki/log.md` con un'entrata che riepiloga le modifiche wiki effettuate
4. Eseguire `qmd update && qmd embed` per aggiornare l'indice di ricerca

**Regola**: se `git status` mostra modifiche al codice senza corrispondenti modifiche in `Wiki/`, il commit è bloccante. Il Wiki deve essere allineato prima del push.

**Eccezioni**: modifiche puramente cosmetiche (formattazione, typo nei commenti, rename locali senza impatto architetturale) possono essere committate senza aggiornamento Wiki. In caso di dubbio, allineare il Wiki.

---

## Linguistic Separation Policy

Every document in this project belongs to exactly one language category. Never mix languages within a single document body.

### Level 1 — Project Documentation

Three categories with distinct rules:

| Category | Language | Examples |
|----------|----------|----------|
| **Technical documents** | English | Architecture, code comments, API docs, DB schemas, README, infra configs |
| **Product documents** | Italian | PRD, user stories, product briefs, marketing specs, brand guidelines |
| **Proposals & implementation plans** | English | RFC, design proposals, milestone planning, gap analysis |

Consistency rules:

- Never mix English and Italian in the body of the same document
- The document title and all section headings must be in the same language as the body
- YAML frontmatter keys are always in English (regardless of body language)
- **Wiki pages are 100% English.** The wiki is technical documentation — never Italian prose. If Italian text is found in any wiki page during any operation, translate it to English immediately. The only exception is `concepts/Centralized Copy Modules` where Italian strings are the app's copy content itself (not prose).

### Level 2 — Prompt Templates (LLM Instructions)

When writing prompt templates that instruct a language model, separate by channel:

| Channel | Language | Content |
|---------|----------|---------|
| **System instructions** | English | The prompt text itself — rules, constraints, format, behavior |
| **Generated output** | Italian | The artifact the LLM produces, visible to the end user |
| **Awareness labels** | Italian | UI strings the user sees: "Generazione in corso...", "Step 2 di 5", error messages |

**Rationale**: Separating the instruction channel (English) from the output channel (Italian) produces more predictable model behavior. The LLM clearly distinguishes the rules it must follow from the language it must produce.

---

## LLM Wiki

This vault implements the [llm-wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — using LLMs to incrementally build and maintain a persistent, interlinked wiki from raw sources.

### Architecture

Three layers:

1.  **Raw sources** — immutable documents in `doodle/`. Read them, never modify them. These are the ground truth.
2.  **The wiki** (`Wiki/`) — LLM-generated and maintained. Interlinked markdown pages: source summaries, entity pages, concept pages, synthesis.
3.  **The schema** — this file. Instructions that make the LLM a disciplined wiki maintainer.

### Wiki Directory Structure

```
Wiki/
├── index.md          # Content catalog — read this first on every operation
├── log.md            # Append-only operation log
├── overview.md       # High-level synthesis of all knowledge
├── sources/          # One summary per ingested raw source
├── entities/         # People, tools, orgs, repos, bounded contexts
├── concepts/         # Ideas, patterns, techniques, design decisions
└── synthesis/        # Query answers filed back into the wiki
```

### Page Conventions

Every wiki page must include:

```
---
type: <source-summary | entity | concept | synthesis>
tags:
  - wiki/<source | entity | concept | synthesis>
  - wiki/<domain-tag>
date_updated: YYYY-MM-DD
source_count: <N>          # on entity and concept pages
confidence: <high | medium | low>   # on concept pages
---
```

Additional conventions:

- Use `[[wikilinks]]` for all cross-references (enables Obsidian graph view)
- Use `[key::value]` inline metadata where Dataview queries are useful
- Track `date_updated` on every page and update it on any modification
- Tag namespace `wiki/` for all wiki pages to distinguish from other vault content

### Operations

#### Ingest

Process a raw source into the wiki. This is the core operation.

1.  Read the raw source completely
2.  Create a source summary in `Wiki/sources/<SourceName>.md`:
    - Factual summary only — no interpretation
    - Link to the raw source via `[[wikilink]]`
    - List entities and concepts mentioned
3.  Create or update entity pages in `Wiki/entities/`
4.  Create or update concept pages in `Wiki/concepts/`
5.  Update `Wiki/index.md`:
    - Add to Processed Sources table
    - Remove from Unprocessed Sources list
    - Update entity and concept tables
6.  Update `Wiki/overview.md` if the big picture changed
7.  Append to `Wiki/log.md` with `## [YYYY-MM-DD] ingest | <SourceName>`

A single ingest typically touches 5-15 wiki pages. Each entity/concept page should link back to all sources that reference it.

#### Query

Answer questions against the wiki:

1.  Read `Wiki/index.md` to find relevant pages
2.  Read relevant wiki pages (not raw sources — the wiki should have what you need)
3.  Synthesize an answer with wikilinks
4.  If the answer is substantial, file it as a new page in `Wiki/synthesis/`
5.  Update index and log

Filing query answers as synthesis pages compounds knowledge over time.

#### Lint

Health-check the wiki:

- Orphan pages (no inbound links)
- Broken wikilinks (target doesn't exist)
- Stale pages (`date_updated` older than newest relevant source)
- Contradictions between pages
- Concepts mentioned in prose but lacking their own page
- Missing cross-references (entity mentioned on concept page but not linked)

### Critical Rules

1.  **Raw sources are IMMUTABLE.** Never modify files in `doodle/` or any source directory. Even if metadata is wrong, the wiki layer is where you add clarity.
2.  **Always update `Wiki/index.md` and `Wiki/log.md`** on every wiki change. No exceptions.
3.  **Keep source summaries factual.** Interpretation, opinion, and analysis go in concept and synthesis pages.
4.  **When sources contradict each other**, note contradictions explicitly on the relevant concept page. Never silently overwrite. Track which source supports which claim.
5.  **The LLM writes everything in `Wiki/`.** You read it; the LLM writes it. Don't hand-edit wiki pages.
6.  **The schema evolves.** Update this file as patterns emerge.

### Consistency Enforcement Rules

These rules exist to prevent known classes of cross-session errors. Apply them on every wiki write operation.

#### 1 — Verify, don't claim

Never report an operation as complete without enumerating every file that was supposed to be modified and confirming each one was actually updated. If a multi-file operation (e.g. "translate all Italian prose") is performed, read back each target file after writing and list the result in the log entry. A log entry that claims "N files updated" must be backed by an explicit list. A false completion claim is worse than an incomplete one.

#### 2 — Language check on every wiki write

Before finalising any wiki page write, scan the output for Italian prose. The rule is: **Wiki pages are 100% English.** Violations are surgical — translate the Italian sentence in place and continue. Do not defer or batch. The only exception is `concepts/Centralized Copy Modules`, where Italian strings are the app's UI copy (not prose).

Checklist before writing any wiki page:
- [ ] No Italian sentence-level prose in body text
- [ ] No Italian section headings
- [ ] Italian table cell content is acceptable only when it is a literal UI string being documented

#### 3 — `source_count` must match the `## Sources` section

The `source_count:` frontmatter field must equal the number of entries in the `## Sources` section of the same page. Update it whenever sources are added or removed. Never leave it at `0` if the `## Sources` section is non-empty.

#### 4 — No duplicate log entries

Before appending to `Wiki/log.md`, read the last 10 entries. If an entry with the same date and operation type already exists, extend or amend it rather than creating a second one. Two entries for the same event on the same date are never correct.

#### 5 — Anchor links must be verified

Never write a `[[Page#anchor]]` wikilink without first reading the target page and confirming a heading that produces that anchor exists. If the section does not exist, either use `[[Page]]` (linking to the page root) or create the missing section first.

#### 6 — Cross-version naming: always map old names to new

Source summaries preserve original document vocabulary (raw sources are immutable). When a source summary uses names that differ from current wiki canonical names (e.g. old tool slugs, old bounded context labels), add an explicit mapping note at the top of the source summary under a `> **Name mapping**:` blockquote. This prevents a reader from seeing two sets of names with no connection between them.

Example:
> **Name mapping**: `funnel-pages` → `landing-funnel`, `nextland` → `landing-page`, `youtube-lf-script` → `video-script-long-form` (v1 → v3 rename).

#### 7 — Schema authority

**This file (`CLAUDE.md`) is the authoritative schema for all wiki pages.** The file `Wiki/schema/config.md` is an unused artifact from the original llm-wiki OSS plugin and does not reflect the conventions in use. Ignore it when writing or validating pages. Do not reconcile pages against `schema/config.md`.

#### 8 — Zero environment references

**Wiki and repo files must be 100% environment-agnostic.** Never include:

- Hostnames, domains, or proxy URLs (e.g. `*.internal`, `*.proxy.*`)
- IP addresses, ports, or connection strings with real credentials
- API keys, tokens, passwords, or secrets
- Platform-specific identifiers (project IDs, service IDs, environment IDs)
- User emails, user IDs, or seed data identifiers

**Replace with generic placeholders:**

| ❌ Never | ✅ Always |
|----------|----------|
| `real-host.example.com:5432` | `<DB_HOST>:<DB_PORT>` |
| `postgresql://user:pass@host:5432/db` | `<DATABASE_URL>` |
| `redis://default:pass@host:6379` | `<REDIS_URL>` |
| `a0eebc99-...` | `<seed-user-id>` |
| Platform names | `managed PostgreSQL` or `managed Redis` |

**Checklist before writing any wiki page:**
- [ ] No real hostnames or connection strings
- [ ] No platform names — use generic terms
- [ ] No credentials or identifiers
- [ ] Infrastructure references use placeholders only

**Enforcement**: if any leak is found during a wiki write, fix it immediately before committing. A single leak in `Wiki/` or repo is a blocking issue.

#### 9 — Maintenance entries go to the dedicated page, never to index frontmatter

**Pattern**: index.md had 12 `maintenance:` YAML keys in the frontmatter, all duplicates. The last value overwrites earlier ones, making most entries invisible to Dataview and YAML parsers.

**Rule**: every maintenance note must be appended to [[Maintenance Log]] — never to index.md frontmatter or body. `Wiki/index.md` is purely a catalog of pages; it does not carry maintenance state.

```markdown
# ✅ CORRECT — append to Maintenance Log page
Wiki/concepts/Maintenance Log.md:
  ## 2026-08-04
  - Deployed feature X to staging. Build ✅, tests ✅.

# ❌ VIOLATION — anywhere in index.md
Wiki/index.md frontmatter:
  maintenance: 2026-08-04 — deployed feature X
Wiki/index.md body:
  > Maintenance note (2026-08-04): deployed feature X
```

**Checklist after any maintenance operation:**
- [ ] New entry appended to [[Maintenance Log]] under the correct date heading
- [ ] `Wiki/index.md` NOT modified (unless adding a new entity/concept/source to the catalog)
- [ ] `Wiki/log.md` updated with operation type + summary

---

## Domain Design Rules

These rules enforce DDD tactical patterns discovered from governance audits (Phase 0–9) and the [[DDD Domain Design Rules|multi-agent code review (41 findings)]]. Violations introduce technical debt that compounds across bounded contexts. Apply on every domain/application code write.

> **Authoritative reference**: [[DDD Domain Design Rules]] (19 rules with rationale, canonical templates, and code references). This section is the concise, enforceable subset — the wiki page is the full governance document.

### 1 — No `as any` to access private fields in domain aggregates

**Pattern**: aggregate roots that use `(entity as any)._privateField` to mutate child entities violate the encapsulation contract. Child entities must expose explicit delegation methods — even if package-private visibility isn't available in TypeScript, use a clearly named internal setter.

```typescript
// ❌ VIOLATION — Workspace.transferOwnership()
(newOwner as any)._role = 'owner';

// ✅ CORRECT — Add explicit delegation on WorkspaceMembership
// In WorkspaceMembership:
_setRoleAsOwner(): void { this._role = MembershipRole.Owner; }
// In Workspace.transferOwnership():
newOwner._setRoleAsOwner();
```

**Checklist before writing domain mutation code:**
- [ ] No `as any` cast on `this` or any entity private field
- [ ] Child entity exposes a named method for every mutation the aggregate root needs
- [ ] Field remains `private` (not `public` or `protected`)

### 2 — Zero external validation libraries in `packages/domain`

**Pattern**: importing `zod`, `class-validator`, `yup`, or any validation framework into the domain layer couples the domain to infrastructure. Value Objects must validate inline using plain TypeScript.

```typescript
// ❌ VIOLATION — Email.ts
import { z } from 'zod';
const schema = z.string().email();
static create(raw: string): Email { ... schema.safeParse(raw) ... }

// ✅ CORRECT — Inline validation
static create(raw: string): Email {
  const normalized = raw.trim().toLowerCase();
  if (!normalized.includes('@') || normalized.length > 255) {
    throw new InvalidEmailError(raw);
  }
  return new Email(normalized);
}
```

**Checklist before writing domain code:**
- [ ] No `import` from `zod` anywhere under `packages/domain/src/`
- [ ] No `import` from any validation library in domain files
- [ ] Validation logic lives in the value object's `static create()` or `private constructor()`
- [ ] Complex validation extracted to a pure function in `packages/domain/src/shared/`

### 3 — Every domain and application error must extend `DomainError`

**Pattern**: `throw new Error(...)` in domain aggregates, value objects, or application use cases bypasses the `ErrorMapper → HTTP status` pipeline. All errors that reach the API layer MUST be `DomainError` subclasses with `code` and `retryable`.

```typescript
// ❌ VIOLATION — use case
throw new Error('Workspace not found');

// ❌ VIOLATION — aggregate
export class InvalidSessionStateError extends Error { ... }

// ✅ CORRECT
export class WorkspaceNotFoundError extends DomainError {
  readonly code = 'WORKSPACE_NOT_FOUND';
  readonly retryable = false;
  constructor(id: string) { super(`Workspace ${id} not found`); }
}
```

**Checklist before writing domain/application code:**
- [ ] No `throw new Error(` anywhere in `packages/domain/src/`
- [ ] No `throw new Error(` anywhere in `apps/backend/src/application/`
- [ ] Every custom error class extends `DomainError` (not plain `Error`)
- [ ] Every error has an explicit `code` matching a case in `ErrorMapper.toHttpStatus()`

### 4 — Value Objects with constrained domains must be classes, not type aliases

**Pattern**: `type SessionStatus = 'a' | 'b' | 'c'` provides zero runtime validation and zero behavior (no `isTerminal()`, no `canTransitionTo()`). If a value has a finite set of valid states or requires validation, it MUST be a class with `private constructor`, `static` factory, and `equals()`.

```typescript
// ❌ VIOLATION — bare type alias
export type MembershipRole = 'owner' | 'editor' | 'viewer';

// ✅ CORRECT — class value object
export class MembershipRole {
  private constructor(private readonly _value: MembershipRoleValue) {}
  static readonly Owner = new MembershipRole('owner');
  static readonly Editor = new MembershipRole('editor');
  static readonly Viewer = new MembershipRole('viewer');
  static from(value: string): MembershipRole { /* switch with throw */ }
  equals(other: MembershipRole): boolean { return this._value === other._value; }
  toString(): string { return this._value; }
}
```

**Exceptions**: open-ended strings (e.g., `ToolKey` for tool identifiers that may grow unbounded) or truly unconstrained values may remain as type aliases. Document the reason in a comment.

**Checklist before writing domain code:**
- [ ] Every value with a finite set of valid states is a class, not a type alias
- [ ] Class has `private constructor` (no `new` from outside)
- [ ] Class has `static` factory or `static readonly` instances
- [ ] Class has `equals(other: T): boolean`

### 5 — Repository `save()` persists ONLY the aggregate root and its owned entities

**Pattern**: `SessionRepository.save()` inserting into `idempotency_keys` is a side-effect hidden behind a generic method name. Cross-table operations that are not part of the aggregate's owned entity graph must be separate, explicitly-named methods.

```typescript
// ❌ VIOLATION — save() does two unrelated things
async save(session: Session): Promise<void> {
  await this.db.insertInto('sessions').values(...).execute();
  await this.db.insertInto('idempotency_keys').values(...).execute(); // ← side-effect
}

// ✅ CORRECT — separate methods
async save(session: Session): Promise<void> { /* sessions table + artifacts only */ }
async saveIdempotencyKey(hash: string, sessionId: string): Promise<void> { /* idempotency_keys table */ }
```

**Checklist before writing repository code:**
- [ ] `save()` method touches ONLY the aggregate root table + owned entity tables (1:N within the aggregate boundary)
- [ ] Cross-cutting tables (idempotency, events, audit logs) have their own dedicated methods
- [ ] Method name clearly communicates what is being persisted

### 6 — Factory methods follow canonical naming

**Pattern**: inconsistent factory naming across aggregates — `Session.create()`, `Conversation.start()`, `Message.user()/agent()/system()`. Use `create()` for all aggregate root instantiation from business input.

| Entity type | Factory method | Purpose |
|-------------|---------------|---------|
| Aggregate root | `static create(...)` | New entity from business input (generates ID) |
| Aggregate root | `static reconstitute(...)` | Hydration from persistence (takes existing ID) |
| Child entity (role-specific) | `static user(...)`, `static agent(...)` | Specialized factory with role-dependent defaults |

**Checklist before writing domain code:**
- [ ] Every aggregate root has exactly one `static create()` and one `static reconstitute()`
- [ ] No custom factory names on aggregate roots (no `start()`, `begin()`, `init()`)
- [ ] `reconstitute()` accepts all fields verbatim (no validation, no defaults) — the database is the source of truth

### 7 — Aggregate roots follow the canonical template

**Pattern**: every aggregate root must use `private constructor`, carry a `_version` for optimistic locking, return `DomainEvent | null` from business methods, and expose child collections as `ReadonlyArray<T>`.

```typescript
// ✅ CANONICAL — see [[DDD Domain Design Rules#Pattern 7 — Aggregate Root Design]]
export class AggregateRoot {
  private _version: number;
  private _childEntities: ChildEntity[];

  private constructor(readonly id: string, /* all fields */) { ... }

  static create(businessInput: Input): AggregateRoot { /* generates ID, sets defaults */ }
  static reconstitute(/* all fields verbatim */): AggregateRoot { /* pass-through */ }

  doSomething(input: Input): DomainEvent | null {
    // 1. Validate preconditions (throw DomainError on failure)
    // 2. Mutate private state
    // 3. Increment _version
    // 4. Return domain event (or null if internal transition)
  }

  get childEntities(): ReadonlyArray<ChildEntity> { return this._childEntities; }
  get version(): number { return this._version; }
}
```

**Checklist before writing an aggregate root:**
- [ ] `private constructor` — no external `new`
- [ ] `_version` field incremented on every mutation
- [ ] Business methods return `DomainEvent | null`
- [ ] Child collections exposed as `ReadonlyArray<T>`, never as mutable arrays
- [ ] Immutable identity fields are `readonly` in constructor

### 8 — Domain events are immutable DTOs, nothing more

**Pattern**: domain events implement the `DomainEvent` interface (`eventType`, `occurredAt`, `aggregateId`). They carry all data the consumer needs — no callbacks, no behavior, no references to live aggregates.

```typescript
// ✅ CANONICAL
interface DomainEvent {
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
}

class SessionCompleted implements DomainEvent {
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

**Checklist before writing a domain event:**
- [ ] Implements `DomainEvent` interface (all three fields present)
- [ ] All constructor parameters are `readonly`
- [ ] No behavior methods — pure data transfer
- [ ] Carries all information the consumer needs (no callback to source aggregate)

### 9 — Domain-owned lifecycle: domain defines states, XState imports them

**Pattern**: `SessionLifecycle` in `packages/domain` is the single source of truth for states and valid transitions. XState imports it and adds runtime concerns (actors, invocations, persistence). **Never define states in XState that the domain doesn't know about.**

```
packages/domain/SessionLifecycle  ←  defines states, transitions, getValidTransition()
         │ imports
         ▼
apps/backend/sessionMachine       ←  adds actors, guards (delegating to domain VOs), persistence
```

**Checklist before writing state machine code:**
- [ ] All states and transitions are defined in `packages/domain`, never hardcoded in XState
- [ ] XState guards delegate to domain VOs (e.g., `canQueue` → `ReadinessPolicy.evaluate()`) — no inline business logic
- [ ] `Session.apply(event)` is the single entry point for state changes — validates via `SessionLifecycle.getValidTransition()` before mutating
- [ ] Startup validation exists: `validateXStateMatchesDomain()` runs on boot, fails fast on drift

### 10 — Business rules belong in domain Value Objects, never in application services or workflow guards

**Pattern**: logic that was duplicated in `StartSessionUseCase.validateReadiness()` and XState `canQueue` guard now lives in `ReadinessPolicy.evaluate()` — a pure function VO with zero I/O.

```typescript
// ❌ VIOLATION — business logic in application layer
private validateReadiness(tool, data) { /* checks required inputs inline */ }

// ✅ CORRECT — delegate to domain VO
const policy = ReadinessPolicy.from(tool);
const result = policy.evaluate(acquisitionData);
if (!result.isReady) throw new ReadinessError(result.missing);
```

**Checklist before writing business logic:**
- [ ] No business rules in `apps/backend/src/application/` use cases — delegate to domain VOs
- [ ] No business rules in XState guards — delegate to domain VOs
- [ ] New Value Object with behavior: `private constructor` + `static` factory + `equals()`
- [ ] The VO is a pure function: deterministic, zero I/O, zero infrastructure imports

### 11 — Domain enforces permissions for ALL callers; middleware is a performance optimization

**Pattern**: the domain aggregate root (`Workspace.assertIsOwner()`) throws domain errors on invalid operations. HTTP middleware (`requireWorkspaceRole()`) short-circuits requests before use cases, but it is never the sole enforcer. Workers, CLI scripts, and tests all go through the same domain methods.

```
HTTP → Middleware (early reject) → Use Case → Domain (ultimate authority, throws DomainError)
Worker → Use Case → Domain (same method, same enforcement — middleware bypassed intentionally)
```

**Checklist before writing authorization code:**
- [ ] Permission checks live in the domain aggregate root (e.g., `assertIsOwner()`, `canEdit()`)
- [ ] Middleware is an optional optimization — never the only enforcement layer
- [ ] Every permission failure throws a `DomainError` subclass
- [ ] No caller (worker, CLI, test) can bypass domain authorization by skipping middleware

### 12 — Aggregate boundaries are driven by business invariants, not data modeling

**Pattern**: the decision to embed `WorkspaceMembership` inside `Workspace` (rather than as a separate aggregate) is intentional — driven by B2B team sizes (2–10 members) and low concurrency. Document the rationale and revisit conditions.

| Factor | Embed in aggregate | Separate aggregate |
|--------|-------------------|-------------------|
| Expected cardinality | 1–20 | 50+ |
| Concurrency on child | Low (<1 change/hour) | High (many changes/second) |
| Invariant | Must be atomically consistent with root | Eventually consistent is acceptable |

**Checklist before adding an owned entity to an aggregate:**
- [ ] Document the expected cardinality (max entities per aggregate)
- [ ] Document the revisit condition (e.g., "split when >50 members")
- [ ] The child entity cannot be modified independently — all mutations go through the aggregate root
- [ ] Repository `save()` persists root + owned entities in one transaction

### 13 — Long-running processes persist snapshots, not events

**Pattern**: workers persist the XState actor snapshot (`actor.getPersistedSnapshot()`) after every state transition. On retry, resume from the snapshot — no duplicate work. Snapshot methods are cross-cutting (separate from `save()` per Rule 5).

```typescript
// Worker
actor.subscribe(async (state) => {
  await deps.sessionRepo.saveSnapshot(sessionId, JSON.stringify(state));
});
// On retry
const snapshot = await deps.sessionRepo.loadSnapshot(sessionId);
const actor = snapshot
  ? createActor(machine, { snapshot: JSON.parse(snapshot) })
  : createActor(machine, { input: { session, tool } });
```

**Checklist before writing worker/process code:**
- [ ] State is persisted after every transition (not just at the end)
- [ ] On retry, state is resumed from persisted snapshot (not re-executed from start)
- [ ] Snapshot persistence uses dedicated repository methods (not side-effects in `save()`)

### 14 — Idempotency keys are domain Value Objects, not infrastructure strings

**Pattern**: `IdempotencyKey` is a class VO in `packages/domain` with its own format (`userId:workspaceId:toolKey:inputHash:templateVersions`) and generation rules. Persistence uses a dedicated `saveIdempotencyKey()` method (Rule 5). The claim must be atomic.

```typescript
// ✅ Domain VO generates the key, infrastructure persists it
const key = IdempotencyKey.generate({ userId, workspaceId, toolKey, inputHash, templateVersions });
await sessionRepo.save(session);                         // Aggregate
await sessionRepo.saveIdempotencyKey(key.hash, sessionId); // Cross-cutting
```

**Checklist before implementing idempotency:**
- [ ] Key generation lives in `packages/domain` as a class VO
- [ ] Key format includes the prompt version hash to detect template changes
- [ ] Persistence uses a dedicated repository method (not a side-effect in `save()`)
- [ ] The claim operation is atomic (Redis `SET NX` or PostgreSQL `INSERT ON CONFLICT`)

---

## Wiki Content Rules

These rules prevent the structural anti-patterns discovered during wiki health audits (2026-08-02). They apply to every wiki write operation. Numbered independently from Consistency Enforcement Rules (1–8) above and Domain Design Rules (1–14).

### 1 — No split-page syndrome (one topic, one page)

**Pattern**: three or more pages explaining the same concept from slightly different angles (e.g., `IdempotencyKey` + `Idempotency Implementation` + `IdempotencyKey + Prompt Version` — same hash algorithm, same format, same persistence logic across three pages).

**Rule**: if a topic already has two dedicated wiki pages, do not create a third. Extend the most authoritative existing page instead. A concept can have at most **2 pages**: one domain/concept page and one UX/implementation page. Three pages on the same topic is always a split-page syndrome.

```markdown
# ❌ VIOLATION — three pages on the same idempotency concept
Wiki/concepts/IdempotencyKey.md             # Key format
Wiki/concepts/Idempotency Implementation.md  # Redis/DB details
Wiki/concepts/IdempotencyKey + Prompt Version.md  # Version-hash interaction

# ✅ CORRECT — one authoritative page, optional UX companion
Wiki/concepts/Idempotency.md                # Key format + implementation + version interaction
Wiki/concepts/Idempotency UX.md             # Optional: UI patterns only
```

**Checklist before creating a new concept page:**
- [ ] Run `qmd query "<topic>" --no-rerank` to find existing pages on the same topic
- [ ] If 2+ pages already exist, extend the best one — do not create a third
- [ ] If creating a UX companion page, it must contain ONLY UI/design content, not re-explain the domain concept

### 2 — No stub proliferation (pages <50 lines must justify existence)

**Pattern**: 30-line pages with 12 lines of frontmatter, 3 source links, and 4 bullet points of body text. These add index entries and graph complexity without providing value.

**Rule**: a wiki page under 50 lines of body content (excluding frontmatter) must pass the "section test" — could this content live as a `## Section` inside an existing parent page? If yes, merge it.

```markdown
# ❌ VIOLATION — 32-line page that could be a section
Wiki/concepts/Token Budget Control.md       # 4 bullet points, 3 source links
Wiki/concepts/Identity & Access.md          # 10 lines of body content

# ✅ CORRECT — absorbed into parent pages
Wiki/concepts/LLM Gateway - OpenRouter.md   # Added "## Token Budget" section
Wiki/concepts/Auth Dependencies.md          # Absorbed Identity & Access content
```

**Checklist before creating a page <50 lines:**
- [ ] Can this content live as a `## Section` in an existing page? If yes, add it there.
- [ ] If it must be standalone, does it answer a question no other page answers? If not, merge.
- [ ] Does the page have at least 3 unique, non-boilerplate paragraphs? If not, merge.

**Exception**: entity pages (type: entity) may be concise by nature — they describe a single aggregate/entity and link to sources. The 50-line threshold applies to concept and synthesis pages only.

### 3 — Synthesis pages must be referenced (no isolated analysis)

**Pattern**: a synthesis page with 18 outgoing links but only 1 inbound link. It's well-informed (reads everything) but invisible to the graph (nobody reads it back). This defeats the purpose — the wiki compounds when synthesis feeds back into the concepts it analyzes.

**Rule**: every synthesis page must have at least 3 inbound links from the concept/entity pages it references. After writing a synthesis, update the `## Sources` pages to link back to the synthesis.

```markdown
# ❌ VIOLATION — invisible synthesis
synthesis/gamification-proposal.md          # 1 inbound link, 16 outgoing
# No concept page links back to it. The analysis is wasted.

# ✅ CORRECT — bidirectional graph
synthesis/gamification-proposal.md          # 5+ inbound links
concepts/Gamification.md                    # Sources section includes [[gamification-proposal]]
concepts/Achievements & Badges.md           # Sources section includes [[gamification-proposal]]
```

**Checklist after writing a synthesis page:**
- [ ] Identify the 3 most relevant concept pages the synthesis analyzes
- [ ] Add `[[synthesis/page-name]]` to the `## Sources` section of each
- [ ] The synthesis should appear in the "Referenced By" section of at least 3 pages

### 4 — Cross-references must add information, not duplicate it

**Pattern**: pages that cross-reference each other redundantly (A describes X, B also describes X and links to A, C also describes X and links to B). The cross-references create an illusion of structure while the content is triplicated.

**Rule**: when page A links to page B, the content in A must NOT re-explain what B already covers. A should say "see [[B]] for X" and move on. If A needs to explain X, X should only live in A — and B should not duplicate it.

```markdown
# ❌ VIOLATION — gamification roles defined in 3 pages
concepts/Gamification.md            # Defines XP triggers + badges
concepts/Workspace Gamification.md  # Re-defines XP triggers + badges
concepts/Gamification UX.md         # Re-defines XP triggers + UI

# ✅ CORRECT — single source of truth per concept
concepts/Gamification.md            # Authoritative: XP triggers, badges, seasons
concepts/Gamification UX.md         # UI patterns only — "XP triggers: see [[Gamification#XP System]]"
```

**Checklist before adding a cross-reference:**
- [ ] Does the linked page already explain this concept? If yes, reference it — don't re-explain.
- [ ] Does this page contain original information NOT in the linked page? If not, the cross-reference should replace the duplicate content.
- [ ] For every `[[link]]` in a page, verify the linked page is the authoritative source for that concept. If multiple pages claim authority, consolidate.

### 5 — Reference-only pages must have a parent concept

**Pattern**: catalog pages (SQL DDL, CSS tokens, component inventories, API route tables) that exist as standalone references with no concept page explaining WHY the reference exists and HOW to use it.

**Rule**: every reference-only page (catalog, token list, enumeration) must be linked from at least one concept page that provides context and usage guidance. The reference page answers "what"; the concept page answers "why and how."

```markdown
# ❌ VIOLATION — orphan reference page
concepts/Domain Events Catalog.md          # 40+ events, no context page links to it directly

# ✅ CORRECT — reference with parent concept
concepts/Domain Events.md                  # Explains pattern, architecture, usage
concepts/Domain Events Catalog.md          # Linked from Domain Events: "See [[Domain Events Catalog]] for full index"
```

### 6 — Verify code exists before documenting it

**Pattern**: wiki pages describing domain entities, value objects, or API endpoints that do not exist in the codebase. The wiki claims implementation but the code doesn't deliver.

**Rule**: before marking a wiki page as "implemented" or listing a file in a structure tree, verify the corresponding code file exists. If code doesn't exist, mark the wiki section as `> **Planned** — not yet implemented.`

```markdown
# ❌ VIOLATION — wiki claims code that doesn't exist
packages-domain Structure.md:
│   ├── usage/                    # ❌ Directory does not exist in code
│   │   ├── entities/Quota.ts     # ❌ File does not exist

# ✅ CORRECT — wiki reflects reality
> **Implementation note**: The `usage/` bounded context is planned. DB migrations exist (005)
> but domain code is not yet implemented. See [[implementation-roadmap-2026-08-01|Phase plan]].
```

**Checklist before documenting implementation status:**
- [ ] Verify the claimed file/directory exists at the path described
- [ ] If code doesn't exist, use `> **Planned**` or `🔴 Planned` markers, never `✅`
- [ ] Run `scripts/wiki-lint.py` after any status change — it catches broken wikilinks to non-existent pages

---

### Tools

- **Obsidian CLI**: `obsidian read file="..."`, `obsidian search query="..."`, etc. (symlinked to `~/.local/bin/obsidian`)
- **qmd**: Hybrid BM25/vector search with LLM re-ranking (`qmd query "..."`). Must be invoked via `bash` tool — not an internal function.
- **Dataview**: SQL-like queries over YAML frontmatter (in Obsidian)

#### qmd — Proactive Wiki Exploration

**qmd is a CLI tool, not an internal function.** Invoke it via the `bash` tool: `bash "qmd search 'keyword'"`. Never call it as a tool directly — it must run through a shell.

Use `qmd` **proactively** before any wiki operation (ingest, query, lint) to ground yourself in existing wiki knowledge. Never operate on the wiki from scratch — search first, then act.

**Pre-operation workflow:**

1. **Before ingesting** a source → `qmd query "<topics>" --no-rerank` to find overlapping entities/concepts. If models aren't cached, use `qmd search` instead.
2. **Before answering a query** → `qmd query "<terms>" --no-rerank` to discover relevant pages beyond `index.md` listings.
3. **Before linting** → `qmd search "<keywords>"` (BM25) to find orphan candidates.

**Key commands:**

```
qmd search "keyword terms"        # BM25 only (primary — instant, no models needed)
qmd vsearch "semantic concept"    # vector similarity
qmd query "..." --no-rerank       # hybrid BM25 + vector (needs ~1.28GB expansion model)
```

**Always prefer `qmd search`.** It uses BM25 full-text only — instant, deterministic. Use `qmd vsearch` for semantic search. Avoid `qmd query` unless models are pre-downloaded to `~/.cache/qmd/models/`.

**Index maintenance** (after wiki changes): `qmd update && qmd embed`

**Critical rule:** Always run a qmd query before creating a new wiki page. If qmd returns relevant existing pages, read them and link from the new page instead of duplicating content.