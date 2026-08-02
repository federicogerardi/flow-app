---
type: entity
tags:
  - wiki/entity
  - wiki/workspace
  - wiki/sharing
date_updated: 2026-08-01
source_count: 7
---

# Workspace

> Aggregate Root — [[Workspace & Assets]] context  
> **v2 (2026-08-01)**: Multi-member via [[WorkspaceMembership]]. Single-owner model retired.

## Definition

A `Workspace` is a named collaboration container that groups [[Asset]]s and [[WorkspaceMembership|members]]. It is the central organizational unit — the "project folder" for a campaign or client. Users see workspaces as their primary work objects. Multiple users can share a workspace with role-based permissions (owner, editor, viewer).

[[Artifact]]s are owned by [[Session]]s, not by Workspaces. When a Session completes, its final Artifact can be **promoted** to an Asset that the Workspace then owns. The Workspace never directly contains Artifacts.

## Ubiquitous Language

> "A named workspace shared by members that groups related assets."

From [[Workspace Sharing]]: an **owner** creates and controls the workspace, **editors** modify assets and generate content, **viewers** have read-only access. See [[Workspace Permissions]] for the full matrix.

## Internal Entities

- **[[Asset]]** (1:N) — Reusable brand resources scoped to this workspace
- **[[WorkspaceMembership]]** (1:N) — Member relationships with role + status (v2)

## Invariants

- **Membership**: Has exactly one `owner` at all times — enforced by `transferOwnership()` which atomically swaps roles
- **Ownership**: The creating user (`createdBy`) is automatically the initial `owner`
- **Member uniqueness**: A [[User]] cannot have duplicate memberships in the same workspace — enforced by `inviteMember()` check + DB composite PK
- **Owner protection**: Cannot remove or demote the owner — enforced by `removeMember()` and `changeRole()`
- **Asset uniqueness**: At most one [[Asset]] per `AssetType` per Workspace — enforced by `addAsset()`
- **Asset traceability**: An [[Asset]] with `source = 'generated'` must have a valid `sourceRef` (traceability to original [[Artifact]]) — enforced by `addAsset()`
- **Cascade delete**: Deleting a Workspace cascades to all contained Assets and Memberships (database: `ON DELETE CASCADE`)

## Methods

### Asset Management (v1, unchanged)

### `addAsset()`

```typescript
class Workspace {
  private _assets: Asset[];

  addAsset(
    content: AssetContent,
    assetType: AssetType,
    source: AssetSource,
    sourceRef?: ArtifactId,      // required when source === 'generated'
    addedBy?: UserId,            // NEW (v2): only owner or editor
  ): Asset {
    if (addedBy && !this.canEdit(addedBy)) {
      throw new InsufficientWorkspacePermissionError(addedBy, this.workspaceId, 'editor');
    }
    if (this._assets.some(a => a.assetType === assetType)) {
      throw new AssetTypeExistsError(assetType);
    }
    if (source === AssetSource.Generated && !sourceRef) {
      throw new ValidationError('Generated assets require a sourceRef (ArtifactId)');
    }
    const asset = new Asset(AssetId.generate(), assetType, source, content, sourceRef ?? null);
    this._assets.push(asset);
    return asset;
  }

  get assets(): ReadonlyArray<Asset> {
    return this._assets;
  }
}
```

### Membership Management (v2)

### `inviteMember()`

```typescript
inviteMember(userId: UserId, role: MembershipRole, invitedBy: UserId): WorkspaceMembership {
  if (!this.isOwner(invitedBy)) throw new NotWorkspaceOwnerError(invitedBy, this.workspaceId);
  if (this._memberships.some(m => m.userId.equals(userId))) throw new MemberAlreadyExistsError(userId, this.workspaceId);

  const membership = WorkspaceMembership.invite(userId, this.workspaceId, role, invitedBy);
  this._memberships.push(membership);
  return membership;
}
```

### `acceptInvitation()`

