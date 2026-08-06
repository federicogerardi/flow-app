---
type: concept
tags:
  - wiki/concept
  - wiki/workspace
date_updated: 2026-08-06
source_count: 6
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

**[[Workspace]]** — a named container created by a [[User]], shared through membership roles, and used to group [[Asset]]s for all generation work.

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
  findByMember(userId: UserId): Promise<Workspace[]>;
  findByCreator(userId: UserId): Promise<Workspace[]>;
  save(workspace: Workspace): Promise<void>;
  delete(id: WorkspaceId): Promise<void>;
}
```

## Cross-Context Interactions

| Direction | Context | Pattern | Description |
|-----------|---------|---------|-------------|
| ← [[Content Generation]] | Domain Event | Async | `SessionCompleted` → promote [[Artifact]] to [[Asset]] |
| → [[Content Generation]] | Query | Sync | `AssetResolver.resolve()` before generation starts |
| → [[Auth Dependencies]] | Shared ID | — | References `UserId` |

## Invariants

- Multiple [[Asset]]s of the same `AssetType` per [[Workspace]] are allowed — deduplication by `source_ref` (DB constraint: `UNIQUE(workspace_id, asset_type, source_ref)`). Manual assets (NULL source_ref) have a partial unique index to prevent accidental duplicates.
- `Asset.source = 'generated'` requires valid `sourceRef` to original [[Artifact]]
- A Workspace has exactly one active owner membership
- Workspace deletion cascades to all Assets

## Sources

- [[sources/STARTUP]] — Original definitions, Artifact vs Asset
- [[sources/PRD]] — FR-A01 to FR-A05
- [[sources/USER-STORIES]] — US-W01 to US-W06, US-AS01 to US-AS08
- [[sources/APP-CONCEPT]] — Knowledge Panel, AssetFieldMapping
- [[Workspace Sharing]] — membership-based access model
- [[synthesis/multi-asset-implementation-plan]] — migration 011, multi-asset constraint
