---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
  - wiki/backend
date_updated: 2026-08-01
source_count: 4
confidence: high
---

# API Routes

> HTTP API for Flow App — `apps/backend/src/routes/`  
> Exposes [[Application Services]] to the frontend via REST + SSE

## Conventions

- Base path: `/api/` for resources, `/auth/` for authentication, `/admin/` for admin
- All IDs: UUID strings
- Auth required unless marked 🔓
- Request body: `application/json` unless file upload
- Response: `application/json`
- Errors: `{ error: { code: string, message: string, details?: unknown, retryable: boolean } }`
- SSE: `text/event-stream` with `event:` and `data:` fields
- Pagination: `?limit=20&offset=0` returning `{ data: T[], total: number }`

Canonical contract freeze for v1 is defined in [[API Contract Baseline v1]].

## API Contract Governance

- **Versioning**: current contract is `v1` (implicit in `/api`). Breaking changes require `/api/v2` endpoints and a deprecation window for `v1`.
- **Correlation ID**: clients may send `X-Request-Id`; if missing, server generates one and echoes it in response headers.
- **Idempotency**: `POST /api/tools/:toolKey/sessions` accepts `Idempotency-Key` and returns `201` for new sessions or `200` for replay of an existing session.
- **Rate limiting**: responses include `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`; exceed => `429 RATE_LIMITED`.
- **Deprecation**: deprecated endpoints return `Deprecation: true` and `Sunset: <RFC-1123 date>` headers before removal.
- **Session status enum**: `queued | draft | ready | running | completed | failed | cancelled`.

### Deprecation Timeline Policy (Phase 3)

| Phase | Minimum Window | Required Action |
|------|----------------|-----------------|
| Announce | T-90 days | Update changelog + OpenAPI description with migration path |
| Warn | T-60 days | Return `Deprecation` + `Sunset` + `Link: rel="deprecation"` headers |
| Enforce | T-30 days | Increase warning severity in logs and dashboard |
| Remove | T+0 | Remove endpoint only in next major API version (`/api/v2`) |

Compatibility rule: no breaking response-schema change inside the same API major version.

---

## Route Index

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | 🔓 | Health check |
| `POST` | `/auth/register` | 🔓 | Register |
| `POST` | `/auth/login` | 🔓 | Login email/password |
| `POST` | `/auth/logout` | ✅ | Logout |
| `GET` | `/auth/session` | ✅ | Current session |
| `GET` | `/auth/:provider/start` | 🔓 | OAuth start |
| `GET` | `/auth/:provider/callback` | 🔓 | OAuth callback |
| `GET` | `/api/workspaces` | ✅ | List workspaces |
| `POST` | `/api/workspaces` | ✅ | Create workspace |
| `GET` | `/api/workspaces/:id` | ✅ | Get workspace |
| `PUT` | `/api/workspaces/:id` | ✅ | Update workspace |
| `DELETE` | `/api/workspaces/:id` | ✅ | Delete workspace |
| `GET` | `/api/workspaces/:id/assets` | ✅ | List assets |
| `POST` | `/api/workspaces/:id/assets` | ✅ | Create asset (upload) |
| `GET` | `/api/workspaces/:wid/assets/:aid` | ✅ | Get asset |
| `PUT` | `/api/workspaces/:wid/assets/:aid` | ✅ | Update asset |
| `DELETE` | `/api/workspaces/:wid/assets/:aid` | ✅ | Delete asset |
| `POST` | `/api/tools/:toolKey/sessions` | ✅ | Start generation |
| `GET` | `/api/sessions` | ✅ | List sessions |
| `GET` | `/api/sessions/:id` | ✅ | Get session |
| `GET` | `/api/sessions/:id/events` | ✅ | SSE progress stream |
| `POST` | `/api/sessions/:id/cancel` | ✅ | Cancel session |
| `GET` | `/api/artifacts/:id` | ✅ | Get artifact |
| `GET` | `/api/artifacts/:id/download` | ✅ | Download artifact |
| `GET` | `/admin/users` | 🔒 admin | List users |
| `POST` | `/admin/users` | 🔒 admin | Create user |
| `PUT` | `/admin/users/:id` | 🔒 admin | Update user |
| `GET` | `/admin/models` | 🔒 admin | List LLM models |
| `POST` | `/admin/models` | 🔒 admin | Create model |
| `PUT` | `/admin/models/:id` | 🔒 admin | Update model |
| `DELETE` | `/admin/models/:id` | 🔒 admin | Delete model |
| `GET` | `/admin/api-services` | 🔒 admin | List API services |
| `POST` | `/admin/api-services` | 🔒 admin | Create API service |
| `PUT` | `/admin/api-services/:id` | 🔒 admin | Update API service |
| `DELETE` | `/admin/api-services/:id` | 🔒 admin | Delete API service |
| `GET` | `/admin/jobs` | 🔒 admin | List ToolWorkflowJobs |

