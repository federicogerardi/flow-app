---
type: entity
tags:
  - wiki/entity
  - wiki/generation
date_updated: 2026-07-30
source_count: 4
---

# Artifact

> Entity — owned by [[Session]] aggregate in [[Content Generation]] context

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
| Preview length | 500 chars | `SessionListItemDTO.lastArtifactPreview` |
| Download format | `.md`, `.txt`, `.docx`, `.pdf` | Full content via `GET /api/artifacts/:id/download` |

## Value Objects

| VO | Type | Description |
|----|------|-------------|
| `ArtifactId` | Identifier | Unique within Session |
| `StepNumber` | int ≥ 1 | Position in the tool's step sequence |
| `ArtifactContent` | Immutable string | The generated output |
| `ArtifactStatus` | Enum | `pending` \| `generating` \| `completed` \| `failed` |

## Factory Method

```typescript
// Domain: no role argument — role is positional
static create(stepNumber: StepNumber, content: ArtifactContent): Artifact
```

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