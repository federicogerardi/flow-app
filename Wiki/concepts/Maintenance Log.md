---
type: concept
tags:
  - wiki/concept
  - wiki/governance
date_updated: 2026-08-04
confidence: high
---

# Maintenance Log

> Chronological log of wiki and codebase maintenance operations. Append-only — newest entries at the top.

## 2026-08-04

- ✅ **Phase 11 testing executed** — 66 test files, ~634 tests across 4 workspaces (domain: 32/415, backend: 18/127, frontend: 12/60, infra-db: 4/32). All passing (infra-db requires real PostgreSQL).
- ✅ Production vitest configs: per-workspace coverage thresholds, infra-db fork pool + sequential isolation, jsdom + React for frontend, MSW handlers (19 endpoints)
- ✅ `vitest.workspace.ts` finalized: 4 named projects (contracts + copy excluded — no testable code)
- ✅ `vitest.config.base.ts` updated: `testTimeout: 10s`, `hookTimeout: 10s`
- ✅ Wiki pages updated: `Testing Strategy` → Phase 11 Baseline section + updated configs, `phase-11-testing-plan` → Results section, `log.md`, `Maintenance Log`

## 2026-08-03

- ✅ Node.js thin reverse proxy deployed and verified on Railway dev. 9 attempts, 6 root causes resolved. Backend public domain removed, CORS disabled. Proxy serving SPA + /api/* via backend.railway.internal. Deploy log: [[synthesis/reverse-proxy-deploy-log]].
- Wiki health check executed — 113 pages analyzed. 3 high-severity fixes applied:
  - Added [[Design Tokens]] to index.md Concepts table (was orphan from catalog)
  - Fixed 2 broken wikilinks in [[DDD Domain Design Rules]]: `[[Email]]` → `[[Auth Dependencies]]`, `[[MembershipRole]]` → `[[WorkspaceMembership]]`
  - Removed duplicate `synthesis/lint-report-2026-08-01-coherence` from index.md Synthesis table
  - Fixed `---` separator line in Database Schema.md Sources section
  - Converted plain text to wikilink in Quality Gate Matrix Sources section
- Removed `maintenance:` from index.md frontmatter (YAML duplicate key issue). Created dedicated [[Maintenance Log]] page.
- Added Rule 9 to CLAUDE.md: maintenance entries → [[Maintenance Log]], never index.md

## 2026-08-02

- Phase 8 fully complete — Real Authentication frontend implemented (Workstream D: 6 new files, 4 modified — AuthContext, AuthGuard, OAuthCallback, AuthLayout, LoginPage, RegisterPage, API client token injection + 401 interceptor, AppShell user menu, protected routes). Build ✅, typecheck ✅, lint ✅, tests 8/8. Phase 8 now marked ✅ in roadmap.
- Wiki drift remediation — 8 runtime gaps + 13 documentation gaps resolved. `packages-domain Structure.md` rewritten to match code (agent-chat added, usage/ removed, 11 tool files → 1 index.ts, Asset subsystem marked as planned). `API Routes.md`: status fixes + typos. `Database Schema.md`: conversations + messages added, Kysely types corrected. `Frontend Architecture.md`: route count corrected (5→7), hooks/API methods updated. `overview.md`: usage/ context marked 🔴 planned.
- DDD governance audit completed — 58 files across 4 bounded contexts. 8 findings: 2 critical (encapsulation + zod in domain), 5 important (Error hierarchy + use case errors), 1 minor (repository side-effect). 6 pattern-based rules added to schema.
- Phase 8 backend implemented — Real Authentication (Workstreams A+B+C+E): identity domain (User, Email, UserRole, UserStatus), KyselyUserRepository, BcryptPasswordHasher, TokenService, AuthService, Passport.js, 7 auth endpoints, authenticate middleware, rate limiter. Lint warnings resolved (7→0). Branch: `feature/phase-8-real-auth`.
- Phase 8 implementation plan created — Real Authentication (5 workstreams, 35 files, 8-10 days). Plan: [[synthesis/phase-8-real-auth-plan]].
- ESM hoisting bug fixed — `process.env.SEED_USER_ID` was evaluated at module load time (before `dotenv.config()`), so dev-auth always used the fallback UUID. Moved read to request time inside middleware function.
- Medium-severity findings executed: 16/16 active findings closed across 5 phases. M1 deferred.
- Low-severity remediation executed: 5 findings across 2 phases.
- High-severity findings executed: all 10 closed across 5 phases.
- Critical findings executed: all 8 closed across 3 phases.
- Multi-agent code review filed: 41 findings across 6 domains. Synthesis: [[synthesis/code-review-2026-08-02]].
- Wiki maintenance: 2 stubs merged (Token Budget Control → LLM Gateway, Railway Deployment Config → Environment Configuration), split-page resolved (Workspace Gamification → Gamification), Planned markers added to PlayerProfile + Achievement, 7 synthesis backlinks added, Global Deterministic Model Matrix linked from Content Generation, 12 source_counts updated. Wiki-lint ✅ 114 pages.
- Health maintenance: 4 wiki-lint issues fixed (log.md frontmatter, overview.md escaped pipe, 2 missing concept stubs), 5 Italian prose violations translated, 6 env reference leaks sanitized.

## 2026-08-01

- Phase 7 implemented — Frontend MVP (4 shared + 4 page components, 5 routes, react-router v7, MUI v6 Grid2, SWR). Build ✅, tests ✅.
- Phase 5 implemented — Agent Chat bounded context (Conversation, Message, 7 agents, 6 API routes, privacy invariant). Build ✅, tests ✅.
- Phase 4 implemented — Prompt Governance Runtime (PromptTemplateId, PromptVersion, PromptComponent, PromptComposer, filesystem repository, 12 default components). Build ✅, tests ✅.
- Phase 3 implemented — workspace collaboration (membership entity, aggregate, domain events, repository, middleware, 10 API routes, 3 use cases). Build ✅, tests ✅.
- API verification completed — managed PostgreSQL + Redis provisioned, 6 migrations executed, all endpoints green, idempotency replay verified.
- Phase 2 implemented — reliability and ops hardening (optimistic locking, health monitor, graceful shutdown, cleanup job). Build ✅, tests ✅.
- Branch sync policy documented — permanent branches (main/staging/dev), auto-sync workflow, promotion flow.
- Phase 0-1 implemented — monorepo bootstrap + core async generation vertical slice.
- Implementation roadmap filed — phased development sequence.
- Ultra-strict naming pass completed — canonical guard naming standardized to `canQueue`.
- Lexical hardening pass completed — residual `START` transition references removed.
- Mini-remediation cleanup completed — `draft` vs `queued` lifecycle semantics aligned.
- Queued-state drift closed — `queued` is now canonical.
- Coherence lint executed — structural wiki lint passed.
- Final-gate remediation applied — contract freeze and enforcement artifacts added.
- Execution follow-up completed — 3 governance concept pages added.
- Model alignment for PM review — overview updated to 6 bounded contexts.
- Governance audit persisted — multi-dimension project model audit.
- Fast-close governance gaps — 3 concept pages added.
- CI/CD governance completed — CI-CD Promotion Policy added.
- Output Personalization deprecated — concept page removed.
- Critical-gap remediation for PM review — 4 concept pages added.
- Gamification UI Designer review — 3 pages updated.
- Agent chat UX extended — new concept page added.
- Agent chat exploration — 2 new concept + 2 new entities + 1 synthesis.
- Workspace sharing exploration — 2 new concept + 1 new entity + 1 synthesis.
- Prompting mechanics deep-dive — 3 concept pages added.
- Prompting mechanics exploration completed — 4 concept pages + 1 synthesis.

## 2026-07-31

- Post-remediation language normalization completed on source/concept pages.
- Backend architecture consistency remediation applied.
- Second remediation applied (API contract governance, CI contract checks, LLM reliability policy, worker scaling policy).
- Phase 3 remediation applied (DR runbook targets, outbox/inbox delivery contract, API deprecation timeline policy).
- Phase 4 frontend remediation applied (readiness determinism, SSE multi-session client contract, queue-position semantics).
- UX/GUI design session completed — 3 new concept pages added.

## Sources

- [[log]] — Wiki operation log
- [[index]] — Wiki catalog index
