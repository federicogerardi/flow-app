---
type: technical-standard
owner: architecture
status: active
date_updated: 2026-07-31
---

# Flow App Project Constitution

> **Purpose**: ensure the application is built as a direct, executable child of `Wiki/`.
> The wiki defines architecture intent; code is the implementation of that intent.

## 1) Constitutional Principle

**No code change is valid unless it is traceable to canonical wiki pages.**

Traceability is mandatory for features, refactors, and bug fixes that impact domain behavior, APIs, workflows, or architecture.

---

## 2) Source-of-Truth Hierarchy

1. **Canonical architecture**: `Wiki/concepts/*`, `Wiki/entities/*`, `Wiki/overview.md`
2. **Factual source summaries**: `Wiki/sources/*`
3. **Synthesis and audits**: `Wiki/synthesis/*`
4. **Codebase**: implementation artifact

If wiki and code disagree, implementation is considered drifting until:
- wiki is updated through explicit architectural decision, or
- code is corrected to match existing wiki canon.

---

## 3) Ten Non-Negotiable Architecture Laws

1. **Bounded Context Integrity**
   - Every change belongs to one declared bounded context.
   - Cross-context behavior must be explicit (domain events, application orchestration).

2. **Aggregate Root Gatekeeping**
   - State-changing operations enter through aggregate roots only.
   - No external mutation of child entities bypassing aggregate invariants.

3. **Domain Invariants in Domain**
   - Business rules live in entities, value objects, and domain services.
   - Controllers, routes, and UI may validate shape, never core business truth.

4. **Tool Unification First**
   - New tool capabilities must extend static tool configuration before new runtime structures are introduced.
   - "One engine, many configurations" is default policy.

5. **No Tool-Specific UI Fork by Default**
   - UI differences should be configuration-driven.
   - Tool-specific components require an explicit exception note in wiki.

6. **Single Workflow Canon**
   - Session lifecycle remains canonical and shared.
   - Workflow changes update both domain lifecycle definition and machine integration docs.

7. **Domain Events for Inter-Context Effects**
   - Cross-context side effects are event-driven and documented.
   - Hidden synchronous coupling across contexts is forbidden.

8. **Infrastructure Is an Adapter Layer**
   - Repositories and gateways implement domain contracts; they do not define domain semantics.
   - No infrastructure concern leaks into domain model types.

9. **Wiki-First Evolution**
   - Significant architecture/design changes start in wiki (`concepts/` or `synthesis/`) before or alongside code.
   - "Code now, docs later" is non-compliant for architecture-impacting work.

10. **Anti-Drift Enforcement**
   - Every merge must pass wiki consistency + architecture fitness checks.
   - Drift is a release blocker, not tech debt backlog.

---

## 4) Mandatory PR Contract

Every PR must include a section named `Architecture Traceability` with this structure:

```md
## Architecture Traceability

- wiki_refs:
  - [[Content Generation]]
  - [[Session Machine (XState v5)]]
- bounded_context: Content Generation
- aggregate: Session
- invariants_changed: yes|no
- domain_events_changed: yes|no
- api_contract_changed: yes|no
- migration_required: yes|no
```

Missing this block means PR is constitutionally incomplete.

---

## 5) Tool Extension Policy (Default Path)

Adding a tool should primarily require changes in:

- tool definition (domain static config)
- prompt templates / step definitions
- copy modules
- asset mapping and readiness rules

Adding a new tool **must not** require:

- a new dedicated session workflow engine
- ad hoc route families duplicating generic behavior
- bespoke UI flow when generic setup/progress/result can express it

If any of the above is required, create an explicit architecture exception in wiki before merge.

---

## 6) Definition of Done (Architecture Level)

A change is done only when all are true:

1. Wiki pages are updated and internally consistent.
2. Bounded context, aggregate, and invariants are explicit.
3. Domain event implications are explicit (if any).
4. Code behavior matches documented model.
5. Tests cover domain rules and orchestration behavior.

---

## 7) CI Gate Recommendations (Required to Operationalize)

At minimum, enforce these gates:

1. **Wiki lint gate**
   - frontmatter completeness
   - `source_count` matches `## Sources`
   - no broken wikilinks/anchors
   - language policy compliance

2. **Wiki-to-Code drift gate**
   - tool catalog parity
   - route and contract parity
   - lifecycle/state transition parity

3. **Architecture fitness gate**
   - layer dependency rules
   - forbidden imports across boundaries
   - domain purity checks

---

## 8) Exception Handling

Exceptions are allowed only if:

1. documented in wiki as a time-boxed exception,
2. owner and expiration condition are explicit,
3. rollback or convergence path is defined.

Undocumented exceptions are architectural defects.

---

## 9) Governance Cadence

- **Per PR**: traceability contract check
- **Weekly**: wiki/code drift review
- **Per release**: architecture conformance checkpoint

---

## 10) Adoption Note

This constitution is active immediately for all new architecture-impacting work.

Recommended follow-up artifacts:

1. `/.github/pull_request_template.md` with mandatory `Architecture Traceability` block
2. `scripts/wiki-lint.py` + `scripts/architecture-traceability-check.py` (and later `architecture-fitness` checks)
3. `Wiki/synthesis/constitution-adoption-plan.md` for rollout tracking
