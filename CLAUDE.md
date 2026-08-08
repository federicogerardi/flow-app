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

| Branch | Purpose | Protection | Direct push |
|--------|---------|------------|--------------|
| `main` | Always releasable, production | Status checks + linear history | ❌ PR only |
| `staging` | Pre-production validation | Status checks | ❌ PR only |
| `dev` | Fast feedback, development | None | ✅ Allowed |

### Working Rules

1. **Never work directly on `main` or `staging`**.
2. All features/fixes start from `dev` or dedicated branches.
3. The flow is: `feature/*` → `dev` → `staging` → `main`.
4. After each PR merge, downstream branches sync automatically (`branch-sync.yml`).

### Pre-Session Branch Verification

Before starting any work, verify:

```bash
# 1. Verify current branch
git branch --show-current

# 2. Must NOT be main or staging
# If it is, switch to dev
git checkout dev

# 3. Align dev with upstream
git pull origin dev

# 4. Create working branch
git checkout -b feature/<scope>-<short-name>
```

**Rule**: if the current branch is `main` or `staging`, STOP and ask for confirmation before proceeding.

### Wiki Alignment Before Commit

**Every code commit must be preceded by Wiki alignment.** Code must never be pushed if the Wiki (`Wiki/`) does not reflect the activities performed in the current stage.

**Pre-commit checklist:**

1. Verify that all code changes have a corresponding entry in the Wiki:
   - New entities/aggregates → page in `Wiki/entities/` or update existing page
   - New concepts/patterns → page in `Wiki/concepts/` or update existing page
   - Architectural changes → update `Wiki/overview.md`
   - New dependencies/infrastructure → update relevant concept pages
2. Update `Wiki/index.md` if pages were added/modified
3. Update `Wiki/log.md` with an entry summarizing the wiki changes made
4. Run `qmd update && qmd embed` to update the search index

**Rule**: if `git status` shows code changes without corresponding changes in `Wiki/`, the commit is blocked. The Wiki must be aligned before pushing.

**Exceptions**: purely cosmetic changes (formatting, typos in comments, local renames without architectural impact) may be committed without Wiki update. When in doubt, align the Wiki.

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

#### 9 — Maintenance entries go to log.md, never to index frontmatter

**Pattern**: index.md had 12 `maintenance:` YAML keys in the frontmatter, all duplicates. The last value overwrites earlier ones, making most entries invisible to Dataview and YAML parsers.

**Rule**: every maintenance note must be appended to [[log]] — never to index.md frontmatter or body. `Wiki/index.md` is purely a catalog of pages; it does not carry maintenance state.

```markdown
# ✅ CORRECT — append to log.md
Wiki/log.md:
  ## [2026-08-04] maintenance | Deployed feature X to staging
  - Build ✅, tests ✅.

# ❌ VIOLATION — anywhere in index.md
Wiki/index.md frontmatter:
  maintenance: 2026-08-04 — deployed feature X
Wiki/index.md body:
  > Maintenance note (2026-08-04): deployed feature X
```

**Checklist after any maintenance operation:**
- [ ] New entry appended to [[log]] under the correct date heading
- [ ] `Wiki/index.md` NOT modified (unless adding a new entity/concept/source to the catalog)

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

**Checklist when adding a field to an existing aggregate root:**
- [ ] `rg "\.reconstitute\("` across entire repo — every call site must be updated (domain entity, repository, tests)
- [ ] Run domain tests + backend tests before declaring change complete
- [ ] Expected blast radius: domain entity (1 file) + repository implementation (1 file, 3-5 call sites) + test files calling `reconstitute()` (typically 2-4 files) + contracts DTO (1 file) + API routes (1 file) + DB migration (1 file) = **6-10 files**
- [ ] If `reconstitute()` signature changes, verify NO file was missed: `rg "Reconstitute\(" packages/domain/src/__tests__ apps/backend/src/`

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
- [ ] **Single-owner check**: is this concept owned by exactly one existing page (e.g., a VO owned by one entity, a sub-mechanism of one pipeline)? If yes, add it as a `## Section` to the parent — do not create a standalone page
- [ ] If the proposed page would be <70 lines of body content, prefer a section in the parent page

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

#### Single-owner heuristic

A page that passes the 50-line threshold but describes content **owned by a single parent** must also pass the section test. This is the most common near-stub anti-pattern:

