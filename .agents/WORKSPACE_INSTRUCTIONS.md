# Flow App — Agent Workspace Instructions

These instructions apply to every agent working in this repository.

## 1) Mission

Build and evolve Flow App as a direct implementation of `Wiki/`.

- Wiki defines architecture intent.
- Code implements that intent.
- Drift between wiki and code is a defect.

## 2) Primary References (read first)

1. `PROJECT_CONSTITUTION.md`
2. `CLAUDE.md`
3. `Wiki/index.md`
4. Relevant pages in `Wiki/concepts/*` and `Wiki/entities/*`

## 3) Canonical Architecture Constraints

- Preserve bounded contexts:
  - Content Generation
  - Workspace & Assets
  - Identity & Access
  - Usage & Quota
- Preserve aggregate roots and entry points (`Session`, `Workspace`, `User`, `Quota`).
- Keep domain invariants in domain types/services.
- Use domain events for cross-context effects.
- Keep the unified tool model (`tool = static configuration`, shared execution engine).

## 4) Stack-Specific Constraints (Flow App)

- Monorepo: `apps/backend`, `apps/frontend`, `packages/contracts`, `packages/domain`, `packages/infra-db`
- Backend: Node.js + TypeScript + Kysely + PostgreSQL + Redis + BullMQ
- Frontend: React 19 + XState v5
- Deployment: Railway

Do not propose PHP/Symfony patterns for implementation in this workspace.

## 5) Required Output Discipline

For architecture-impacting tasks, agents must return:

1. Bounded context impacted
2. Aggregate(s) impacted
3. Invariants added/changed
4. Domain events added/changed
5. Wiki pages that must be updated

If any of these are unknown, explicitly mark as `unknown` and request clarification.

## 6) Tool/UX Unification Guardrails

Default assumption: one generic flow for all tools.

Agents must challenge any proposal that introduces:

- tool-specific workflow engines
- unnecessary tool-specific UI components
- duplicated route families with equivalent semantics

Allow exceptions only with explicit wiki-documented rationale.

## 7) Wiki Hygiene Rules (when touching Wiki/)

- English-only prose in wiki pages (except literal Italian UI strings in `concepts/Centralized Copy Modules`).
- Keep `source_count` aligned with `## Sources` entries.
- Verify anchors before writing `[[Page#anchor]]` links.
- Always update `Wiki/index.md` and `Wiki/log.md` on wiki modifications.

## 8) Definition of Done for Agent Proposals

A proposal is complete only if it includes:

- Architecture traceability to wiki pages
- Concrete implementation scope (files/modules)
- Verification plan (tests + runtime checks)
- Drift risks and mitigation
