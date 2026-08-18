---
type: concept
tags:
  - wiki/concept
  - wiki/workspace
  - wiki/sharing
date_updated: 2026-08-08
source_count: 7
confidence: high
---

# Workspace Sharing

> Multi-user workspace access via membership roles — `packages/domain/src/workspace/`

## Definition

**Workspace Sharing** transforms a [[Workspace]] from a single-owner container into a multi-member collaboration space. Each workspace has one `owner` and N `editor` or `viewer` members. All members see the workspace in their dashboard. Permissions are role-based and enforced at the aggregate root level.

## Motivation

Current state: `Workspace` belongs to exactly one [[User]] via `userId`. Only the owner can view or modify the workspace and its [[Asset]]s. A marketing team of 3 people needs 3 separate workspaces for the same campaign — or they share credentials. Neither is acceptable for a B2B product.

## Ubiquitous Language

| Term | Definition |
|------|-----------|
| **Owner** | The user who created the workspace. There is always exactly one owner. Can invite, remove, transfer ownership, delete workspace. |
| **Editor** | An active member who can create, edit, and delete assets, and start generation sessions. Cannot manage members or delete the workspace. |
| **Viewer** | An active member who can view workspace contents and assets but cannot modify anything or start generation sessions. |
| **Invited** | A pending membership — the user has been invited but has not yet accepted. They cannot access the workspace until they accept. |
| **Membership** | The relationship between a User and a Workspace, carrying a role and status. |

## Domain Model

### Membership as Entity Within the Workspace Aggregate

`[[WorkspaceMembership]]` lives inside the `Workspace` aggregate root. This means all membership operations (invite, accept, remove, role change) are transactional with the workspace — no eventual consistency needed for small teams (2-10 members).

```
Workspace (Aggregate Root)
├── WorkspaceMembership[]     ← NEW: 1:N collection
│     ├── userId
│     ├── role: owner | editor | viewer
│     └── status: invited | active
└── Asset[]                   ← unchanged
```

### Permission Matrix

Permalink: see [[Workspace Sharing#role-definitions|Role Definitions]] for what each role can do.

| Action | owner | editor | viewer | Invited |
|--------|-------|--------|--------|---------|
| View workspace details | ✅ | ✅ | ✅ | ❌ |
| View assets + content | ✅ | ✅ | ✅ | ❌ |
| List members | ✅ | ✅ | ✅ | ❌ |
| Create asset | ✅ | ✅ | ❌ | ❌ |
| Edit asset | ✅ | ✅ | ❌ | ❌ |
| Delete asset | ✅ | ✅ | ❌ | ❌ |
| Promote artifact → asset | ✅ | ✅ | ❌ | ❌ |
| Start generation session | ✅ | ✅ | ❌ | ❌ |
| Invite member | ✅ | ❌ | ❌ | ❌ |
| Remove member | ✅ | ❌ | ❌ | ❌ |
| Change member role | ✅ | ❌ | ❌ | ❌ |
| Change workspace name | ✅ | ❌ | ❌ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ | ❌ |
| Accept own invitation | — | — | — | ✅ |
| Decline own invitation | — | — | — | ✅ |

### Role Definitions

#### owner

The user who created the workspace (or received it via transfer). There is always exactly one owner.

**Capabilities**: full control — view, edit assets, manage members, change name, transfer ownership, delete workspace.

**Constraints**:
- Cannot be removed from the workspace
- Cannot be demoted (only ownership transfer changes this)
- Only one owner at a time

#### editor

An active member invited by the owner with edit capabilities.

**Capabilities**: view workspace, create/edit/delete assets, start generation sessions, promote artifacts to assets.

**Constraints**:
- Cannot manage members (invite, remove, change roles)
- Cannot change workspace name
- Cannot delete workspace
- Cannot transfer ownership

#### viewer

An active member with read-only access.

**Capabilities**: view workspace contents, view assets and their content, list members.

**Constraints**:
- Cannot create, edit, or delete assets
- Cannot start generation sessions
- Cannot promote artifacts
- Cannot manage members

### Domain Enforcement

The `Workspace` aggregate root enforces permissions at the domain level. Any caller (HTTP, CLI, test, worker) is subject to the same rules:

```typescript
class Workspace {
  private assertIsOwner(userId: UserId): void {
    if (!this.isOwner(userId)) {
      throw new NotWorkspaceOwnerError(userId, this.workspaceId);
    }
  }

  private assertCanEdit(userId: UserId): void {
    const role = this.getMemberRole(userId);
    if (role !== 'owner' && role !== 'editor') {
      throw new InsufficientWorkspacePermissionError(
        userId, this.workspaceId, 'editor'
      );
    }
  }

  private assertIsMember(userId: UserId): void {
    if (!this.isMember(userId)) {
      throw new NotAWorkspaceMemberError(userId, this.workspaceId);
    }
  }
}
```

### Middleware Enforcement

The `requireWorkspaceRole()` middleware provides a second layer of enforcement at the HTTP boundary (see [[Auth Dependencies]] for the JWT authentication layer):

```typescript
function requireWorkspaceRole(...roles: MembershipRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const workspaceId = req.params.workspaceId || req.params.id;
    const workspace = await workspaceRepo.findById(WorkspaceId.from(workspaceId));

    if (req.user?.role === 'admin') return next();

    const memberRole = workspace.getMemberRole(UserId.from(req.user!.sub));
    if (!memberRole || !roles.includes(memberRole)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Requires workspace role: [${roles.join(', ')}]. Your role: ${memberRole ?? 'none'}.`,
          retryable: false,
        }
      });
    }

    (req as any).workspaceRole = memberRole;
    next();
  };
}
```

### Route Guard Mapping

```
GET    /api/workspaces/:id              → requireWorkspaceRole('owner', 'editor', 'viewer')
PUT    /api/workspaces/:id              → requireWorkspaceRole('owner')
DELETE /api/workspaces/:id              → requireWorkspaceRole('owner')
POST   /api/workspaces/:id/assets       → requireWorkspaceRole('owner', 'editor')
PUT    /api/workspaces/:wid/assets/:aid → requireWorkspaceRole('owner', 'editor')
DELETE /api/workspaces/:wid/assets/:aid → requireWorkspaceRole('owner', 'editor')
POST   /api/workspaces/:id/invitations  → requireWorkspaceRole('owner')
DELETE /api/workspaces/:id/members/:uid → requireWorkspaceRole('owner')
PUT    /api/workspaces/:id/members/:uid/role → requireWorkspaceRole('owner')
POST   /api/workspaces/:id/transfer-ownership → requireWorkspaceRole('owner')
```

### Credit Consumption Rule

Credits are always consumed by the **user who launches the tool**, not by the workspace owner:

> A `viewer` cannot launch tools (no credit consumption). An `editor` launching a tool in a workspace they don't own consumes **their own** credits. The owner's credit balance is unaffected by other members' generations. Credits = user-scoped, usage-based.

This rule requires **no domain changes** — it's already how the system works. See [[Usage & Quota]].

### Error Types

| Error | HTTP Status | When |
|-------|-------------|------|
| `NotWorkspaceOwnerError` | 403 | A non-owner attempts an owner-only action |
| `InsufficientWorkspacePermissionError` | 403 | An editor/viewer attempts an action requiring a higher role |
| `NotAWorkspaceMemberError` | 403 | A user who is not a member attempts to access the workspace |
| `CannotRemoveOwnerError` | 422 | Attempt to remove the workspace owner |
| `MemberAlreadyExistsError` | 409 | Inviting a user who is already a member |
| `NotAnActiveMemberError` | 422 | Attempting to transfer ownership to an invited (not active) user |

### Notification Delivery

Invitation emails are sent via an **application-level notification service** in the backend, triggered by the `MemberInvited` domain event:

```
Workspace.inviteMember()
  -> MemberInvited
  -> NotificationHandler.onMemberInvited()
  -> NotificationService.sendInvitationEmail()
  -> Delivery log written (success/failure)
