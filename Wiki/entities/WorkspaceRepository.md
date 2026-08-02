---
type: entity
tags:
  - wiki/entity
  - wiki/workspace
  - wiki/repository
date_updated: 2026-08-02
source_count: 3
---

# WorkspaceRepository

Repository interface for the `Workspace` aggregate root. Defines persistence operations for workspaces and their owned `WorkspaceMembership` entities.

## Interface

```typescript
export interface WorkspaceRepository {
  findById(id: string): Promise<Workspace | null>;
  findByMember(userId: string): Promise<Workspace[]>;
  save(workspace: Workspace): Promise<void>;
  saveWithLock(workspace: Workspace, expectedVersion: number): Promise<void>;
  findMembership(workspaceId: string, userId: string): Promise<WorkspaceMembership | null>;
  findPendingInvitations(userId: string): Promise<Workspace[]>;
}
```

## Key design decisions

- `save()` persists the workspace and its memberships in a single operation — per [[DDD Domain Design Rules#Rule 5 — Repository save persists ONLY the aggregate root and its owned entities|Rule 5]].
- `saveWithLock()` uses optimistic locking (`WHERE version = expectedVersion`), throws `ConcurrencyError` on 0 rows updated.
- `findByMember()` batch-loads memberships in 2 queries (not N+1) — fixed in [[synthesis/medium-fix-plan-2026-08-02|M14]].
- Membership sync uses `Promise.all` for parallel inserts — fixed in [[synthesis/medium-fix-plan-2026-08-02|M15]].

## Implementation

Implemented by `KyselyWorkspaceRepository` in `packages/infra-db/src/repositories/workspace-repository.ts`.

## Sources

- [[DDD Domain Design Rules]]
- [[Workspace Sharing]]
- [[Workspace Permissions]]
