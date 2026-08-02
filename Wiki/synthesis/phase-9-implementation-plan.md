---
type: synthesis
tags:
  - wiki/synthesis
  - wiki/implementation-plan
  - wiki/governance
date_updated: 2026-08-02
source_count: 1
confidence: high
---

# Implementation Plan: Phase 9 — Validation + Structural Gaps

## Overview

This plan addresses the 11 VALIDATION and 2 quick-win STRUCTURAL gaps documented in
`[[phase-9-architectural-targets]]`. It converts type-alias value objects to classes
(Domain Design Rule 4), replaces raw `throw new Error()` with `DomainError` subclasses
(Rule 3), types session events as a discriminated union, adds artifact lifecycle guards,
and fixes temporal invariants on Session `_startedAt`.

**Total estimated effort: ~12h 40m** across four phases (9a–9d).

## Requirements

- Every `throw new Error(...)` in domain code becomes a `DomainError` subclass with `code` and `retryable`
- 8 type-alias value objects converted to the canonical class pattern: `private constructor`, `static readonly` instances, `static from()` with validation, `equals()`, `toString()`
- `Session.apply()` uses a discriminated union instead of `{ type: SessionEventType; [key: string]: unknown }`
- `Artifact` gains lifecycle guard methods (`startGeneration`, `complete`, `fail`)
- `CONFIGURE` no longer sets `_startedAt`; `WORKER_PICKUP` does
- All 11 tool keys get real definitions instead of the `blogPostTool` stub
- Structural gaps S1, S2, S3 require RFCs first and are deferred to Phase 10+

## Architecture Changes

- **24 new `DomainError` subclasses** — one per validation failure point across 8 files
- **8 new class-based value objects** — replacing type aliases across 4 bounded contexts
- **`SessionEvent` discriminated union** — replacing `{ type: SessionEventType; [key: string]: unknown }`
- **`artifact-lifecycle.ts`** — new file to centralize lifecycle types and guards (avoids circular deps)
- **`ToolKey` class** — becomes a class with 11 static instances, replacing `as ToolKey` casts
- **11 new tool definitions** — real `ToolDefinition` objects for each tool key

## Implementation Steps

---

### Phase 9a — Foundation (P0, ~1h 40m)

#### GAP V10 — `throw new Error()` → `DomainError` (30 min)

**Goal**: Every `throw new Error(...)` in domain code becomes a `DomainError` subclass.
This ensures the `ErrorMapper → HTTP status` pipeline produces `422` or appropriate codes
instead of `500`.

> **IMPORTANT**: The prompt domain files live under `packages/domain/src/generation/prompting/`,
> NOT under `packages/domain/src/prompt/`. The target doc's file paths are wrong for three files.

**Files affected (7 files, 11 violations + 1 existing class fix):**

---

**Step 1.1 — `StepNumber.ts`** (File: `packages/domain/src/generation/value-objects/StepNumber.ts`)

- **Violation**: Line 4: `throw new Error('StepNumber must be >= 1');`
- **Action**: Create `InvalidStepNumberError extends DomainError` inline. Use `code = 'VALIDATION_ERROR'`, `retryable = false`.
- **New code**:
  ```typescript
  // Add import
  import { DomainError } from '../../shared/domain-error';

  // Add after StepNumber class
  export class InvalidStepNumberError extends DomainError {
    readonly code = 'VALIDATION_ERROR';
    readonly retryable = false;
    constructor(value: number) {
      super(`StepNumber must be >= 1, got ${value}`);
    }
  }

  // Change line 4:
  // OLD: throw new Error('StepNumber must be >= 1');
  // NEW: throw new InvalidStepNumberError(value);
  ```
- **Dependencies**: None
- **Risk**: Low — pure replacement, no consumers call `.of()` with invalid values

**Step 1.2 — `WorkspaceMembership.ts`** (File: `packages/domain/src/workspace/entities/WorkspaceMembership.ts`)

- **Violations**: Line 22 (`invite()`), Line 49 (`accept()`), Line 64 (`changeRole()`)
- **Action**: Create three `DomainError` subclasses inline at bottom of file
- **New errors**:
  - `CannotInviteAsOwnerError` — code `VALIDATION_ERROR`, retryable `false` (line 22)
  - `InvalidMembershipAcceptError` — code `INVALID_STATE`, retryable `false` (line 49) — Note: code already exists but currently extends `Error` on line 54 of `errors.ts`
  - `CannotAssignOwnerRoleError` — code `VALIDATION_ERROR`, retryable `false` (line 64)
- **Dependencies**: None
- **Risk**: Low

**Step 1.3 — `PromptTemplateId.ts`** (File: `packages/domain/src/generation/prompting/PromptTemplateId.ts`)

- **Violations**: Line 9 (`Invalid toolKey`), Line 12 (`Invalid stepLabel`), Line 20 (`Invalid format`)
- **Action**: Create two `DomainError` subclasses inline:
  - `InvalidPromptTemplateKeyError` — code `VALIDATION_ERROR`, retryable `false`
  - `InvalidPromptTemplateIdFormatError` — code `VALIDATION_ERROR`, retryable `false`
- **Dependencies**: None
- **Risk**: Low

**Step 1.4 — `PromptVersion.ts`** (File: `packages/domain/src/generation/prompting/PromptVersion.ts`)

- **Violation**: Line 9: `throw new Error('Invalid version...')`
- **Action**: Create `InvalidPromptVersionError extends DomainError` inline. Code `VALIDATION_ERROR`, retryable `false`.
- **Dependencies**: None
- **Risk**: Low

**Step 1.5 — `PromptComponent.ts`** (File: `packages/domain/src/generation/prompting/PromptComponent.ts`)

- **Violation**: Line 28: `throw new Error('Component content must not be empty')`
- **Action**: Create `EmptyComponentContentError extends DomainError`. Code `VALIDATION_ERROR`, retryable `false`.
- **Dependencies**: None
- **Risk**: Low

**Step 1.6 — `UserStatus.ts`** (File: `packages/domain/src/identity/value-objects/UserStatus.ts`)

- **Violation**: Line 16: `throw new Error('Invalid UserStatus: ${value}')`
- **Action**: Create `InvalidUserStatusError extends DomainError`. Code `VALIDATION_ERROR`, retryable `false`.
- **Dependencies**: None
- **Risk**: Low

**Step 1.7 — `UserRole.ts`** (File: `packages/domain/src/identity/value-objects/UserRole.ts`)

- **Violation**: Line 16: `throw new Error('Invalid UserRole: ${value}')`
- **Action**: Create `InvalidUserRoleError extends DomainError`. Code `VALIDATION_ERROR`, retryable `false`.
- **Dependencies**: None
- **Risk**: Low

**Step 1.8 — `PromptComponentRegistry.ts`** (File: `packages/domain/src/generation/prompting/PromptComponentRegistry.ts`)

- **Violation**: Lines 3–9: `PromptComponentNotFoundError extends Error`, NOT `DomainError`. It has `code` and `retryable` fields but the base class is wrong — the `ErrorMapper` sees it as a plain `Error` and returns 500.
- **Action**: Change `extends Error` to `extends DomainError`. Import `DomainError` from `../../shared/domain-error`. Remove manual `code`/`retryable` declarations (they come from the abstract base), keep as class properties.
- **Dependencies**: None
- **Risk**: Low — is an upgrade, not a behavioral change. The error already has the right code.

**Step 1.9 — Update exports** (Files: various index.ts)