| Pattern | Example | Should be section in |
|---------|---------|---------------------|
| A VO owned exclusively by one entity | `ArtifactContent` (54 lines) | `entities/Artifact.md` |
| A domain service owned by one context | `Progressive Context Enrichment` (55 lines) | `concepts/Content Generation.md` |
| A sub-concern of one feature | `Invitation Notification Delivery` (55 lines) | `concepts/Workspace Sharing.md` |
| A repository for one aggregate | `WorkspaceRepository` (43 lines) | `entities/Workspace.md` |

**Checklist before creating a page 50-70 lines:**
- [ ] Is this concept owned by exactly one parent page? If yes, make it a `## Section` in that parent.
- [ ] Would deleting this page force a reader to navigate to exactly one other page to find the content? If yes, merge.

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

### 7 — Planning gate: audit the codebase before planning from wiki status claims

**Pattern**: wiki pages claiming component completion percentages, implementation status, or file paths that don't match the codebase. This session found a 4x discrepancy: wiki claimed 22% completion (8/37), actual filesystem audit revealed 86% (32/37). 24 components were built but marked ⬜.

**Rule**: before any planning operation that reads wiki status claims (component completion %, implementation status, inventory counts), run a filesystem audit to verify:

```bash
# 1. List all component files by layer
for dir in workspace tool agent-chat gamification shared layout; do
  echo "$dir: $(find apps/frontend/src/components/$dir -name '*.tsx' 2>/dev/null | wc -l)"
done

# 2. Quick grep for key patterns
rg "export function|export const.*=.*\(\)" apps/frontend/src/components/ --include='*.tsx' -l | wc -l
```

**Rule**: if the audit disagrees with wiki claims, update the wiki FIRST, then plan from the corrected baseline. Never plan from a wiki that doesn't match the codebase. A wiki status claim without a recent filesystem audit backing it is fiction.

```markdown
# ❌ VIOLATION — planning from stale wiki
"Per il wiki, restano 29 componenti da costruire" → Audit rivela che 24 sono già built

# ✅ CORRECT — audit-first workflow
1. Audit filesystem → 32/37 built (86%)
2. Update wiki status → all 37 rows corrected
3. Plan from corrected baseline → 1 gap reale, non 24
```

**Checklist before any wiki-status-dependent plan:**
- [ ] Filesystem audit run (component count per layer)
- [ ] Wiki status claims corrected if audit disagrees
- [ ] Plan targets ONLY the real gaps, not wiki fiction
- [ ] Date of audit recorded in the plan

### 8 — Proposal synthesis pages must be archived when superseded by concept pages

**Pattern**: synthesis proposals (`gamification-proposal`, `agent-chat-proposal`, `workspace-sharing-proposal`) bootstrap a concept page, then remain in the index with 0–1 inbound links months after the concept page contains the same information in canonical form. Readers who find the proposal get outdated architecture decisions. This is a structural anti-pattern because proposals are scaffolds — once the building exists, the scaffold must come down or be clearly marked as historical.

**Rule**: when a concept page is created from a synthesis proposal, evaluate the proposal immediately:

| Condition | Action |
|-----------|--------|
| Concept page contains ALL proposal content | **Delete** the proposal (example: `agent-chat-proposal` → `Agent Chat`) |
| Proposal has a unique decision tree or trade-off analysis | **Archive** with `> **Archived** — superseded by [[ConceptPage]]. Retained for [specific value].` at the top of the file |
| Proposal is still being actively referenced by implementation plans | **Mark as superseded**: add the archived header but keep the file until implementation plans are updated |

```markdown
# ❌ VIOLATION — proposal still active with 0 inbound links
# synthesis/gamification-proposal.md — 246 lines, 1 inbound (index only)
# But concepts/Gamification.md already contains all the same information
# Result: readers find an outdated design document instead of the canonical page

# ✅ CORRECT — proposal archived or deleted
# synthesis/agent-chat-proposal.md — DELETED (fully superseded)
# synthesis/workspace-sharing-proposal.md — ARCHIVED with header:
#   > **Archived** — superseded by [[Workspace Sharing]].
#   > Retained as decision record (Option A/B/C evaluation).
```

**Checklist after creating a concept page from a proposal:**
- [ ] Evaluate: does the concept page contain ALL proposal content? If yes, delete the proposal.
- [ ] If retaining for historical value, add `> **Archived** — superseded by [[ConceptPage]]` as the first line after the title.
- [ ] Remove the proposal from any "active" index categories (e.g., change "Architecture proposal" → "Archived design record").
- [ ] Update `Wiki/index.md` description to reflect archived status.

### 9 — Post-merge wikilink verification (no dead links after any page deletion)

