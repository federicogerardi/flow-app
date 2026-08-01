---
type: source-summary
tags:
  - wiki/source
  - wiki/generation
  - wiki/requirements
date_updated: 2026-07-30
source: "doodle/USER-STORIES.md (raw)"
---

# USER-STORIES — User Stories

> Source: `doodle/USER-STORIES.md` (removed — content now lives in this wiki)

## Summary

74 user stories across 14 epics. Format: "As `<persona>`, I want `<action>` so that `<benefit>`". Personas: CM (Content Marketer), SA (SEO Analyst), AD (Admin).

## Epic Breakdown

| # | Epic | Stories | Status |
|---|------|---------|--------|
| 1 | Onboarding & Auth | 7 | ✅ All done |
| 2 | Workspace | 6 | ✅ All done |
| 3 | Asset Management | 8 | ✅ All done |
| 4 | Tool: Content Generation (Funnel, Nextland, YouTube) | 10 | ✅ All done |
| 5 | Tool: Angle Generator | 4 | ✅ All done |
| 6 | Tool: YouTube Description | 4 | ✅ All done |
| 7 | Tool: Blog Article Generator | 4 | ✅ All done |
| 8 | Tool: Geometric (SERP Analysis) | 10 | 8 ✅, 2 📝 |
| 9 | Tool: Meta Ads | 3 | ✅ All done |
| 10 | Generation Flow & Performance | 9 | 5 ✅, 4 📝 |
| 11 | Platform Administration | 9 | ✅ All done |
| 12 | Quality & Feedback | 8 | 6 ✅, 1 🔄, 1 💡 |
| 13 | Security & Compliance | 6 | ✅ All done |
| 14 | Observability & Monitoring | 4 | 3 ✅, 1 🔄 |

## Status Summary

| Status | Count |
|--------|-------|
| ✅ Done | 61 |
| 🔄 In Progress | 2 |
| 📝 Planned | 8 |
| 💡 Idea | 3 |

## Priority Summary

| Priority | Count |
|----------|-------|
| P0 (must-have) | 47 |
| P1 (should-have) | 19 |
| P2 (could-have) | 8 |

## Key Stories by Theme

**BE-Driven workflow**: Submit and receive immediate confirmation, real-time SSE progress, reconnect on disconnect, browser-close resilience (US-GF01 to US-GF04).

**Idempotency**: Two identical requests must not produce duplicate content or double-consume credits (US-GF04).

**Resume/Regenerate**: Resume interrupted workflow from last checkpoint, regenerate specific steps (US-T06, US-T07).

**Asset injection**: Assets auto-injected into prompts, blocked if required asset missing with clear message (US-AS05, US-AS06).

**Promote-to-Asset**: One-click promotion of generation output to reusable asset (US-AS07).

**Admin visibility**: Model CRUD, API service config, job monitoring, cost tracking (US-AD01 to US-AD09).

**Proposed/Planned**: Global model assignment per step (US-GF05), ~~multi-variant fan-out (US-GF06), HITL approve-and-continue (US-GF07), preference learning (US-GF08), side-by-side comparison (US-GF09)~~ [deprecated in current model baseline, 2026-08-01], crawling cost optimization (US-GE09), historical SERP comparison (US-GE10).

## Entities Mentioned

- Workspace, Asset, Tool, Session, Artifact, LlmModel, ApiService, Job
- Knowledge Panel, Readiness Snapshot, Session Summary

## Concepts Mentioned

- Idempotency, SSE streaming, Browser-close resilience, Asset auto-injection
- Promote-to-Asset, Two-level credits, Global Deterministic Model Matrix
- Explicit error states, Accessibility (keyboard + screen reader)
