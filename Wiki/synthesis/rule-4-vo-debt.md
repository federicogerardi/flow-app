---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/governance
  - wiki/debt
date_updated: 2026-08-02
source_count: 2
confidence: high
status: resolved
---

# Rule 4 VO Debt — Type Alias Conversion

> **CLAUDE.md Rule 4**: "Value Objects with constrained domains must be classes, not type aliases."

✅ **RESOLVED** (2026-08-02). All 8 type-alias VOs converted to classes across Phase 9a–9c. Zero `as` casts remain in repository files. Additional VOs (`PromptComponentType`, `UserStatus`) also addressed.

## Resolution Summary

All 8 VOs now follow the canonical class pattern: `private constructor`, `static readonly` instances, `static from()` with validation, `equals()`, `toString()`, `value` getter.

| Value Object | Values | Phase | Class Features | `as` Casts Removed |
|-------------|--------|:---:|----------------|:---:|
| `SessionStatus` | 7 variants | 9a | `isTerminal()`, `equals()` | 35+ |
| `MembershipRole` | 3 variants | 9b | `isOwner`, `isEditor`, `isViewer` getters | 4 |
| `ToolKey` | 11 variants | 9b | `from()` with validation | 4 |
| `AgentKey` | 7 variants | 9b | `from()` with validation | 2 |
| `ConversationStatus` | 2 variants | 9c | `isActive`, `isArchived` getters | 2 |
| `MessageRole` | 3 variants | 9c | `isUser`, `isAgent`, `isSystem` getters | 2 |
| `MembershipStatus` | 2 variants | 9c | `isPending`, `isActive` getters | 2 |
| `ArtifactStatus` | 4 variants | 9c | `canTransitionTo()`, `apply()`, `isTerminal` | 0 |

### Additional VOs addressed

| Value Object | Phase | Change |
|-------------|:---:|--------|
| `PromptComponentType` | 9d | 5-value type alias → class with `isSystemRule`/`isFormatConstraint`/`isSafetyGuard`/`isStyleGuide`/`isDomainKnowledge` getters |
| `UserStatus` | 9d | Already a class — fixed `isActive()` method → `isActive` getter for consistency |

### Remaining type alias

`ModelTier` (`'premium' | 'balanced' | 'light' | 'search'`) remains a type alias. This is intentional — it's an infrastructure/config concern (LLM provider routing), not a domain value object with constrained lifecycle semantics.

## Implementation Pattern

All VOs follow this canonical pattern (from CLAUDE.md Rule 4):

```typescript
export class SessionStatus {
  private constructor(private readonly _value: SessionStatusValue) {}

  static readonly Draft = new SessionStatus('draft');
  static readonly Ready = new SessionStatus('ready');
  // ... all 7 instances

  static from(value: string): SessionStatus {
    // exhaustive switch — throws DomainError on invalid
  }

  get value(): string { return this._value; }
  equals(other: SessionStatus): boolean { return this._value === other._value; }
  toString(): string { return this._value; }
  isTerminal(): boolean { ... }
}
```

### Key implementation decisions

- **DB column types remain strings** — VOs convert at repository boundary via `from()` (reads) and `.value` (writes)
- **`from()` throws `DomainError` subclasses** (not plain `Error`) — ensures `ErrorMapper → HTTP status` pipeline produces `422` instead of `500`
- **Barrel exports** use `export { ClassName }` (value) + `export type { ClassNameValue }` (string union)
- **No circular dependencies** — `SessionStatus` does NOT import `SessionLifecycle`; transition logic stays in `SessionLifecycle` exclusively
- **`ArtifactStatus` lifecycle guards** (`canTransitionTo()`, `apply()`) live on the class itself, not in a separate file

## Verification (2026-08-02)

- `grep -rn "as ToolKey|as AgentKey|as SessionStatus|as MembershipRole|as MembershipStatus|as ConversationStatus|as MessageRole|as ArtifactStatus" packages/ apps/`: **0 matches**
- `grep -rn "throw new Error" packages/domain/src/`: **0 matches**
- `npm run typecheck`: 0 errors
- `npm run lint`: 0 errors, 0 warnings
- `npm test`: 8/8 pass

## Sources

- [[phase-9-architectural-targets]] — Rule 4 definition and canonical class pattern
- [[phase-9-implementation-plan]] — Full implementation plan (47 steps)
- [[phase-9-architectural-targets]] — Decision record with all 16 gaps
