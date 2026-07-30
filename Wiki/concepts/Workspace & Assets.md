---
type: concept
tags:
  - wiki/concept
  - wiki/workspace
date_updated: 2026-07-30
source_count: 4
confidence: high
---

# Workspace & Assets

> Supporting Bounded Context — `packages/domain/src/workspace/`

## Responsibility

Organize work into named containers ([[Workspace]]s) and manage reusable brand resources ([[Asset]]s) that survive individual generation sessions and are auto-injected into [[Content Generation]] prompts for strategic coherence.

This context **did not exist** in the original v1 architecture. In v1, workspace and asset logic was scattered between the Generation context and the Frontend/UI layer. v2 makes it an explicit bounded context.

## Why a Separate Context?

- Workspaces and Assets have their **own lifecycle** independent of generation sessions
- Assets are **reusable cross-tool** — they are not owned by any single tool or session
- The user sees workspaces as their **primary work objects** — they deserve first-class domain modeling
- Asset resolution is a **cross-cutting concern** that multiple contexts depend on

## Aggregate Root

**[[Workspace]]** — a named container owned by a [[User]] that groups [[Asset]]s and provides the organizational structure for all generation work.

## Entities

| Entity | Role |
|--------|------|
| [[Workspace]] | Aggregate Root — the container |
| [[Asset]] | Reusable brand resource scoped to a workspace |

## Value Objects

| VO | Description |
|----|-------------|
| `WorkspaceId` | Unique identifier |
| `WorkspaceName` | User-facing name |
| `AssetId` | Unique identifier |
| `AssetType` | `brief` \| `brand-voice` \| `persona` \| `angle` \| `ad-copy` |
| `AssetSource` | `generated` \| `uploaded` \| `manual` |
| `AssetContent` | Immutable content |

## Domain Services

- **[[AssetResolver]]**: Resolves which Assets should be injected into a tool's generation context. Crosses the boundary from Workspace into [[Content Generation]].

## Repository Interface

```typescript
interface WorkspaceRepository {
  findById(id: WorkspaceId): Promise<Workspace | null>;
  findByUser(userId: UserId): Promise<Workspace[]>;
  save(workspace: Workspace): Promise<void>;
  delete(id: WorkspaceId): Promise<void>;
}
```

## Cross-Context Interactions

| Direction | Context | Pattern | Description |
|-----------|---------|---------|-------------|
| ← [[Content Generation]] | Domain Event | Async | `SessionCompleted` → promote [[Artifact]] to [[Asset]] |
| → [[Content Generation]] | Query | Sync | `AssetResolver.resolve()` before generation starts |
| → [[Identity & Access]] | Shared ID | — | References `UserId` |

## Invariants

- One [[Asset]] per `AssetType` per [[Workspace]]
- `Asset.source = 'generated'` requires valid `sourceRef` to original [[Artifact]]
- Workspace deletion cascades to all Assets

## Sources

- [[doodle/STARTUP]] — Original definitions, Artifact vs Asset
- [[doodle/PRD]] — FR-A01 to FR-A05
- [[doodle/USER-STORIES]] — US-W01 to US-W06, US-AS01 to US-AS08
- [[doodle/APP-CONCEPT]] — Knowledge Panel, AssetFieldMapping