- **Action**: Add new error classes to their respective barrel exports:
  - `packages/domain/src/generation/index.ts`: Add `InvalidStepNumberError`, `InvalidPromptTemplateKeyError`, `InvalidPromptTemplateIdFormatError`, `InvalidPromptVersionError`, `EmptyComponentContentError` (the prompting errors are re-exported through the `./prompting` barrel)
  - `packages/domain/src/generation/prompting/index.ts`: Re-export `InvalidPromptTemplateKeyError`, `InvalidPromptTemplateIdFormatError`, `InvalidPromptVersionError`, `EmptyComponentContentError`
  - `packages/domain/src/identity/index.ts`: Add `InvalidUserStatusError`, `InvalidUserRoleError`
- **Dependencies**: Steps 1.1–1.8
- **Risk**: Low — pure addition

**Testing**: Since these are pure validation error changes, the existing test suite should pass unchanged. Adding explicit unit tests for each new error class (instantiation + code + retryable) is recommended but not blocking.

---

#### GAP V1 — `SessionStatus` type alias → class (1h 10m)

**Goal**: Convert the 7-value type alias to a class with `isTerminal()` and transition guards.
This eliminates 35+ `as SessionStatus` casts at DB layer, removes `SessionLifecycle.isFinalState()`
redundancy, and prevents DB corruption from silently accepted invalid status values.

**Impact radius**: 4 files directly, `session-lifecycle.ts` becomes simpler.

---

**Step 2.1 — Create `SessionStatus` class** (File: `packages/domain/src/generation/value-objects/SessionStatus.ts`)

- **Current state** (lines 1–8):
  ```typescript
  export type SessionStatus =
    | 'draft' | 'ready' | 'queued' | 'running'
    | 'completed' | 'failed' | 'cancelled';
  ```
- **Replace with**:
  ```typescript
  import { DomainError } from '../../shared/domain-error';

  export type SessionStatusValue = 'draft' | 'ready' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

  export class SessionStatus {
    private constructor(private readonly _value: SessionStatusValue) {}

    static readonly Draft = new SessionStatus('draft');
    static readonly Ready = new SessionStatus('ready');
    static readonly Queued = new SessionStatus('queued');
    static readonly Running = new SessionStatus('running');
    static readonly Completed = new SessionStatus('completed');
    static readonly Failed = new SessionStatus('failed');
    static readonly Cancelled = new SessionStatus('cancelled');

    static from(value: string): SessionStatus {
      switch (value) {
        case 'draft': return SessionStatus.Draft;
        case 'ready': return SessionStatus.Ready;
        case 'queued': return SessionStatus.Queued;
        case 'running': return SessionStatus.Running;
        case 'completed': return SessionStatus.Completed;
        case 'failed': return SessionStatus.Failed;
        case 'cancelled': return SessionStatus.Cancelled;
        default:
          throw new InvalidSessionStatusError(value);
      }
    }

    isTerminal(): boolean {
      return this._value === 'completed' || this._value === 'failed' || this._value === 'cancelled';
    }

    canTransitionTo(target: SessionStatus): boolean {
      // Delegate to SessionLifecycle — see Step 2.3
      return SessionLifecycle.getValidTransition(this, target) !== null;
    }

    equals(other: SessionStatus): boolean {
      return this._value === other._value;
    }

    toString(): SessionStatusValue {
      return this._value;
    }

    get value(): SessionStatusValue {
      return this._value;
    }
  }

  export class InvalidSessionStatusError extends DomainError {
    readonly code = 'VALIDATION_ERROR';
    readonly retryable = false;
    constructor(value: string) {
      super(`Invalid SessionStatus: ${value}`);
    }
  }
  ```
- **Dependencies**: None (creates the class first)
- **Risk**: Medium — circular dependency risk with `SessionLifecycle` (see Step 2.3 mitigation)

**Step 2.2 — Update `Session` entity** (File: `packages/domain/src/generation/entities/Session.ts`)

- **Changes**:
  - Line 2: Change `import type { SessionStatus }` → `import { SessionStatus, type SessionStatusValue }`
  - Line 9: `private _status: SessionStatus;` stays the same type (now class)
  - Line 52 (create): `'draft'` → `SessionStatus.Draft`
  - Line 52: `'draft'` → `SessionStatus.Draft`
  - Line 54 (create): `null` for startedAt → stays `null`
  - Lines 52, 82 (reconstitute): `status: SessionStatus` parameter stays same type (now class)
  - Line 92: `get status(): SessionStatus` stays same
  - Line 121–123: `SessionLifecycle.getValidTransition(this._status, event.type)` — `this._status` is now a class instance, not a string. The `SessionLifecycle` lookup needs updating (Step 2.3)
  - Line 176–183: `InvalidSessionStateError` constructor params `currentState: SessionStatus, attemptedEvent: SessionEventType` — `currentState` now takes the class
  - Line 183: `super(\`Cannot apply "${attemptedEvent}" in state "${currentState}"\`)` — `currentState.toString()` returns the value, so this still works
- **Dependencies**: Step 2.1
- **Risk**: Medium — if `SessionLifecycle` isn't updated simultaneously, `getValidTransition` will break

**Step 2.3 — Update `SessionLifecycle`** (File: `packages/domain/src/generation/session-lifecycle.ts`)

- **Changes**:
  - Line 1: Change `import type { SessionStatus }` → `import { SessionStatus, type SessionStatusValue }`
  - Line 12: `export type SessionState = SessionStatus;` → **Delete this line** (SessionState IS SessionStatus now, the class is its own type)
  - Lines 19–48: Rewrite `states` record to use `SessionStatus` instances as keys instead of string literals:
    ```typescript
    const stateTransitions = new Map<SessionStatus, StateDefinition>();
    stateTransitions.set(SessionStatus.Draft, {
      transitions: { CONFIGURE: SessionStatus.Ready },
      isFinal: false,
    });
    // ... etc for all 7 states
    ```
  - Line 54–59: Update `getValidTransition()` to accept `SessionStatus` objects:
    ```typescript
    getValidTransition(currentState: SessionStatus, event: SessionEventType): SessionStatus | null {
      const stateDef = stateTransitions.get(currentState);
      if (!stateDef) return null;
      return stateDef.transitions[event] ?? null;
    },
    ```
  - Line 63: `isFinalState()` → **deprecate** (use `SessionStatus.isTerminal()` instead). Keep for backward compat:
    ```typescript
    isFinalState(state: SessionStatus): boolean {
      return state.isTerminal();
    },
    ```
  - Line 51: `initialState` → `SessionStatus.Draft`
- **Important**: How to avoid circular dependency. `SessionStatus.canTransitionTo()` calls `SessionLifecycle.getValidTransition()`. Solution: Do NOT add `import { SessionLifecycle }` inside `SessionStatus.ts`. Instead, `canTransitionTo()` delegates to `SessionLifecycle` only at runtime (lazy import) OR remove `canTransitionTo()` from the class and keep transition logic exclusively in `SessionLifecycle`. **Recommendation**: Keep transition logic in `SessionLifecycle` only. `SessionStatus` class has `isTerminal()` and `equals()` — no transition logic.
- **Dependencies**: Steps 2.1, 2.2
- **Risk**: High — circular dependency is the main hazard. Mitigation: keep `SessionStatus` free of lifecycle imports.

**Step 2.4 — Update `SessionRepository`** (File: `packages/infra-db/src/repositories/session-repository.ts`)

- **Changes**:
  - Line 3: Change import to use `SessionStatus`
  - Lines 23, 50, 83: `row.status` → `SessionStatus.from(row.status)` (replaces the implicit `as SessionStatus` cast — this is the main benefit)
  - Line 66: `filters.status as SessionStatus` → `filters.status` (Kysely accepts the string; no cast needed since the filter goes directly to WHERE clause). Or keep `as` since it's a DB query param, not a domain VO.
  - Line 103, 130: `status: session.status` — `session.status` now returns a `SessionStatus` instance. Kysely needs the string value. Change to `status: session.status.value`. This is the key change — the VO class's `value` property is used for DB writes.
