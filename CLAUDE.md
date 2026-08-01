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

---

## Linguistic Separation Policy

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

---

## Domain Design Rules

These rules enforce DDD tactical patterns discovered from governance audits (Phase 0–8). Violations introduce technical debt that compounds across bounded contexts. Apply on every domain/application code write.

### 1 — No `as any` to access private fields in domain aggregates

**Pattern**: aggregate roots that use `(entity as any)._privateField` to mutate child entities violate the encapsulation contract. Child entities must expose explicit delegation methods — even if package-private visibility isn't available in TypeScript, use a clearly named internal setter.

```typescript
// ❌ VIOLATION — Workspace.transferOwnership()
(newOwner as any)._role = 'owner';

// ✅ CORRECT — Add explicit delegation on WorkspaceMembership
// In WorkspaceMembership:
_setRoleAsOwner(): void { this._role = 'owner'; }
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
  private constructor(private readonly _value: 'owner' | 'editor' | 'viewer') {}
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
async save(session: Session): Promise<void> { /* sessions table only */ }
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

### Tools

- **Obsidian CLI**: `obsidian read file="..."`, `obsidian search query="..."`, etc. (symlinked to `~/.local/bin/obsidian`)
- **qmd**: Hybrid BM25/vector search with LLM re-ranking (`qmd query "..."`)
- **Dataview**: SQL-like queries over YAML frontmatter (in Obsidian)

#### qmd — Proactive Wiki Exploration

Use `qmd` **proactively** before any wiki operation (ingest, query, lint) to ground yourself in existing wiki knowledge. Never operate on the wiki from scratch — search first, then act.

**Pre-operation workflow:**

1. **Before ingesting** a source → `qmd query "..." --no-rerank` with the source's key topics to find overlapping entities/concepts already in the wiki. This prevents duplicate pages and ensures new content links back to existing knowledge. If the models aren't cached yet, use `qmd search` instead.

2. **Before answering a query** → `qmd query "..." --no-rerank` with the query terms to discover relevant wiki pages beyond what `index.md` listings reveal. qmd's hybrid search surfaces semantically related content that the index tables alone might miss. Use `qmd search` as fallback if models aren't cached.

3. **Before linting** → `qmd search "..."` (BM25 keyword mode) to find orphan candidates and pages not referenced in `index.md`.

**Key commands:**

```
qmd search "keyword terms"                  # BM25 only (primary — instant, no models needed)
qmd vsearch "semantic concept"              # vector similarity (uses embedding model, already downloaded)
qmd query "..." --no-rerank                 # hybrid BM25 + vector, no LLM re-rank (needs expansion model)
```

**Always prefer `qmd search`** as the primary command. It uses BM25 full-text only — instant, deterministic, and requires no model downloads. Use `qmd vsearch` when you need semantic (meaning-based) search. Avoid `qmd query` unless the models have been pre-downloaded (see below).

**`qmd query` downloads models on first use.** It needs a 1.28GB expansion model on first run, which will timeout an agent session. If you need hybrid search, pre-download models once (outside agent sessions):

```bash
qmd query "test" 2>/dev/null &  # downloads ~1.28GB expansion model + ~0.6GB reranker
```

Once models are cached in `~/.cache/qmd/models/`, `qmd query` runs instantly.

**Collection setup (one-time, per machine):**

This project uses a project-local `.qmd/` config (not tracked in git — absolute paths differ per machine). On each new machine, copy the example template and adapt:

```bash
# 1. Copy example template and set your absolute vault path
cp .qmd/index.yml.example .qmd/index.yml
# Edit .qmd/index.yml — replace <ABSOLUTE_VAULT_PATH> with your machine's path
#   Linux:   /home/<user>/Dev/Progetti/flow-app
#   macOS:   /Users/<user>/Dev/flow-app

# 2. Alternatively, create from scratch with the CLI:
qmd collection add /path/to/vault --name flow-app --mask "**/*.md"

# 3. Index and embed
qmd update && qmd embed
```

Models are cached globally in `~/.cache/qmd/models/` (shared across collections, not tracked in git).

**Index maintenance (after wiki changes):**

```
qmd update && qmd embed                     # re-index after adding/modifying pages
```

**Effective query patterns for the wiki:**

```
qmd query "entity X relationships and sources" --no-rerank
qmd query "concept Y design decisions and tradeoffs" --no-rerank
qmd query "what does the wiki say about pattern Z" --no-rerank
qmd search "frontmatter type:entity"        # find all entity pages by frontmatter
```

**Critical rule:** Always run a qmd query before creating a new wiki page. If qmd returns relevant existing pages, read them and link from the new page instead of duplicating content. The wiki compounds; qmd ensures each new page builds on what's already there.