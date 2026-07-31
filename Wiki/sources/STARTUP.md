---
type: source-summary
tags:
  - wiki/source
  - wiki/generation
  - wiki/domain-model
date_updated: 2026-07-30
source: "doodle/STARTUP.md (raw)"
---

# STARTUP — Bootstrap Decisions

> Source: `doodle/STARTUP.md` (removed — content now lives in this wiki)

## Summary

Bootstrap document for Flow app development. Captures preliminary decisions, domain definitions, and initial API design.

## Core Definitions

### Workspace
"A named workspace owned by a User that groups related Artifacts." Canonical DDD entity — a container grouping related artifacts, owned by a user.

### Artifact vs Asset

| Concept | Definition |
|---------|-----------|
| **Artifact** | Persistent output of a generation attempt, session-scoped. Has a lifecycle (generating → completed → failed) and a role (intermediate step or final). The record of what was produced. |
| **Asset** | Persistent workspace resource, reusable cross-tool. Born from: promotion of a completed Artifact (`source = 'generated'`), file upload (`'uploaded'`), or manual creation (`'manual'`). Has an independent lifecycle from the session. |

**Core distinction**: Artifact = what you produced in a session. Asset = workspace property, persistent and reusable as input for subsequent tools.

## Backend API Design

### Health
`GET/HEAD /health`

### Auth
`POST /auth/login`, `POST /auth/logout`, `GET /auth/session`, Google OAuth flow.

### Generation
`POST /generation/stream` (SSE), `POST /generation/run` (non-streaming JSON).

### Public APIs
- **Workspaces**: CRUD at `/api/workspaces`
- **Artifacts**: List, detail, download at `/api/artifacts/:artifactId/download`
- **Admin**: CRUD for users, models, API services, sessions

## Domain Rules

1. **Ordered Step Chain**: Each Tool executes a deterministic sequence of WorkflowSteps
2. **Step Categories**: Extraction (data from documents), Acquisition/Crawling (external data), Scoring (evaluation), Generation (text synthesis)
3. **Progressive Context Enrichment**: Output of one step becomes context input for the next
4. **Readiness Policy**: Tool start is gated by verification of required inputs; optional inputs are non-blocking
5. **Artifact & Session Lifecycle**: Each step produces an Artifact (intermediate role = support, final role = deliverable). Work is grouped into Sessions for traceability, idempotency, and resume capability.

## Entities Mentioned

- Workspace, Artifact, Asset, Tool, WorkflowStep, Session

## Concepts Mentioned

- Ordered Step Chain, Progressive Context Enrichment, Readiness Policy
- Artifact Lifecycle, Session grouping, Idempotency, Resume from checkpoint
- Step Categories (extraction, acquisition/crawling, scoring, generation)