```

**Reliability contract**:
- At-least-once processing at notification handler boundary
- Idempotency key: `{workspaceId}:{inviteeUserId}:{invitedAt}`
- Duplicate sends prevented by idempotent delivery record check
- Failures retried with exponential backoff
- Delivery status tracked: `pending`, `sent`, `failed`, `retrying`
- Structured logs with correlation ID

**Future extraction path**: If notification volume grows, extract to a dedicated notification bounded context without changing workspace aggregate semantics.

## Invariant Changes

| Before (single owner) | After (multi-member) |
|-----------------------|---------------------|
| `workspace.userId` is the sole owner | `workspace.createdBy` records who created it; ownership is via membership with role `owner` |
| FK: `workspaces.user_id → users` | Migrated to `workspace_memberships` table |
| Only owner can access workspace | Members with role ≥ viewer can access |
| `WorkspaceRepository.findByUser()` | `WorkspaceRepository.findByMember()` + `findByUser()` (owned/created) |

## Invitation Flow

```
Owner invites user by email
        │
        ▼
Workspace.inviteMember(userId, role)
  → MemberInvited domain event
  → Email notification to invitee
        │
        ▼
Invitee sees pending invitation (GET /api/invitations)
        │
   ┌────┴────┐
   ▼         ▼
Accept     Decline
   │          │
   ▼          ▼
MemberJoined  Membership removed
   │
   ▼
Workspace appears in invitee's dashboard
```

## API Routes

New routes (all under existing `/api/workspaces` and new `/api/invitations`):

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/workspaces` | ✅ | User's workspaces (owned + member) |
| `POST` | `/api/workspaces/:id/invitations` | owner | Invite a member |
| `GET` | `/api/workspaces/:id/members` | member | List members |
| `DELETE` | `/api/workspaces/:id/members/:userId` | owner | Remove member |
| `PUT` | `/api/workspaces/:id/members/:userId/role` | owner | Change role |
| `POST` | `/api/workspaces/:id/transfer-ownership` | owner | Transfer ownership |
| `GET` | `/api/invitations` | ✅ | Pending invitations |
| `POST` | `/api/invitations/:workspaceId/accept` | ✅ | Accept invitation |
| `POST` | `/api/invitations/:workspaceId/decline` | ✅ | Decline invitation |

Existing routes gain `requireWorkspaceRole()` guard instead of implicit ownership check.

## Cross-Context Impact

| Context | Impact | Resolution |
|---------|--------|------------|
| [[Content Generation]] | None. Session has `userId` (author) + `workspaceId`. | No changes. |
| [[Usage & Quota]] | Credit consumer = `Session.userId`. Owner does not pay for editors. | No changes. Credit rule documented here. |
| [[Auth Dependencies]] | None. `UserId` is already a shared VO. | No changes. |
| [[Workspace & Assets]] | Aggregate root modified. Repository extended. New middleware. | See [[workspace-sharing-proposal]]. |

## Sources

- [[Workspace]] — Aggregate root being modified
- [[WorkspaceMembership]] — New entity within the aggregate
- [[Usage & Quota]] — Credit consumption rule
- [[Auth Dependencies]] — `requireWorkspaceRole()` guard
- [[Domain Events]] — Event-mediated integration contract
- [[Logging Strategy]] — Structured logs and correlation requirements
- [[workspace-sharing-proposal]] — Full architecture proposal (synthesis)