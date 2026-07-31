---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
date_updated: 2026-07-30
source_count: 0
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
    status: z.enum(['queued', 'ready', 'running', 'completed', 'failed', 'cancelled']),
    stepCount: z.number().int(),
    createdAt: z.string().datetime(),
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
    201: { description: 'Session created', content: { 'application/json': { schema: SessionSchema } } },
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

## Sources

- [[API Routes]] — endpoint definitions
- [[Contracts Package]] — DTO schemas