---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/workspace
  - wiki/sharing
  - wiki/architecture
date_updated: 2026-08-01
---

# Workspace Sharing — Architecture Proposal

> **Archived** — superseded by [[Workspace Sharing]]. This page is retained as a decision record (Option A/B/C evaluation). For the canonical documentation, see [[Workspace Sharing]] which includes the full permission matrix, role definitions, domain enforcement, middleware, and notification delivery.

> Synthesis of the multi-user workspace sharing design. Extends [[Workspace & Assets]] with membership-based access control.

## Summary

This proposal transforms `Workspace` from a single-owner container (`User 1:N Workspace`) into a multi-member collaboration space (`User M:N Workspace` via `WorkspaceMembership`). The design follows **Option A — Direct Membership**: a new entity inside the Workspace aggregate with three roles (`owner`, `editor`, `viewer`).

## Decision Context

Three canonical options were evaluated (see full analysis in exploration phase):

| Option | Complexity | New Entities | Chosen? |
|--------|-----------|-------------|---------|
| **A — Direct Membership** | Low-Medium | 1 (`WorkspaceMembership`) | ✅ |
| B — Team-Based | High | 2 (`Team`, `TeamMembership`) | ❌ Overkill for current stage |
| C — Ephemeral Invite | Minimal | 0 | ❌ Too ephemeral — members should see shared workspaces in dashboard |

## What Changes

### Domain (`packages/domain`)

| File | Change | Type |
|------|--------|------|
| `workspace/entities/Workspace.ts` | Collection `_memberships`, new methods (`inviteMember`, `acceptInvitation`, `removeMember`, `transferOwnership`, permission checks) | MODIFIED |
| `workspace/entities/WorkspaceMembership.ts` | New entity with `role`, `status`, lifecycle methods (`invite`, `accept`) | NEW |
| `workspace/value-objects/MembershipRole.ts` | `owner \| editor \| viewer` | NEW |
| `workspace/value-objects/MembershipStatus.ts` | `invited \| active` | NEW |
| `workspace/domain-events/MemberInvited.ts` | Domain event | NEW |
| `workspace/domain-events/MemberJoined.ts` | Domain event | NEW |
| `workspace/domain-events/MemberRemoved.ts` | Domain event | NEW |
| `workspace/domain-events/OwnershipTransferred.ts` | Domain event | NEW |
| `workspace/repositories/WorkspaceRepository.ts` | `findByMember()`, `findPendingInvitations()`, `findMembership()` | MODIFIED |
| `workspace/index.ts` | New exports | MODIFIED |

### Database (`packages/infra-db`)

```sql
-- Migration 007: workspace_memberships
ALTER TABLE workspaces DROP COLUMN user_id;
ALTER TABLE workspaces ADD COLUMN created_by UUID NOT NULL REFERENCES users(id);

CREATE TABLE workspace_memberships (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role         VARCHAR(10) NOT NULL DEFAULT 'editor',
    status       VARCHAR(10) NOT NULL DEFAULT 'invited',
    invited_by   UUID NOT NULL REFERENCES users(id),
    invited_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    joined_at    TIMESTAMPTZ,
    PRIMARY KEY (workspace_id, user_id)
);

-- Data migration: existing workspaces.user_id → membership with role 'owner'
INSERT INTO workspace_memberships (workspace_id, user_id, role, status, invited_by, invited_at, joined_at)
SELECT id, user_id, 'owner', 'active', user_id, created_at, created_at FROM workspaces;
```

### API (`apps/backend`)

| File | Change | Type |
|------|--------|------|
| `middleware/auth.ts` | `requireWorkspaceRole()` guard | MODIFIED |
| `routes/workspaces.ts` | New routes for invitations, members, ownership transfer | MODIFIED |
| `routes/invitations.ts` | New route file for pending invitations, accept, decline | NEW |
| `application/workspace/invite-member.usecase.ts` | Use case | NEW |
| `application/workspace/accept-invitation.usecase.ts` | Use case | NEW |
| `application/workspace/transfer-ownership.usecase.ts` | Use case | NEW |

### Unchanged Contexts

| Context | Impact | Reason |
|---------|--------|--------|
| [[Content Generation]] | None | `Session.userId` (author) + `Session.workspaceId` (context) unchanged |
| [[Usage & Quota]] | None | Credits consumed by `Session.userId` — no shared billing |
| [[Auth Dependencies]] | None | `UserId` already shared across contexts |

## Permission Model

```
owner   → full control (invite, remove, transfer, delete workspace)
editor  → create/edit/delete assets, start sessions
viewer  → read-only access
invited → no access until accepted
```

See [[Workspace Permissions]] for the full matrix.

## Invitation Flow

```
Owner invites (email) → MemberInvited event → Email sent → Invitee accepts → MemberJoined event → Workspace in dashboard
```

## Migration Path

| Phase | Action | Breaking? |
|-------|--------|-----------|
| **0** | Add `workspace_memberships` table + `created_by` column to workspaces | No |
| **1** | Migrate existing `workspaces.user_id` into memberships as `owner` | No |
| **2** | Deploy new `Workspace` aggregate with membership methods | No |
| **3** | Add `requireWorkspaceRole()` to existing routes | No |
| **4** | Add invitation routes + use cases | No |
| **5** | Drop `workspaces.user_id` column | Yes — cleanup only |

## Decision Closure

1. **Notification delivery (closed)**: invitation notifications are sent by an in-process application notification service, triggered by `MemberInvited`, with retry + idempotent delivery guard. See [[Invitation Notification Delivery]].

## Remaining Questions

1. **Workspace limits per user**: should there be a limit on how many workspaces a user can be a member of? Current: no limit. Revisit if performance becomes an issue.

2. **Viewer -> session visibility**: can a `viewer` see sessions created by other members? Yes — sessions are scoped to the workspace, not to the user. All members can see all sessions in the workspace.

## Sources

- [[Workspace Sharing]] — Feature overview concept page
- [[WorkspaceMembership]] — Membership entity
- [[Workspace Permissions]] — Permission matrix and enforcement
- [[Workspace]] — Modified aggregate root
- [[Workspace & Assets]] — Parent bounded context
- [[Auth Middleware]] — `requireWorkspaceRole()` guard
- [[Invitation Notification Delivery]] — invitation notification contract
