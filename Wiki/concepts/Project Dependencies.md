---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
date_updated: 2026-07-30
source_count: 4
confidence: high
---

# Project Dependencies

> Complete dependency map for the Flow App monorepo  
> npm workspaces: `apps/backend`, `apps/frontend`, `packages/*`

---

## Monorepo Workspaces

```json
// package.json (root)
{
  "workspaces": [
    "apps/backend",
    "apps/frontend",
    "packages/domain",
    "packages/contracts",
    "packages/infra-db",
    "packages/copy"
  ]
}
```

---

## `apps/backend`

### Runtime

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.21 | HTTP server, routing, middleware |
| `xstate` | ^5.20 | State machines — session workflow orchestration |
| `bullmq` | ^5.41 | Job queue on Redis — session worker |
| `ioredis` | ^5.4 | Redis client — queue, idempotency, pub/sub, rate limiting |
| `kysely` | ^0.27 | Type-safe SQL query builder |
| `pg` | ^8.13 | PostgreSQL driver |
| `openai` | ^4.73 | OpenRouter API client (OpenAI-compatible) — LLM gateway |
| `jsonwebtoken` | ^9.0 | JWT sign/verify — access tokens |
| `passport` | ^0.7 | Authentication middleware framework |
| `passport-local` | ^1.0 | Email/password strategy |
| `passport-google-oauth2` | ^2.0 | Google OAuth 2.0 strategy |
| `passport-oauth2` | ^1.8 | GitHub OAuth 2.0 strategy |
| `bcrypt` | ^5.1 | Password hashing (12 salt rounds) |
| `helmet` | ^8.0 | HTTP security headers (11 headers) |
| `express-rate-limit` | ^7.5 | Rate limiting middleware |
| `pino` | ^9.5 | Structured JSON logging |
| `pino-http` | ^10.3 | Express HTTP request logging |
| `pino-pretty` | ^11.3 | Dev-friendly log formatting |
| `csrf` | ^3.1 | CSRF token generation and verification |
| `zod` | ^3.23 | Request/response validation schemas |
| `cookie-parser` | ^1.4 | Cookie parsing — refresh tokens, CSRF secret |
| `cors` | ^2.8 | CORS middleware |
| `dotenv` | ^16.4 | Environment variable loading |

### Dev

| Package | Purpose |
|---------|---------|
| `typescript` | ^5.6 |
| `@types/express` | Express types |
| `@types/jsonwebtoken` | JWT types |
| `@types/cookie-parser` | Cookie parser types |
| `@types/cors` | CORS types |
| `@types/passport` | Passport types |
| `@types/passport-local` | Passport-local types |
| `@types/bcrypt` | bcrypt types |
| `tsx` | TypeScript execution (dev server) |
| `supertest` | ^7.0 | HTTP integration tests |
| `@types/supertest` | ^6.0 | Supertest types |

**Note**: `vitest` and `@vitest/coverage-v8` are root devDependencies — available to all workspaces.

### Internal

| Package | Purpose |
|---------|---------|
| `@flow-app/domain` | Entities, VOs, domain services, events, repository interfaces, tool configs |
| `@flow-app/infra-db` | Kysely DB type, migrations, repository implementations |
| `@flow-app/contracts` | DTOs, request/response shapes, SSE types (with domain) |
| `@flow-app/copy` | Centralized user-facing text (error messages, notifications) |

---

## `apps/frontend`

### Runtime

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.0 | UI library |
| `react-dom` | ^19.0 | DOM rendering |
| `xstate` | ^5.20 | State machines — ToolPage, UI workflows |
| `@xstate/react` | ^5.0 | React hooks: useMachine, useSelector |
| `@mui/material` | ^6.4 | Material UI component library |
| `@emotion/react` | ^11.13 | CSS-in-JS (MUI dependency) |
| `@emotion/styled` | ^11.13 | Styled components (MUI dependency) |
| `swr` | ^2.3 | Data fetching with cache — workspaces, sessions list |

### Dev

| Package | Purpose |
|---------|---------|
| `typescript` | ^5.6 |
| `vite` | ^6.0 | Build tool + dev server |
| `@vitejs/plugin-react` | Vite React plugin |
| `@testing-library/react` | ^16.2 | Component testing |
| `@testing-library/user-event` | ^14.6 | User interaction simulation |
| `@testing-library/jest-dom` | ^6.6 | DOM assertions |
| `msw` | ^2.7 | API mocking (network level)

### Internal

| Package | Purpose |
|---------|---------|
| `@flow-app/contracts` | DTOs, SSE event types, shared enums |
| `@flow-app/copy` | Centralized UI copy — labels, CTAs, error messages |

**Note**: `apps/frontend` does not import `@flow-app/domain` directly — it uses `@flow-app/contracts` which exports the necessary types. Only `ToolDefinition` and `ReadinessPolicy` pass through contracts.

---

## `packages/domain`

| Package | Type | Purpose |
|---------|------|---------|
| `typescript` | dev | Compilazione |

Zero runtime dependencies. Framework-agnostic pure TypeScript.

---

## `packages/contracts`

| Package | Type | Purpose |
|---------|------|---------|
| `@flow-app/domain` | internal | Importa Entity/VO types per creare DTOs |
| `typescript` | dev | Compilazione |

---

## `packages/infra-db`

| Package | Type | Purpose |
|---------|------|---------|
| `kysely` | runtime | Query builder |
| `pg` | runtime | PostgreSQL driver |
| `@flow-app/domain` | internal | Repository interfaces + entity types |
| `typescript` | dev | Compilazione |

---

## `packages/copy`

| Package | Type | Purpose |
|---------|------|---------|
| `@flow-app/domain` | internal | AssetType, ToolKey enums |
| `typescript` | dev | Compilazione |

---

## Dependency Graph

```
                    ┌──────────────────┐
                    │  packages/domain  │  ← zero runtime deps
                    └────────┬─────────┘
                             │ imports
            ┌────────────────┼────────────────┐
            ▼                ▼                 ▼
  ┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
  │packages/contracts│ │packages/infra│ │packages/copy │
  │  (DTOs, types)   │ │     -db      │ │  (UI text)   │
  └────────┬────────┘ └──────┬───────┘ └──────┬───────┘
           │                 │                 │
           ▼                 ▼                 ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │apps/frontend │  │apps/backend  │  │apps/backend  │
  │              │  │              │  │  (errors)    │
  └──────────────┘  └──────────────┘  └──────────────┘
           │                 │
     contracts          domain
     copy             contracts
                      infra-db
                      copy
```

| Consumer | Diretto | Via contracts |
|----------|---------|---------------|
| `apps/backend` | `@flow-app/domain`, `@flow-app/infra-db`, `@flow-app/copy` | `@flow-app/contracts` |
| `apps/frontend` | — | `@flow-app/contracts`, `@flow-app/copy` |

---

## Installation

```bash
# Root
npm install

# This installs all workspaces — dependencies are hoisted to root node_modules
# Each package declares its own deps in its package.json
```

## Version Policy

- Runtime packages: pinned minor (`^5.20`), dependabot updates monthly
- Dev packages: pinned minor, updated on need
- Internal packages: `"@flow-app/domain": "*"` (workspace protocol — always latest)

## Sources

- [[sources/APP-CONCEPT]] — Tech stack definition
- [[sources/PRD]] — Stack constraints
- [[packages-domain Structure]] — Internal package dependencies
- [[Centralized Copy Modules]] — packages/copy