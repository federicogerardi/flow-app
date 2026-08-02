---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/governance
  - wiki/debt
date_updated: 2026-08-02
source_count: 2
confidence: high
---

# Rule 4 VO Debt — Type Alias Conversion

> **CLAUDE.md Rule 4**: "Value Objects with constrained domains must be classes, not type aliases."

8 domain value objects are currently implemented as bare `type` aliases instead of classes. This is pre-existing architectural debt (Phase 1–8), not introduced by the 2026-08-02 lint remediation — but the remediation exposed its impact through repository `as` casts and frontend `string` fields.

## Current State

All 8 VOs are type aliases with no runtime validation, no `equals()`, and no `isTerminal()`:

| Value Object | Values | File | Impact |
|-------------|--------|------|--------|
| `ToolKey` | 11 variants | `generation/value-objects/ToolKey.ts` | Repository `as ToolKey` casts |
| `SessionStatus` | 7 variants with lifecycle | `generation/value-objects/SessionStatus.ts` | Repository `as SessionStatus` casts, no `isTerminal()` |
| `AgentKey` | 7 variants | `agent-chat/value-objects/AgentKey.ts` | Repository `as AgentKey` casts |
| `ConversationStatus` | 2 variants | `agent-chat/value-objects/ConversationStatus.ts` | Repository `as ConversationStatus` casts |
| `MessageRole` | 3 variants | `agent-chat/value-objects/MessageRole.ts` | Repository `as MessageRole` casts |
| `MembershipRole` | 3 variants (authorization-critical) | `workspace/value-objects/MembershipRole.ts` | Repository `as MembershipRole` casts |
| `MembershipStatus` | 2 variants | `workspace/value-objects/MembershipStatus.ts` | Repository `as MembershipStatus` casts |
| `ArtifactStatus` | 4 variants | `generation/value-objects/ArtifactStatus.ts` | Unused in repositories currently |

## Impact

### Repositories — no runtime validation at persistence boundary

The `as TypeName` casts in repositories silently accept garbage from the database:

```typescript
// packages/infra-db/src/repositories/session-repository.ts:19
row.tool_key as ToolKey  // silently accepts 'invalid-key' from corrupted DB
```

A class-based VO with `static from()` would validate and throw at the boundary.

### Frontend — string fields instead of branded types

DTOs in `apps/frontend/src/api/client.ts` use `string` for status/role/key fields:

```typescript
// client.ts — all DTOs use string where the API returns branded values
status: string;       // should be SessionStatus | SessionStatusDTO
agentKey: string;     // should be AgentKey
role: string;         // should be MessageRole
```

This limits type safety on the client side.

### Domain — no `isTerminal()`, no `canTransitionTo()`

`SessionStatus` (7 states with lifecycle) has no `isTerminal()` method. The `SessionLifecycle.checkTransition()` must be called separately. A class could expose `status.isTerminal()` and `status.canTransitionTo(eventType)` directly.

## Conversion Roadmap

Target pattern (from CLAUDE.md Rule 4):

```typescript
export class SessionStatus {
  private constructor(private readonly _value: string) {}

  static readonly Draft = new SessionStatus('draft');
  static readonly Ready = new SessionStatus('ready');
  static readonly Queued = new SessionStatus('queued');
  static readonly Running = new SessionStatus('running');
  static readonly Completed = new SessionStatus('completed');
  static readonly Failed = new SessionStatus('failed');
  static readonly Cancelled = new SessionStatus('cancelled');

  static from(value: string): SessionStatus {
    // exhaustive switch — throws on invalid
  }

  equals(other: SessionStatus): boolean { return this._value === other._value; }
  toString(): string { return this._value; }
  isTerminal(): boolean { ... }
}
```

### Phase 1 — Critical VOs (authorization + lifecycle)

| VO | Reason | Effort | Dependencies |
|----|--------|--------|-------------|
| `MembershipRole` | Authorization checks; 3 values | 30 min | Workspace aggregate, repository |
| `SessionStatus` | Lifecycle semantics; 7 values; most casts | 1 hr | Session aggregate, lifecycle, repository, XState |

### Phase 2 — Remaining VOs

| VO | Reason | Effort |
|----|--------|--------|
| `ToolKey` | 11 values; used in routing/dispatch | 45 min |
| `AgentKey` | 7 values | 30 min |
| `ConversationStatus` | 2 values | 15 min |
| `MessageRole` | 3 values | 15 min |
| `MembershipStatus` | 2 values | 15 min |
| `ArtifactStatus` | 4 values | 15 min |

### Sequencing constraint

`SessionStatus` should be converted first because:
1. It has the most casts (10 in session-repository alone)
2. It has lifecycle semantics (`isTerminal()`) that would simplify `SessionLifecycle`
3. It's referenced by the XState machine, which would benefit from typed statuses

## Compatibility notes

- Backward-compatible: `toString()` and `JSON.stringify()` on instances produce the same strings the DB currently stores
- Repository casts disappear: `row.status as SessionStatus` → `SessionStatus.from(row.status)`
- Express/hook types: `req.workspace` and similar augmentations remain unchanged

## Sources

- [[sources/CLAUDE]] — Rule 4 definition and canonical class pattern
- [[session-machine|LLM wiki lint remediation 2026-08-02]] — Discovered during Tier 3 repository type assertion work
