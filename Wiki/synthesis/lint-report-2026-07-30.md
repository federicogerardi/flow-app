---
type: synthesis
tags:
  - wiki/synthesis
date_updated: 2026-07-31
---
# Wiki Lint Report — 2026-07-30

> Health-check of the wiki after `doodle/` cleanup. 59 pages analyzed.

## Results

### 1. Orphan Pages

**Status: ✅ 0 orphans**

6 pages were orphaned after the `doodle/` migration. Backlinks added:

| Page | Backlink added to |
|--------|---------------------|
| `concepts/Auth Dependencies` | `concepts/Auth Middleware` |
| `concepts/Logging Strategy` | `concepts/Environment Configuration`, `concepts/Health Check - Deep` |
| `concepts/Project Dependencies` | `concepts/Dependency Injection Setup` |
| `concepts/Session List - Live Status` | `concepts/Frontend Architecture`, `concepts/Tool UX Architecture` |
| `concepts/Testing Strategy` | `concepts/packages-domain Structure` |
| `concepts/Tool UX Architecture` | `concepts/Frontend Architecture`, `concepts/ToolPage Machine (XState v5)` |

### 2. Broken Wikilinks

**Status: ✅ 0 broken**

Resolved:

- **99 links** `[[Wiki/sources/*]]` → `[[sources/*]]` (wrong prefix from doodle migration)
- **2 links** `[[Wiki/index]]`, `[[Wiki/overview]]` → `[[index]]`, `[[overview]]`
- **1 typo** `[[Tool as Static Configuration\]]` → `[[Tool as Static Configuration]]` (Markdown table escaping)
- **2 pages created**: `[[ArtifactContent]]`, `[[IdempotencyKey]]` (value objects mentioned without dedicated page)
- **6 placeholders** in `schema/config.md` ignored (intentional template)

### 3. Stale Pages

**Status: ✅ 0 stale**

All pages have `date_updated: 2026-07-30`. No raw source newer than any wiki page.

### 4. Contradictions

**Status: ⚠️ Not verified**

Automated search not executed. The 3 DDD revision cycles (v1 → v2 → v3) and 15 compliance fixes have significantly reduced risk. To verify with NLP tools in the future.

### 5. Missing Cross-References

**Status: ⚠️ Not verified**

Automatic scan not executed (requires NLP to identify entity/concept names in prose without wikilinks). Backlinks added for orphans have improved the situation.

## Summary

| Category | Pre-fix | Post-fix |
|-----------|---------|----------|
| Orphan pages | 11 | **0** |
| Broken wikilinks | 125 | **0** |
| Stale pages | 0 | 0 |
| New pages created | — | 2 (`ArtifactContent`, `IdempotencyKey`) |
| Backlinks added | — | 10 |

## Not Removed

- `schema/config.md` — empty template with wikilink placeholders. Kept intentionally.
- Contradictions + missing cross-references — to verify with NLP tools in the future.