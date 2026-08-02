---
type: concept
tags:
  - wiki/concept
  - wiki/architecture
date_updated: 2026-08-02
source_count: 5
confidence: high
maintenance: 2026-08-02 — drift remediation: added agent-chat tree (12 files), removed usage/ tree (not implemented), fixed identity paths (flat, no entities/), fixed workspace (added Membership, errors; Asset files, IdempotencyKey.ts, CrawlData.ts, AcquisitionData.ts removed — not yet implemented), fixed tools/ (single index.ts not 11 files), added shared/domain-error.ts + concurrency-error.ts.
---

# packages/domain — Directory Structure

> Definitive file tree for the framework-agnostic domain package

## Principle

`packages/domain` contains **pure TypeScript**: entities, value objects, domain services, domain events, and repository interfaces. Zero dependencies on infrastructure (Kysely, BullMQ, Express, React, Redis). Only `typescript` as devDependency.

```
packages/domain/
├── package.json              # { "name": "@flow-app/domain", "devDependencies": { "typescript" } }
├── tsconfig.json
│
└── src/
    ├── generation/           # Content Generation — Core Domain
    ├── workspace/            # Workspace & Assets — Supporting
    ├── identity/             # Identity & Access — Generic
    ├── agent-chat/           # Agent Chat — Supporting
    └── shared/               # Shared Kernel
```

## Full Tree

```
packages/domain/src/
│
├── generation/                          # 🟢 Content Generation (Core)
│   ├── entities/
│   │   ├── Session.ts                   # Aggregate Root
│   │   └── Artifact.ts                  # Entity
│   │
│   ├── value-objects/
│   │   ├── SessionId.ts                 # VO: extends Identifier
│   │   ├── ToolKey.ts                   # VO: kebab-case string
│   │   ├── StepNumber.ts                # VO: int >= 1
│   │   ├── ArtifactId.ts                # VO: extends Identifier
│   │   ├── ArtifactContent.ts           # VO: immutable string
│   │   ├── ArtifactStatus.ts            # VO: pending | generating | completed | failed
│   │   ├── SessionStatus.ts             # VO: queued | draft | ready | running | completed | failed | cancelled
│   │   └── ReadinessPolicy.ts           # VO: evaluates whether AcquisitionData satisfies ToolDefinition requirements
│   │
│   ├── domain-services/
│   │   └── ContextEnricher.ts           # DS: assembles prompt context (serial | hybrid)
│   │
│   ├── domain-events/
│   │   ├── SessionStarted.ts            # Event
│   │   ├── StepCompleted.ts             # Event
│   │   ├── SessionCompleted.ts          # Event (cross-context: → workspace, → usage)
│   │   ├── SessionFailed.ts             # Event
│   │   └── SessionCancelled.ts          # Event
│   │
│   ├── session-lifecycle.ts             # Domain-owned state machine (states, transitions, getValidTransition)
│   │
│   ├── repositories/
│   │   └── SessionRepository.ts         # Interface (implemented in packages/infra-db)
│   │
│   ├── tools/                           # Static tool configurations
│   │   ├── tool-definition.ts           # ToolDefinition, StepDefinition types
│   │   ├── index.ts                     # toolRegistry + 11 tool definitions (blog-post, landing-funnel, landing-page, video-script-long-form, video-description, ad-copy, brief, brand-voice, buyer-persona, marketing-angle, ai-overview-analysis)
│   │   └── prompting/                   # Prompt governance (Phase 4)
│   │
│   └── index.ts                         # Barrel: exports all public types
│
├── workspace/                           # 🟡 Workspace & Assets (Supporting)
│   ├── entities/
│   │   ├── Workspace.ts                 # Aggregate Root
│   │   └── WorkspaceMembership.ts       # Internal Entity (invite/accept/role)
│   │
│   ├── value-objects/
│   │   ├── MembershipRole.ts            # VO: owner | editor | viewer
│   │   └── MembershipStatus.ts          # VO: invited | active
│   │
│   ├── domain-events/
│   │   └── index.ts                     # MemberInvited, MemberJoined, MemberRemoved, OwnershipTransferred
│   │
│   ├── errors.ts                        # NotWorkspaceOwnerError, NotAWorkspaceMemberError, etc.
│   │
│   ├── repositories/
│   │   └── WorkspaceRepository.ts       # Interface
│   │
│   └── index.ts
│
├── identity/                            # 🔵 Identity & Access (Generic)
│   ├── User.ts                          # Aggregate Root (flat — no entities/ subdirectory)
│   │
│   ├── value-objects/
│   │   ├── Email.ts                     # VO: validated email
│   │   ├── UserRole.ts                  # VO: admin | member
│   │   └── UserStatus.ts               # VO: active | disabled
│   │
│   ├── AuthSession.ts                   # Read model
│   ├── OAuthAccount.ts                  # Read model
│   ├── errors.ts                        # InvalidCredentialsError, UserAlreadyExistsError, etc.
│   │
│   ├── repositories/
│   │   └── UserRepository.ts            # Interface
│   │
│   └── index.ts
│
├── agent-chat/                          # 🟢 Agent Chat (Supporting) — Phase 5
│   ├── entities/
│   │   ├── Conversation.ts              # Aggregate Root
│   │   └── Message.ts                   # Entity (immutable, append-only)
│   │
│   ├── value-objects/
│   │   ├── MessageRole.ts               # VO: user | agent | system
│   │   ├── ConversationStatus.ts        # VO: active | archived
│   │   └── AgentKey.ts                  # VO: strategist | copywriter | etc.
│   │
│   ├── agent-personas.ts                # 7 static agent configs with system prompts
│   │
│   ├── domain-events/
│   │   └── index.ts                     # ConversationStarted, MessageAdded, ConversationArchived
│   │
│   ├── repositories/
│   │   └── ConversationRepository.ts    # Interface
│   │
│   └── index.ts
│
└── shared/                              # ⬜ Shared Kernel
    ├── domain-error.ts                  # DomainError abstract class (code, retryable)
    ├── domain-event.ts                  # DomainEvent interface
    ├── identifier.ts                    # Base Value Object: new Identifier<T>(value)
    ├── date-time.ts                     # DateTime VO wrapper
    ├── concurrency-error.ts             # ConcurrencyError (extends DomainError)
    ├── __tests__/
    │   └── identifier.test.ts           # 1 unit test (only test file)
    └── index.ts

> **Implementation note**: The `usage/` bounded context (Quota aggregate) and the Asset subsystem under `workspace/` (Asset.ts, AssetResolver.ts, Asset VOs) are documented in the wiki but not yet implemented in code. DB migrations exist (005, 003) but domain code and Kysely repository implementations are planned for a future phase. `toolRegistry` condenses all 11 tools into a single `tools/index.ts` rather than individual per-tool files.
```

