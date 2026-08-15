---
type: schema
tags:
  - wiki/schema
---

# CLAUDE.md — Flow App

Instructions for LLM agents working in this vault: codebase interaction, documentation, and wiki maintenance rules.

## Project Context

AI-powered content generation platform for B2B marketing teams. Transforms contextual inputs into structured marketing artifacts through deterministic, traceable multi-step LLM pipelines.

**Monorepo**: `apps/backend`, `apps/frontend`, `packages/contracts`, `packages/domain`, `packages/infra-db`
**Stack**: Node.js, React 19, XState v5, Kysely, PostgreSQL, Redis, BullMQ

## Task Routing

Read the relevant section(s) only — skip the rest. Match your task to the trigger:

| Task / Trigger | Relevant Sections |
|---|---|
| Code in `packages/domain` | Domain Design Rules |
| Code in `apps/backend` | Domain Design Rules, Test Fidelity Rules |
| Code in `apps/frontend` (components, pages, layout) | Copy Module Rules, Code Quality Rules, Accessibility Rules, UI Component Unification Rules |
| Writing or modifying tests | Test Fidelity Rules |
| Wiki operations (ingest, query, lint) | LLM Wiki, Wiki Content Rules, Tools (qmd) |
| Planning refactoring / multi-file changes | Implementation Planning Patterns, Test Fidelity Rules §2 |
| Git operations (branch, commit, push) | Git Branch Policy |
| Any code commit | Wiki Alignment Before Commit |

## Rule Severity

| Tag | Meaning |
|---|---|
| `[MUST]` | Violation blocks commit/merge. Security, correctness, data integrity, architectural invariants. |
| `[SHOULD]` | Violation requires documented justification. Strong convention, exceptions possible. |
| `[MAY]` | Preference or team convention. Discretionary. |

---

## Git Branch Policy [MUST]

| Branch | Purpose | Protection | Direct push |
|--------|---------|------------|--------------|
| `main` | Production, always releasable | Status checks + linear history | ❌ PR only |
| `staging` | Pre-production validation | Status checks | ❌ PR only |
| `dev` | Fast feedback, development | None | ✅ Allowed |

1. Never work directly on `main` or `staging`.
2. Flow: `feature/*` → `dev` → `staging` → `main`.
3. After PR merge, downstream branches sync automatically (`branch-sync.yml`).

### Pre-Session Branch Verification

```bash
git branch --show-current
# Must NOT be main or staging. If it is:
git checkout dev && git pull origin dev
git checkout -b feature/<scope>-<short-name>
```

**If current branch is `main` or `staging`, STOP and ask for confirmation.**

### Wiki Alignment Before Commit

Every code commit must be preceded by Wiki alignment. Code must never be pushed if `Wiki/` does not reflect the activities performed.

**Pre-commit checklist:**
1. Code changes → corresponding Wiki entry (entities, concepts, overview, dependencies)
2. Update `Wiki/index.md` if pages added/modified
3. Update `Wiki/log.md` with summary of wiki changes
4. Run `qmd update && qmd embed`

**Rule**: if `git status` shows code changes without `Wiki/` changes, the commit is blocked.

**Exceptions**: cosmetic changes (formatting, typos, local renames without architectural impact). When in doubt, align the Wiki.

---

## Linguistic Separation Policy [MUST]

**Wiki pages are 100% English.** No coexistence with other languages in any wiki document. Translate any Italian prose immediately.

**Exception**: `concepts/Centralized Copy Modules` where Italian strings are the app's UI copy content (not prose). Copy tokens (`copy.t('...')`) are English keys — the resolved Italian strings are UI, not wiki content.

---

## LLM Wiki [MUST]