🔓 = public, ✅ = authenticated, 🔒 = admin only

---

## Health

### `GET /health`

**Response** `200`:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 12345
}
```

---

## Authentication

### `POST /auth/register`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "min-8-chars"
}
```

**Response** `201`:
```json
{
  "user": { "id": "uuid", "email": "user@example.com", "role": "member" },
  "accessToken": "jwt...",
  "refreshToken": "refresh..."
}
```

**Errors**: `409` email already exists, `422` invalid password

### `POST /auth/login`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "..."
}
```

**Response** `200`: same shape as register

**Errors**: `401` invalid credentials, `403` user disabled

### `GET /auth/session`

**Response** `200`:
```json
{
  "user": { "id": "uuid", "email": "user@example.com", "role": "member" },
  "expiresAt": "2026-08-01T00:00:00Z"
}
```

**Errors**: `401` no valid session

### `POST /auth/logout`

**Response** `204` No Content

### `GET /auth/google/start`

**Response** `302` redirect to Google OAuth

### `GET /auth/google/callback`

**Response** `302` redirect to frontend with `accessToken` in query

---

## Workspaces

### `GET /api/workspaces`

**Response** `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Q3 Campaign",
      "assetCount": 3,
      "createdAt": "2026-07-01T00:00:00Z"
    }
  ],
  "total": 5
}
```

### `POST /api/workspaces`

**Request**:
```json
{
  "name": "Q3 Campaign"
}
```

**Response** `201`:
```json
{
  "id": "uuid",
  "name": "Q3 Campaign",
  "createdAt": "2026-07-30T00:00:00Z"
}
```

### `GET /api/workspaces/:id`

**Response** `200`:
```json
{
  "id": "uuid",
  "name": "Q3 Campaign",
  "assets": [
    {
      "id": "uuid",
      "assetType": "brand-voice",
      "source": "generated",
      "createdAt": "2026-07-15T00:00:00Z"
    }
  ],
  "recentSessions": [
    {
      "id": "uuid",
      "toolKey": "blog-post",
      "status": "completed",
      "createdAt": "2026-07-29T00:00:00Z"
    }
  ],
  "createdAt": "2026-07-01T00:00:00Z"
}
```

### `PUT /api/workspaces/:id`

**Request**: `{ "name": "Q4 Campaign" }`  
**Response** `200`: updated workspace

### `DELETE /api/workspaces/:id`

**Response** `204` No Content (cascades to assets)

---

## Assets

### `GET /api/workspaces/:id/assets`

**Response** `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "assetType": "brand-voice",
      "source": "generated",
      "sourceRef": "artifact-uuid",
      "createdAt": "2026-07-15T00:00:00Z",
      "updatedAt": "2026-07-20T00:00:00Z"
    }
  ],
  "total": 1
}
```

### `POST /api/workspaces/:id/assets`

Creates an asset from file upload or manual text.

**Request** (`multipart/form-data`):
```
assetType: "brief"
source: "uploaded"
file: <binary>
```

Or (`application/json`):
```json
{
  "assetType": "brief",
  "source": "manual",
  "content": "# Brief\n\n..."
}
```

**Response** `201`:
```json
{
  "id": "uuid",
  "assetType": "brief",
  "source": "manual",
  "createdAt": "2026-07-30T00:00:00Z"
}
```

**Errors**: `409` asset type already exists in workspace, `422` invalid type

### `GET /api/workspaces/:wid/assets/:aid`

**Response** `200`:
```json
{
  "id": "uuid",
  "assetType": "brand-voice",
  "source": "generated",
  "sourceRef": "artifact-uuid",
  "content": "# Brand Voice\n\n...",
  "createdAt": "2026-07-15T00:00:00Z",
  "updatedAt": "2026-07-20T00:00:00Z"
}
```

### `PUT /api/workspaces/:wid/assets/:aid`

**Request**: `{ "content": "updated content" }`  
**Response** `200`: updated asset

### `DELETE /api/workspaces/:wid/assets/:aid`

**Response** `204` No Content

---

## Generation — Core Flow

### `POST /api/tools/:toolKey/sessions`

Starts a new generation session. Invokes [[Application Services|StartSessionUseCase]].

**Request**:
```json
{
  "workspaceId": "uuid",
  "inputs": {
    "text": {
      "keyword": "b2b saas marketing",
      "language": "it"
    },
    "files": [
      {
        "key": "briefing",
        "filename": "briefing.md",
        "content": "<base64 or multipart>"
      }
    ],
    "selectedAssets": ["asset-uuid-1"]
  }
}
```

**Response** `201`:
```json
{
  "session": {
    "id": "uuid",
    "toolKey": "blog-post",
    "workspaceId": "uuid",
    "status": "ready",
    "stepCount": 3,
    "createdAt": "2026-07-30T00:00:00Z"
  }
}
```

**Errors**:
- `404` tool not found
- `422` readiness check failed → `{ error: { code: "READINESS_FAILED", message: "...", details: { missing: [...] } } }`
- `200` idempotent replay → existing session returned (same shape as `201`)
- `429` quota exceeded

### `GET /api/sessions`

**Query**: `?workspaceId=uuid&toolKey=blog-post&status=completed&limit=20&offset=0`

**Response** `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "toolKey": "blog-post",
      "workspaceId": "uuid",
      "status": "completed",
      "stepCount": 3,
      "createdAt": "2026-07-29T00:00:00Z"
    }
  ],
  "total": 12
}
```

### `GET /api/sessions/:id`

**Response** `200`:
```json
{
  "id": "uuid",
  "toolKey": "blog-post",
  "workspaceId": "uuid",
  "status": "completed",
  "currentStepIndex": 3,
  "startedAt": "2026-07-29T10:00:00Z",
  "completedAt": "2026-07-29T10:03:00Z",
  "artifacts": [
    {
      "id": "uuid",
      "stepNumber": 1,
      "status": "completed",
      "createdAt": "2026-07-29T10:00:30Z"
    },
    {
      "id": "uuid",
      "stepNumber": 2,
      "status": "completed",
      "createdAt": "2026-07-29T10:01:30Z"
    },
    {
      "id": "uuid",
      "stepNumber": 3,
      "status": "completed",
      "createdAt": "2026-07-29T10:03:00Z"
    }
  ]
}
```

### `GET /api/sessions/:id/events`

SSE stream for real-time progress. Connection stays open until session completes or fails.

**Response** `200` (`text/event-stream`):

```
event: session_started
data: {"sessionId":"uuid","status":"running","startedAt":"..."}

