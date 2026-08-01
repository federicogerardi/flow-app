---
type: concept
tags:
  - wiki/concept
  - wiki/frontend
  - wiki/observability
date_updated: 2026-08-01
source_count: 7
confidence: high
---

# Frontend Error Observability

> Standard for capturing, grouping, and triaging browser-side failures in production and staging.

## Objective

Close the frontend telemetry gap by defining a deterministic client-side error pipeline with release-aware traces, source maps, and triage ownership.

## Error Sources to Capture

- Uncaught JavaScript exceptions (`window.onerror`).
- Unhandled promise rejections (`window.onunhandledrejection`).
- React render and lifecycle failures (Error Boundary).
- API client failures above warning threshold (4xx/5xx trend, network errors, timeouts).
- SSE stream instability (reconnect exhaustion, malformed events).

## Baseline Integration

Recommended baseline uses Sentry Browser + React SDK:

- Initialize once at app bootstrap with environment, release, and commit SHA.
- Upload source maps per release in CI.
- Tag events with `workspaceId`, `userId` (hashed or internal ID), `toolKey`, and `sessionId` when available.
- Redact sensitive fields from request payloads before sending telemetry.

## Event Contract

Minimum event payload fields:

| Field | Description |
|------|-------------|
| `eventType` | `js_exception`, `unhandled_rejection`, `api_error`, `sse_error`, `ui_boundary_error` |
| `severity` | `warning`, `error`, `fatal` |
| `release` | App version or git SHA |
| `environment` | `development`, `staging`, `production` |
| `route` | Current frontend route |
| `correlationId` | `X-Request-Id` when linked to backend request |
| `fingerprint` | Stable grouping key for deduplication |

## Privacy and Redaction Rules

- Never send raw tokens, cookies, API keys, or free-text user input unless explicitly allowlisted.
- Strip or hash email-like identifiers when not required for debugging.
- Keep attachments disabled by default for production.
- Match frontend redaction policy with backend logging policy in [[Logging Strategy]].

## CI and Release Requirements

- Block production release if source map upload fails.
- Block production release if telemetry DSN or project key is missing.
- Include release annotation for deployment start/end and rollback markers.
- Validate error pipeline in staging with synthetic test errors before promotion.

## Alerting and Triage

- Alert trigger: new issue frequency spike over baseline for 15 minutes.
- Alert trigger: fatal JS error rate > 1.0% of frontend sessions for 15 minutes.
- Assign ownership by route/domain area; unresolved P1 frontend errors block promotion.
- Weekly triage: top 10 recurring issues, aging, and fix ETA.

### Numeric Release Thresholds

- Warning: fatal JS error rate >= 0.5% for 15 minutes.
- Critical: fatal JS error rate >= 1.0% for 15 minutes.
- Release block: any active critical frontend telemetry alert at promotion time.

## Success Criteria

- >= 95% of production frontend crashes include stack trace + release tag.
- Source-map deobfuscation success rate >= 99% for production events.
- Mean time to acknowledge critical frontend incidents <= 15 minutes.

## Sources

- [[Frontend Architecture]]
- [[API Client + SSE Client]]
- [[Logging Strategy]]
- [[CI-CD Promotion Policy]]
- [[API SLO Catalog]]
- [[Secure SDLC Controls]]
- [[Quality Gate Matrix]]