Implements the [llm-wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — LLMs incrementally build and maintain a persistent, interlinked wiki from raw sources.

### Architecture

Three layers:
1. **Raw sources** — immutable documents in `Wiki/sources/`. Read only, never modify.
2. **The wiki** (`Wiki/`) — LLM-generated: source summaries, entity pages, concept pages, synthesis.
3. **The schema** — this file. Makes the LLM a disciplined wiki maintainer.

```
Wiki/
├── index.md          # Content catalog — read first on every operation
├── log.md            # Append-only operation log
├── overview.md       # High-level synthesis
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
source_count: <N>              # entity and concept pages
confidence: <high | medium | low>   # concept pages only
---
```

- Use `[[wikilinks]]` for all cross-references
- Use `[key::value]` inline metadata where Dataview queries are useful
- Track `date_updated` on every page; update on any modification
- Tag namespace `wiki/` to distinguish from other vault content

### Operations

#### Ingest

1. Read raw source → create source summary in `Wiki/sources/` (factual only, link to raw source, list entities/concepts)
2. Create or update entity/concept pages in `Wiki/entities/` and `Wiki/concepts/`
3. Update `Wiki/index.md` (Processed Sources, Unprocessed Sources, entity/concept tables)
4. Update `Wiki/overview.md` if the big picture changed
5. Append to `Wiki/log.md`: `## [YYYY-MM-DD] ingest | <SourceName>`

#### Query

1. Read `Wiki/index.md` → find relevant pages
2. Read wiki pages (not raw sources)
3. Synthesize answer with wikilinks; file substantial answers in `Wiki/synthesis/`
4. Update index and log

#### Lint

Check: orphan pages, broken wikilinks, stale pages, contradictions, concepts without pages, missing cross-references.

### Critical Rules

1. **Raw sources are IMMUTABLE.** Never modify raw source documents in `Wiki/sources/` or any ingested source directory.
2. **Always update `Wiki/index.md` and `Wiki/log.md`** on every wiki change.
3. **Keep source summaries factual.** Interpretation goes in concept/synthesis pages.
4. **When sources contradict**, note contradictions explicitly; never silently overwrite.
5. **The LLM writes everything in `Wiki/`.** Don't hand-edit wiki pages.
6. **The schema evolves.** Update this file as patterns emerge.

### Consistency Enforcement Rules

Apply on every wiki write operation.

#### 1 — Verify, don't claim

Never report an operation as complete without enumerating every modified file. A log entry claiming "N files updated" must be backed by an explicit list of files.

#### 2 — Language check on every wiki write

Wiki pages are 100% English. Before finalizing, scan for Italian prose — translate in place. Exception: `concepts/Centralized Copy Modules` (Italian strings are UI copy content).

Checklist:
- [ ] No Italian sentence-level prose in body text
- [ ] No Italian section headings
- [ ] Italian table cells OK only when documenting literal UI strings

#### 3 — `source_count` must match `## Sources` section

Update `source_count` whenever sources are added or removed. Never leave it at `0` if `## Sources` is non-empty.

#### 4 — No duplicate log entries

Before appending to `Wiki/log.md`, read the last 10 entries. Extend or amend existing entries with same date/operation type. Two entries for same event on same date are never correct.

#### 5 — Anchor links must be verified

Never write `[[Page#anchor]]` without first confirming the heading exists on the target page. If missing, use `[[Page]]` or create the section.

#### 6 — Cross-version naming: map old names to new

When a source summary uses names differing from wiki canonical names, add an explicit mapping at the top:

> **Name mapping**: `funnel-pages` → `landing-funnel`, `nextland` → `landing-page`, `youtube-lf-script` → `video-script-long-form` (v1 → v3 rename).

#### 7 — Schema authority

**This file (`CLAUDE.md`) is the authoritative schema.** `Wiki/schema/config.md` is an unused artifact — ignore it.

#### 8 — Zero environment references

Wiki and repo files must be 100% environment-agnostic. Never include hostnames, IPs, connection strings, API keys, platform identifiers, user emails/IDs.

Replace with generic placeholders:

| ❌ Never | ✅ Always |
|----------|----------|
| `real-host.example.com:5432` | `<DB_HOST>:<DB_PORT>` |
| `postgresql://user:pass@host:5432/db` | `<DATABASE_URL>` |
| `redis://default:pass@host:6379` | `<REDIS_URL>` |
| `a0eebc99-...` | `<seed-user-id>` |
| Platform names | `managed PostgreSQL` / `managed Redis` |

Checklist:
- [ ] No real hostnames or connection strings
- [ ] No platform names — use generic terms
- [ ] No credentials or identifiers

**If any leak is found during a wiki write, fix it immediately before committing.**

#### 9 — Maintenance entries go to log.md, never to index frontmatter

`Wiki/index.md` is purely a catalog; it does not carry maintenance state. Append maintenance notes to [[log]].

```markdown
# ✅ Wiki/log.md:
## [2026-08-04] maintenance | Deployed feature X to staging
- Build ✅, tests ✅.

# ❌ Wiki/index.md frontmatter or body — never
```

Checklist:
- [ ] New entry appended to [[log]] under correct date heading
- [ ] `Wiki/index.md` NOT modified (unless adding entity/concept/source to catalog)

#### 10 — CLAUDE.md pruning discipline (self-maintenance)

This file grows by sedimenting incident-driven rules. Without pruning it becomes unbounded. Review quarterly:

- **Consolidate when a lesson is repeated ≥3 times**: if the same instruction appears in multiple sections (e.g., "scan `pages/` + `components/` + `layout/`, never just `components/`"), keep ONE canonical occurrence and replace the others with `> **See** [[CLAUDE.md#<canonical-section>]]`.
- **Demote dormant rules**: a rule not triggered as a violation for 3+ months is a candidate for `[MAY]` or removal.
- **Check the ceiling**: if `wc -l CLAUDE.md` exceeds 1500 lines, split into a core `CLAUDE.md` (routing + invariants, <200 lines) plus linked governance docs loaded on demand.

---

## Domain Design Rules [MUST]

Enforce DDD tactical patterns from governance audits (Phase 0–9) and [[DDD Domain Design Rules|multi-agent code review (41 findings)]]. Violations compound technical debt across bounded contexts.

> **Authoritative reference**: [[DDD Domain Design Rules]] (19 rules with rationale, templates, and code references). This section is the enforceable subset.

### 1 — No `as any` to access private fields in domain aggregates

Child entities must expose explicit delegation methods — never cast to access private fields.

```typescript
// ❌ (newOwner as any)._role = 'owner';
// ✅ newOwner._setRoleAsOwner();  // WorkspaceMembership delegation method
```

Checklist:
- [ ] No `as any` cast on `this` or any entity private field
- [ ] Child entity exposes named method for every mutation the aggregate root needs

### 2 — Zero external validation libraries in `packages/domain`

Value Objects must validate inline using plain TypeScript — no `zod`, `class-validator`, `yup`, etc.

```typescript
// ❌ import { z } from 'zod'; schema.safeParse(raw)...
// ✅ Inline: if (!normalized.includes('@')) throw new InvalidEmailError(raw);
```

Checklist:
- [ ] No import from any validation library in `packages/domain/src/`
- [ ] Validation lives in `static create()` or `private constructor()`
- [ ] Complex validation extracted to pure function in `packages/domain/src/shared/`

### 3 — Every domain and application error must extend `DomainError`

`throw new Error(...)` bypasses the `ErrorMapper → HTTP status` pipeline. All errors reaching the API layer MUST be `DomainError` subclasses with `code` and `retryable`.

```typescript
// ❌ throw new Error('Workspace not found');
// ❌ export class InvalidSessionStateError extends Error { ... }

// ✅
export class WorkspaceNotFoundError extends DomainError {
  readonly code = 'WORKSPACE_NOT_FOUND';
  readonly retryable = false;
  constructor(id: string) { super(`Workspace ${id} not found`); }
}
```

Checklist:
- [ ] No `throw new Error(` in `packages/domain/src/` or `apps/backend/src/application/`
- [ ] Every custom error extends `DomainError` (not plain `Error`)
- [ ] Every error has explicit `code` matching a case in `ErrorMapper.toHttpStatus()`

### 4 — Value Objects with constrained domains must be classes, not type aliases

`type SessionStatus = 'a' | 'b' | 'c'` gives zero runtime validation and zero behavior. Finite-state values MUST be classes with `private constructor`, `static` factory, and `equals()`.

```typescript
// ❌ type MembershipRole = 'owner' | 'editor' | 'viewer';

// ✅
export class MembershipRole {
  private constructor(private readonly _value: MembershipRoleValue) {}
  static readonly Owner = new MembershipRole('owner');
  static readonly Editor = new MembershipRole('editor');
  static readonly Viewer = new MembershipRole('viewer');
  static from(value: string): MembershipRole { /* switch with throw */ }
  equals(other: MembershipRole): boolean { return this._value === other._value; }
}
```

**Exceptions**: open-ended strings (e.g., `ToolKey`) may remain type aliases. Document the reason.

Checklist:
- [ ] Every finite-state value is a class, not a type alias
- [ ] Class has `private constructor`, `static` factory/instances, `equals()`

### 5 — Repository `save()` persists ONLY the aggregate root and its owned entities

Cross-table operations outside the aggregate's entity graph must be separate, explicitly-named methods.

```typescript
// ❌ save() inserting into idempotency_keys — hidden side-effect
// ✅
async save(session: Session): Promise<void> { /* sessions + artifacts only */ }
async saveIdempotencyKey(hash: string, sessionId: string): Promise<void> { /* separate */ }
```

Checklist:
- [ ] `save()` touches only aggregate root table + owned entity tables
- [ ] Cross-cutting tables have dedicated methods (idempotency, events, audit logs)

### 6 — Factory methods follow canonical naming

| Entity type | Factory method | Purpose |
|-------------|---------------|---------|
| Aggregate root | `static create(...)` | New entity from business input (generates ID) |
| Aggregate root | `static reconstitute(...)` | Hydration from persistence (takes existing ID) |
| Child entity (role-specific) | `static user(...)`, `static agent(...)` | Specialized factory with role-dependent defaults |

Checklist:
- [ ] Every aggregate root has exactly one `static create()` and `static reconstitute()`
- [ ] No custom factory names on aggregate roots (no `start()`, `begin()`, `init()`)
- [ ] `reconstitute()` accepts all fields verbatim (no validation, no defaults)

### 7 — Aggregate roots follow the canonical template

Must use `private constructor`, carry `_version` for optimistic locking, return `DomainEvent | null` from business methods, expose child collections as `ReadonlyArray<T>`.

```typescript
// CANONICAL — see [[DDD Domain Design Rules#Pattern 7 — Aggregate Root Design]]
export class AggregateRoot {
  private _version: number;
  private _childEntities: ChildEntity[];

  private constructor(readonly id: string, /* all fields */) { ... }

  static create(businessInput: Input): AggregateRoot { /* generates ID, sets defaults */ }
  static reconstitute(/* all fields verbatim */): AggregateRoot { /* pass-through */ }

  doSomething(input: Input): DomainEvent | null {
    // 1. Validate preconditions (throw DomainError)
    // 2. Mutate private state
    // 3. Increment _version
    // 4. Return domain event (or null if internal transition)
  }

  get childEntities(): ReadonlyArray<ChildEntity> { return this._childEntities; }
  get version(): number { return this._version; }
}
```

Checklist (new aggregate root):
- [ ] `private constructor`, `_version` field, `DomainEvent | null` return, `ReadonlyArray<T>` child collections

Checklist (adding field to existing aggregate root):
- [ ] `rg "\.reconstitute\("` across entire repo — update all call sites (domain, repository, tests)
- [ ] Expected blast radius: 6–10 files (domain, repo, tests, contracts DTO, API routes, DB migration)
- [ ] Run domain + backend tests before declaring complete

### 8 — Domain events are immutable DTOs, nothing more

Implement `DomainEvent` interface (`eventType`, `occurredAt`, `aggregateId`). Carry all data the consumer needs — no callbacks, no behavior, no references to live aggregates.

```typescript
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

Checklist:
- [ ] Implements `DomainEvent` (all three fields)
- [ ] All constructor parameters `readonly`; no behavior methods

### 9 — Domain-owned lifecycle: domain defines states, XState imports them

`SessionLifecycle` in `packages/domain` is the single source of truth for states and transitions. XState adds runtime concerns (actors, invocations, persistence). **Never define states in XState that the domain doesn't know about.**

```
packages/domain/SessionLifecycle  ←  states, transitions, getValidTransition()
         │ imports
         ▼
apps/backend/sessionMachine       ←  actors, guards (delegating to domain VOs), persistence
```

Checklist:
- [ ] All states/transitions defined in `packages/domain`, never hardcoded in XState
- [ ] XState guards delegate to domain VOs — no inline business logic
- [ ] `Session.apply(event)` is single entry point for state changes
- [ ] `validateXStateMatchesDomain()` runs on boot, fails fast on drift

### 10 — Business rules belong in domain Value Objects, never in application services

Delegate to domain VOs — pure functions with zero I/O, zero infrastructure imports.

```typescript
// ❌ private validateReadiness(tool, data) { /* inline checks */ }
// ✅
const policy = ReadinessPolicy.from(tool);
const result = policy.evaluate(acquisitionData);
if (!result.isReady) throw new ReadinessError(result.missing);
```

Checklist:
- [ ] No business rules in `apps/backend/src/application/` use cases
- [ ] No business rules in XState guards
- [ ] VO is a pure function: deterministic, zero I/O

### 11 — Domain enforces permissions for ALL callers; middleware is a performance optimization

The domain aggregate root throws domain errors on invalid operations. HTTP middleware short-circuits requests but is never the sole enforcer. Workers, CLI scripts, and tests all go through the same domain methods.

```
HTTP → Middleware (early reject) → Use Case → Domain (ultimate authority)
Worker → Use Case → Domain (same enforcement — middleware bypassed)
```

Checklist:
- [ ] Permission checks live in the domain aggregate root
- [ ] Middleware is optional optimization — never the only enforcement layer
- [ ] Every permission failure throws a `DomainError`

### 12 — Aggregate boundaries are driven by business invariants, not data modeling

| Factor | Embed in aggregate | Separate aggregate |
|--------|-------------------|-------------------|
| Expected cardinality | 1–20 | 50+ |
| Concurrency on child | Low (<1 change/hour) | High (many changes/second) |
| Invariant | Atomically consistent with root | Eventually consistent |

Checklist:
- [ ] Document expected cardinality (max entities per aggregate)
- [ ] Document revisit condition (e.g., "split when >50 members")
- [ ] Child entity cannot be modified independently
- [ ] Repository `save()` persists root + owned entities in one transaction

### 13 — Long-running processes persist snapshots, not events

Workers persist XState actor snapshot after every state transition. On retry, resume from snapshot — no duplicate work. Snapshot persistence uses dedicated repository methods (Rule 5).

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

Checklist:
- [ ] State persisted after every transition
- [ ] On retry, resumed from persisted snapshot
- [ ] Snapshot persistence uses dedicated repository methods

### 14 — Idempotency keys are domain Value Objects, not infrastructure strings

`IdempotencyKey` is a class VO in `packages/domain` with its own format and generation rules. Persistence uses a dedicated `saveIdempotencyKey()` method (Rule 5). The claim must be atomic.

```typescript
const key = IdempotencyKey.generate({ userId, workspaceId, toolKey, inputHash, templateVersions });
await sessionRepo.save(session);                           // Aggregate
await sessionRepo.saveIdempotencyKey(key.hash, sessionId); // Cross-cutting
```

Checklist:
- [ ] Key generation lives in `packages/domain` as a class VO
- [ ] Key format includes prompt version hash to detect template changes
- [ ] Persistence uses dedicated repository method
- [ ] Claim operation is atomic (Redis `SET NX` or PostgreSQL `INSERT ON CONFLICT`)

---

## Wiki Content Rules [MUST]

Prevent structural anti-patterns discovered during wiki health audits (2026-08-02). Apply on every wiki write operation.

### 1 — No split-page syndrome (one topic, one page)

Three or more pages on the same concept is always an anti-pattern. A concept can have at most **2 pages**: one domain/concept page and one UX/implementation page.

```markdown
# ❌ IdempotencyKey.md + Idempotency Implementation.md + IdempotencyKey + Prompt Version.md
# ✅ Idempotency.md (authoritative) + Idempotency UX.md (UI patterns only)
```

Checklist before creating a concept page:
- [ ] Run `qmd query "<topic>" --no-rerank` to find existing pages
- [ ] If 2+ pages exist, extend the best one — do not create a third
- [ ] **Single-owner check**: if owned by one existing page, add as `## Section` to parent
- [ ] If proposed page would be <70 lines, prefer a section in the parent

### 2 — No stub proliferation (pages <50 lines must justify existence)

A concept/synthesis page under 50 lines of body content must pass the "section test" — could this live as a `## Section` in an existing parent page?

**Exception**: entity pages may be concise by nature.

**Single-owner heuristic** (pages 50-70 lines too):

| Pattern | Example | Should be section in |
|---------|---------|---------------------|
| VO owned by one entity | `ArtifactContent` (54 lines) | `entities/Artifact.md` |
| Domain service owned by one context | `Progressive Context Enrichment` (55 lines) | `concepts/Content Generation.md` |
| Sub-concern of one feature | `Invitation Notification Delivery` (55 lines) | `concepts/Workspace Sharing.md` |
| Repository for one aggregate | `WorkspaceRepository` (43 lines) | `entities/Workspace.md` |

Checklist before creating a page 50-70 lines:
- [ ] Is this concept owned by exactly one parent? If yes, make it a `## Section`.
- [ ] Would deleting this page force navigation to exactly one other page? If yes, merge.

### 3 — Synthesis pages must be referenced (no isolated analysis)

Every synthesis page must have at least 3 inbound links from the concept/entity pages it references. After writing a synthesis, update the `## Sources` pages to link back.

```markdown
# ❌ synthesis/gamification-proposal.md — 1 inbound, 16 outgoing
# ✅ Add [[synthesis/gamification-proposal]] to Sources of concepts/Gamification.md,
#    concepts/Achievements & Badges.md, etc.
```

Checklist:
- [ ] Identify 3 most relevant concept pages → add `[[synthesis/page-name]]` to each `## Sources`
- [ ] Synthesis should appear in "Referenced By" of at least 3 pages

### 4 — Cross-references must add information, not duplicate it

When page A links to page B, A must NOT re-explain what B covers. A says "see [[B]]" and moves on. If A needs to explain X, X lives only in A — B doesn't duplicate it.

```markdown
# ❌ concepts/Gamification.md, Workspace Gamification.md, Gamification UX.md — all define XP triggers
# ✅ Gamification.md is authoritative; UX.md says "XP triggers: see [[Gamification#XP System]]"
```

Checklist:
- [ ] Does linked page already explain this? Reference it — don't re-explain.
- [ ] Does this page contain info NOT in the linked page? If not, replace content with cross-reference.
- [ ] Verify linked page is authoritative for that concept.

### 5 — Reference-only pages must have a parent concept

Every reference-only page (catalog, token list, enumeration) must be linked from at least one concept page that provides context and usage guidance.

```markdown
# ❌ concepts/Domain Events Catalog.md — orphan with no context page
# ✅ concepts/Domain Events.md explains pattern; links to Domain Events Catalog
```

### 6 — Verify code exists before documenting it

Before marking a wiki page as "implemented" or listing a file in a structure tree, verify the code file exists.

```markdown
# ❌ Wiki claims packages/domain/src/usage/entities/Quota.ts exists — it doesn't
# ✅ > **Planned** — not yet implemented. DB migrations exist (005), domain code pending.
```

Checklist:
- [ ] Verify claimed file/directory exists
- [ ] If not, use `> **Planned**` or `🔴 Planned`, never `✅`

### 7 — Planning gate: audit the codebase before planning from wiki status claims

Wiki status claims (component completion %, implementation counts) can be 4x wrong vs reality. Before any planning operation, run a filesystem audit:

```bash
for dir in workspace tool agent-chat gamification shared layout; do
  echo "$dir: $(find apps/frontend/src/components/$dir -name '*.tsx' 2>/dev/null | wc -l)"
done
```

**Pre-remediation checklist** — mandatory before writing any remediation plan:

1. [ ] **Define the audit scope** — list every directory that could contain the target pattern. A copy-violation audit that scans only `components/` misses `pages/` entries. A DTO-shape audit that scans only `frontend/src/` misses `contracts/src/`.
2. [ ] **Run a file-system grep** across the full scope — not just memory or wiki claims. The SessionPage copy remediation (2026-08-08) scanned 8 files in `components/` and missed the 11 violations in `pages/SessionPage.tsx`.
3. [ ] **Verify wiki status claims** against the filesystem. If the wiki says "6/6 tool components built" but `find` shows 4 files, fix the wiki first.
4. [ ] **Check test mock data shapes** — if the remediation changes how data flows into a component, verify that all SWR mocks providing data to that component match the new shape.

If audit disagrees with wiki, update wiki FIRST, then plan from corrected baseline. A wiki status claim without a recent audit is fiction.

Checklist:
- [ ] Filesystem audit run (component count per layer)
- [ ] Audit scope explicitly includes pages/ + components/ + layout/
- [ ] Wiki status corrected if audit disagrees
- [ ] Plan targets only real gaps

### 8 — Archive proposals when superseded by concept pages

Proposals are scaffolds — once the concept page exists, the scaffold must come down or be marked historical.

| Condition | Action |
|-----------|--------|
| Concept page contains ALL proposal content | **Delete** the proposal |
| Proposal has unique decision tree/trade-off analysis | **Archive** with `> **Archived** — superseded by [[ConceptPage]]. Retained for [value].` |
| Still actively referenced by implementation plans | Mark as superseded, keep until plans updated |

```markdown
# ❌ synthesis/gamification-proposal.md — 246 lines, 0 inbound links, all content in concepts/Gamification.md
# ✅ Delete or: > **Archived** — superseded by [[Workspace Sharing]]. Retained as decision record.
```

Checklist:
- [ ] Does concept page contain ALL proposal content? If yes, delete.
- [ ] If retaining, add `> **Archived**` header as first line after title.
- [ ] Update `Wiki/index.md` description to reflect archived status.

### 9 — Post-merge wikilink verification (no dead links)

After any page deletion or merge, grep sweep for the deleted filename and fix every broken link in entity and concept pages:

```bash
rg "\[\[DeletedPage\]\]" Wiki/entities/ Wiki/concepts/ Wiki/concepts/DDD*
# Fix: update to new location, remove if absorbed, or replace with similar page
```

**Fix priority**: Entity pages → Governance pages (CLAUDE.md, DDD) → Core concept pages → Historical synthesis (optional).

Checklist:
- [ ] `rg "\[\[DeletedPageName\]\]" Wiki/entities/ Wiki/concepts/` — fix all matches
- [ ] `rg "\[\[DeletedPageName\]\]" Wiki/concepts/DDD*` — fix governance documents
- [ ] Re-run grep to confirm zero matches in entity/concept/governance pages

---

## Copy Module Rules [SHOULD]

Govern `@flow-app/copy` (`packages/copy/`). Every user-visible string — label, button, error, notification, tooltip, placeholder — lives here. Reference keys, never literal strings.

### 1 — Zero hardcoded user-facing strings

Every user-visible string MUST come from `copy.t('module.category.key')`. Applies to React JSX children, `label`, `placeholder`, `aria-label`, `title`, `helperText`, `tooltip`, backend error messages, SSE descriptions, HTML attributes.

```tsx
// ❌ <button>Generate</button>
// ❌ <TextField label="Email" />
// ✅ <button>{copy.t('toolPage.cta.submit')}</button>
// ✅ <TextField label={copy.t('auth.login.email')} />
```

Checklist:
- [ ] No literal strings in JSX children
- [ ] All `label`, `placeholder`, `aria-label`, `title`, `helperText`, `tooltip` use `copy.t()`
- [ ] User-facing errors use `DomainError` subclass, not `throw new Error('...')`

**Verification**: an `import { copy }` in the file is NOT sufficient proof of compliance. After fixing copy violations, run a **grep for non-copy strings across ALL directories** that render user-facing UI:

```bash
# Scan pages/ too — not just components/. The 2026-08-08 remediation missed
# SessionPage.tsx (11 hardcoded strings) because the audit only scanned components/.
rg -n '"[A-Z][a-z]' apps/frontend/src/pages/ apps/frontend/src/components/ apps/frontend/src/layout/ \
  --iglob '*.tsx' | grep -v 'copy\.t(' | grep -v 'import ' | grep -v '//'
```

**Boundary rule**: copy violation audits MUST scan `pages/`, `components/`, and `layout/` — never just `components/` alone. See [[CLAUDE.md]] → "Wiki Content Rules" §7 for the canonical audit-scope rule.

### 2 — Test mocking convention

Mock `@flow-app/copy` to return the KEY as value. Tests assert on keys, not resolved Italian strings.

```typescript
vi.mock('@flow-app/copy', () => ({ copy: { t: (key: string) => key } }));
expect(screen.getByText('toolPage.cta.submit')).toBeDefined();
```

**Exception**: component-level tests explicitly testing copy resolution may use the real module.

Checklist:
- [ ] Copy module mocked to return keys (unless testing copy resolution)
- [ ] Assertions search for copy KEYS, not Italian strings

### 3 — No duplicate label maps

Before creating a local constant map of labels, verify it doesn't exist in:
1. `packages/copy/src/it/assets.ts` — canonical asset type labels
2. `apps/frontend/src/constants/assets.ts` — `ASSET_TYPE_LABELS` (shared import)
3. `packages/domain/src/generation/` — `ToolDefinition`-based labels

```typescript
// ❌ const ASSET_LABELS: Record<string, string> = { 'brief': 'Brief', ... };
// ✅ import { ASSET_TYPE_LABELS } from '../../constants/assets';
```

Checklist:
- [ ] Run `rg "ASSET_TYPE_LABELS|ASSET_LABELS|asset.*label" apps/frontend/src/ --iglob '*.{ts,tsx}'`
- [ ] This applies to ALL label/display-name maps, not just asset types

### 4 — Copy module is the single source of status/state labels

Status chips, tab labels, challenge states, and UI state labels live in `packages/copy/`. Status labels: `shared.sessionStatus.*`; tab labels: `workspace.sessions.tabs.*`.

```typescript
// ❌ <Chip label="Running" />
// ✅ <Chip label={copy.t('shared.sessionStatus.running')} />
```

Available keys (check `packages/copy/src/it/shared.ts`):
- `shared.sessionStatus.queued` / `running` / `completed` / `failed` / `cancelled` / `draft`
- `workspace.sessions.tabs.inProgress` / `completed` / `failed`

### 5 — `copy.t()` accepts `string` natively — no `as any` needed

`copy.t(key: string)` is typed to accept any string. Wrapping template literals in `as any` is unnecessary noise. The 2026-08-13 cleanup removed 3 such casts — they were all dead weight.

```typescript
// ❌ copy.t(`shared.sessionStatus.${status}` as any)     // as any is noise
// ✅ copy.t(`shared.sessionStatus.${status}`)            // copy.t accepts string
```

Lint: this pattern triggers `@typescript-eslint/no-explicit-any`. Remove the cast, not the lint rule.

---

## Test Fidelity Rules [SHOULD]

Prevent mock-object mismatches, missing fields, and editing side-effects discovered during the 2026-08-08 remediation session.

### 1 — Test mocks must match every property path accessed by code under test

Trace all property accesses in the production code path and ensure the mock provides valid values.

```
session.createdAt.toISOString()  →  createdAt must exist on mock
session.artifacts.length          →  artifacts must be an array
session.toolKey.value             →  toolKey.value must exist on mock
```

Checklist:
- [ ] Every property read on the mock returns a valid value (not `undefined`)
- [ ] Objects with methods (`.toString()`, `.toISOString()`, `.isTerminal()`) mock those methods
- [ ] `apply()` and other mutating methods actually modify the mock object (not just `vi.fn()`)
- [ ] Repository methods called indirectly still accept the expected parameter shape

### 1.1 — Mock data must include ALL mandatory DTO fields

Missing `workspaceId` and `stepCount` in `SessionListItemDTO` mocks silently broke Tab badges (rendered "undefined steps") and navigation callbacks.

```typescript
// ❌ { id: 's-1', toolKey: 'blog-post', status: 'completed', createdAt: '...' }
//    — missing workspaceId, stepCount
// ✅ const mockSession: SessionListItemDTO = {
//      id: 's-1', toolKey: 'blog-post', workspaceId: 'ws-1',
//      status: 'completed', stepCount: 5, createdAt: '2024-01-15T10:30:00Z',
//    };
```

Checklist:
- [ ] Read the interface definition (not just the code under test)
- [ ] Every non-optional field has a valid value
- [ ] For list/page-level tests with SWR: provide ALL keys used by child components
- [ ] Mock SWR responses include `{ data, isLoading: false, error: undefined }`
- [ ] **SWR data shapes must match consumer destructuring**: if a component destructures `{ queued, running, completed, failed }`, the mock must provide those keys, not a flat `data: [...]` array. A shape mismatch silently produces `undefined` arrays → empty UI that passes tests but masks real behavior.

### 1.2 — When a component's data contract changes, grep for ALL SWR mocks feeding that component

Changing how a component consumes data (e.g., `SessionList` switching from single `api.listSessions` to 4 per-status calls) changes the implicit contract with every SWR mock that provides data for that component's SWR key. After changing a component's data fetcher:

```bash
# Find all test files that mock SWR data for the changed component's key
rg "sessions-.*workspaceId" apps/frontend/src/**/*.test.tsx -l
# Update each mock's data shape to match the new fetcher return type
```

Checklist:
- [ ] Identify the SWR key(s) the component uses (`sessions-${workspaceId}`, etc.)
- [ ] Grep all test files for that key pattern
- [ ] Update every mock's `data` field to match the new fetcher return shape
- [ ] Run the full test suite — shape mismatches produce no visible error, they silently render empty UI

### 2 — Establish test baseline before large-scale refactoring

Before any refactoring touching >3 files, run the full test suite and record failures:

```bash
cd apps/backend && npx vitest run 2>&1 | grep -E 'FAIL|Tests.*failed' > /tmp/pre-baseline.txt
cd apps/frontend && npx vitest run 2>&1 | grep -E 'FAIL|Tests.*failed' > /tmp/pre-baseline-fe.txt
```

After changes, diff against baseline — only NEW failures are blockers.

### 3 — Avoid `replaceAll` on short multi-context strings

Strings <15 characters (e.g., `"Sign in"`) may appear in multiple contexts needing different replacements. Prefer full-file `write` for files <200 lines; for larger files, use targeted `edit` with 3+ lines of surrounding context.

```bash
# After batch edit, verify no old strings remain:
rg "Sign in" apps/frontend/src/pages/__tests__/LoginPage.test.tsx
```

### 4 — Batch reads before batch edits

When modifying >5 files: (1) read all target files in parallel, (2) plan changes, (3) execute edits in parallel batches. Prefer `write` for files <200 lines, `edit` for targeted changes in larger files.

### 5 — XState v5 `fromCallback` with browser APIs requires jsdom polyfill

Machines using `fromCallback` to invoke `EventSource`, `WebSocket`, or `fetch` fail in jsdom. Polyfill before any test triggering those states:

```typescript
class MockEventSource {
  onerror: (() => void) | null = null;
  addEventListener(_type: string, _handler: (e: MessageEvent) => void) {}
  close() {}
}
beforeAll(() => { (globalThis as any).EventSource = MockEventSource; });
```

Checklist:
- [ ] Scan machine for `fromCallback` actors — identify all browser APIs used
- [ ] Polyfill every browser API before any test runs
- [ ] Simulate SSE events via `actor.send()`, not through the polyfill

---

## Implementation Planning Patterns [MAY]

### 1 — Batch compression (parallelize independent subtrees)

When creating an implementation plan:
1. **Identify independent subtrees** — files without shared dependencies run in parallel
2. **Merge steps touching the same file** into one pass
3. **Backend as single commit** — migration + types + domain + repo + API = 1 batch
4. **Extraction + wiring = one operation** — extract component AND update caller simultaneously
5. **UI with mock before backend is ready** — build UI with `onSave` stub; wire API when backend lands

```markdown
# ❌ Phase 1: Backend → Phase 2: API → Phase 3: Frontend → Phase 4: Wiring → Phase 5: Testing
# ✅ Batch 1 (parallel): Backend PR + Component A (mock) + Component B
#    Batch 2: Wire A + wrapper C
#    Batch 3: Integration test
```

### 2 — Multi-agent audit before large-scale refactoring

Before any refactoring touching >10 files or spanning frontend + backend, launch a multi-agent audit with specialized lenses. The 2026-08-13 session ran 5 agents (type-design-analyzer, design-ux-architect, design-ui-designer, code-reviewer, code-simplifier) on the FE generation perimeter. **Overlap between their findings was <20%** — each agent caught bugs the others missed.

**Agent roster and lenses:**
| Agent | Lens | Finds what others miss |
|-------|------|----------------------|
| `type-design-analyzer` | DTO shapes, type drift, unsafe casts | `as any` masks real data gaps, type duplicates |
| `design-ux-architect` | Flow redundancy, state machine states, URL deep-linking | Unreachable states, race conditions, refresh resilience |
| `design-ui-designer` | Visual coherence, animation, accessibility, token consistency | Gradient contrast failures, dead animation code, nested live regions |
| `code-reviewer` | Correctness, leaks, performance | rAF loops, race conditions, silent error swallowing |
| `code-simplifier` | Duplication, dead code, DRY violations | Copy-paste twins, unused exports, 4+ formatDuration variants |

**Process:**
1. Load the full perimeter into session (all files in the scope, all wiki entries)
2. Launch all agents in **parallel** — each gets the full scope + a tailored mandate
3. Merge findings into a unified report organized by cross-cutting theme
4. Derive a phased implementation plan from the merged report
5. Implement in dependency order

**One agent is worth ~5-8 findings. Five agents running in parallel (same cost as one) are worth ~40 findings with <20% redundancy.**

---

## Code Quality Rules [SHOULD]

### 1 — TypeScript: `useState` with `as const` arrays requires explicit type

```typescript
// ❌ const [color, setColor] = useState(COLORS[0]); // type = "red" literal
// ✅ const [color, setColor] = useState<string>(COLORS[0]);
```

### 2 — Design token contrast verification

Color values in design tokens must be mechanically verified for WCAG 2.1 AA compliance — human perception is unreliable. A teal `#0891B2` on white looked fine but measured **2.9:1** (below the 3:1 minimum for large text).

```bash
# After any gradient, background, or text color change, verify:
# Use an online tool (https://webaim.org/resources/contrastchecker/) or
# a CLI tool like `color-contrast-checker`:
npx color-contrast-checker --background "#FFFFFF" --foreground "#0891B2"
# Must return ≥4.5:1 for normal text, ≥3:1 for large/bold text
```

**Particular risk**: gradients with multiple color stops. The **endpoint** color determines the worst-case contrast. Verify every stop in the gradient.

Checklist:
- [ ] Every new color value checked against its intended background
- [ ] Gradient endpoints verified — not just the "average" color
- [ ] Normal text: ≥4.5:1; Large text (≥18px or ≥14px bold): ≥3:1

### 3 — Tool selection: `edit` vs `write` decision rule

| File size | Operation | Tool |
|-----------|-----------|------|
| <100 lines, single change | Targeted edit | `edit` |
| 100-300 lines, multiple changes | Full rewrite | `write` |
| >300 lines, single change | Targeted edit, 5+ lines context | `edit` |

**Never use `edit` for renaming across an entire file — use `write`.** After batch `write`, verify with `tsc --noEmit`.

### 4 — Semantic field naming: rename when meaning bifurcates

A single field interpreted three different ways across three surfaces is the most expensive class of bug — no type system catches it because `number` is correct everywhere. The 2026-08-13 audit found `progress.current` consumed as a COUNT (progress bar), an INDEX (active step), and a CURRENT_STEP_INDEX (RunningCard) — all from the same field.

```typescript
// ❌ progress.current — "current" is ambiguous: count? index? step number?
// ✅ progress.completedCount — explicit: "count of completed steps"
```

**Rule**: when a field name could mean two things and both are valid interpretations in different contexts, rename it. The rename cost is trivial (grep + replace). The cost of NOT renaming is three surfaces silently disagreeing on what the value means.

Checklist:
- [ ] Does this field have ≥2 consumers that interpret its meaning differently?
- [ ] If yes, rename to make the producer's semantics explicit (count, index, timestamp, flag)
- [ ] Document the semantics as a JSDoc on the type definition

---

## Accessibility Rules [MUST]

Accessibility attributes (`aria-label`, `role`, `aria-live`) are systematically omitted during feature development — they require a dedicated verification pass. Run after any UI change touching user interaction.

```bash
# 1. Every onClick handler should have an aria-label on the same element
rg -B2 'onClick=' apps/frontend/src/components/ apps/frontend/src/pages/ --iglob '*.tsx' \
  | rg -v 'aria-label'

# 2. State changes visible to sighted users must be announced to screen readers
rg '"alert"|aria-live="polite"|aria-live="assertive"|role="status"' \
  apps/frontend/src/components/ apps/frontend/src/pages/ --iglob '*.tsx'

# 3. Timers rendering elapsed time must have role="timer"
rg 'Elapsed|elapsed|duration|Duration' apps/frontend/src/components/ --iglob '*.tsx' \
  | rg -v 'role="timer"'
```

**Minimum bar**: every `<Button>` and `<IconButton>` with an action must have `aria-label={copy.t('...')}`. Banner components showing completion/error state changes must have `role="alert"` (which already implies a live region — do NOT add redundant `aria-live="polite"`).

**Rules discovered 2026-08-13:**

1. **No nested `aria-live` regions**: a single status update wrapped in multiple `role="status" aria-live="polite"` containers causes triple screen-reader announcements. Keep ONE live region at the outermost level; strip from inner containers.

2. **`role="alert"` is self-contained**: `role="alert"` already implies `aria-live="assertive"` + `aria-atomic="true"`. Adding `aria-live="polite"` is contradictory and causes lint noise. Use `role="alert"` alone.

3. **`role="listitem"` requires `role="list"` parent**: `<Stack>` renders a `<div>`. If children have `role="listitem"`, the container must have `role="list"` (or use semantic `<ul>`/`<ol>`).

4. **Every animation must have `@media (prefers-reduced-motion: reduce)` guard**: one missing guard is all it takes. Audit all `animation:` / `keyframes` usages — not just the ones you wrote.

Checklist:
- [ ] Every `onClick` on a button element has an accompanying `aria-label`
- [ ] Completion/celebration/error banners have `role="alert"` (no redundant `aria-live`)
- [ ] Time-based UI elements have `role="timer"`
- [ ] Dynamic content regions use `aria-live="polite"` (max ONE per component tree)
- [ ] No nested live regions — strip `aria-live` from inner containers
- [ ] `role="listitem"` elements are inside `role="list"` / `<ul>` / `<ol>`
- [ ] Every `animation:` / `keyframes` has `prefers-reduced-motion` guard

---

## UI Component Unification Rules [SHOULD]

Prevent duplication and inconsistency across surfaces discovered during the 2026-08-10 promote-to-asset unification session. Apply when the same domain action (button, indicator, dialog) appears in ≥2 surfaces.

### 1 — Same domain action = same component

A domain action (e.g. "Promote to asset", "Cancel session") must render identically regardless of which surface triggers it. Variations in `variant` (contained/outlined) or `size` are props, not reasons to duplicate the component.

```typescript
// ❌ Three different <Button> implementations for "Promote" across SessionDetail, SessionList, Dashboard
// ✅ One <PromoteActionButton variant="contained|outlined" onClick={...} />
```

Checklist:
- [ ] Grep for the domain action's copy key or API call across `components/`, `pages/`, `layout/`
- [ ] If ≥2 surfaces render the same action, extract a shared component in `components/shared/`
- [ ] Shared component accepts `variant` and `onClick` as minimum props

### 2 — Non-interactive state indicators use `pointer-events: none`, not `disabled`

MUI's `disabled` prop overrides color (e.g. `color="success"` → gray). An indicator that communicates state ("Promoted", "Completed") must preserve its semantic color. Use `sx={{ pointerEvents: 'none' }}` to prevent clicks without losing the color.

```tsx
// ❌ <Button color="success" disabled>Promosso ad asset</Button>  → gray, not green
// ✅ <Button color="success" sx={{ pointerEvents: 'none' }}>Promosso ad asset</Button>
```

Checklist:
- [ ] Button is purely informational (no interaction expected)
- [ ] Button communicates a terminal/positive state (success, completed, done)
- [ ] `pointer-events: none` used instead of `disabled`
- [ ] Alternative: consider a `<Chip>` if MUI's disabled styling cannot be cleanly overridden

### 3 — State machines live in hooks, not components

A multi-step flow (e.g. idle → dialog → saving → done) couples UI and control logic when embedded in a component. Extract the state machine into a custom hook; the component becomes a thin orchestrator of shared sub-components.

```
❌ PromoteButton.tsx (68 lines):
   useState('idle'|'confirming'|'promoting'|'done')
   + inline confirmation UI
   + inline API call

✅ PromoteButton.tsx (42 lines):
   usePromoteAction()           ← hook: dialog state, isAlreadyPromoted, SWR invalidation
   → PromoteActionButton        ← shared: "Promuovi ad asset" button
   → PromoteDialog              ← shared: name input dialog
   → PromotedBadge              ← shared: "Promosso ad asset" indicator
```

Checklist:
- [ ] Multi-step flow with ≥3 states extracted to `hooks/use<ActionName>.ts`
- [ ] Hook returns `{ openDialog, closeDialog, isDone, <Dialog /> }` or similar declarative API
- [ ] Component file reduced to <50 lines of orchestration

### 4 — Duplication audit is feature-scoped, not directory-scoped

Duplication spans directories. A `components/`-only scan misses `pages/`. Audit by **domain action**, not by file tree.

```bash
# Right: search by domain action
rg "promoteArtifact|PromoteButton|copy\.t\('.*promote" apps/frontend/src/ --iglob '*.tsx'

# Wrong: search by directory
rg "Promote" apps/frontend/src/components/
```

Checklist before refactoring a feature:
- [ ] Grep the API call name (e.g. `promoteArtifact`) across `pages/`, `components/`, `hooks/`
- [ ] Grep the copy key (e.g. `shared.actions.promote`) across the same scope
- [ ] Grep the component name (e.g. `PromoteButton`) to find all consumers
- [ ] List every file rendering the action; if ≥3, extraction is mandatory

### 5 — Extract constants to a canonical location

Maps duplicated across components (e.g. `toolKey → assetType`) drift independently. Place them in the same file as their inverse or related constants.

```typescript
// ❌ TOOL_PRODUCES_MAP in ReadyToPromoteList.tsx AND SessionList.tsx
// ✅ constants/assets.ts — alongside ASSET_TOOL_MAP (its inverse) and ASSET_TYPE_LABELS
```

Checklist:
- [ ] Check `constants/` directory for existing related maps
- [ ] If an inverse map exists, add the new map to the same file
- [ ] Remove the inline constant from all components; import from `constants/`

### 6 — Backend serves the frontend's state needs

If the frontend needs to know "is this already in state X?" to render correctly on page load, the backend endpoint must return that information. Local state alone cannot survive page refreshes.

```
❌ Frontend uses only local Set<string> for "already promoted"
   → state lost on refresh, button re-enabled incorrectly

✅ Backend batch-queries related table (assets WHERE source_ref IN (...))
   → returns promotedAssetId in list response
   → frontend combines backend state (persistent) + local state (immediate feedback)
```

Checklist:
- [ ] Does the UI need to show a terminal state on page load?
- [ ] Does the list/detail endpoint return the state field?
- [ ] If not, add a batch query in the backend (follow existing patterns like `findLastArtifactsBySessionIds`)
- [ ] Add the field to the contracts DTO
- [ ] Frontend uses `backendField || localState` for the combined state

### 7 — Copy keys respect bounded contexts

A copy key used in a session card must not reference "asset" if the destination is a session. Create separate keys for separate domain contexts, even if the action is superficially similar.

```typescript
// ❌ CompletedCard navigates to session page but uses viewAsset ("Vedi asset")
// ✅ CompletedCard uses viewSession ("Vedi sessione")
//    SessionSummary snackbar link to actual asset uses viewAsset ("Vedi asset")
```

Checklist:
- [ ] What domain object does the CTA navigate to? (session, asset, workspace, tool)
- [ ] Does the copy key's namespace match the destination context?
- [ ] If not, create a new key (e.g. `shared.actions.view<DomainObject>`)
- [ ] Verify no duplicate keys with identical strings (e.g. `assets.actions.promote` = `shared.actions.promote`)

### 8 — Test behavior, not implementation

Asserting on MUI props (`toBeDisabled()`) couples tests to styling mechanism. Assert on **what the user perceives**: presence/absence of elements, visible text, interactive vs non-interactive state.

```typescript
// ❌ expect(btn).toBeDisabled();                           // implementation detail
// ✅ expect(screen.getByText('notifications.asset.promoted')).toBeInTheDocument();
//    expect(screen.queryByRole('button', { name: '...promote' })).toBeNull();  // active button absent
```

Checklist:
- [ ] Test asserts on visible text or ARIA role presence
- [ ] Test verifies mutual exclusivity (active button absent when indicator present, and vice versa)
- [ ] No assertions on MUI-specific DOM attributes (`disabled`, `aria-disabled`) unless those attributes are the feature under test

### 9 — Duplicate surface detection: ≥2 surfaces rendering the same lifecycle = mandatory extraction

When two page-level components (e.g., `SessionPage` and `InlineSessionTracker`) render the same session lifecycle (cancel, status derivation, GenerationSlot props, terminal CTAs), they WILL diverge. The 2026-08-13 audit found 4 independent drifts between these two surfaces after only 2 weeks of co-existence.

**Detection**: grep for the domain action's copy key or API call across `pages/` AND `components/`. If ≥2 surfaces render the same lifecycle, extract a single canonical component immediately.

```bash
# Audit for surface duplication BEFORE writing any feature:
rg "cancelSession|GenerationSlot|handleCancel" apps/frontend/src/pages/ apps/frontend/src/components/ --iglob '*.tsx' -l | sort
```

Checklist:
- [ ] Grep for the lifecycle-defining API call (e.g., `cancelSession`) across `pages/` + `components/`
- [ ] If ≥2 files match, extract a shared component (e.g., `SessionTracker`) BEFORE the drift compounds
- [ ] The shared component owns loading/error guards + status derivation + cancel + terminal CTAs — surfaces become thin wrappers

### 10 — Don't duplicate functions in tests; extract to a real module

Never replicate a function in a test file because "it's private." The test asserts on a COPY, and a future change to the real function passes the suite while breaking the app. The 2026-08-13 session fixed `deriveUIState` which had exactly this anti-pattern.

```typescript
// ❌ Test file replicates deriveUIState verbatim (line comment: "reproduced here for testing")
// ❌ Test asserts on a COPY — real function can drift undetected

// ✅ Function lives in its own module (machines/derive-ui-state.ts)
// ✅ Component imports it, test imports it — single source of truth
```

Checklist:
- [ ] If a function is complex enough to need unit tests, it belongs in its own module
- [ ] Never write `// Replicate the X function from Y — reproduced here for testing`
- [ ] Test file imports the real module, doesn't copy-paste

### 11 — Don't fallback to replacement when merging live data with base data

SSE hooks (`useLiveSession`) produce partial updates. When combining SSE data with base REST data (SWR), use **merge** (`{ ...base, ...live }`) — never **replace** (`live ?? base`). Replace silently drops fields the SSE doesn't touch (e.g., `elapsedSeconds`, `durationSeconds`, `isPromotable`).

```typescript
// ❌ const display = liveSession ?? session;  // replace drops elapsedSeconds on first SSE mount
// ✅ const display = liveSession ? { ...session, ...liveSession } : session;  // merge preserves REST fields
```

Checklist:
- [ ] Are there fields on the base data that SSE never updates? (elapsed time, isPromotable, promotedAssetId)
- [ ] Is the merge operator used, not the fallback operator?
- [ ] Does the hook's mount catch-up map ALL fields the card renders? (currentStepIndex, completedAt, etc.)

### 12 — SSE label semantics must align with list endpoint label semantics

The SSE `stepLabel` points backward ("last completed step"). The list endpoint `currentStepLabel` pointed forward ("next step to execute") — two different semantics for the same UI field. The card showed label jitter: "Draft" (forward) → "Analysis" (backward) on first SSE event. After the 2026-08-13 fix, both use backward-looking semantics.

```typescript
// ❌ listSessions: steps[s.currentStepIndex]?.label   → forward-looking ("next step")
// ❌ SSE onStep:   steps[artifactCount - 1]?.label     → backward-looking ("last completed")

// ✅ Both use backward-looking: completed steps label
// listSessions: steps[s.currentStepIndex - 1]?.label (when index > 0)
// SSE onStep:   steps[artifactCount - 1]?.label
```

Checklist:
- [ ] When a label comes from ≥2 data sources (list endpoint + SSE), verify they use the SAME semantic direction
- [ ] If `currentStepIndex` is a forward-looking index, the label must be backward-looking (`index - 1`)
- [ ] Test with both sources: initial REST load AND first SSE event — label must not change direction

---

### Tools

- **Obsidian CLI**: `obsidian read file="..."`, `obsidian search query="..."`, etc. (symlinked to `~/.local/bin/obsidian`)
- **Dataview**: SQL-like queries over YAML frontmatter (in Obsidian)

#### qmd — Proactive Wiki Exploration

**CLI tool invoked via bash**, not an internal function: `bash "qmd search 'keyword'"`.

Use proactively before any wiki operation to ground yourself in existing knowledge. Never operate on the wiki from scratch.

**Pre-operation workflow:**
1. **Before ingesting** → `qmd query "<topics>" --no-rerank` (or `qmd search` if models not cached)
2. **Before answering a query** → `qmd query "<terms>" --no-rerank`
3. **Before linting** → `qmd search "<keywords>"` (BM25)

**Key commands:**
```
qmd search "keyword terms"        # BM25 only — primary, instant, deterministic
qmd vsearch "semantic concept"    # vector similarity
qmd query "..." --no-rerank       # hybrid BM25 + vector
```

**Always prefer `qmd search`** — BM25 full-text, instant, no models needed. Avoid `qmd query` unless models are cached.

**Index maintenance** (after wiki changes): `qmd update && qmd embed`

**Critical rule**: always run a qmd query before creating a new wiki page. If relevant pages exist, link from the new page instead of duplicating. Apply the **single-owner heuristic** (see Wiki Content Rules §1–2) — if the concept is owned by one existing page, add as `## Section`.