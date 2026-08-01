---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
  - wiki/observability
date_updated: 2026-08-01
source_count: 5
confidence: high
---

# API SLO Catalog

> Endpoint-class SLO baseline for Flow App APIs.

## Objective

Define explicit SLI/SLO targets by API class so reliability decisions are measurable and aligned across backend, queue, and frontend expectations.

## SLI Definitions

- **Availability SLI**: successful responses / total requests (excluding client-cancelled requests).
- **Latency SLI**: server response time percentile at p95 and p99.
- **Error-rate SLI**: `5xx / total` by endpoint class.

## SLO Baseline by Endpoint Class

| Endpoint class | Examples | Availability (30d) | Latency target | Error-rate target |
|----------------|----------|--------------------|----------------|-------------------|
| Health (light) | `GET /health` | >= 99.95% | p95 <= 20ms, p99 <= 50ms | <= 0.1% |
| Auth | `/auth/login`, `/auth/session` | >= 99.9% | p95 <= 250ms, p99 <= 500ms | <= 0.5% |
| Read APIs | workspace/session/artifact reads | >= 99.9% | p95 <= 300ms, p99 <= 800ms | <= 0.5% |
| Write APIs (non-generation) | workspace/asset mutations | >= 99.9% | p95 <= 500ms, p99 <= 1000ms | <= 1.0% |
| Session start | `POST /api/tools/:toolKey/sessions` | >= 99.9% | p95 <= 500ms, p99 <= 1200ms | <= 1.0% |
| SSE stream setup | `GET /api/sessions/:id/events` handshake | >= 99.9% | first-event <= 2s (p95) | <= 1.0% setup failures |
| Admin APIs | `/admin/*` | >= 99.5% | p95 <= 800ms, p99 <= 1500ms | <= 1.5% |

## Queue-Coupled Objective

Session generation is async; API-level SLOs must be read together with queue SLOs in [[Job Queue - Monitoring and Stability]].

Operational coupling:

- Session start API can be healthy while completion SLO is degraded.
- A queue alert (`wait p95`, completion p95, stalled ratio) must trigger application-level incident status.

## Alert Thresholds

| Signal | Warning | Critical |
|--------|---------|----------|
| API availability | below target for 15m | below target for 30m |
| API p95 latency | +25% over target for 15m | +50% over target for 30m |
| 5xx rate | > 1.5x target for 10m | > 2x target for 20m |
| SSE first-event | p95 > 2s for 15m | p95 > 4s for 20m |

## Measurement and Reporting

- Source of truth: structured logs + metrics aggregation.
- Report cadence: daily operational summary, weekly trend review.
- Incident annotation required for each SLO breach window.

## Review and Versioning

- SLOs reviewed monthly.
- Any SLO target change requires rationale and date.
- Changes must be reflected in API docs and operations dashboards.

## Sources

- [[synthesis/project-model-multi-dimension-audit-2026-08-01]]
- [[sources/PRD]]
- [[API Routes]]
- [[Job Queue - Monitoring and Stability]]
- [[Health Check - Deep]]
