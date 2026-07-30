---
type: concept
tags:
  - wiki/concept
  - wiki/architecture
date_updated: 2026-07-30
source_count: 4
confidence: high
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
    ├── usage/                # Usage & Quota — Supporting
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
│   │   ├── IdempotencyKey.ts            # VO: (userId, workspaceId, toolKey, inputHash)
│   │   ├── StepNumber.ts                # VO: int >= 1
│   │   ├── ArtifactId.ts                # VO: extends Identifier
│   │   ├── ArtifactContent.ts           # VO: immutable string
│   │   ├── ArtifactStatus.ts            # VO: pending | generating | completed | failed
│   │   ├── SessionStatus.ts             # VO: draft | ready | running | completed | failed | cancelled
│   │   ├── CrawlData.ts                 # VO: raw API response (immutable, for replay/cache)
│   │   ├── AcquisitionData.ts           # VO: structured pre-flight data (userInputs, parsedFiles, apiResponses, assets)
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
│   ├── repositories/
│   │   └── SessionRepository.ts         # Interface (implemented in packages/infra-db)
│   │
│   ├── tools/                           # Static tool configurations
│   │   ├── tool-definition.ts           # ToolDefinition, StepDefinition types
│   │   ├── index.ts                     # toolRegistry + getTool()
│   │   ├── landing-funnel.tool.ts
│   │   ├── landing-page.tool.ts
│   │   ├── video-script-long-form.tool.ts
│   │   ├── video-description.tool.ts
│   │   ├── blog-post.tool.ts
│   │   ├── ad-copy.tool.ts
│   │   ├── brief.tool.ts
│   │   ├── brand-voice.tool.ts
│   │   ├── buyer-persona.tool.ts
│   │   ├── marketing-angle.tool.ts
│   │   └── ai-overview-analysis.tool.ts
│   │
│   └── index.ts                         # Barrel: exports all public types
│
├── workspace/                           # 🟡 Workspace & Assets (Supporting)
│   ├── entities/
│   │   ├── Workspace.ts                 # Aggregate Root
│   │   └── Asset.ts                     # Entity
│   │
│   ├── value-objects/
│   │   ├── WorkspaceId.ts               # VO: extends Identifier
│   │   ├── WorkspaceName.ts             # VO: non-empty string
│   │   ├── AssetId.ts                   # VO: extends Identifier
│   │   ├── AssetType.ts                 # VO: brief | brand-voice | persona | angle | ad-copy
│   │   ├── AssetSource.ts               # VO: generated | uploaded | manual
│   │   └── AssetContent.ts              # VO: immutable string
│   │
│   ├── domain-services/
│   │   └── AssetResolver.ts             # DS: resolves injectable assets for a tool
│   │
│   ├── domain-events/
│   │   ├── AssetCreated.ts              # Event
│   │   └── AssetUpdated.ts              # Event
│   │
│   ├── repositories/
│   │   └── WorkspaceRepository.ts       # Interface
│   │
│   └── index.ts
│
├── identity/                            # 🔵 Identity & Access (Generic)
│   ├── entities/
│   │   └── User.ts                      # Aggregate Root
│   │
│   ├── value-objects/
│   │   ├── UserId.ts                    # VO: extends Identifier
│   │   ├── Email.ts                     # VO: validated email
│   │   └── Role.ts                      # VO: admin | member
│   │
│   ├── repositories/
│   │   └── UserRepository.ts            # Interface
│   │
│   └── index.ts
│
├── usage/                               # 🟠 Usage & Quota (Supporting)
│   ├── entities/
│   │   ├── Quota.ts                     # Aggregate Root
│   │   └── CreditTransaction.ts         # Entity
│   │
│   ├── value-objects/
│   │   ├── QuotaId.ts                   # VO: extends Identifier
│   │   ├── CreditAmount.ts              # VO: int >= 0
│   │   ├── QuotaPeriod.ts               # VO: YYYY-MM
│   │   └── TransactionReason.ts         # VO: generation | admin_grant
│   │
│   ├── domain-services/
│   │   └── QuotaEnforcer.ts             # DS: canConsume(quota, amount) → boolean
│   │
│   ├── domain-events/
│   │   ├── CreditConsumed.ts            # Event
│   │   └── QuotaExceeded.ts             # Event
│   │
│   ├── repositories/
│   │   └── QuotaRepository.ts           # Interface
│   │
│   └── index.ts
│
└── shared/                              # ⬜ Shared Kernel
    ├── domain-event.ts                  # DomainEvent interface
    ├── identifier.ts                    # Base Value Object: new Identifier<T>(value)
    ├── date-time.ts                     # DateTime VO wrapper
    └── index.ts
```

## File Count

| Context | Entities | VOs | Services | Events | Repos | Tools | Total |
|---------|----------|-----|----------|--------|-------|-------|-------|
| generation | 2 | 11 | 1 | 5 | 1 | 12 | 32 |
| workspace | 2 | 6 | 1 | 2 | 1 | — | 12 |
| identity | 1 | 3 | — | — | 1 | — | 5 |
| usage | 2 | 4 | 1 | 2 | 1 | — | 10 |
| shared | — | — | — | — | — | — | 3 |
| **Total** | **7** | **24** | **3** | **9** | **4** | **12** | **62** |

---

## Package Boundaries

### What goes IN `packages/domain`

| ✅ IN | Example |
|-------|---------|
| Entity classes with business methods | `Session.addArtifact()`, `Workspace.addAsset()` |
| Value Objects with validation | `Email.validate()`, `IdempotencyKey.from()` |
| Domain Services (pure logic) | `ContextEnricher.enrich()`, `QuotaEnforcer.canConsume()` |
| Domain Events (immutable DTOs) | `SessionCompleted`, `AssetCreated` |
| Repository Interfaces (signatures only) | `SessionRepository.save(session: Session): Promise<void>` |
| Static Tool Configurations | `landing-funnel.tool.ts` |
| Shared Kernel | `DomainEvent`, `Identifier`, `DateTime` |

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
  ├── imported by: packages/contracts, packages/infra-db, apps/backend, apps/frontend
  └── never imports from: any other package in the monorepo
```

```
packages/domain ← packages/contracts    (reads types)
                ← packages/infra-db     (implements repository interfaces)
                ← apps/backend          (uses entities, VOs, services)
                ← apps/frontend         (uses types via contracts)
```

---

## Barrel Exports

Ogni contesto espone un `index.ts` pulito. Nessun consumer importa da path interni.

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
export { IdempotencyKey } from './value-objects/IdempotencyKey';
export { StepNumber } from './value-objects/StepNumber';
export { ArtifactId } from './value-objects/ArtifactId';
export { ArtifactContent } from './value-objects/ArtifactContent';
export { SessionStatus } from './value-objects/SessionStatus';
export { CrawlData } from './value-objects/CrawlData';

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

I contesti si referenziano tramite **Value Object condivisi** (shared IDs), mai tramite import diretti di entity.

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
| `UserId` | `identity/value-objects/` | `workspace/`, `usage/`, `generation/` |

---

## Sources

- [[doodle/APP-CONCEPT]] — Monorepo structure, packages/domain definition
- [[doodle/PRD]] — NFR-M02 (domain isolation)
- [[doodle/STARTUP]] — Domain model
- [[doodle/USER-STORIES]] — All epics