## File Count

> Actual count from codebase (2026-08-02). `usage/` omitted — not implemented.

| Context | Entities | VOs | Services | Events | Repos | Tools | Other | Total |
|---------|----------|-----|----------|--------|-------|-------|-------|-------|
| generation | 2 | 8 | 1 | 5 | 1 | 2 | 1 (session-lifecycle) | 20 |
| workspace | 2 | 2 | — | 4 | 1 | — | 2 (errors, index) | 11 |
| identity | 1 | 3 | — | — | 1 | — | 4 (AuthSession, OAuthAccount, errors, index) | 9 |
| agent-chat | 2 | 3 | — | 3 | 1 | — | 2 (personas, index) | 11 |
| shared | — | — | — | — | — | — | 7 | 7 |
| **Total** | **7** | **16** | **1** | **12** | **4** | **2** | **16** | **58** |

> **Planned but not implemented**: `usage/` (Quota aggregate, ~10 files). Asset subsystem (`Asset.ts`, 6 Asset VOs, `AssetResolver.ts`, `AssetCreated`/`AssetUpdated` events). See [[implementation-roadmap-2026-08-01|Phase plan]].

---

## Package Boundaries

### What goes IN `packages/domain`

| ✅ IN | Example |
|-------|---------|
| Entity classes with business methods | `Session.addArtifact()`, `Workspace.inviteMember()` |
| Value Objects with validation | `Email.create()`, `MembershipRole.from()` |
| Domain Services (pure logic) | `ContextEnricher.enrich()` |
| Domain Events (immutable DTOs) | `SessionCompleted`, `MemberInvited` |
| Repository Interfaces (signatures only) | `SessionRepository.save(session: Session): Promise<void>` |
| Static Tool Configurations | `tools/index.ts` (toolRegistry with 11 tools) |
| Shared Kernel | `DomainEvent`, `Identifier`, `DateTime`, `DomainError` |

