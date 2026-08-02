---
type: concept
tags:
  - wiki/concept
  - wiki/deployment
  - wiki/infrastructure
date_updated: 2026-08-02
source_count: 3
confidence: high
---

# Railway Deployment Config

Production deployment configuration for the Flow App on Railway, defining service topology, environment parity, and health monitoring.

## Design

- `backend` service — Express API on port 3000 with `/health` endpoint
- `worker` service — BullMQ worker process, same Docker image, different start command
- PostgreSQL + Redis via Railway managed services
- Environment-specific configs: dev, staging, production
- Secrets via Railway variable references (never in repo)

## Referenced By

- [[implementation-roadmap-2026-08-01]] — Phase 9 scope

## Sources

- [[Docker Compose - Local Dev]]
- [[Environment Configuration]]
- [[implementation-roadmap-2026-08-01]]
