---
type: concept
tags:
  - wiki/concept
  - wiki/domain-value-object
date_updated: 2026-07-31
source_count: 3
confidence: high
---

# ArtifactContent

> Value Object — the textual content of an [[Artifact]]

## Definition

`ArtifactContent` is an immutable value object that wraps the raw textual content produced by an [[Session Machine (XState v5)|Elaboration Step]]. It has no identity of its own — it exists only as a property of [[Artifact]].

## Constraints

- Max **500KB** (≈125,000 words) — **enforced at domain level** in the VO constructor via `ArtifactContent.from()`. Any attempt to create content exceeding the limit throws `ValidationError`.
- Immutable — any modification produces a new `ArtifactContent`
- The preview (first 500 characters) is derived: `ArtifactContent.preview()`

## Structure

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

## Where It Lives

| Table | Column | Type |
|---------|---------|------|
| `artifacts` | `content` | `TEXT` |
| `session_snapshots` | `snapshot` | `JSONB` (as part of the context) |

## Sources

- [[Artifact]] — Entity that owns this Value Object
- [[Database Schema]] — Table `artifacts.content`
- [[Health Check - Deep#deep-health-check]] — 500KB limit