**Pattern**: after merging two pages or deleting a page, residual `[[wikilinks]]` to the deleted target remain in 15–25 other files. This session found 48 broken links after 15 deletions, spread across entity pages, concept pages, synthesis pages, and the governance document (DDD Domain Design Rules). Entity pages and governance documents must be fixed; historical synthesis pages with broken links are acceptable but should be noted.

**Rule**: after ANY page deletion or merge, run a grep sweep for the deleted filename and fix every broken link in entity and concept pages:

```bash
# After deleting any wiki page:
rg "\[\[DeletedPage\]\]" Wiki/entities/ Wiki/concepts/ Wiki/concepts/DDD*

# Fix each match by either:
# 1. Updating to the new canonical location (e.g., [[Gamification#achievements-badges]])
# 2. Removing the reference if the content is fully absorbed
# 3. Replacing with a similar existing page if the concept is still valid
```

**Priority order for fixing broken links:**
1. **Entity pages** — must be fixed (these are the primary navigation surface)
2. **Governance pages** (CLAUDE.md, DDD Domain Design Rules) — must be fixed (authoritative references)
3. **Core concept pages** in the Concepts index table — should be fixed
4. **Historical synthesis pages** — optional; broken links in archival documents are acceptable

```markdown
# ❌ VIOLATION — merge without grep
# Achievement.md still has [[Achievements & Badges]] after the page was deleted
# Session.md still has [[rule-4-vo-debt]] after the page was deleted
# Result: reader clicks a link and gets a 404 in Obsidian

# ✅ CORRECT — grep sweep after every merge/delete
# After merging Achievements & Badges → Gamification:
rg "\[\[Achievements & Badges\]\]" Wiki/
# → Found 4 matches in Achievement.md, PlayerProfile.md, Gamification UX.md, phase-13-plan.md
# → Fixed all 3 in entity/concept pages, noted the synthesis page as archival
```

**Checklist after any page deletion or merge:**
- [ ] `rg "\[\[DeletedPageName\]\]" Wiki/entities/ Wiki/concepts/` — fix all matches
- [ ] `rg "\[\[DeletedPageName\]\]" Wiki/concepts/DDD*` — fix governance documents
- [ ] Re-run the grep after fixes to confirm zero remaining matches in entity/concept/governance pages
- [ ] Note in the log entry any historical synthesis pages with intentionally preserved broken links

---

## Copy Module Rules

These rules govern the `@flow-app/copy` (`packages/copy/`) centralized text module. Every user-visible string — label, button, error message, notification, tooltip, placeholder — lives here. Components and logic reference keys, never literal strings.

### 1 — Zero hardcoded user-facing strings

**Rule**: every user-visible string MUST come from `copy.t('module.category.key')`. Components and logic reference keys, never literal strings. This applies to:

- React: JSX text children, `label`, `placeholder`, `aria-label`, `title`, `helperText` props
- Backend: error messages, notification text, SSE event descriptions
- All HTML attributes: `aria-label`, `placeholder`, `title`, `alt`

```tsx
// ❌ VIOLATION
<button>Generate</button>
<TextField label="Email" />

// ✅ CORRECT
import { copy } from '@flow-app/copy';
<button>{copy.t('toolPage.cta.submit')}</button>
<TextField label={copy.t('auth.login.email')} />
```

**Checklist before writing any UI code:**
- [ ] No literal Italian or English strings in JSX children
- [ ] All `label`, `placeholder`, `aria-label`, `title`, `helperText`, `tooltip` use `copy.t()`
- [ ] No `throw new Error('...')` with user-facing messages — use `DomainError` subclass with `copy.t()` message

### 2 — Test mocking convention for copy module

**Pattern**: when a test renders a component that imports `@flow-app/copy`, mock it to return the KEY as the value. This makes tests resilient to copy text changes and lets tests verify that the correct key is rendered.

```typescript
// ✅ CORRECT — mock returns key, not resolved Italian string
vi.mock('@flow-app/copy', () => ({
  copy: { t: (key: string) => key },
}));

// Test assertions search for KEYS, not Italian text
expect(screen.getByText('toolPage.cta.submit')).toBeDefined();
expect(screen.getByText('shared.sessionStatus.running')).toBeDefined();
```

**Exception**: component-level unit tests that explicitly test copy resolution may use the real module. All other tests (page-level, integration) MUST mock the copy module as shown above.

**Checklist before writing tests:**
- [ ] Copy module is mocked to return keys (unless explicitly testing copy resolution)
- [ ] Test assertions search for copy KEYS, not Italian strings
- [ ] Test does not assume any specific Italian text is rendered

