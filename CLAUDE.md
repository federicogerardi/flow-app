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

**Key technology**: Node.js, React 19, XState v5, Kysely, PostgreSQL, Redis, BullMQ, Railway deployment.

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