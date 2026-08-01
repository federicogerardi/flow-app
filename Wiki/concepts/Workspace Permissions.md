---
type: concept
tags:
  - wiki/concept
  - wiki/workspace
  - wiki/sharing
date_updated: 2026-08-01
source_count: 5
confidence: high
---

# Workspace Permissions

> Role-based access control for shared workspaces — enforced at aggregate root, applied via middleware

## Definition

**Workspace Permissions** define what each `[[WorkspaceMembership|MembershipRole]]` can do within a [[Workspace]]. Permissions are enforced at two layers:

1. **Domain layer** — the `Workspace` aggregate root throws domain errors for invalid operations (e.g. `NotWorkspaceOwnerError`)
2. **Application layer** — `requireWorkspaceRole()` middleware rejects HTTP requests before they reach use cases

## Role Definitions

### owner

The user who created the workspace (or received it via transfer). There is always exactly one owner.

**Capabilities**: full control — view, edit assets, manage members, change name, transfer ownership, delete workspace.

**Constraints**:
- Cannot be removed from the workspace
- Cannot be demoted (only ownership transfer changes this)
- Only one owner at a time

### editor

An active member invited by the owner with edit capabilities.

**Capabilities**: view workspace, create/edit/delete assets, start generation sessions, promote artifacts to assets.

**Constraints**:
- Cannot manage members (invite, remove, change roles)
- Cannot change workspace name
- Cannot delete workspace
- Cannot transfer ownership

### viewer

An active member with read-only access.

**Capabilities**: view workspace contents, view assets and their content, list members.

**Constraints**:
- Cannot create, edit, or delete assets
- Cannot start generation sessions
- Cannot promote artifacts
- Cannot manage members

## Permission Matrix

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

## Domain Enforcement

The `Workspace` aggregate root enforces permissions at the domain level. Any caller (HTTP, CLI, test, worker) is subject to the same rules:

```typescript
class Workspace {
  // Permission checks — used internally by all mutating methods
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

## Middleware Enforcement

The `requireWorkspaceRole()` middleware provides a second layer of enforcement at the HTTP boundary. It rejects requests before they reach use cases, avoiding unnecessary aggregate loads:

```typescript
// apps/backend/src/middleware/auth.ts

function requireWorkspaceRole(...roles: MembershipRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const workspaceId = req.params.workspaceId || req.params.id;
    const workspace = await workspaceRepo.findById(WorkspaceId.from(workspaceId));

    // Admin bypass — admins have full access to all workspaces
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

## Credit Consumption Rule

Credits are user-scoped and usage-based. The rule is simple and enforced by the existing `[[Usage & Quota]]` context with zero changes:

> The user who creates a `[[Session]]` pays with their own credits. This is always `Session.userId`, regardless of their role in the workspace. An `editor` launching a tool in a workspace they don't own consumes their own credits. The `owner`'s balance is unaffected.

This rule requires **no domain changes** — it's already how the system works. It is documented here for clarity.

## Error Types

| Error | HTTP Status | When |
|-------|-------------|------|
| `NotWorkspaceOwnerError` | 403 | A non-owner attempts an owner-only action |
| `InsufficientWorkspacePermissionError` | 403 | An editor/viewer attempts an action requiring a higher role |
| `NotAWorkspaceMemberError` | 403 | A user who is not a member attempts to access the workspace |
| `CannotRemoveOwnerError` | 422 | Attempt to remove the workspace owner |
| `MemberAlreadyExistsError` | 409 | Inviting a user who is already a member |
| `NotAnActiveMemberError` | 422 | Attempting to transfer ownership to an invited (not active) user |

## Key Properties

| Property | Meaning |
|----------|---------|
| **Domain-first enforcement** | Workspace aggregate throws before any persistence |
| **Middleware second layer** | HTTP guard avoids unnecessary aggregate loads |
| **Admin bypass** | `role === 'admin'` skips workspace permission checks |
| **Credit rule unchanged** | Credits consumed by `Session.userId` — no shared billing |
| **Exactly one owner** | Enforced at domain level — `transferOwnership()` swaps, never duplicates |

## Sources

- [[Workspace Sharing]] — Feature overview
- [[WorkspaceMembership]] — Membership entity
- [[Workspace]] — Aggregate root enforcing permissions
- [[Auth Middleware]] — `requireWorkspaceRole()` guard
- [[Usage & Quota]] — Credit consumption rule