- **Dependencies**: Steps 2.1–2.3
- **Risk**: Medium — Kysely column type expects `SessionStatus` (the DB type alias). We need to ensure `session.status.value` returns a `SessionStatusValue` that matches the DB column type. The DB type in `packages/infra-db/src/types.ts` may also need updating.

**Step 2.5 — Update exports** (File: `packages/domain/src/generation/index.ts`)

- Line 11: Change `export type { SessionStatus }` → `export { SessionStatus, InvalidSessionStatusError }` and `export type { SessionStatusValue }`
- **Dependencies**: Step 2.1
- **Risk**: Low

**Testing**:
- Unit test `SessionStatus.from()` with valid and invalid values
- Unit test `SessionStatus.isTerminal()` for each of 7 states
- Integration test: `Session.apply()` with each event type, verify state transitions
- Integration test: Repository `findById()` returns Session with correct SessionStatus class

---

### Phase 9b — Core (P0/P1, ~4h)

#### GAP V2 — `MembershipRole` type alias → class (40 min)

**Goal**: Convert `'owner' | 'editor' | 'viewer'` to class. This eliminates `role === 'owner'` string comparisons in 3 files and `as MembershipRole` casts in 4 places in the repository.

---

**Step 3.1 — Create `MembershipRole` class** (File: `packages/domain/src/workspace/value-objects/MembershipRole.ts`)

- **Current state** (line 1):
  ```typescript
  export type MembershipRole = 'owner' | 'editor' | 'viewer';
  ```
- **Replace with**:
  ```typescript
  import { DomainError } from '../../shared/domain-error';

  export type MembershipRoleValue = 'owner' | 'editor' | 'viewer';

  export class MembershipRole {
    private constructor(private readonly _value: MembershipRoleValue) {}

    static readonly Owner = new MembershipRole('owner');
    static readonly Editor = new MembershipRole('editor');
    static readonly Viewer = new MembershipRole('viewer');

    static from(value: string): MembershipRole {
      switch (value) {
        case 'owner': return MembershipRole.Owner;
        case 'editor': return MembershipRole.Editor;
        case 'viewer': return MembershipRole.Viewer;
        default:
          throw new InvalidMembershipRoleError(value);
      }
    }

    equals(other: MembershipRole): boolean {
      return this._value === other._value;
    }

    toString(): MembershipRoleValue {
      return this._value;
    }

    get value(): MembershipRoleValue {
      return this._value;
    }

    // Convenience queries
    get isOwner(): boolean { return this._value === 'owner'; }
    get isEditor(): boolean { return this._value === 'editor'; }
    get isViewer(): boolean { return this._value === 'viewer'; }
  }

  export class InvalidMembershipRoleError extends DomainError {
    readonly code = 'VALIDATION_ERROR';
    readonly retryable = false;
    constructor(value: string) {
      super(`Invalid MembershipRole: ${value}`);
    }
  }
  ```
- **Dependencies**: None
- **Risk**: Low

**Step 3.2 — Update `WorkspaceMembership`** (File: `packages/domain/src/workspace/entities/WorkspaceMembership.ts`)

- **Changes**:
  - Line 1: Change `import type` → `import { MembershipRole, type MembershipRoleValue }`
  - Line 8: `private _role: MembershipRole` stays same type
  - Line 21: `if (role === 'owner')` → `if (role.isOwner)`
  - Line 28: `'invited'` → stays string literal (MembershipStatus not yet converted — will be updated in V7 later)
  - Line 48: `if (this._status !== 'invited')` → stays string (MembershipStatus not yet converted)
  - Line 55: `'active'` → stays string
  - Line 63: `if (newRole === 'owner')` → `if (newRole.isOwner)`
  - Line 74: `this._role = 'owner'` → `this._role = MembershipRole.Owner`
  - Line 90: `return this._role === 'owner' && this.isActive` → `return this._role.isOwner && this.isActive`
- **Dependencies**: Step 3.1
- **Risk**: Low

**Step 3.3 — Update `Workspace`** (File: `packages/domain/src/workspace/entities/Workspace.ts`)

- **Changes**:
  - Line 3: Change `import type { MembershipRole }` → `import { MembershipRole, type MembershipRoleValue }`
  - Line 36, 38: `'owner'` → `MembershipRole.Owner`
  - Line 37: `'active'` → stays (MembershipStatus not yet converted)
  - Line 103: `currentOwner.changeRole('editor')` → `currentOwner.changeRole(MembershipRole.Editor)`
  - Line 135: `return role === 'owner' || role === 'editor'` → `return role?.isOwner === true || role?.isEditor === true`
  - Line 129–130: `getMemberRole()` return type stays `MembershipRole | null` (now class)
- **Dependencies**: Steps 3.1, 3.2
- **Risk**: Low

**Step 3.4 — Update `WorkspaceRepository`** (File: `packages/infra-db/src/repositories/workspace-repository.ts`)

- **Changes**:
  - Line 3: Update import to use class
  - Line 34: `m.role as MembershipRole` → `MembershipRole.from(m.role)`
  - Line 86, 94, 145: `role: m.role` → `role: m.role.value` (Kysely needs string for DB column)
- **Dependencies**: Steps 3.1–3.3
- **Risk**: Low

**Step 3.5 — Update exports** (File: `packages/domain/src/workspace/index.ts`)

- Line 3: Change `export type { MembershipRole }` → `export { MembershipRole, InvalidMembershipRoleError }` and add `export type { MembershipRoleValue }`
- **Dependencies**: Step 3.1
- **Risk**: Low

**Testing**: Unit test `from()` with valid/invalid values, `isOwner`/`isEditor`/`isViewer` queries.

---

#### GAP V9 — `apply()` strongly-typed events (1h 30m)

**Goal**: Replace `{ type: SessionEventType; [key: string]: unknown }` with a discriminated union so the compiler catches unknown event types and the `as` casts on `event.errorCode`/`event.errorMessage` disappear.

---

**Step 4.1 — Define `SessionEvent` discriminated union** (File: `packages/domain/src/generation/session-lifecycle.ts`)

- **Current state** (lines 3–10):
  ```typescript
  export type SessionEventType =
    | 'CONFIGURE' | 'QUEUE' | 'WORKER_PICKUP'
    | 'ADD_ARTIFACT' | 'COMPLETE' | 'FAIL' | 'CANCEL';
  ```
- **Add after existing type**:
  ```typescript
  import type { Artifact } from './entities/Artifact';

  export type SessionEvent =
    | { type: 'CONFIGURE' }
    | { type: 'QUEUE' }
    | { type: 'WORKER_PICKUP' }
    | { type: 'ADD_ARTIFACT'; artifact: Artifact; isLast: boolean; stepLabel: string }
    | { type: 'COMPLETE' }
    | { type: 'FAIL'; errorCode: string; errorMessage: string }
    | { type: 'CANCEL' };
  ```
- **Dependencies**: None
- **Risk**: Medium — `Artifact` import creates a dependency; must verify no circular import exists (SessionLifecycle → Artifact, Artifact → only SessionId, so safe)

**Step 4.2 — Update `Session.apply()`** (File: `packages/domain/src/generation/entities/Session.ts`)

