---
type: entity
tags:
  - wiki/entity
  - wiki/identity
date_updated: 2026-07-30
source_count: 2
---

# User

> Aggregate Root — [[Identity & Access]] context

## Definition

Represents an authenticated user of the platform. Generic subdomain — mostly off-the-shelf patterns.

## Structure

- `userId: UserId`
- `email: Email` (VO)
- `role: Role` (`admin` | `member`)
- `status: UserStatus` (`active` | `disabled`)
- Owns [[Workspace]]s
- Has a [[Quota]]

## Cross-Context References

- Referenced by [[Workspace]] via `UserId`
- Referenced by [[Quota]] via `UserId`
- Referenced by [[Session]] via `UserId`

## Sources

- [[doodle/PRD]] — FR-S01 to FR-S06
- [[doodle/USER-STORIES]] — US-A01 to US-A07