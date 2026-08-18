---
type: entity
tags:
  - wiki/entity
  - wiki/gamification
date_updated: 2026-08-18
source_count: 2
---

# WorkspaceChallenge

> Aggregate Root — [[Gamification]] context

## Definition

A `WorkspaceChallenge` tracks a workspace's progress toward a weekly team challenge (e.g. "complete N sessions", "promote M artifacts"). Progress accumulates from cross-context events; on reaching the target the challenge completes and emits `ChallengeCompleted`.

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `challengeId` | `string` | Unique identifier (aggregate root id) |
| `workspaceId` | `string` | Owning workspace |
| `challengeKey` | `ChallengeKey` | Which challenge (from `challenge-catalog`) |
| `progress` | `number` | Accumulated progress (capped at `target`) |
| `target` | `number` | Completion threshold |
| `status` | `ChallengeStatus` | `Active` \| `Completed` |
| `weekStart` | `string` | Weekly challenge window start |
| `createdAt` / `completedAt` | `Date` | Timestamps |
| `version` | `number` | Optimistic-lock version |

## Factory Methods

- `static create(workspaceId, challengeKey, target, weekStart)` — new challenge, progress `0`, status `Active`, version `1`.
- `static reconstitute(...)` — hydration from persistence (all fields verbatim).

## Business Methods

- `contribute(amount = 1): DomainEvent | null` — adds progress (capped at `target`); on reaching the target sets status `Completed`, sets `completedAt`, and returns `ChallengeCompleted`. Returns `null` when already completed.

## Events

- `ChallengeCompleted` (`challengeId`, `workspaceId`, `challengeKey`) — emitted when progress reaches `target`.

## Sources

- [[Gamification]] — context, challenge catalog, event-driven flow
- [[PlayerProfile]] — sibling aggregate (XP, achievements)