- **Changes**:
  - Line 4: Import `type SessionEvent` from session-lifecycle
  - Line 120: Replace signature:
    ```typescript
    // OLD:
    apply(event: { type: SessionEventType; [key: string]: unknown }): DomainEvent | null {
    // NEW:
    apply(event: SessionEvent): DomainEvent | null {
    ```
  - Line 129: `case 'CONFIGURE'` — no payload, no change needed
  - Line 134: `case 'QUEUE'` — no change
  - Line 137: `case 'WORKER_PICKUP'` — now needs to set `_startedAt` (see GAP S4, Step 8.1)
  - Line 140: `case 'ADD_ARTIFACT'` — access `event.artifact`, `event.isLast`, `event.stepLabel` directly (typed)
  - Line 144: `case 'COMPLETE'` — no change
  - Line 152–153: Remove `as` casts:
    ```typescript
    // OLD:
    this._errorCode = (event.errorCode as string) ?? 'UNKNOWN';
    this._errorMessage = (event.errorMessage as string) ?? 'Unknown error';
    // NEW:
    this._errorCode = event.errorCode;
    this._errorMessage = event.errorMessage;
    ```
  - Line 170: Remove `default` case or keep as exhaustive check (discriminated union makes it unreachable)
- **Dependencies**: Step 4.1
- **Risk**: Medium — consumers that construct event objects must now match the exact shape

**Step 4.3 — Update `SessionWorker`** (File: `apps/backend/src/generation/worker/session-worker.ts`)

- **Changes**:
  - Line 149: `actor.send({ type: 'CONFIGURE', acquisitionData: { ... } })` — this event goes to the XState machine, NOT to `Session.apply()`. The XState machine's `CONFIGURE` event already has `acquisitionData` payload (line 13 of session-machine.ts). This is correct and does NOT need changing — XState events and domain events are separate.
  - However, verify: does `session.apply()` get called from the worker? Looking at line 52–57 of `session-machine.ts`, the `callApply` action calls `context.session.apply()`. The machine triggers `apply` with `ADD_ARTIFACT` and `COMPLETE` events. These must match the new `SessionEvent` discriminated union.
  - **Action**: Verify `session-machine.ts` changes (Step 4.4). No changes needed in session-worker.ts itself for V9.
- **Dependencies**: Steps 4.1, 4.2
- **Risk**: Low

**Step 4.4 — Update `SessionMachine`** (File: `apps/backend/src/generation/machines/session-machine.ts`)

- **Changes**:
  - Line 52–57 (callApply action): The machine currently calls:
    ```typescript
    context.session.apply({
      type: 'ADD_ARTIFACT',
      artifact: output,
      isLast: stepIndex >= context.tool.steps.length - 1,
      stepLabel: context.tool.steps[stepIndex]?.label ?? '',
    });
    ```
    This already matches the new `SessionEvent` shape for `ADD_ARTIFACT`. **No changes needed** — the machine already constructs the event with the right payload.
  - Line 63: `context.session.apply({ type: 'COMPLETE' })` — matches the new discriminated union. **No change needed.**
- **Dependencies**: Steps 4.1, 4.2
- **Risk**: Low — the machine already provides the right payload structure

**Step 4.5 — Update exports** (File: `packages/domain/src/generation/index.ts`)

- Line 18: Change `export type { SessionState, SessionEventType }` → `export type { SessionState, SessionEventType, SessionEvent }`
- **Dependencies**: Step 4.1
- **Risk**: Low

**Testing**:
- Unit test: `Session.apply({ type: 'FAIL', errorCode: 'X', errorMessage: 'Y' })` — error fields set without casts
- Unit test: `Session.apply({ type: 'CONFIGURE' })` — compiler should reject `{ type: 'CONFIGURE', extra: true }` (excess property check)
- Integration test: Machine transitions still produce correct `apply()` calls

---

#### GAP V3 — `ToolKey` type alias → class (50 min)

**Goal**: Convert the 11-value type alias to a class. This is a constrained domain (11 known values), so it must be a class (Rule 4).

---

**Step 5.1 — Create `ToolKey` class** (File: `packages/domain/src/generation/value-objects/ToolKey.ts`)

- **Current state** (lines 1–12): 11-value union type alias
- **Replace with**:
  ```typescript
  import { DomainError } from '../../shared/domain-error';

  export type ToolKeyValue =
    | 'landing-funnel' | 'landing-page' | 'video-script-long-form'
    | 'video-description' | 'blog-post' | 'ad-copy' | 'brief'
    | 'brand-voice' | 'buyer-persona' | 'marketing-angle'
    | 'ai-overview-analysis';

  export class ToolKey {
    private constructor(private readonly _value: ToolKeyValue) {}

    static readonly LandingFunnel = new ToolKey('landing-funnel');
    static readonly LandingPage = new ToolKey('landing-page');
    static readonly VideoScriptLongForm = new ToolKey('video-script-long-form');
    static readonly VideoDescription = new ToolKey('video-description');
    static readonly BlogPost = new ToolKey('blog-post');
    static readonly AdCopy = new ToolKey('ad-copy');
    static readonly Brief = new ToolKey('brief');
    static readonly BrandVoice = new ToolKey('brand-voice');
    static readonly BuyerPersona = new ToolKey('buyer-persona');
    static readonly MarketingAngle = new ToolKey('marketing-angle');
    static readonly AiOverviewAnalysis = new ToolKey('ai-overview-analysis');

    static from(value: string): ToolKey {
      switch (value) {
        case 'landing-funnel': return ToolKey.LandingFunnel;
        case 'landing-page': return ToolKey.LandingPage;
        case 'video-script-long-form': return ToolKey.VideoScriptLongForm;
        case 'video-description': return ToolKey.VideoDescription;
        case 'blog-post': return ToolKey.BlogPost;
        case 'ad-copy': return ToolKey.AdCopy;
        case 'brief': return ToolKey.Brief;
        case 'brand-voice': return ToolKey.BrandVoice;
        case 'buyer-persona': return ToolKey.BuyerPersona;
        case 'marketing-angle': return ToolKey.MarketingAngle;
        case 'ai-overview-analysis': return ToolKey.AiOverviewAnalysis;
        default:
          throw new InvalidToolKeyError(value);
      }
    }

    equals(other: ToolKey): boolean {
      return this._value === other._value;
    }

    toString(): ToolKeyValue {
      return this._value;
    }

    get value(): ToolKeyValue {
      return this._value;
    }
  }

  export class InvalidToolKeyError extends DomainError {
    readonly code = 'VALIDATION_ERROR';
    readonly retryable = false;
    constructor(value: string) {
      super(`Invalid ToolKey: ${value}`);
    }
  }
  ```
- **Dependencies**: None
- **Risk**: Low

**Step 5.2 — Update `Session`** (File: `packages/domain/src/generation/entities/Session.ts`)

- **Changes**:
  - Line 3: Change `import type { ToolKey }` → `import { ToolKey, type ToolKeyValue }`
  - Line 19: `readonly toolKey: ToolKey` stays same type
  - Line 40–45 (create): Parameter `toolKey: ToolKey` stays same. Caller now passes `ToolKey.BlogPost` instead of `'blog-post'`.
  - Line 64 (reconstitute): Parameter stays same. Caller (repository) now passes `ToolKey.from(row.tool_key)`.
- **Dependencies**: Step 5.1
- **Risk**: Low

**Step 5.3 — Update `ToolRegistry`** (File: `packages/domain/src/generation/tools/index.ts`)

- **Changes**:
  - Line 2: Import changes — `ToolKey` is now a class
  - Lines 48–59: The registry record key type must change from `Record<ToolKey, ToolDefinition>` to `Map<ToolKey, ToolDefinition>` or keep the record but use `ToolKey` instances as keys. **Recommendation**: Keep as `Record` but change to mapped type using `ToolKeyValue`:
    ```typescript
    export const toolRegistry: Record<ToolKeyValue, ToolDefinition> = { ... };
    ```
    This avoids needing to change the `getTool()` lookup.
  - Lines 50–59: String literal keys stay as-is (e.g., `'landing-funnel': blogPostTool`)
  - Line 62: `getTool(key: ToolKey)` — parameter type stays `ToolKey` (class). Update body: `return toolRegistry[key.value]`