event: step_completed
data: {"sessionId":"uuid","stepNumber":1,"stepLabel":"Briefing Analysis","progress":{"current":1,"total":3}}

event: step_completed
data: {"sessionId":"uuid","stepNumber":2,"stepLabel":"Outline","progress":{"current":2,"total":3}}

event: session_completed
data: {"sessionId":"uuid","status":"completed","finalArtifactId":"uuid","completedAt":"..."}
```

**Error case**:
```
event: session_failed
data: {"sessionId":"uuid","status":"failed","failedAtStep":2,"error":{"code":"LLM_TIMEOUT","message":"..."}}
```

### `POST /api/sessions/:id/cancel`

**Response** `200`:
```json
{
  "id": "uuid",
  "status": "cancelled",
  "cancelledAtStep": 1
}
```

---

## Artifacts

### `GET /api/artifacts/:id`

**Response** `200`:
```json
{
  "id": "uuid",
  "sessionId": "uuid",
  "stepNumber": 3,
  "content": "# Generated content...",
  "status": "completed",
  "createdAt": "2026-07-29T10:03:00Z"
}
```

### `GET /api/artifacts/:id/download`

**Query**: `?format=docx` (options: `md`, `txt`, `docx`, `pdf`)

**Response** `200`: binary file download with `Content-Disposition: attachment`

**Errors**: `404` artifact not found, `400` unsupported format

---

## Admin

### `GET /admin/users`

**Response** `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "member",
      "status": "active",
      "createdAt": "2026-07-01T00:00:00Z"
    }
  ],
  "total": 5
}
```

### `POST /admin/users`

**Request**: `{ "email": "...", "role": "member" }`  
**Response** `201`: created user

### `PUT /admin/users/:id`

**Request**: `{ "role": "admin" }` or `{ "status": "disabled" }`  
**Response** `200`: updated user

### `GET /admin/models`

**Response** `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "label": "GPT-4o",
      "provider": "openai",
      "modelId": "gpt-4o",
      "tier": "premium",
      "enabled": true,
      "sortOrder": 1
    }
  ],
  "total": 4
}
```

### `POST /admin/models`

**Request**: `{ "label": "...", "provider": "openai", "modelId": "gpt-4o", "tier": "premium" }`  
**Response** `201`: created model

### `GET /admin/api-services`

**Response** `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "label": "SerpAPI",
      "endpoint": "https://serpapi.com/search",
      "enabled": true
    }
  ],
  "total": 1
}
```

### `POST /admin/api-services`

**Request**: `{ "label": "...", "endpoint": "...", "authHeaderName": "X-API-Key", "authHeaderValue": "..." }`  
**Response** `201`: created service. Auth header value is write-only: never returned in responses.

### `GET /admin/jobs`

Returns BullMQ job status for monitoring.

**Response** `200`:
```json
{
  "active": 3,
  "waiting": 1,
  "completed": 142,
  "failed": 2,
  "recent": [
    {
      "id": "job-uuid",
      "sessionId": "uuid",
      "toolKey": "blog-post",
      "status": "active",
      "progress": 66,
      "startedAt": "..."
    }
  ]
}
```

---

## Error Response Format

All errors follow a consistent shape:

```json
{
  "error": {
    "code": "READINESS_FAILED",
    "message": "Missing required inputs: File Briefing",
    "details": {
      "missing": [
        { "type": "file", "key": "briefing", "label": "File Briefing" }
      ]
    }
  }
}
```

### Error Code Catalog

| HTTP | Code | When |
|------|------|------|
| 400 | `BAD_REQUEST` | Malformed request body |
| 401 | `UNAUTHORIZED` | Missing or expired token |
| 403 | `FORBIDDEN` | Role insufficient (member accessing admin) |
| 404 | `NOT_FOUND` | Resource doesn't exist |
| 409 | `CONFLICT` | Generic write conflict (concurrent update / duplicate uniqueness violation) |
| 409 | `ASSET_TYPE_EXISTS` | Asset type already in workspace |
| 422 | `READINESS_FAILED` | Missing required inputs for session start |
| 422 | `VALIDATION_ERROR` | Invalid field values |
| 429 | `QUOTA_EXCEEDED` | Monthly credit limit reached |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected error |

---

## Mapping to Application Services

| Route | Application Service | Domain Events |
|-------|-------------------|---------------|
| `POST /api/tools/:toolKey/sessions` | `StartSessionUseCase` | — |
| `GET /api/sessions/:id/events` | SSE emitter | `SessionStarted`, `StepCompleted`, `SessionCompleted`, `SessionFailed` |
| `POST /api/sessions/:id/cancel` | Cancel action in `sessionMachine` | `SessionCancelled` |
| `POST /api/workspaces/:id/assets` | Workspace CRUD | `AssetCreated` |
| `PUT /api/workspaces/:wid/assets/:aid` | Workspace CRUD | `AssetUpdated` |

## Sources

- [[Application Services]] — use cases mapped to routes
- [[Domain Events Catalog]] — events emitted during API calls
- [[Session Machine (XState v5)]] — state machine driving the `/events` SSE stream
- [[API Contract Baseline v1]] — canonical v1 wire contract
