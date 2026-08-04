---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
  - wiki/backend
date_updated: 2026-08-02
source_count: 4
confidence: high
---

# API Routes

> HTTP API for Flow App — `apps/backend/src/routes/`  
> Exposes [[Application Services]] to the frontend via REST + SSE

## Conventions

- Base path: `/api/` for resources, `/api/auth/` for authentication, `/admin/` for admin
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

> **Last synced**: 2026-08-04 against `apps/backend/src/app.ts` and `apps/backend/src/api/*.ts`.
> ✅ = implemented, 🟡 = partial, ⬜ = planned (not built), 🔜 = deferred to future phase.
> Phase 12 drift closure: `GET /api/usage/credits` added (was implemented but not documented).

| Method | Path | Auth | Status | Notes |
|--------|------|------|--------|-------|
| `GET` | `/health` | 🔓 | ✅ | Health check |
| `GET` | `/api` | 🔓 | ✅ | API info (version, message) |
| `POST` | `/api/auth/register` | 🔓 | ✅ | Register email/password |
| `POST` | `/api/auth/login` | 🔓 | ✅ | Login (rate limited 5/15min) |
| `POST` | `/api/auth/refresh` | 🔓 | ✅ | Token refresh (httpOnly cookie) |
| `POST` | `/api/auth/logout` | 🔓 | ✅ | Logout + clear cookie |
| `GET` | `/api/auth/me` | ✅ | ✅ | Current user info |
| `GET` | `/api/auth/google` | 🔓 | ✅ | Google OAuth start |
| `GET` | `/api/auth/google/callback` | 🔓 | ✅ | Google OAuth callback |
| `GET` | `/api/auth/github` | 🔓 | ⬜ | GitHub OAuth (planned) |
| `GET` | `/api/workspaces` | ✅ | ✅ | List user's workspaces |
| `POST` | `/api/workspaces` | ✅ | ✅ | Create workspace |
| `GET` | `/api/workspaces/:id` | ✅ | ✅ | Get workspace detail |
| `PUT` | `/api/workspaces/:id` | ✅ | ⬜ | Update workspace |
| `DELETE` | `/api/workspaces/:id` | ✅ | ⬜ | Delete workspace |
| `POST` | `/api/workspaces/:id/invitations` | owner | ✅ | Invite member |
| `GET` | `/api/workspaces/:id/members` | member | ✅ | List members |
| `DELETE` | `/api/workspaces/:id/members/:userId` | owner | ✅ | Remove member |
| `PUT` | `/api/workspaces/:id/members/:userId/role` | owner | ✅ | Change member role |
| `POST` | `/api/workspaces/:id/transfer-ownership` | owner | ✅ | Transfer ownership |
| `GET` | `/api/invitations` | ✅ | ✅ | List pending invitations |
| `POST` | `/api/invitations/:id/accept` | ✅ | ✅ | Accept invitation |
| `POST` | `/api/invitations/:id/decline` | ✅ | ✅ | Decline invitation |
| `GET` | `/api/workspaces/:id/assets` | ✅ | ⬜ | List assets (planned) |
| `POST` | `/api/workspaces/:id/assets` | ✅ | ⬜ | Create asset (planned) |
| `GET` | `/api/workspaces/:wid/assets/:aid` | ✅ | ⬜ | Get asset (planned) |
| `PUT` | `/api/workspaces/:wid/assets/:aid` | ✅ | ⬜ | Update asset (planned) |
| `DELETE` | `/api/workspaces/:wid/assets/:aid` | ✅ | ⬜ | Delete asset (planned) |
| `POST` | `/api/tools/:toolKey/sessions` | ✅ | ✅ | Start generation (idempotent) |
| `GET` | `/api/sessions` | ✅ | ✅ | List sessions (filterable) |
| `GET` | `/api/sessions/:id` | ✅ | ✅ | Get session detail |
| `GET` | `/api/sessions/:id/events` | ✅ | ✅ | SSE progress stream |
| `POST` | `/api/sessions/:id/cancel` | ✅ | ⬜ | Cancel running session |
| `GET` | `/api/artifacts/:id` | ✅ | ✅ | Get artifact content |
| `GET` | `/api/artifacts/:id/download` | ✅ | ⬜ | Download artifact |
| `GET` | `/api/workspaces/:workspaceId/agents` | member | ✅ | List 7 agent personas |
| `GET` | `/api/workspaces/:workspaceId/conversations` | member | ✅ | List user's conversations |
| `POST` | `/api/workspaces/:workspaceId/conversations` | member | ✅ | Start conversation |
| `GET` | `/api/conversations/:id` | ✅ | ✅ | Get conversation + messages |
| `POST` | `/api/conversations/:id/messages` | ✅ | ✅ | Send message (LLM reply) |
| `POST` | `/api/conversations/:id/archive` | ✅ | ✅ | Archive conversation |
| `GET` | `/admin/jobs` | 🔒 | ✅ | Queue stats + worker health |
| `GET` | `/admin/health` | 🔒 | ✅ | Health check + active alerts |
| `GET` | `/admin/users` | 🔒 | ⬜ | List users (planned) |
| `POST` | `/admin/users` | 🔒 | ⬜ | Create user (planned) |
| `PUT` | `/admin/users/:id` | 🔒 | ⬜ | Update user (planned) |
| `GET` | `/api/usage/credits` | ✅ | ✅ | Quota + credits + artifacts status |