### 3 — No duplicate asset/type label maps

**Pattern**: `ASSET_LABELS` was duplicated in 4 files (KnowledgePanel, AssetCoverageBar, AgentContextDrawer, AssetDetailPage) before consolidation.

**Rule**: before creating a local constant map of labels, verify it does not already exist in:
1. `packages/copy/src/it/assets.ts` — canonical asset type labels
2. `apps/frontend/src/constants/assets.ts` — `ASSET_TYPE_LABELS` (shared import)
3. `packages/domain/src/generation/` — `ToolDefinition`-based labels

```typescript
// ❌ VIOLATION — local duplicate of ASSET_TYPE_LABELS
const ASSET_LABELS: Record<string, string> = { 'brief': 'Brief', ... };

// ✅ CORRECT — import the shared constant
import { ASSET_TYPE_LABELS } from '../../constants/assets';
```

**Checklist before creating a label map:**
- [ ] Run `rg "ASSET_TYPE_LABELS|ASSET_LABELS|asset.*label" apps/frontend/src/ --iglob '*.{ts,tsx}'` to find existing maps
- [ ] If a shared map exists, import it — do not create a local copy
- [ ] Asset type labels are the canonical example, but this rule applies to ALL label/display-name maps

### 4 — Copy module is the single source of status/state labels

**Pattern**: status chips (`"Running"`, `"Completed"`, `"Failed"`, `"Queued"`) and tab labels (`"In Progress"`) were hardcoded in SessionList and session cards.

**Rule**: all session status labels, tab labels, challenge states, and UI state labels live in `packages/copy/`. Status labels are in `shared.sessionStatus.*`; tab labels in `workspace.sessions.tabs.*`.

```typescript
// ❌ VIOLATION — hardcoded status label
<Chip label="Running" />

// ✅ CORRECT
<Chip label={copy.t('shared.sessionStatus.running')} />
```

**Available keys** (check `packages/copy/src/it/shared.ts` for the full list):
- `shared.sessionStatus.queued` / `running` / `completed` / `failed` / `cancelled` / `draft`
- `workspace.sessions.tabs.inProgress` / `completed` / `failed`

---

## Test Fidelity Rules

These rules prevent the class of test failures discovered during the 2026-08-08 remediation session — mock objects that don't match real interfaces, missing fields causing cascading `TypeError`s, and editing patterns that introduce unintended side-effects.

### 1 — Test mocks MUST match the full interface accessed by code under test

**Pattern**: test mocks in `generation.spec.ts` and `session-worker.test.ts` were missing fields (`createdAt`, `artifacts`, `userId`, `status.toString()`, `toolKey.value`) that the production code accesses. This caused 5 pre-existing test failures that masked real issues.

**Rule**: every field accessed by the code under test MUST exist on the mock object. When writing a test mock, trace every property access path in the production code and ensure the mock provides it.

```
// If production code does:  session.createdAt.toISOString()
//                                       └── must exist on mock
// If production code does:  session.artifacts.length
//                                       └── must exist on mock (as array)
// If production code does:  session.toolKey.value
//                                       └── must exist on mock
```

**Checklist before writing a mock:**
- [ ] Trace all property accesses in the production code path being tested
- [ ] Every property read on the mock returns a valid value (not `undefined`)
- [ ] Objects with methods (`.toString()`, `.toISOString()`, `.isTerminal()`) mock those methods
- [ ] `apply()` and other mutating methods actually modify the mock object (not just `vi.fn()`)
- [ ] Repository methods not directly called in tests still accept the expected parameter shape (e.g., `findLastArtifactsBySessionIds`)

### 2 — Establish test baseline before large-scale refactoring

**Pattern**: starting a 50-file refactor without knowing the pre-existing test state wastes time debugging failures that pre-date the changes.

**Rule**: before any refactoring that touches more than 3 files, run the full test suite and record the baseline:

```bash
# 1. Record pre-existing failures
cd apps/backend && npx vitest run 2>&1 | grep -E 'FAIL|Tests.*failed' > /tmp/pre-baseline.txt
cd apps/frontend && npx vitest run 2>&1 | grep -E 'FAIL|Tests.*failed' > /tmp/pre-baseline-fe.txt

# 2. After changes, diff against baseline to identify NEW failures
```

**Checklist before starting a multi-file change:**
- [ ] Full test suite run and failures recorded
- [ ] Pre-existing failures documented in the change plan
- [ ] After changes, only NEW failures are investigated — pre-existing ones are noted but not blockers

### 3 — `replaceAll` with caution on multi-context strings

