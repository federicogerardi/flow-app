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

- Max **500KB** (≈125,000 words) — enforced at application layer before persistence; see [[Database Schema#artifacts|artifacts table]]
- Immutable — any modification produces a new `ArtifactContent`
- The preview (first 500 characters) is derived: `ArtifactContent.preview()`

## Where It Lives

| Table | Column | Type |
|---------|---------|------|
| `artifacts` | `content` | `TEXT` |
| `session_snapshots` | `snapshot` | `JSONB` (as part of the context) |

## Sources

- [[Artifact]] — Entity that owns this Value Object
- [[Database Schema]] — Table `artifacts.content`
- [[Health Check - Deep#7]] — 500KB limit