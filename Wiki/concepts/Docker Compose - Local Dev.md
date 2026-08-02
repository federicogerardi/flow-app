---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
date_updated: 2026-07-30
source_count: 2
confidence: high
---

# Docker Compose — Local Dev

> One-command local development environment  
> `docker-compose.yml` (project root)

## Services

```yaml
# docker-compose.yml

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: flow_app
      POSTGRES_USER: flow_app
      POSTGRES_PASSWORD: flow_app
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U flow_app']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
```

## Usage

```bash
# Start infrastructure
docker compose up -d

# Verify
docker compose ps

# Stop
docker compose down          # keep data
docker compose down -v       # destroy data

# Start app
cp apps/backend/.env.example apps/backend/.env
npm install
npm run dev                  # starts backend (port 3000) + frontend (port 5173)
```

## Environment

```bash
# apps/backend/.env (local dev)
DATABASE_URL=<DATABASE_URL>
REDIS_URL=<REDIS_URL>
# ... other vars from .env.example
```

## Sources

- [[Environment Configuration]] — env vars
- [[Database Schema]] — PostgreSQL setup