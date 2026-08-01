---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
date_updated: 2026-08-01
source_count: 3
confidence: high
---

# API Documentation — OpenAPI

> Auto-generated OpenAPI spec from Zod schemas  
> `apps/backend/src/openapi.ts`

## Principle

Express routes are already validated with Zod. We use `zod-to-openapi` to automatically generate an OpenAPI 3.1 schema without duplicating definitions. Swagger UI serves the interactive documentation.

## Dependencies

```json
{
  "devDependencies": {
    "@asteasolutions/zod-to-openapi": "^7.3",
    "swagger-ui-express": "^5.0",
    "@types/swagger-ui-express": "^4.1"
  }
}
```

Note: `zod-to-openapi` is not directly on Context7, but it's the de facto standard for Zod → OpenAPI. Alternative: `zod-openapi`. Both are valid.

## Setup

```typescript
// apps/backend/src/openapi.ts

import { OpenAPIRegistry, OpenAPIGenerator } from '@asteasolutions/zod-to-openapi';
import swaggerUi from 'swagger-ui-express';
import { z } from 'zod';

const registry = new OpenAPIRegistry();

// Security scheme
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// ──── Schema registrations ────

// Session DTO (mirrors @flow-app/contracts)
const SessionSchema = registry.register(
  'Session',
  z.object({
    id: z.string().uuid(),
    toolKey: z.string(),
    workspaceId: z.string().uuid(),
    status: z.enum(['queued', 'draft', 'ready', 'running', 'completed', 'failed', 'cancelled']),
    stepCount: z.number().int(),
    createdAt: z.string().datetime(),
  })
);

const StartSessionResponseSchema = registry.register(
  'StartSessionResponse',
  z.object({
    session: SessionSchema,
    replayed: z.boolean(),
  })
);

// ──── Route registrations ────

registry.registerPath({
  method: 'post',
  path: '/api/tools/{toolKey}/sessions',
  description: 'Start a new generation session',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ toolKey: z.string() }),
    body: {
      content: { 'application/json': {
        schema: z.object({
          workspaceId: z.string().uuid(),
          inputs: z.object({
            text: z.record(z.string()).optional(),
            files: z.array(z.object({
              key: z.string(),
              filename: z.string(),
              content: z.string(),
            })).optional(),
          }),
        }),
      }},
    },
  },
  responses: {
    200: { description: 'Idempotent replay', content: { 'application/json': { schema: StartSessionResponseSchema } } },
    201: { description: 'Session created', content: { 'application/json': { schema: StartSessionResponseSchema } } },
    422: { description: 'Readiness check failed' },
    429: { description: 'Quota exceeded' },
  },
});

// ──── Generate spec ────

const generator = new OpenAPIGenerator(registry.definitions, '3.1.0');
const spec = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'Flow App API',
    version: '1.0.0',
    description: 'AI-powered content generation platform for B2B marketing teams.',
  },
  servers: [{ url: process.env.API_URL ?? 'http://localhost:3000' }],
});

// ──── Serve ────

router.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
router.get('/api/openapi.json', (_req, res) => res.json(spec));
```

## Access

- Swagger UI: `GET /api/docs` (development only, disabled in production)
- Raw spec: `GET /api/openapi.json`
- Production: serve static `openapi.json` from CI build

## Incremental Adoption

There's no need to register all 45 routes at once. Register routes as they are implemented. The schema grows with the project.

## Governance Requirements

- Every route must define a stable `operationId`.
- Every authenticated route must include `security` metadata.
- Every write route (`POST`, `PUT`, `DELETE`) must document error codes and retry semantics.
- `POST /api/tools/{toolKey}/sessions` must document `Idempotency-Key` header and dual response (`201` created, `200` replay).
- All responses must include shared error schema `{ error: { code, message, details?, retryable } }` for non-2xx outcomes.

### Deprecation Metadata Requirements (Phase 3)

For deprecated operations, OpenAPI entries must include:

- `deprecated: true`
- `description` with migration endpoint
- response headers schema for `Deprecation`, `Sunset`, and `Link`

Example:

```yaml
paths:
  /api/v1/legacy-endpoint:
    get:
      deprecated: true
      description: "Use /api/v2/new-endpoint"
      responses:
        '200':
          description: OK
          headers:
            Deprecation:
              schema: { type: string, example: "true" }
            Sunset:
              schema: { type: string, example: "Wed, 31 Dec 2026 23:59:59 GMT" }
            Link:
              schema: { type: string, example: "</api/v2/new-endpoint>; rel=\"successor-version\"" }
```

## Contract Validation in CI

Generate and validate `openapi.json` on every pull request:

```yaml
# .github/workflows/contracts.yml
jobs:
  api-contract:
    steps:
      - run: npm ci
      - run: npm run openapi:generate --workspace=apps/backend
      - run: npm run openapi:lint --workspace=apps/backend
      - run: npm run openapi:diff --workspace=apps/backend
```

Fail the pipeline on undocumented breaking changes (removed paths, narrowed schemas, removed enum values) unless the version is intentionally bumped to `v2`.

## Sources

- [[API Routes]] — endpoint definitions
- [[Contracts Package]] — DTO schemas
- [[API Contract Baseline v1]] — canonical wire contract