- **Dependencies**: Step 5.1
- **Risk**: Low — `getTool()` needs updating but pattern is straightforward

**Step 5.4 — Update `SessionRepository`** (File: `packages/infra-db/src/repositories/session-repository.ts`)

- **Changes**:
  - Line 3: Update import to use class
  - Line 19, 46, 79: `row.tool_key as ToolKey` → `ToolKey.from(row.tool_key)` (replaces 3 `as` casts)
  - Line 99: `tool_key: session.toolKey` → `tool_key: session.toolKey.value` (Kysely needs string)
- **Dependencies**: Step 5.1
- **Risk**: Low

**Step 5.5 — Update `SessionWorker`** (File: `apps/backend/src/generation/worker/session-worker.ts`)

- **Changes**:
  - Line 4: Import change
  - Line 56: `session.toolKey as ToolKey` → just `session.toolKey` (it's already the right type from the entity)
- **Dependencies**: Steps 5.1, 5.2
- **Risk**: Low

**Step 5.6 — Update exports** (File: `packages/domain/src/generation/index.ts`)

- Line 7: Change `export type { ToolKey }` → `export { ToolKey, InvalidToolKeyError }` and add `export type { ToolKeyValue }`
- **Dependencies**: Step 5.1
- **Risk**: Low

**Testing**: Unit test `ToolKey.from()` with all 11 valid values and one invalid. Verify `getTool(ToolKey.BlogPost)` returns definition.

---

#### GAP V4 — `AgentKey` type alias → class (45 min)

**Goal**: Convert the 7-value type alias to a class. Same pattern as ToolKey.

---

**Step 6.1 — Create `AgentKey` class** (File: `packages/domain/src/agent-chat/value-objects/AgentKey.ts`)

- **Current state** (lines 1–8): 7-value union type alias
- **Replace with**: Class with 7 static instances (`Strategist`, `Copywriter`, `SeoSpecialist`, `AdsSpecialist`, `Analyst`, `CreativeDirector`, `EmailMarketer`), `from()` with validation throwing `InvalidAgentKeyError extends DomainError`, `equals()`, `toString()`, `value` getter.
- **Dependencies**: None
- **Risk**: Low

**Step 6.2 — Update `Conversation`** (File: `packages/domain/src/agent-chat/entities/Conversation.ts`)

- **Changes**:
  - Line 2: Change `import type { AgentKey }` → `import { AgentKey, type AgentKeyValue }`
  - Line 50: `readonly agentKey: AgentKey` stays same type
  - Line 63 (start): Parameter stays. Callers now pass `AgentKey.Strategist` etc.
  - Line 82 (reconstitute): Parameter stays. Repository passes `AgentKey.from(row.agent_key)`.
- **Dependencies**: Step 6.1
- **Risk**: Low

**Step 6.3 — Update `ConversationRepository`** (File: `packages/infra-db/src/repositories/conversation-repository.ts`)

- **Changes**:
  - Line 3: Update import to use class
  - Line 28, 82: `row.agent_key as AgentKey` → `AgentKey.from(row.agent_key)` (replaces 2 `as` casts)
  - Line 112: `agent_key: conversation.agentKey` → `agent_key: conversation.agentKey.value`
- **Dependencies**: Step 6.1
- **Risk**: Low

**Step 6.4 — Update exports** (File: `packages/domain/src/agent-chat/index.ts`)

- Line 3: Change `export type { AgentKey }` → `export { AgentKey, InvalidAgentKeyError }` and add `export type { AgentKeyValue }`
- **Dependencies**: Step 6.1
- **Risk**: Low

**Testing**: Unit test `AgentKey.from()` with all 7 valid values and one invalid.

---

### Phase 9c — Remaining VOs + Artifact Lifecycle (P2, ~3h)

#### GAP V5 — `ConversationStatus` type alias → class (25 min)

**Step 7.1 — Create class** (File: `packages/domain/src/agent-chat/value-objects/ConversationStatus.ts`)

- Current: `export type ConversationStatus = 'active' | 'archived';`
- New: Class with `Active` and `Archived` static instances. Add `isActive()` convenience method.
- Error: `InvalidConversationStatusError extends DomainError` (code `VALIDATION_ERROR`)
- **Dependencies**: None
- **Risk**: Low

**Step 7.2 — Update `Conversation`** (File: `packages/domain/src/agent-chat/entities/Conversation.ts`)

- Line 3: Import class
- Line 42: `private _status: ConversationStatus` stays (now class)
- Line 72 (start): `'active'` → `ConversationStatus.Active`
- Line 85 (reconstitute): Parameter stays. Repository passes `ConversationStatus.from(row.status)`.
- Line 103: `if (this._status !== 'active')` → `if (!this._status.equals(ConversationStatus.Active))`
- Line 125, 155: `'archived'` → `ConversationStatus.Archived`, `'active'` → `ConversationStatus.Active`
- **Dependencies**: Step 7.1
- **Risk**: Low

**Step 7.3 — Update `ConversationRepository`** (File: `packages/infra-db/src/repositories/conversation-repository.ts`)

- Line 31, 85: `row.status as ConversationStatus` → `ConversationStatus.from(row.status)`
- Line 114, 119: `status: conversation.status` → `status: conversation.status.value`
- **Dependencies**: Step 7.1
- **Risk**: Low

**Step 7.4 — Update exports** (File: `packages/domain/src/agent-chat/index.ts`)

- Line 5: Change `export type` → `export { ConversationStatus, InvalidConversationStatusError }` + value type
- **Dependencies**: Step 7.1

**Testing**: Unit test `from()` with valid/invalid. Verify `Conversation.archive()` uses class.

---

#### GAP V6 — `MessageRole` type alias → class (25 min)

**Step 8.1 — Create class** (File: `packages/domain/src/agent-chat/value-objects/MessageRole.ts`)

- Current: `export type MessageRole = 'user' | 'agent' | 'system';`
- New: Class with `User`, `Agent`, `System` static instances.
- Error: `InvalidMessageRoleError extends DomainError` (code `VALIDATION_ERROR`)
- **Dependencies**: None
- **Risk**: Low

**Step 8.2 — Update `Message`** (File: `packages/domain/src/agent-chat/entities/Message.ts`)

- Line 2: Import class
- Line 8: `readonly role: MessageRole` stays (now class)
- Lines 19, 36, 48: `'user'` → `MessageRole.User`, `'agent'` → `MessageRole.Agent`, `'system'` → `MessageRole.System`
- Line 59 (reconstitute): Parameter stays. Repository passes `MessageRole.from(m.role)`.
- **Dependencies**: Step 8.1
- **Risk**: Low

**Step 8.3 — Update `Conversation`** (File: `packages/domain/src/agent-chat/entities/Conversation.ts`)

- Line 110: `message.role === 'user'` → `message.role.equals(MessageRole.User)`
- **Dependencies**: Steps 8.1, 7.2
- **Risk**: Low

**Step 8.4 — Update `ConversationRepository`** (File: `packages/infra-db/src/repositories/conversation-repository.ts`)

- Lines 37, 91: `m.role as MessageRole` → `MessageRole.from(m.role)`
- Line 132: `role: message.role` → `role: message.role.value`
- **Dependencies**: Step 8.1
- **Risk**: Low

**Step 8.5 — Update exports** (File: `packages/domain/src/agent-chat/index.ts`)

- Line 4: Change `export type` → class export
- **Dependencies**: Step 8.1

**Testing**: Unit test `from()` valid/invalid. Verify `Message.user()`, `Message.agent()`, `Message.system()` use class.

---

#### GAP V7 — `MembershipStatus` type alias → class (25 min)

**Step 9.1 — Create class** (File: `packages/domain/src/workspace/value-objects/MembershipStatus.ts`)

- Current: `export type MembershipStatus = 'invited' | 'active';`
- New: Class with `Invited` and `Active` static instances. Add `isActive()` convenience.
- Error: `InvalidMembershipStatusError extends DomainError` (code `VALIDATION_ERROR`)
- **Dependencies**: None
- **Risk**: Low

**Step 9.2 — Update `WorkspaceMembership`** (File: `packages/domain/src/workspace/entities/WorkspaceMembership.ts`)

- Line 2: Import class
- Line 9: `private _status: MembershipStatus` stays (now class)
- Line 28: `'invited'` → `MembershipStatus.Invited`
- Line 37 (reconstitute): Parameter stays. Repository passes `MembershipStatus.from(m.status)`.
- Line 48: `if (this._status !== 'invited')` → `if (!this._status.equals(MembershipStatus.Invited))`
- Line 55: `'active'` → `MembershipStatus.Active`
- Line 86: `this._status === 'active'` → `this._status.equals(MembershipStatus.Active)`
- **Dependencies**: Step 9.1
- **Risk**: Low

**Step 9.3 — Update `Workspace`** (File: `packages/domain/src/workspace/entities/Workspace.ts`)

- Line 37: `'active'` → `MembershipStatus.Active`
- Line 74: `m.status === 'invited'` → `m.status.equals(MembershipStatus.Invited)`
- **Dependencies**: Steps 9.1, 9.2, 3.2 (MembershipRole class must also be done)
- **Risk**: Low

**Step 9.4 — Update `WorkspaceRepository`** (File: `packages/infra-db/src/repositories/workspace-repository.ts`)

- Lines 35, 169: `m.status as MembershipStatus` → `MembershipStatus.from(m.status)`
- Lines 87, 95, 147, 152: `status: m.status` → `status: m.status.value`
- Line 49: `where('workspace_memberships.status', '=', 'active')` → `where('workspace_memberships.status', '=', MembershipStatus.Active.value)`
- Line 181: Same pattern for `'invited'`
- **Dependencies**: Step 9.1
- **Risk**: Low

**Step 9.5 — Update exports** (File: `packages/domain/src/workspace/index.ts`)

- Line 4: Change `export type` → class export
- **Dependencies**: Step 9.1

**Testing**: Unit test `from()` valid/invalid. Verify repository `findPendingInvitations()` uses `MembershipStatus.Invited.value`.

---

#### GAP V8 — `ArtifactStatus` type alias → class (20 min)

**Step 10.1 — Create class** (File: `packages/domain/src/generation/value-objects/ArtifactStatus.ts`)

- Current: `export type ArtifactStatus = 'pending' | 'generating' | 'completed' | 'failed';`
- New: Class with `Pending`, `Generating`, `Completed`, `Failed` static instances. Add `isTerminal()` (completed or failed).
- Error: `InvalidArtifactStatusError extends DomainError` (code `VALIDATION_ERROR`)
- **Dependencies**: None
- **Risk**: Low

**Step 10.2 — Update `Artifact`** (File: `packages/domain/src/generation/entities/Artifact.ts`)

- Line 2: Import class
- Line 5: `private _status: ArtifactStatus` stays (now class)
- Line 12, 38 (constructor/reconstitute): Parameter stays.
- Line 28 (create): `'completed'` → `ArtifactStatus.Completed` (this will later change to `Pending` in V11)
- **Dependencies**: Step 10.1
- **Risk**: Low — `create()` hardcodes `Completed`, but this is the current behavior. V11 will adjust.

**Step 10.3 — Update exports** (File: `packages/domain/src/generation/index.ts`)

- Line 12: Change `export type { ArtifactStatus }` → `export { ArtifactStatus, InvalidArtifactStatusError }` + value type
- **Dependencies**: Step 10.1

**Testing**: Unit test `from()` valid/invalid, `isTerminal()` for each status.

---

#### GAP V11 — Artifact lifecycle methods (30 min)

**Goal**: Add `startGeneration()`, `complete()`, `fail()` methods with status guards so callers can't set arbitrary status values.

---

**Step 11.1 — Create lifecycle types** (File: NEW `packages/domain/src/generation/value-objects/artifact-lifecycle.ts`)

- **Action**: Create a small file to avoid circular dependencies:
  ```typescript
  export const VALID_ARTIFACT_TRANSITIONS: Record<string, string[]> = {
    'pending': ['generating'],
    'generating': ['completed', 'failed'],
    'completed': [],
    'failed': [],
  };

  export function canTransitionArtifact(from: string, to: string): boolean {
    return (VALID_ARTIFACT_TRANSITIONS[from] ?? []).includes(to);
  }
  ```
- **Dependencies**: None
- **Risk**: Low

**Step 11.2 — Add lifecycle methods to `Artifact`** (File: `packages/domain/src/generation/entities/Artifact.ts`)

- **Changes**:
  - Import `ArtifactStatus` class and `canTransitionArtifact` from the lifecycle file
  - Import `DomainError` for new error classes
  - Add after the `create()` method:
    ```typescript
    startGeneration(): void {
      if (!this._status.equals(ArtifactStatus.Pending)) {
        throw new CannotStartArtifactError(this.artifactId, this._status.toString());
      }
      this._status = ArtifactStatus.Generating;
    }

    complete(): void {
      if (!this._status.equals(ArtifactStatus.Generating)) {
        throw new CannotCompleteArtifactError(this.artifactId, this._status.toString());
      }
      this._status = ArtifactStatus.Completed;
    }

    fail(): void {
      if (!this._status.equals(ArtifactStatus.Generating)) {
        throw new CannotFailArtifactError(this.artifactId, this._status.toString());
      }
      this._status = ArtifactStatus.Failed;
    }
    ```
  - Update `create()` to start as `Pending` instead of `Completed`:
    ```typescript
    // Line 28: OLD: 'completed', → NEW: ArtifactStatus.Pending,
    ```
  - Add error classes at bottom of file:
    ```typescript
    export class CannotStartArtifactError extends DomainError {
      readonly code = 'INVALID_STATE'; readonly retryable = false;
      constructor(artifactId: string, currentStatus: string) {
        super(`Cannot start artifact ${artifactId} in status ${currentStatus}`);
      }
    }
    export class CannotCompleteArtifactError extends DomainError { ... }
    export class CannotFailArtifactError extends DomainError { ... }
    ```
- **Dependencies**: Step 10.1 (ArtifactStatus class), Step 11.1 (lifecycle)
- **Risk**: Medium — `create()` change from `Completed` to `Pending` is a behavioral change. Any code that creates artifacts and immediately reads them as "completed" will break. **Mitigation**: Audit all callers of `Artifact.create()`.

**Step 11.3 — Audit callers of `Artifact.create()`**

- `apps/backend/src/generation/worker/session-worker.ts` line 121: `ArtifactEntity.create(sessionId, stepIndex + 1, result.content)` — Creates artifact after LLM step completes. Currently expects `'completed'`. After V11, must call `artifact.complete()` or update `create()` to accept an optional status.
- **Decision**: Keep `create()` starting as `Pending` and update the worker to call `artifact.complete()` after persisting. Or add an optional parameter to `create()`: `static create(sessionId, stepNumber, content, status = ArtifactStatus.Pending)`. **Recommendation**: Add the optional parameter for backward compatibility, then update the worker in a separate step.
- **Dependencies**: Step 11.2
- **Risk**: High — changing default status breaks production. Mitigation: use the optional parameter approach.

**Step 11.4 — Update `SessionWorker`** (File: `apps/backend/src/generation/worker/session-worker.ts`)

- Line 121: Change `ArtifactEntity.create(sessionId, stepIndex + 1, result.content)` to pass `ArtifactStatus.Completed` as the 4th parameter (since the worker creates artifacts after successful LLM generation, they are completed at creation time).
- **Dependencies**: Step 11.3
- **Risk**: Low

**Step 11.5 — Update exports** (File: `packages/domain/src/generation/index.ts`)

- Line 3: Change `export { Artifact }` → `export { Artifact, CannotStartArtifactError, CannotCompleteArtifactError, CannotFailArtifactError }`
- **Dependencies**: Step 11.2

**Testing**: Unit test lifecycle transitions. Verify `startGeneration()` throws if not pending. Verify `complete()` throws if not generating.

---

### Phase 9d — Structural Quick Wins (P1, ~5h)

#### GAP S4 — Session temporal invariants (30 min)

**Goal**: `CONFIGURE` should NOT set `_startedAt`. `WORKER_PICKUP` should.

**Context**: Line 131 of `Session.ts` currently sets `_startedAt = new Date()` on `CONFIGURE`. This means the session "starts" before a worker picks it up. The correct semantics: a session starts when a worker actually begins processing it.

---

**Step 12.1 — Fix `apply()` temporal logic** (File: `packages/domain/src/generation/entities/Session.ts`)

- **Changes**:
  - Line 130–132: Remove `this._startedAt = new Date()` from `CONFIGURE` case:
    ```typescript
    // OLD (lines 130-132):
    case 'CONFIGURE':
      this._startedAt = new Date();
      return null;
    // NEW:
    case 'CONFIGURE':
      return null;
    ```
  - Line 137–138: Add `this._startedAt = new Date()` to `WORKER_PICKUP` case:
    ```typescript
    // OLD (lines 137-138):
    case 'WORKER_PICKUP':
      return null;
    // NEW:
    case 'WORKER_PICKUP':
      this._startedAt = new Date();
      return null;
    ```
- **Dependencies**: None (pure logic change, no type changes)
- **Risk**: Medium — downstream consumers that read `startedAt` after `CONFIGURE` will now see `null` instead of a timestamp. Check:
  - SSE progress events (referenced in the target doc)
  - Any dashboard/UI showing "session duration"
  - The worker (it reads `session.startedAt` — now will be set correctly after WORKER_PICKUP)

**Step 12.2 — Audit `startedAt` consumers** (Repository and worker)

- `session-repository.ts` line 105, 115: `started_at: session.startedAt` — writes whatever the entity has. After S4, will write `null` until WORKER_PICKUP. This is correct.
- `session-worker.ts`: The worker itself sends `WORKER_PICKUP` (line 151) and `CONFIGURE` (line 149). The order is: CONFIGURE → QUEUE → WORKER_PICKUP. After the fix, `startedAt` will be set on WORKER_PICKUP. This is correct.
- **Dependencies**: Step 12.1
- **Risk**: Low

**Testing**:
- Unit test: `session.apply({ type: 'CONFIGURE' })` → `startedAt` is `null`
- Unit test: `session.apply({ type: 'WORKER_PICKUP' })` → `startedAt` is a `Date`

---

#### GAP S5 — Tool stub content (4h)

**Goal**: Author real `ToolDefinition` objects for all 11 tool keys. Currently all tools point to `blogPostTool` stub — every tool behaves identically.

**This requires domain expertise**. The tool definitions encode:
- What user inputs each tool needs (text fields, file uploads, asset references)
- What steps each tool executes (LLM prompt templates, model tiers, timeouts)
- What components each tool uses by default (system rules, format constraints)
- Credit costs

The plan below provides a **process** rather than hardcoded content, since the actual step definitions require product knowledge.

---

**Step 13.1 — Audit existing step templates** (Investigation, 30 min)

- **Action**: Check which prompt templates exist in the database/template system. Query: which `{toolKey}/{stepLabel}` combinations have templates? Only tools with existing prompt templates can have real step definitions.
- **Output**: A matrix of `ToolKey × step labels` showing which have templates ready.
- **Dependencies**: None
- **Risk**: Low — discovery only

**Step 13.2 — Define tool input schemas** (File: `packages/domain/src/generation/tools/index.ts`, 1h)

- **Action**: For each tool key, define the `acquisition` block:
  - `userText`: What text inputs does the user provide? (topic, keywords, language, target audience, etc.)
  - `files`: What file uploads are accepted? (briefs, existing content, brand docs)
  - `assets`: What workspace assets does the tool reference? (brand-voice, buyer-persona, marketing-angle)
- **Tool-by-tool guidance**:
  - `landing-funnel`: topic, industry, target audience, campaign goal
  - `landing-page`: page type, product description, CTA text, target persona
  - `video-script-long-form`: video topic, platform (YouTube), duration target, key messages
  - `video-description`: video title, content summary, target keywords, platform
  - `blog-post`: topic, language, keywords, target persona (already has partial definition)
  - `ad-copy`: platform (Google/Meta/LinkedIn), product, audience, budget tier
  - `brief`: campaign type, goals, budget, timeline, deliverables
  - `brand-voice`: brand name, industry, existing copy samples, tone preferences
  - `buyer-persona`: target role, industry, pain points, goals, demographics
  - `marketing-angle`: product, market, competitor analysis, differentiation
  - `ai-overview-analysis`: AI tool/product name, category, target users, competitors
- **Dependencies**: Step 13.1 (template audit)
- **Risk**: Medium — input schemas must match what the frontend acquisition form can render

**Step 13.3 — Define tool steps** (File: `packages/domain/src/generation/tools/index.ts`, 1h 30m)

- **Action**: For each tool, define `steps[]` with prompt templates, model tiers, and timeouts.
- **Pattern**: Each tool follows a 2–3 step pipeline:
  1. **Structure/Research step** (balanced model, 60s timeout) — defines structure, SEO keywords, outline
  2. **Draft step** (premium model, 120s timeout) — generates the main content
  3. **Polish step** (balanced model, 60s timeout) — optional, for refinement/formatting
- **Tool-specific steps**:
  - `blog-post`: SEO Structure → Outline → Article (already defined)
  - `landing-funnel`: Audience Analysis → Page Sequence → Copy Drafting
  - `landing-page`: Structure → Hero + Sections → CTA Optimization
  - `video-script-long-form`: Hook/Intro → Main Content → Call to Action
  - `video-description`: Keyword Research → Description Draft → Tags/Hashtags
  - `ad-copy`: Platform Strategy → Ad Variants → A/B Copy Generation
  - `brief`: Requirement Analysis → Brief Draft → Deliverable Checklist
  - `brand-voice`: Tone Analysis → Voice Guidelines → Style Examples
  - `buyer-persona`: Research Synthesis → Persona Profile → Messaging Guide
  - `marketing-angle`: Market Analysis → Angle Development → Validation Points
  - `ai-overview-analysis`: Feature Mapping → Competitive Analysis → Strategic Summary
- **Each step needs**:
  ```typescript
  {
    order: N,
    label: 'Step Name',
    enrichment: 'serial' as const,
    prompt: { templateId: 'tool-key/step-slug', version: '1.0.0', model: 'balanced' },
    execution: { timeoutMs: 60000, maxRetries: 2 },
  }
  ```
- **Dependencies**: Step 13.1 (template audit) — template IDs must match existing templates
- **Risk**: High — steps reference `templateId` values that must exist in the template system. If templates don't exist, the worker falls back to generic prompts (line 96–103 of session-worker.ts). Mitigation: document which templates are missing and flag them for separate authoring.

**Step 13.4 — Assign credit costs** (File: `packages/domain/src/generation/tools/index.ts`, 15 min)

- **Action**: Set `creditCost` per tool based on step count and model tier:
  - 1-step tools (brief, brand-voice, buyer-persona, marketing-angle): 1 credit
  - 2-step tools (landing-page, video-description, ad-copy, ai-overview-analysis): 2 credits
  - 3-step tools (landing-funnel, video-script-long-form, blog-post): 3 credits
- **Dependencies**: Step 13.3
- **Risk**: Low

**Step 13.5 — Set default components per tool** (File: `packages/domain/src/generation/tools/index.ts`, 15 min)

- **Action**: Each tool's `defaultComponents` array specifies prompt components applied to all steps:
  ```typescript
  defaultComponents: ['anti-hallucination/v1', 'output-markdown/v1', 'seo-optimized/v1']
  ```
  Vary by tool type:
  - Content generation: `['anti-hallucination/v1', 'output-markdown/v1', 'seo-optimized/v1']`
  - Analysis: `['anti-hallucination/v1', 'output-markdown/v1']`
  - Brand/internal: `['output-markdown/v1', 'brand-consistency/v1']`
- **Dependencies**: Step 13.3
- **Risk**: Low

**Step 13.6 — Verify worker compatibility** (File: `apps/backend/src/generation/worker/session-worker.ts`, 30 min)

- **Action**: Test that the worker correctly iterates over `tool.steps` for each tool. The worker (line 65) does `tool.steps[stepIndex]`. Verify step indexing is consistent across all tool definitions (no gaps in `order` numbers).
- **Dependencies**: Step 13.3
- **Risk**: Medium — index out of bounds if step arrays have different lengths than expected

**Testing**: Integration test: run each tool through the worker (with mock LLM) and verify correct step iteration, artifact creation, and completion.

---

### Phase 10+ — Structural RFC (Deferred)

The following gaps require design decisions documented in RFCs before implementation:

#### S1 — Session `_artifacts` array (RFC, then implement)

**Design question**: Should `Session` own its `Artifact` collection (1:N owned entities) or should artifacts remain separately queried? Adding `_artifacts` to Session means `findById()` loads all artifacts — potential N+1 or memory cost. But it enables `finalArtifact` getter and `COMPLETE` guard (reject completion if no artifacts).

**RFC needed for**:
- Aggregate boundary decision: Session owns artifacts vs artifacts are separate
- Loading strategy: eager vs lazy
- Performance impact analysis (sessions with 10+ artifacts)
- `COMPLETE` guard semantics

---

#### S2 — Domain event payload data (RFC, then implement)

**Design question**: Should domain events carry typed payloads (e.g., `SessionCompleted` with `{ toolKey, workspaceId, artifactId, content }`) or stay minimal (`{ eventType, occurredAt, aggregateId }`)?

**RFC needed for**:
- Event schema across all aggregate types
- Consumer contract for `AssetPromotion` and `UsageQuota` listeners
- Backward compatibility (existing event subscribers)
- Event size/persistence considerations

---

#### S3 — Workspace asset domain logic (RFC, then implement)

**Design question**: Migration 003 defines `workspace_assets` table but no domain code represents assets. Should Assets be owned entities of Workspace (1:N) or a separate aggregate? How do asset types (brand-voice, persona) integrate with `AssetPromotion` domain events?

**RFC needed for**:
- Aggregate boundary: Workspace owns assets vs separate Asset aggregate
- `addAsset()`, asset uniqueness, source traceability
- Cross-context integration with `AssetPromotion`
- Compatibility with S2 (domain event payloads needed for asset promotion events)

---

## Testing Strategy

### Per-Gap Unit Tests
- Each VO class: test `from()` with valid and invalid values
- Each VO class: test `equals()` with same and different instances
- Each VO class with terminal states: test `isTerminal()`
- Each new `DomainError`: test `code` and `retryable` properties
- Artifact lifecycle: test valid transitions, invalid transitions throw

### Integration Tests
- `Session.apply()` with `SessionEvent` discriminated union: all 7 event types
- Repository `findById()` → returns entities with correct VO class instances
- Repository `save()` → writes VO `.value` correctly
- Worker: CONFIGURE → QUEUE → WORKER_PICKUP → ADD_ARTIFACT → COMPLETE pipeline

### Regression Suite
- All existing tests must pass after each phase
- Smoke test: create session, run through worker, verify status transitions, verify artifact creation

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Circular dependency** (SessionStatus ↔ SessionLifecycle) | High | Keep transition logic exclusively in SessionLifecycle. SessionStatus class has `isTerminal()` and `equals()` only. |
| **Artifact.create() default status change** breaks worker | High | Add optional 4th parameter to `create()` for backward compatibility. Worker explicitly passes `Completed`. |
| **Tool definitions reference non-existent templates** | High | Audit template system first (Step 13.1). Document missing templates as separate work items. Worker has fallback (generic prompts) so tools won't break. |
| **Type-alias → class breaks DB type inference** | Medium | DB column types remain strings. VOs convert at repository boundary via `from()`/`.value`. Kysely queries don't reference domain VO types directly. |
| **`CONFIGURE` no longer sets `_startedAt`** | Medium | Audit all `startedAt` consumers (SSE, UI). Worker sends WORKER_PICKUP immediately after CONFIGURE, so the gap is milliseconds. |
| **ErrorMapper.map** doesn't recognize new error codes | Low | All new errors use existing codes (`VALIDATION_ERROR`, `INVALID_STATE`, `CONFLICT`) already handled in the switch. |

## Success Criteria

- [ ] Zero `throw new Error(...)` in `packages/domain/src/` (except in `DomainError` constructors themselves)
- [ ] All 11 `DomainError` subclass violations replaced (7 files)
- [ ] `PromptComponentNotFoundError` extends `DomainError`
- [ ] All 8 type-alias VOs converted to classes with `private constructor`, `static readonly` instances, `static from()`, `equals()`, `toString()`
- [ ] Zero `as ToolKey`, `as AgentKey`, `as SessionStatus`, `as MembershipRole`, `as MembershipStatus`, `as ConversationStatus`, `as MessageRole` casts in repository files
- [ ] `Session.apply()` uses `SessionEvent` discriminated union (no `[key: string]: unknown`)
- [ ] `CONFIGURE` does NOT set `_startedAt`
- [ ] `WORKER_PICKUP` sets `_startedAt`
- [ ] `Artifact` has `startGeneration()`, `complete()`, `fail()` lifecycle methods
- [ ] All 11 tool keys have distinct `ToolDefinition` objects (not all pointing to `blogPostTool`)
- [ ] All existing tests pass
- [ ] No circular imports introduced
- [ ] RFC documents created for S1, S2, S3 (deferred to Phase 10+)

## Summary

| Phase | Gaps | Files Changed | Effort | Gate Criteria |
|-------|------|:---:|:---:|---|
| 9a | V10, V1 | 10 | 1h 40m | Zero `throw new Error`; `SessionStatus` class; `SessionLifecycle` uses class |
| 9b | V2, V9, V3, V4 | 12 | 3h 45m | `MembershipRole`/`ToolKey`/`AgentKey` classes; `SessionEvent` discriminated union |
| 9c | V5-V8, V11 | 9 | 2h 20m | Remaining VO classes; `Artifact` lifecycle methods |
| 9d | S4, S5 | 3 | 4h 30m | Temporal invariants fixed; 11 distinct tool definitions |
| **Total** | **11 gaps** | **24+** | **~12h 15m** | |

## Sources

- [[phase-9-architectural-targets]]