🔓 = public, ✅ = authenticated, 🔒 = admin only, `owner`/`member` = workspace role required

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

> Mounted at `/api/auth/` in code. All auth endpoints are public (mounted before auth middleware).

### `POST /api/auth/register` ✅

**Request**: `{ "email": "user@example.com", "password": "min-8-chars" }`

**Response** `201`: `{ "user": { "id": "uuid", "email": "string", "role": "member" }, "accessToken": "jwt...", "expiresIn": 900 }` + `Set-Cookie: refresh_token=...` (httpOnly, SameSite=Strict, 7d)

**Errors**: `409 CONFLICT` (email already exists), `422 VALIDATION_ERROR`

### `POST /api/auth/login` ✅

Rate limited: 5 attempts / 15 min.

**Request**: `{ "email": "user@example.com", "password": "..." }`

**Response** `200`: same shape as register + `Set-Cookie`

**Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN` (disabled user), `429 RATE_LIMITED`

### `POST /api/auth/refresh` ✅

Token rotation via httpOnly cookie. Deletes old session, issues new tokens.

**Request**: (no body — reads `refresh_token` cookie)

**Response** `200`: same shape as login + new cookie

**Errors**: `401 UNAUTHORIZED` (expired/revoked or missing cookie)

### `POST /api/auth/logout` ✅

Clears cookie, deletes session.

**Request**: (no body — reads `refresh_token` cookie)

**Response** `200`: `{ "message": "Logged out" }` + cleared cookie

### `GET /api/auth/me` ✅

Current user from JWT. Requires `Authorization: Bearer <token>` (authenticated route).

**Response** `200`: `{ "id": "uuid", "email": "string", "role": "string" }`

### `GET /api/auth/google` ✅

OAuth redirect. Returns `501 NOT_CONFIGURED` if `GOOGLE_CLIENT_ID` not set.

### `GET /api/auth/google/callback` ✅

OAuth callback. Success → redirect to frontend `?token=<accessToken>&expiresIn=<seconds>`. Failure → redirect `/login?error=oauth_failed`. Sets `refresh_token` cookie.

### `GET /api/auth/github` ⬜

GitHub OAuth planned. Same pattern as Google.

---

## Workspaces

### `GET /api/workspaces` ✅

**Response** `200`: `{ "workspaces": [{ "id": "uuid", "name": "string", ... }] }`

### `GET /api/workspaces/:id` ✅

Returns workspace detail. Requires workspace membership.

### `PUT /api/workspaces/:id` ⬜

Update workspace name. Planned — not yet implemented.

### `DELETE /api/workspaces/:id` ⬜

Delete workspace (cascades to assets). Planned — not yet implemented.

### Workspace Membership ✅

All membership routes are implemented and role-gated via `requireWorkspaceRole()` middleware:

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `POST` | `/api/workspaces/:id/invitations` | owner | Invite member |
| `GET` | `/api/workspaces/:id/members` | owner/editor/viewer | List members |
| `DELETE` | `/api/workspaces/:id/members/:userId` | owner | Remove member |
| `PUT` | `/api/workspaces/:id/members/:userId/role` | owner | Change role |
| `POST` | `/api/workspaces/:id/transfer-ownership` | owner | Transfer ownership |
| `GET` | `/api/invitations` | authenticated | List pending invitations |
| `POST` | `/api/invitations/:id/accept` | authenticated | Accept invitation |
| `POST` | `/api/invitations/:id/decline` | authenticated | Decline invitation |

---

## Assets ⬜

> **Status**: planned. Workspace asset CRUD (5 endpoints) is specified but not yet implemented.
> Assets are currently managed implicitly through session generation (artifacts can be promoted to assets).
> Blocked by: asset management domain model not yet built. Target: Phase 9-10.

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

### `POST /api/sessions/:id/cancel` ⬜

Cancels a running session. Planned — not yet implemented. Endpoint registered in Wiki spec only.

---

## Artifacts

### `GET /api/artifacts/:id` ✅

Returns artifact content by ID.

### `GET /api/artifacts/:id/download` ⬜

Download in `md`/`txt`/`docx`/`pdf` format. Planned — not yet implemented.

---

## Usage & Quota ✅

### `GET /api/usage/credits`

Returns current quota state for the authenticated user. Auto-creates a default free-plan quota if none exists for the current billing period.

**Auth**: authenticated user (JWT required).

**Response** `200`:
```json
{
  "credits": {
    "used": 5,
    "limit": 250,
    "remaining": 245,
    "percent": 2
  },
  "artifacts": {
    "used": 12,
    "limit": 1000,
    "remaining": 988
  },
  "plan": "free",
  "period": "2026-08"
}
```

**Implementation**:
- Route: `apps/backend/src/api/usage/usage-routes.ts` (42 lines)
- Repository: `KyselyQuotaRepository.findCurrent(userId)` with auto-initialization fallback
- Consumed synchronously by session worker on `SessionCompleted` via `ConsumeCreditsUseCase`
- Optimistic locking with 3 retry attempts on concurrent credit consumption

---

## Agent Chat ✅

All 6 agent chat endpoints are implemented (Phase 5).

### `GET /api/workspaces/:workspaceId/agents`

List 7 available agent personas (strategist, copywriter, seo-specialist, ads-specialist, analyst, creative-director, email-marketer). Requires workspace membership.

### `GET /api/workspaces/:workspaceId/conversations`

List user's conversations in the workspace. Privacy: user-scoped only (conversations private to creator).

### `POST /api/workspaces/:workspaceId/conversations`

Start a new conversation. Request: `{ "agentKey": "copywriter" }`. Response: `{ "conversationId": "uuid", "agentName": "Copywriter" }`.

### `GET /api/conversations/:id`

Get conversation with all messages. Response includes `title`, `agentKey`, `agentName`, `messages[]`.

### `POST /api/conversations/:id/messages`

Send a user message. Request: `{ "content": "string" }`. The server generates an agent reply via LLM. Response: `{ "userMessageId": "uuid", "agentMessageId": "uuid", "agentContent": "string" }`.

### `POST /api/conversations/:id/archive`

Archive the conversation. No body. Response `200`.

---

## Admin

### `GET /admin/jobs` ✅

Queue stats: waiting, active, completed, failed, delayed counts + worker uptime.

### `GET /admin/health` ✅

System health: `{ "status": "healthy", "alerts": [] }`.

### `GET /admin/users` ⬜
### `POST /admin/users` ⬜
### `PUT /admin/users/:id` ⬜
### `GET /admin/models` ⬜
### `POST /admin/models` ⬜
### `PUT /admin/models/:id` ⬜
### `DELETE /admin/models/:id` ⬜
### `GET /admin/api-services` ⬜
### `POST /admin/api-services` ⬜
### `PUT /admin/api-services/:id` ⬜
### `DELETE /admin/api-services/:id` ⬜

> All admin CRUD endpoints are planned but not yet implemented. Admin panel is deferred to Phase 10+.

### `GET /admin/jobs` ✅

Returns BullMQ job status: active, waiting, completed, failed + worker uptime.

### `GET /admin/health` ✅

System health: `{ "status": "healthy", "alerts": [] }`.

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
| 401 | `UNAUTHORIZED` | Invalid credentials or expired token |
| 401 | `MISSING_TOKEN` | Authorization header missing |
| 401 | `INVALID_TOKEN` | JWT expired or invalid |
| 403 | `FORBIDDEN` | Insufficient role or disabled user |
| 404 | `NOT_FOUND` | Resource doesn't exist |
| 404 | `TOOL_NOT_FOUND` | Unknown tool key |
| 404 | `SESSION_NOT_FOUND` | Session ID not found |
| 404 | `WORKSPACE_NOT_FOUND` | Workspace ID not found |
| 404 | `ARTIFACT_NOT_FOUND` | Artifact ID not found |
| 404 | `CONVERSATION_NOT_FOUND` | Conversation ID not found |
| 409 | `CONFLICT` | Optimistic lock failure or duplicate |
| 409 | `INVALID_STATE` | Invalid state transition |
| 422 | `READINESS_FAILED` | Missing required inputs |
| 422 | `VALIDATION_ERROR` | Invalid field values |
| 429 | `RATE_LIMITED` | Too many requests (rate limiter) |
| 501 | `NOT_CONFIGURED` | Feature not enabled (e.g., OAuth) |
| 502 | `LLM_GATEWAY_ERROR` | LLM provider failure |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Mapping to Application Services

| Route | Application Service | Status |
|-------|-------------------|--------|
| `POST /api/tools/:toolKey/sessions` | `StartSessionUseCase` | ✅ |
| `GET /api/sessions/:id/events` | SSE emitter via `JobEventBridge` | ✅ |
| `POST /api/workspaces/:id/invitations` | `InviteMemberUseCase` | ✅ |
| `POST /api/invitations/:id/accept` | `AcceptInvitationUseCase` | ✅ |
| `POST /api/workspaces/:id/transfer-ownership` | `TransferOwnershipUseCase` | ✅ |
| `POST /api/conversations/:id/messages` | `SendMessageUseCase` | ✅ |
| `POST /api/auth/register` | `AuthService.register()` | ✅ |
| `POST /api/auth/login` | `AuthService.login()` | ✅ |

## Sources

- [[Application Services]] — use cases mapped to routes
- [[Domain Events Catalog]] — events emitted during API calls
- [[Session Machine (XState v5)]] — state machine driving the `/events` SSE stream
- [[API Contract Baseline v1]] — canonical v1 wire contract