### What stays OUT

| ❌ OUT | Lives in |
|--------|----------|
| Repository implementations (SQL queries) | `packages/infra-db` |
| HTTP handlers, routes, middleware | `apps/backend` |
| XState machines, BullMQ workers | `apps/backend` |
| React components, UI state | `apps/frontend` |
| Database migrations, seeds | `packages/infra-db` |
| Environment config, secrets | `apps/backend` |
| API DTOs, request/response types | `packages/contracts` |

---

## Dependency Rules

```
packages/domain
  ├── import: nothing (except typescript)
  ├── imported by: packages/contracts, packages/copy, packages/infra-db, apps/backend, apps/frontend
  └── never imports from: any other package in the monorepo
```

```
packages/domain ← packages/contracts    (reads types)
                ← packages/copy         (reads AssetType, ToolKey enums)
                ← packages/infra-db     (implements repository interfaces)
                ← apps/backend          (uses entities, VOs, services)
                ← apps/frontend         (uses types via contracts)
```

---

## Barrel Exports

Each context exposes a clean `index.ts`. No consumer imports from internal paths.

```typescript
// ✅ Correct
import { Session, Artifact, SessionRepository } from '@flow-app/domain/generation';

// ❌ Wrong
import { Session } from '@flow-app/domain/generation/entities/Session';
```

### generation/index.ts

```typescript
// Entities
export { Session } from './entities/Session';
export { Artifact } from './entities/Artifact';

// Value Objects
export { SessionId } from './value-objects/SessionId';
export { ToolKey } from './value-objects/ToolKey';
export { StepNumber } from './value-objects/StepNumber';
export { ArtifactId } from './value-objects/ArtifactId';
export { ArtifactContent } from './value-objects/ArtifactContent';
export { SessionStatus } from './value-objects/SessionStatus';
export { SessionLifecycle, getValidTransition } from './session-lifecycle';
export type { SessionState, SessionEventType } from './session-lifecycle';

// Domain Services
export { ContextEnricher } from './domain-services/ContextEnricher';

// Domain Events
export { SessionStarted } from './domain-events/SessionStarted';
export { StepCompleted } from './domain-events/StepCompleted';
export { SessionCompleted } from './domain-events/SessionCompleted';
export { SessionFailed } from './domain-events/SessionFailed';
export { SessionCancelled } from './domain-events/SessionCancelled';

// Repository Interfaces
export { SessionRepository } from './repositories/SessionRepository';

// Tools
export { toolRegistry, getTool } from './tools';
export type { ToolDefinition, StepDefinition } from './tools/tool-definition';
```

---

## Cross-Context References

Contexts reference each other via **shared Value Objects** (shared IDs), never through direct entity imports.

```typescript
// ✅ Cross-context reference: WorkspaceId is a shared VO
// packages/domain/src/generation/entities/Session.ts
import { WorkspaceId } from '../../workspace/value-objects/WorkspaceId';

class Session {
  constructor(
    readonly workspaceId: WorkspaceId,  // Reference, not import of Workspace entity
  ) {}
}
```

| Shared VO | Defined in | Used by |
|-----------|-----------|---------|
| `WorkspaceId` | `workspace/value-objects/` | `generation/` (imported, not duplicated) |
| `UserId` | `identity/value-objects/` | `workspace/`, `generation/`, `agent-chat/` |

---

## Sources

- [[sources/APP-CONCEPT]] — Monorepo structure, packages/domain definition
- [[sources/PRD]] — NFR-M02 (domain isolation)
- [[sources/STARTUP]] — Domain model
- [[sources/USER-STORIES]] — All epics
- [[Testing Strategy]] — Vitest patterns, test isolation, factory helpers
