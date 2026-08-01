---
type: entity
tags:
  - wiki/entity
  - wiki/workspace
  - wiki/sharing
date_updated: 2026-08-01
source_count: 3
---

# WorkspaceMembership

> Entity — owned by [[Workspace]] aggregate in [[Workspace & Assets]] context

## Definition

A `WorkspaceMembership` represents the relationship between a [[User]] and a [[Workspace]]. It carries a role (`owner`, `editor`, `viewer`) and a status (`invited`, `active`). It is an internal entity of the Workspace aggregate root — it has no identity outside its parent workspace.

## Ubiquitous Language

- A User is **invited** to a workspace → status = `invited`
- A User **joins** a workspace → status = `active`
- A User is **removed** from a workspace → membership deleted
- The **owner transfers ownership** → role changes on two memberships

## Lifecycle

```
invited ──accept()──▶ active ──removeMember()──▶ (deleted)
                │
                └── decline() ──▶ (deleted)
```

| State | Meaning | Transition |
|-------|---------|------------|
| `invited` | Invitation sent, not yet accepted | → `active` on `accept()` |
| `active` | Member can access workspace per their role | Terminal (until removed) |

## Structure

```typescript
// packages/domain/src/workspace/entities/WorkspaceMembership.ts

type MembershipRole = 'owner' | 'editor' | 'viewer';
type MembershipStatus = 'invited' | 'active';

class WorkspaceMembership {
  private constructor(
    readonly userId: UserId,
    readonly workspaceId: WorkspaceId,
    private _role: MembershipRole,
    private _status: MembershipStatus,
    readonly invitedBy: UserId,
    readonly invitedAt: DateTime,
    readonly joinedAt: DateTime | null,
  ) {}

  /** Factory for creating an invitation */
  static invite(
    userId: UserId,
    workspaceId: WorkspaceId,
    role: MembershipRole,
    invitedBy: UserId,
  ): WorkspaceMembership {
    if (role === 'owner') {
      throw new ValidationError('Cannot invite a user as owner. Use transferOwnership().');
    }
    return new WorkspaceMembership(
      userId, workspaceId, role, 'invited', invitedBy, DateTime.now(), null,
    );
  }

  /** Accept the invitation — transitions from invited → active */
  accept(): WorkspaceMembership {
    if (this._status !== 'invited') {
      throw new InvalidMembershipStateError(
        `Cannot accept: membership is ${this._status}, expected invited`
      );
    }
    return new WorkspaceMembership(
      this.userId, this.workspaceId, this._role, 'active',
      this.invitedBy, this.invitedAt, DateTime.now(),
    );
  }

  /** Change the member's role. Cannot assign 'owner' via this method. */
  changeRole(newRole: MembershipRole): void {
    if (newRole === 'owner') {
      throw new ValidationError(
        'Cannot assign owner role via changeRole(). Use transferOwnership().'
      );
    }
    this._role = newRole;
  }

  // Getters
  get role(): MembershipRole { return this._role; }
  get status(): MembershipStatus { return this._status; }
  get isActive(): boolean { return this._status === 'active'; }
  get isOwner(): boolean { return this._role === 'owner' && this.isActive; }
}
```

## Invariants

- Only `owner` can invite, remove, or change roles of members
- Cannot invite someone who is already a member (any status) — enforced by `Workspace.inviteMember()`
- Cannot remove the owner — enforced by `Workspace.removeMember()`
- Cannot invite a user with role `owner` — use `transferOwnership()` instead
- `joinedAt` is `null` for `invited` memberships, set on `accept()`

## Value Objects

| VO | Type | Description |
|----|------|-------------|
| `MembershipRole` | `'owner' \| 'editor' \| 'viewer'` | The member's permissions in the workspace |
| `MembershipStatus` | `'invited' \| 'active'` | Whether the invitation has been accepted |

## Database

```sql
CREATE TABLE workspace_memberships (
    workspace_id UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role         VARCHAR(10) NOT NULL DEFAULT 'editor',
    status       VARCHAR(10) NOT NULL DEFAULT 'invited',
    invited_by   UUID        NOT NULL REFERENCES users(id),
    invited_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    joined_at    TIMESTAMPTZ,

    PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_memberships_user_id ON workspace_memberships(user_id);
CREATE INDEX idx_memberships_status  ON workspace_memberships(status);
```

The composite primary key `(workspace_id, user_id)` enforces the invariant that a user cannot have duplicate memberships in the same workspace.

## Relationship to Workspace

`WorkspaceMembership` is an **internal entity** of the Workspace aggregate root. It is loaded, modified, and persisted only through the `Workspace` aggregate:

```typescript
class Workspace {
  private _memberships: WorkspaceMembership[];

  inviteMember(userId, role, invitedBy): WorkspaceMembership { ... }
  acceptInvitation(userId): void { ... }
  removeMember(userId, removedBy): void { ... }
  transferOwnership(from, to): void { ... }
  isOwner(userId): boolean { ... }
  isMember(userId): boolean { ... }
  getMemberRole(userId): MembershipRole | null { ... }
  canEdit(userId): boolean { ... }
  canView(userId): boolean { ... }
}
```

## Domain Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `MemberInvited` | `Workspace.inviteMember()` | workspaceId, invitedUserId, role, invitedBy |
| `MemberJoined` | `Workspace.acceptInvitation()` | workspaceId, userId, role |
| `MemberRemoved` | `Workspace.removeMember()` | workspaceId, removedUserId, removedBy |
| `OwnershipTransferred` | `Workspace.transferOwnership()` | workspaceId, fromUserId, toUserId |

## Sources

- [[Workspace Sharing]] — Concept page for the sharing feature
- [[Workspace Permissions]] — Permission matrix and enforcement
- [[Workspace]] — Parent aggregate root