```typescript
acceptInvitation(userId: UserId): void {
  const idx = this._memberships.findIndex(m => m.userId.equals(userId) && m.status === 'invited');
  if (idx === -1) throw new NotAMemberError(userId, this.workspaceId);

  this._memberships[idx] = this._memberships[idx].accept();  // immutable: returns new instance
}
```

### `removeMember()`

```typescript
removeMember(userId: UserId, removedBy: UserId): void {
  if (!this.isOwner(removedBy)) throw new NotWorkspaceOwnerError(removedBy, this.workspaceId);
  if (this.isOwner(userId)) throw new CannotRemoveOwnerError();

  this._memberships = this._memberships.filter(m => !m.userId.equals(userId));
}
```

### `transferOwnership()`

```typescript
transferOwnership(from: UserId, to: UserId): void {
  if (!this.isOwner(from)) throw new NotWorkspaceOwnerError(from, this.workspaceId);
  const newOwner = this._memberships.find(m => m.userId.equals(to) && m.isActive);
  if (!newOwner) throw new NotAnActiveMemberError(to, this.workspaceId);

  // Atomically swap roles on both memberships
  this._memberships.find(m => m.userId.equals(from))!._role = 'editor';
  this._memberships.find(m => m.userId.equals(to))!._role = 'owner';
}
```

### Permission Checks (v2)

```typescript
isOwner(userId: UserId): boolean {
  return this._memberships.some(m => m.userId.equals(userId) && m.role === 'owner' && m.isActive);
}

isMember(userId: UserId): boolean {
  return this._memberships.some(m => m.userId.equals(userId) && m.isActive);
}

getMemberRole(userId: UserId): MembershipRole | null {
  return this._memberships.find(m => m.userId.equals(userId) && m.isActive)?.role ?? null;
}

canEdit(userId: UserId): boolean {
  const role = this.getMemberRole(userId);
  return role === 'owner' || role === 'editor';
}

canView(userId: UserId): boolean {
  return this.isMember(userId);
}

get memberships(): ReadonlyArray<WorkspaceMembership> {
  return this._memberships;
}
```

## Value Objects

| VO | Description |
|----|-------------|
| `WorkspaceId` | Unique identifier |
| `WorkspaceName` | User-facing name |
| `MembershipRole` | `owner` \| `editor` \| `viewer` (v2) |
| `MembershipStatus` | `invited` \| `active` (v2) |

## Domain Events (v2)

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `MemberInvited` | `inviteMember()` | Email notification, audit log |
| `MemberJoined` | `acceptInvitation()` | Dashboard refresh, audit log |
| `MemberRemoved` | `removeMember()` | Dashboard refresh, audit log |
| `OwnershipTransferred` | `transferOwnership()` | Audit log, notification to new owner |

## Domain Services

- **[[AssetResolver]]**: Given a `ToolKey` and `WorkspaceId`, returns the Assets that should be auto-injected into a generation prompt.

## Cross-Context Interactions

| Direction | Pattern | Description |
|-----------|---------|-------------|
| → [[Content Generation]] | Query (sync) | Generation calls `AssetResolver.resolve()` before starting |
| ← [[Content Generation]] | Domain Event (async) | `SessionCompleted` → promote final [[Artifact]] to [[Asset]] |
| → [[Auth Dependencies]] | Shared ID | References `UserId` |
| → [[Usage & Quota]] | None (by design) | Credits are consumed by `Session.userId`, not by workspace owner |

## Sources

- [[sources/STARTUP]] — Original Workspace definition, Artifact vs Asset
- [[sources/PRD]] — FR-A01 to FR-A05
- [[sources/USER-STORIES]] — US-W01 to US-W06, US-AS01 to US-AS08
- [[sources/APP-CONCEPT]] — Knowledge Panel, Asset auto-injection
- [[Workspace Sharing]] — Multi-member feature overview (v2)
- [[WorkspaceMembership]] — Membership entity (v2)
- [[Workspace Permissions]] — Permission matrix (v2)