**Pattern**: using `replaceAll` on a short, common string like `"Sign in"` can replace it in unintended locations (button names, link text, error messages, comments). The same string in different contexts may need different replacements.

**Rule**: when migrating hardcoded strings across a file:
1. Prefer full-file rewrites (`write` tool) for files under 200 lines
2. For larger files, use targeted `edit` with surrounding context (at least 3 lines of context)
3. Avoid `replaceAll` on strings shorter than 15 characters unless they appear in exactly one context
4. After any batch edit, verify with `rg "oldString" path/to/file` that no instances remain

```bash
# ✅ CORRECT — verify no old strings remain after batch edit
rg "Sign in" apps/frontend/src/pages/__tests__/LoginPage.test.tsx
# If output shows remaining matches, fix them individually
```

### 4 — Batch reads before batch edits

**Pattern**: interleaved read→edit→read→edit cycles are slow and error-prone. In this session, 50 files were modified. Batching reads upfront would have saved time and prevented edit collisions.

**Rule**: when modifying more than 5 files:
1. **Read phase**: read all target files in parallel first
2. **Plan phase**: identify all changes needed in each file
3. **Execute phase**: apply all edits in parallel batches

For the execute phase, prefer `write` for files under 200 lines (cleaner, avoids whitespace/context issues) and `edit` for targeted changes in larger files.

---

## Implementation Planning Patterns

### 1 — Batch compression (parallelize independent subtrees)

**Pattern**: sequential multi-phase plans where each phase waits for the previous one. Most implementation plans contain independent subtrees that can execute in parallel.

**Rule**: when creating an implementation plan:

1. **Identify independent subtrees** — files that don't share dependencies can be modified in parallel
2. **Merge steps touching the same file** — if steps 3 and 5 both modify `DashboardPage.tsx`, merge into one pass
3. **Backend as single commit** — migration + types + domain + repo + API routes = 1 batch, not 5
4. **Extraction + wiring = one operation** — extracting a component AND updating the caller is a single refactor, not two steps
5. **Component builds with mock before backend is ready** — build the UI with a mock `onSave`; wire the real API when the backend PR lands

```markdown
# ❌ VIOLATION — sequential 5-phase plan
Phase 1: Backend migration
Phase 2: Backend API
Phase 3: Frontend component
Phase 4: Frontend wiring
Phase 5: Testing
→ 5 sequential days, 0 parallelism

# ✅ CORRECT — batched plan
Batch 1 (parallel): Backend PR + Component A (mock) + Component B + Extraction C
Batch 2 (after 1): Wire A + thin wrapper C
Batch 3 (after 1+2): Integration test
→ 1.5 days, maximal parallelism
```

---

## Code Quality Rules

### 1 — TypeScript: `useState` with `as const` arrays requires explicit type

**Pattern**: `useState(CONST_ARRAY[0])` with `as const` infers the element's literal type, blocking assignment of other array values.

```typescript
// ❌ VIOLATION — literal type inference
const COLORS = ['red', 'blue', 'green'] as const;
const [color, setColor] = useState(COLORS[0]); // type = "red"
setColor('blue'); // ❌ Type '"blue"' is not assignable to type '"red"'

// ✅ CORRECT — explicit type annotation
const [color, setColor] = useState<string>(COLORS[0]);
```

**Checklist when using `useState` with const arrays:**
- [ ] If the array is `as const`, the state type annotation must be explicit: `useState<string>(...)`
- [ ] If the array elements are objects, use the object type: `useState<MyType>(...)`

### 2 — Tool selection: `edit` vs `write` decision rule

**Pattern**: using `edit` on files >100 lines fails due to whitespace/line-ending mismatches. Full-file `write` is more reliable for multi-change files.

| File size | Operation | Tool |
|-----------|-----------|------|
| <100 lines, single change | Targeted edit | `edit` |
| 100-300 lines, multiple changes | Full rewrite | `write` |
| >300 lines, single change | Targeted edit with 5+ lines of context | `edit` |

**Never use `edit` for renaming across an entire file — use `write` with the full content.** After any batch `write`, verify the file hasn't regressed by running `tsc --noEmit` on the package.

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

**Critical rule:** Always run a qmd query before creating a new wiki page. If qmd returns relevant existing pages, read them and link from the new page instead of duplicating content. Additionally, apply the **single-owner heuristic**: if the concept you're about to document is owned by exactly one existing parent page (a VO owned by one entity, a sub-mechanism of one pipeline, a sub-concern of one feature), add it as a `## Section` in that parent — do not create a standalone concept page.