---
type: concept
tags:
  - wiki/concept
  - wiki/workspace
  - wiki/notifications
date_updated: 2026-08-01
source_count: 4
confidence: high
---

# Invitation Notification Delivery

> Delivery contract for workspace invitation notifications.

## Definition

This concept defines how invitation emails are sent after `MemberInvited` in `[[Workspace Sharing]]`, including reliability guarantees and operational fallback.

## Decision

Use an **application-level notification service** in the backend for MVP, triggered by domain events. The sender is in-process, with durable retry through existing event durability patterns.

## Flow

```
Workspace.inviteMember()
  -> MemberInvited
  -> NotificationHandler.onMemberInvited()
  -> NotificationService.sendInvitationEmail()
  -> Delivery log written (success/failure)
```

## Reliability Contract

- At-least-once processing at notification handler boundary.
- Idempotency key: `{workspaceId}:{inviteeUserId}:{invitedAt}`.
- Duplicate sends are prevented by idempotent delivery record check.
- Failures are retried with exponential backoff.

## Data and Observability

- Store invitation delivery status (`pending`, `sent`, `failed`, `retrying`).
- Emit structured logs with correlation ID.
- Expose counts in admin health/metrics views.

## Future Extraction Path

If notification volume or channel count grows, extract to a dedicated notification bounded context without changing workspace aggregate semantics.

## Key Properties

| Property | Meaning |
|----------|---------|
| **MVP-simple** | In-process service, minimal moving parts |
| **Reliable enough** | Retry + idempotent send guard |
| **Traceable** | Delivery state and logs available for support |
| **Evolvable** | Can be extracted later to separate context |

## Sources

- [[Workspace Sharing]] — invitation lifecycle and events
- [[workspace-sharing-proposal]] — open question being resolved
- [[Domain Events]] — event-mediated integration contract
- [[Logging Strategy]] — structured logs and correlation requirements
