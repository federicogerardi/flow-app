---
type: entity
tags:
  - wiki/entity
  - wiki/generation
date_updated: 2026-08-18
source_count: 5
---

# Artifact

> Entity — owned by [[Session]] aggregate in [[Content Generation]] context
>
> **⚠️ Implementation status (2026-08-02):** The lifecycle methods (`startGeneration`, `complete`, `fail`) shown below are aspirational — the current Artifact entity has no transition guards. `static create()` hardcodes status `'completed'` and accepts `string`/`number` instead of branded VOs. `ArtifactId`, `StepNumber`, `ArtifactContent` VOs exist as classes but are not used in the current `create()` signature.

## Definition

An `Artifact` is the persistent output of a single step within a [[Session]]. It records the result of one LLM elaboration — its content is immutable once produced. Artifacts are session-scoped: they live and die with their Session.

## Role — Determined by Position

There is no explicit `ArtifactRole` field. Finality is **positional**: the last artifact added to a Session is the final deliverable.

| Position | Visibility | Purpose | Promotable |
|----------|-----------|---------|------------|
| Steps 1..N-1 | Hidden from user | Context enrichment for next step | No |
| Step N (last) | Visible, downloadable | Final deliverable | Yes (→ [[Asset]]) |

The [[Session]] exposes `Session.finalArtifact` as a getter over `artifacts[artifacts.length - 1]`. No artifact carries a role flag — the Session knows which is final by count.

## Lifecycle

```
pending → generating → completed
                ↓
              failed
```

## Constraints

| Constraint | Value | Reason |
|------------|-------|--------|
| Max content size | 500 KB | LLM output limit — prevents unbounded TEXT storage |
| Preview length | 150 chars | `SessionListItemDTO.lastArtifactPreview` (list endpoint slices to 150; domain `preview()` default is 500) |
| Download format | `.md`, `.txt`, `.docx`, `.pdf` | Full content via `GET /api/artifacts/:id/download` |

## Value Objects

| VO | Code type | Description |
|----|-----------|-------------|
| `ArtifactId` | `string` | Unique identifier (class exists but not used as constructor param) |
| `StepNumber` | `number` | Position in the tool's step sequence |
| `ArtifactContent` | `string` | The generated output |
| `ArtifactStatus` | `type` alias: `'pending' \| 'generating' \| 'completed' \| 'failed'` | Lifecycle state |

## Factory Method

```typescript
// Actual code signature
static create(sessionId: string, stepNumber: number, content: string): Artifact {
  return new Artifact(randomUUID(), sessionId, stepNumber, content, 'completed', new Date());
}
```

> **Note**: `artifactId` in the API response is the `id` field — serialized as `artifactId` for legacy compatibility with frontend code.

## Status Transitions

> **Type-design audit (2026-07-31)**: Added explicit transition methods. The entity now self-guards its lifecycle — any caller (not just the application layer) is prevented from making illegal transitions.

```typescript
// packages/domain/src/generation/entities/Artifact.ts

class Artifact {
  private _status: ArtifactStatus;

  /** Call when the LLM generation for this step begins */
  startGeneration(): void {
    if (this._status !== ArtifactStatus.Pending) {
      throw new InvalidSessionStateError(
        `Cannot start generation: artifact is ${this._status}, expected pending`
      );
    }
    this._status = ArtifactStatus.Generating;
  }

  /** Call when the LLM generation completes successfully */
  complete(): void {
    if (this._status !== ArtifactStatus.Generating) {
      throw new InvalidSessionStateError(
        `Cannot complete: artifact is ${this._status}, expected generating`
      );
    }
    this._status = ArtifactStatus.Completed;
  }

  /** Call when the LLM generation fails */
  fail(): void {
    if (this._status !== ArtifactStatus.Generating) {
      throw new InvalidSessionStateError(
        `Cannot fail: artifact is ${this._status}, expected generating`
      );
    }
    this._status = ArtifactStatus.Failed;
  }

  get status(): ArtifactStatus { return this._status; }
}
```

The valid transitions are:
```
pending → generating → completed
                   → failed
```

No other transitions are allowed: `pending` cannot go directly to `completed`, `failed` is terminal.

## ArtifactContent Value Object

`ArtifactContent` is an immutable value object that wraps the raw textual content produced by a step. It has no identity of its own — it exists only as a property of [[Artifact]].

```typescript
// packages/domain/src/generation/value-objects/ArtifactContent.ts

class ArtifactContent {
  static readonly MAX_SIZE_BYTES = 500_000; // 500KB

  private constructor(readonly value: string) {}

  static from(raw: string): ArtifactContent {
    if (raw.length > ArtifactContent.MAX_SIZE_BYTES) {
      throw new ValidationError(
        `Artifact content exceeds ${ArtifactContent.MAX_SIZE_BYTES / 1000}KB limit`,
      );
    }
    return new ArtifactContent(raw);
  }

  preview(maxChars: number = 500): string {
    return this.value.slice(0, maxChars);
  }
}
```

> **Type-design audit (2026-07-31)**: Previously the 500KB limit was "enforced at application layer before persistence." This was a domain invariant leak — the VO itself must reject oversized content so that any consumer (test, CLI, worker) is protected, not just the HTTP application layer.

Constraints:
- Max **500KB** (≈125,000 words) — enforced at domain level in the VO constructor
- Immutable — any modification produces a new `ArtifactContent`
- The preview (first 500 characters) is derived: `ArtifactContent.preview()`
- Persisted in `artifacts.content` (TEXT) and `session_snapshots.snapshot` (JSONB)

## Key Distinction

**Artifact ≠ Asset**:
- Artifact = _what was produced_ in a session (temporary, session-scoped)
- [[Asset]] = _what is saved_ in a workspace (persistent, reusable cross-tool)

Only the final Artifact (last step) is promotable via [[Asset Promotion]].

## Sources

- [[sources/STARTUP]] — Original Artifact vs Asset definitions
- [[sources/APP-CONCEPT]] — Tool catalog
- [[sources/PRD]] — FR-W01, FR-A04
- [[sources/USER-STORIES]] — US-AS07
- [[Database Schema]] — Table `artifacts.content` and 500KB limit