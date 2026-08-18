---
type: entity
tags:
  - wiki/entity
  - wiki/workspace
  - wiki/sharing
date_updated: 2026-08-06
source_count: 7
---

# Workspace

> Aggregate Root — [[Workspace & Assets]] context  
> **v2 (2026-08-01)**: Multi-member via [[WorkspaceMembership]]. Single-owner model retired.
>
> **✅ Implementation status (2026-08-06):** The `addAsset()` and `getAssetsByType()` methods are implemented. `_assets` is a `ReadonlyArray<Asset>` on the Workspace entity. Multiple assets of the same type are supported (multi-asset feature). `UserId` references are `string` in code, not a branded VO.

## Definition

A `Workspace` is a named collaboration container that groups [[Asset]]s and [[WorkspaceMembership|members]]. It is the central organizational unit — the "project folder" for a campaign or client. Users see workspaces as their primary work objects. Multiple users can share a workspace with role-based permissions (owner, editor, viewer).

[[Artifact]]s are owned by [[Session]]s, not by Workspaces. When a Session completes, its final Artifact can be **promoted** to an Asset that the Workspace then owns. The Workspace never directly contains Artifacts.

## Ubiquitous Language

> "A named workspace shared by members that groups related assets."

From [[Workspace Sharing]]: an **owner** creates and controls the workspace, **editors** modify assets and generate content, **viewers** have read-only access. See [[Workspace Sharing#role-definitions|Role Definitions]] for the full permission matrix.

## Internal Entities

- **[[Asset]]** (1:N) — Reusable brand resources scoped to this workspace
- **[[WorkspaceMembership]]** (1:N) — Member relationships with role + status (v2)

## Invariants

- **Membership**: Has exactly one `owner` at all times — enforced by `transferOwnership()` which atomically swaps roles
- **Ownership**: The creating user (`createdBy`) is automatically the initial `owner`
- **Member uniqueness**: A [[User]] cannot have duplicate memberships in the same workspace — enforced by `inviteMember()` check + DB composite PK
- **Owner protection**: Cannot remove or demote the owner — enforced by `removeMember()` and `changeRole()`
- **Asset traceability**: An [[Asset]] with `source = 'generated'` must have a valid `sourceRef` (traceability to original [[Artifact]]) — enforced by `addAsset()` ✅
- **Asset deduplication**: Multiple assets of the same type are allowed. Deduplication by `source_ref` (DB constraint: `UNIQUE(workspace_id, asset_type, source_ref)`). Manual assets (NULL source_ref) have a partial unique index. ✅
- **Cascade delete**: Deleting a Workspace cascades to all contained Assets and Memberships (database: `ON DELETE CASCADE`)

## Methods

### Asset Management (v2, multi-asset)

### `addAsset()`

```typescript
// ✅ Implemented — pushes to _assets, increments version
addAsset(asset: Asset): void {
  this._assets.push(asset);
  this._version++;
}
```

### `getAssetsByType()`

```typescript
// ✅ Implemented — returns all assets matching the type
getAssetsByType(assetType: AssetType): Asset[] {
  return this._assets.filter(a => a.assetType.equals(assetType));
}

// @deprecated — returns first match only
getAssetByType(assetType: AssetType): Asset | null {
  return this._assets.find(a => a.assetType.equals(assetType)) ?? null;
}
```

### Membership Management (v2) ✅

### `inviteMember()`

```typescript
inviteMember(userId: string, role: MembershipRole, invitedBy: string): WorkspaceMembership {
  if (!this.isOwner(invitedBy)) throw new NotWorkspaceOwnerError(invitedBy, this.workspaceId);
  if (this._memberships.some(m => m.userId === userId)) throw new MemberAlreadyExistsError(userId, this.workspaceId);

  const membership = WorkspaceMembership.invite(userId, this.workspaceId, role, invitedBy);
  this._memberships.push(membership);
  return membership;
}
```

### `acceptInvitation()`

```typescript
acceptInvitation(userId: string): void {
  const idx = this._memberships.findIndex(m => m.userId === userId && m.status === 'invited');
  if (idx === -1) throw new NotAMemberError(userId, this.workspaceId);

  this._memberships[idx] = this._memberships[idx].accept();  // immutable: returns new instance
}
```

### `removeMember()`

```typescript
removeMember(userId: string, removedBy: string): void {
  if (!this.isOwner(removedBy)) throw new NotWorkspaceOwnerError(removedBy, this.workspaceId);
  if (this.isOwner(userId)) throw new CannotRemoveOwnerError();

  this._memberships = this._memberships.filter(m => m.userId !== userId);
}
```

### `transferOwnership()`

```typescript
// ✅ Implemented — uses delegation methods, not as any casts
transferOwnership(from: string, to: string): void {
  if (!this.isOwner(from)) throw new NotWorkspaceOwnerError(from, this.workspaceId);
  const currentOwner = this._memberships.find(m => m.userId === from && m.isActive);
  const newOwner = this._memberships.find(m => m.userId === to && m.isActive);
  if (!currentOwner || !newOwner) throw new NotAnActiveMemberError(to, this.workspaceId);

  currentOwner.changeRole('editor');      // demotes current owner
  newOwner._setRoleAsOwner();             // promotes new owner via internal setter
}
```

### Permission Checks (v2) ✅

```typescript
isOwner(userId: string): boolean {
  return this._memberships.some(m => m.userId === userId && m.role === 'owner' && m.isActive);
}

isMember(userId: string): boolean {
  return this._memberships.some(m => m.userId === userId && m.isActive);
}

getMemberRole(userId: string): MembershipRole | null {
  return this._memberships.find(m => m.userId === userId && m.isActive)?.role ?? null;
}

canEdit(userId: string): boolean {
  const role = this.getMemberRole(userId);
  return role === 'owner' || role === 'editor';
}

canView(userId: string): boolean {
  return this.isMember(userId);
}

get memberships(): ReadonlyArray<WorkspaceMembership> {
  return this._memberships;
}
```

## Value Objects

| VO | Type | Description |
|----|------|-------------|
| `MembershipRole` | `type` alias: `'owner' \| 'editor' \| 'viewer'` | Role-based permissions (v2) |
| `MembershipStatus` | `type` alias: `'invited' \| 'active'` | Membership lifecycle (v2) |

> **Note**: `WorkspaceId`, `WorkspaceName`, `UserId` are `string` in code, not branded VO classes. `MembershipRole` and `MembershipStatus` are `type` aliases — tracked in the Phase 9 VO conversion plan.

## Domain Events (v2)

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `MemberInvited` | `inviteMember()` | Email notification, audit log |
| `MemberJoined` | `acceptInvitation()` | Dashboard refresh, audit log |
| `MemberRemoved` | `removeMember()` | Dashboard refresh, audit log |
| `OwnershipTransferred` | `transferOwnership()` | Audit log, notification to new owner |

## Domain Services

- **[[Workspace & Assets]]**: Given a `ToolKey` and `WorkspaceId`, returns the Assets that should be auto-injected into a generation prompt.

## Cross-Context Interactions

| Direction | Pattern | Description |
|-----------|---------|-------------|
| → [[Content Generation]] | Query (sync) | Generation calls `AssetResolver.resolve()` before starting |
| ← [[Content Generation]] | Domain Event (async) | `SessionCompleted` → promote final [[Artifact]] to [[Asset]] |
| → [[Auth Dependencies]] | Shared ID | References user IDs as `string` |
| → [[Usage & Quota]] | None (by design) | Credits are consumed by `Session.userId`, not by workspace owner |

## Repository

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

Key design decisions:
- `save()` persists the workspace and its memberships in a single operation — per [[DDD Domain Design Rules#Rule 5 — Repository save persists ONLY the aggregate root and its owned entities|Rule 5]].
- `saveWithLock()` uses optimistic locking (`WHERE version = expectedVersion`), throws `ConcurrencyError` on 0 rows updated.
- `findByMember()` batch-loads memberships in 2 queries (not N+1).
- Membership sync uses `Promise.all` for parallel inserts.
- Implemented by `KyselyWorkspaceRepository` in `packages/infra-db/src/repositories/workspace-repository.ts`.

## Sources

- [[sources/STARTUP]] — Original Workspace definition, Artifact vs Asset
- [[sources/PRD]] — FR-A01 to FR-A05
- [[sources/USER-STORIES]] — US-W01 to US-W06, US-AS01 to US-AS08
- [[sources/APP-CONCEPT]] — Knowledge Panel, Asset auto-injection
- [[Workspace Sharing]] — Multi-member feature overview + full permission model (v2)
- [[WorkspaceMembership]] — Membership entity (v2)
- [[DDD Domain Design Rules]] — Repository design rules