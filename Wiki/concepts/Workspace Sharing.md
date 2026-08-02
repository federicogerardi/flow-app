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

| Action | owner | editor | viewer |
|--------|-------|--------|--------|
| View workspace + assets | ✅ | ✅ | ✅ |
| List members | ✅ | ✅ | ✅ |
| Create / edit / delete assets | ✅ | ✅ | ❌ |
| Promote artifact to asset | ✅ | ✅ | ❌ |
| Start generation sessions | ✅ | ✅ | ❌ |
| Invite members | ✅ | ❌ | ❌ |
| Remove members | ✅ | ❌ | ❌ |
| Change member role | ✅ | ❌ | ❌ |
| Change workspace name | ✅ | ❌ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ |

### Credit Consumption

Credits are always consumed by the **user who launches the tool**, not by the workspace owner:

> A `viewer` cannot launch tools (no credit consumption). An `editor` launching a tool in a workspace they don't own consumes **their own** credits. The owner's credit balance is unaffected by other members' generations. Credits = user-scoped, usage-based.

This rule applies regardless of role and regardless of workspace ownership. See [[Usage & Quota]].

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
- [[Workspace Permissions]] — Detailed permission model
- [[Usage & Quota]] — Credit consumption rule
- [[workspace-sharing-proposal]] — Full architecture proposal (synthesis)