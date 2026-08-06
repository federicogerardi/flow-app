---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
  - wiki/backend
date_updated: 2026-08-06
source_count: 9
confidence: high
maintenance: 2026-08-06 — updated migration strategy (009 quotas version, 010 gamification), added migration runner section linking to [[Migration Tooling]].
---

# Database Schema

> PostgreSQL schema for Flow App — `packages/infra-db`  
> Maps directly from the domain model in `packages/domain`

## Conventions

- All IDs: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- Timestamps: `TIMESTAMPTZ` (UTC)
- Enums: PostgreSQL native enums for type safety
- Foreign keys: always defined, `ON DELETE` explicit per relationship
- Indexes: on all foreign keys + query patterns
- Kysely: types generated from schema, used in repository implementations

---

## Enums

```sql
CREATE TYPE session_status     AS ENUM ('queued', 'draft', 'ready', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE artifact_status    AS ENUM ('pending', 'generating', 'completed', 'failed');
CREATE TYPE asset_type         AS ENUM ('brief', 'brand-voice', 'persona', 'angle', 'ad-copy');
CREATE TYPE asset_source       AS ENUM ('generated', 'uploaded', 'manual');
CREATE TYPE user_role          AS ENUM ('admin', 'member');
CREATE TYPE user_status        AS ENUM ('active', 'disabled');
CREATE TYPE transaction_reason AS ENUM ('generation', 'admin_grant', 'purchase', 'plan_upgrade');
```

---

## Tables

### Content Generation Context

#### `sessions`

```sql
CREATE TABLE sessions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_key             VARCHAR(100)  NOT NULL,
    workspace_id         UUID          NOT NULL REFERENCES workspaces(id),
    user_id              UUID          NOT NULL REFERENCES users(id),
    idempotency_key_hash VARCHAR(64)   NOT NULL,
    status               session_status NOT NULL DEFAULT 'draft',
    current_step_index   INTEGER       NOT NULL DEFAULT 0,
    started_at           TIMESTAMPTZ,
    completed_at         TIMESTAMPTZ,
    error_code           VARCHAR(50),
    error_message        TEXT,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    version              INTEGER       NOT NULL DEFAULT 1
);

CREATE INDEX idx_sessions_workspace_id         ON sessions(workspace_id);
CREATE INDEX idx_sessions_user_id              ON sessions(user_id);
CREATE INDEX idx_sessions_status               ON sessions(status);
CREATE INDEX idx_sessions_idempotency_key_hash ON sessions(idempotency_key_hash);
```

| Column | Type | Notes |
|--------|------|-------|
| `tool_key` | `VARCHAR(100)` | References [[Tool as Static Configuration]] (`ToolDefinition.toolKey`) — no FK (static config, not DB) |
| `workspace_id` | `UUID FK → workspaces` | Session belongs to a [[Workspace]] |
| `user_id` | `UUID FK → users` | Owner |
| `idempotency_key_hash` | `VARCHAR(64)` | SHA-256 of `(userId|workspaceId|toolKey|inputHash|promptSignature)` |
| `status` | `session_status` | Maps to [[Session]] lifecycle states (`queued` before worker pickup) |
| `current_step_index` | `INTEGER` | 0-based index in `ToolDefinition.steps[]` |
| `error_code` | `VARCHAR(50)` | Set on failure (e.g. `LLM_TIMEOUT`, `API_RATE_LIMITED`) |

#### `artifacts`

```sql
CREATE TABLE artifacts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    UUID            NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    step_number   INTEGER         NOT NULL,
    content       TEXT            NOT NULL,
    status        artifact_status NOT NULL DEFAULT 'pending',
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifacts_session_id ON artifacts(session_id);
```

| Column | Type | Notes |
|--------|------|-------|
| `session_id` | `UUID FK → sessions CASCADE` | Artifacts die with their Session |
| `step_number` | `INTEGER` | Position in step sequence (1-based) |
| `content` | `TEXT` | Immutable generated content ([[ArtifactContent]] VO) |
| `status` | `artifact_status` | Lifecycle of generation |

**Role is positional**: no `artifact_role` column. The last `step_number` in a Session is the final Artifact. Query: `SELECT * FROM artifacts WHERE session_id = $1 ORDER BY step_number DESC LIMIT 1`.

#### `idempotency_keys`

```sql
CREATE TABLE idempotency_keys (
    key_hash   VARCHAR(64) PRIMARY KEY,
    session_id UUID        NOT NULL REFERENCES sessions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);
```

| Column | Type | Notes |
|--------|------|-------|
| `key_hash` | `VARCHAR(64) PK` | SHA-256 of [[Idempotency]] key components |
| `expires_at` | `TIMESTAMPTZ` | TTL-based cleanup (e.g. 24h) |

**Usage**: `INSERT INTO idempotency_keys ... ON CONFLICT (key_hash) DO NOTHING RETURNING session_id`. If a row is returned, the key already exists → return existing session.

#### `crawl_data`

```sql
CREATE TABLE crawl_data (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID         NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    source       VARCHAR(50)  NOT NULL,
    raw_response JSONB        NOT NULL,
    fetched_at   TIMESTAMPTZ  NOT NULL,
    expires_at   TIMESTAMPTZ
);

CREATE INDEX idx_crawl_data_session_id ON crawl_data(session_id);
CREATE INDEX idx_crawl_data_expires_at ON crawl_data(expires_at);
```

| Column | Type | Notes |
|--------|------|-------|
| `source` | `VARCHAR(50)` | `serpapi`, `people_also_ask`, `ai_overview` |
| `raw_response` | `JSONB` | Immutable [[CrawlData]] VO — raw API response |
| `expires_at` | `TIMESTAMPTZ` | Cache TTL from `ApiCallInput.cache.ttlSeconds` |

#### `session_snapshots`

```sql
CREATE TABLE session_snapshots (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID         NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    snapshot   JSONB        NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_snapshots_session_id ON session_snapshots(session_id);
```

| Column | Type | Notes |
|--------|------|-------|
| `snapshot` | `JSONB` | Serialized XState snapshot (`actor.getPersistedSnapshot()`) |

**Usage**: Crash recovery — on restart, load the latest snapshot and resume the actor.

---

### Workspace & Assets Context

#### `workspaces`

```sql
CREATE TABLE workspaces (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID         NOT NULL REFERENCES users(id),
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version    INTEGER      NOT NULL DEFAULT 1
);

CREATE INDEX idx_workspaces_created_by ON workspaces(created_by);
```

#### `workspace_memberships`

```sql
CREATE TABLE workspace_memberships (
    workspace_id UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role         VARCHAR(20)  NOT NULL,   -- owner | editor | viewer
    status       VARCHAR(20)  NOT NULL,   -- invited | active
    invited_by   UUID REFERENCES users(id),
    invited_at   TIMESTAMPTZ,
    joined_at    TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_workspace_memberships PRIMARY KEY (workspace_id, user_id)
);

CREATE UNIQUE INDEX uq_workspace_owner
  ON workspace_memberships (workspace_id)
  WHERE role = 'owner' AND status = 'active';

CREATE INDEX idx_workspace_memberships_user_id ON workspace_memberships(user_id);
CREATE INDEX idx_workspace_memberships_workspace_id ON workspace_memberships(workspace_id);
```

#### `assets`

```sql
CREATE TABLE assets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    asset_type   asset_type  NOT NULL,
    source       asset_source NOT NULL,
    source_ref   UUID,
    content      TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version      INTEGER      NOT NULL DEFAULT 1,

    CONSTRAINT uq_assets_workspace_type UNIQUE (workspace_id, asset_type)
);

CREATE INDEX idx_assets_workspace_id ON assets(workspace_id);
CREATE INDEX idx_assets_source_ref    ON assets(source_ref);
```

| Column | Type | Notes |
|--------|------|-------|
| `source_ref` | `UUID` | References `artifacts.id` when `source = 'generated'` (traceability) |
| `uq_assets_workspace_type` | `UNIQUE` | One [[Asset]] per `AssetType` per [[Workspace]] |

---

### Identity & Access Context

#### `users`

```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    role          user_role    NOT NULL DEFAULT 'member',
    status        user_status  NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email  ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

| Column | Type | Notes |
|--------|------|-------|
| `password_hash` | `VARCHAR(255) NULL` | Nullable for OAuth-only users |

#### `auth_sessions`

```sql
CREATE TABLE auth_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at    TIMESTAMPTZ  NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_sessions_user_id       ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_refresh_token ON auth_sessions(refresh_token);
```

#### `oauth_accounts`

```sql
CREATE TABLE oauth_accounts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider      VARCHAR(50)  NOT NULL,   -- 'google', 'github'
    provider_id   VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_oauth_accounts UNIQUE (provider, provider_id)
);
```

---

### Usage & Quota Context

#### `quotas`

```sql
CREATE TABLE quotas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID         NOT NULL REFERENCES users(id),
    period              VARCHAR(7)   NOT NULL,  -- YYYY-MM
    plan_type           VARCHAR(20)  NOT NULL DEFAULT 'free',
    -- Artifact gate (anti-abuse, invisible)
    artifact_limit      INTEGER      NOT NULL DEFAULT 1000,
    artifact_count      INTEGER      NOT NULL DEFAULT 0,
    -- Credit quota (user-facing)
    credit_limit        INTEGER      NOT NULL DEFAULT 250,
    credit_consumed     INTEGER      NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_quotas_user_period UNIQUE (user_id, period)
);

CREATE INDEX idx_quotas_user_id ON quotas(user_id);
```

#### `credit_transactions`

```sql
CREATE TABLE credit_transactions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quota_id   UUID               NOT NULL REFERENCES quotas(id),
    amount     INTEGER            NOT NULL,
    reason     transaction_reason NOT NULL,
    session_id UUID,
    created_at TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_quota_id   ON credit_transactions(quota_id);
CREATE INDEX idx_credit_transactions_session_id ON credit_transactions(session_id);
```

| Column | Type | Notes |
|--------|------|-------|
| `session_id` | `UUID NULL` | Traceability to [[Session]] (null for `admin_grant`) |

---

### Platform Configuration (CRUD admin)

#### `llm_models`

```sql
CREATE TABLE llm_models (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label      VARCHAR(100) NOT NULL,
    provider   VARCHAR(50)  NOT NULL,  -- 'openai', 'anthropic'
    model_id   VARCHAR(100) NOT NULL,  -- 'gpt-4o', 'claude-sonnet-4-20250514'
    tier       VARCHAR(20)  NOT NULL,  -- 'premium', 'balanced', 'light', 'search'
    enabled    BOOLEAN      NOT NULL DEFAULT true,
    sort_order INTEGER      NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

#### `api_services`

```sql
CREATE TABLE api_services (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label             VARCHAR(100)  NOT NULL,
    endpoint          VARCHAR(500)  NOT NULL,
    auth_header_name  VARCHAR(100),
    auth_header_value VARCHAR(500),
    enabled           BOOLEAN       NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

#### `tool_step_bindings`

```sql
CREATE TABLE tool_step_bindings (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_key       VARCHAR(100) NOT NULL,
    step_order     INTEGER      NOT NULL,
    api_service_id UUID         NOT NULL REFERENCES api_services(id),

    CONSTRAINT uq_tool_step_binding UNIQUE (tool_key, step_order)
);
```

---

## Agent Chat Context (Phase 5)

### `conversations`

```sql
CREATE TABLE conversations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID          NOT NULL REFERENCES workspaces(id),
    user_id      UUID          NOT NULL REFERENCES users(id),
    agent_key    VARCHAR(50)   NOT NULL,
    title        VARCHAR(255)  NOT NULL,
    status       VARCHAR(20)   NOT NULL DEFAULT 'active',
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_workspace_id ON conversations(workspace_id);
CREATE INDEX idx_conversations_user_id      ON conversations(user_id);
```

| Column | Type | Notes |
|--------|------|-------|
| `agent_key` | `VARCHAR(50)` | References one of 7 agent personas (e.g. `strategist`, `copywriter`) |
| `title` | `VARCHAR(255)` | Auto-generated from first user message |
| `status` | `VARCHAR(20)` | `active` or `archived` |

### `messages`

```sql
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID         NOT NULL REFERENCES conversations(id),
    role            VARCHAR(10)  NOT NULL,
    content         TEXT         NOT NULL,
    tokens_used     INTEGER,
    model_used      VARCHAR(100),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
```

| Column | Type | Notes |
|--------|------|-------|
| `role` | `VARCHAR(10)` | `user`, `agent`, or `system` |
| `tokens_used` | `INTEGER` | Total tokens consumed, nullable (user messages don't track) |
| `model_used` | `VARCHAR(100)` | LLM model ID, nullable |

---

## Phase 3 — Reliability Schema Extension (Outbox/Inbox)

Current production schema is intentionally lean. For higher reliability in split-service deployments, add the following tables.

### `outbox_events` (publisher side)

```sql
CREATE TABLE outbox_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type  VARCHAR(100) NOT NULL,
    aggregate_id    UUID         NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    event_version   INTEGER      NOT NULL DEFAULT 1,
    dedupe_key      VARCHAR(120) NOT NULL UNIQUE,
    payload         JSONB        NOT NULL,
    occurred_at     TIMESTAMPTZ  NOT NULL,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outbox_events_unpublished ON outbox_events(created_at) WHERE published_at IS NULL;
CREATE INDEX idx_outbox_events_type        ON outbox_events(event_type);
```

### `inbox_consumers` (consumer side dedupe)

```sql
CREATE TABLE inbox_consumers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_name    VARCHAR(100) NOT NULL,
    event_id         UUID         NOT NULL,
    dedupe_key       VARCHAR(120) NOT NULL,
    processed_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    status           VARCHAR(20)  NOT NULL,
    error_message    TEXT,

    CONSTRAINT uq_inbox_consumer_dedupe UNIQUE (consumer_name, dedupe_key)
);

CREATE INDEX idx_inbox_consumers_event_id ON inbox_consumers(event_id);
```

**Dedupe key convention**: `eventType:aggregateId:version`.

**Adoption rule**: use these tables only when enabling relay-based delivery; keep current in-process bus for early-stage topology.

---

## Entity-Relationship Diagram

```
users ───1:N─── workspaces ───1:N─── assets
  │             │                         │
  │             └──1:N─── workspace_memberships
  │                          │
  │                          └──N:1─── users
  │
  ├──1:N─── sessions ───1:N─── artifacts
  │            │                           │
  │            ├──1:N─── crawl_data        │
  │            ├──1:N─── session_snapshots │
  │            └──1:1─── idempotency_keys  │
  │                                        │
  ├──1:N─── quotas ───1:N─── credit_transactions
  │
  ├──1:N─── conversations ───1:N─── messages
  │
  ├──1:N─── auth_sessions
  └──1:N─── oauth_accounts
```

---

## Kysely Database Type

```typescript
// packages/infra-db/src/types.ts
// Note: only 11 of 18 tables have Kysely type definitions.
// 7 tables have migrations but no types (assets, crawl_data, quotas,
// credit_transactions, llm_models, api_services, tool_step_bindings).

import type { Generated, ColumnType } from 'kysely';

interface Tables {
  sessions:            SessionsTable;
  artifacts:           ArtifactsTable;
  idempotency_keys:    IdempotencyKeysTable;
  session_snapshots:   SessionSnapshotsTable;
  workspaces:          WorkspacesTable;
  workspace_memberships: WorkspaceMembershipsTable;
  users:               UsersTable;
  auth_sessions:       AuthSessionsTable;
  oauth_accounts:      OauthAccountsTable;
  conversations:       ConversationsTable;
  messages:            MessagesTable;
}

export type DB = Tables;
```

---

## Migration Strategy

```sql
-- Migration 001: enums
CREATE TYPE session_status AS ENUM (...);
CREATE TYPE artifact_status AS ENUM (...);
CREATE TYPE asset_type AS ENUM (...);
CREATE TYPE asset_source AS ENUM (...);
CREATE TYPE user_role AS ENUM (...);
CREATE TYPE user_status AS ENUM (...);
CREATE TYPE transaction_reason AS ENUM (...);

-- Migration 002: users + auth
CREATE TABLE users (...);
CREATE TABLE auth_sessions (...);
CREATE TABLE oauth_accounts (...);

-- Migration 003: workspaces + memberships + assets
CREATE TABLE workspaces (...);
CREATE TABLE workspace_memberships (...);
CREATE TABLE assets (...);

-- Migration 004: sessions + artifacts + crawl_data + idempotency + snapshots
CREATE TABLE sessions (...);
CREATE TABLE artifacts (...);
CREATE TABLE idempotency_keys (...);
CREATE TABLE crawl_data (...);
CREATE TABLE session_snapshots (...);

-- Migration 005: quotas
CREATE TABLE quotas (...);
CREATE TABLE credit_transactions (...);

-- Migration 006: platform config
CREATE TABLE llm_models (...);
CREATE TABLE api_services (...);
CREATE TABLE tool_step_bindings (...);

-- Migration 007: agent chat (conversations + messages)
CREATE TABLE conversations (...);
CREATE TABLE messages (...);

-- Migration 008: seed data (dev user)
-- No tables created — INSERT only (ON CONFLICT DO NOTHING)

-- Migration 009: quotas version column
ALTER TABLE quotas ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Migration 010: gamification
CREATE TABLE player_profiles (...);
CREATE TABLE achievements (...);
CREATE TABLE xp_transactions (...);
CREATE TABLE gamification_processed_events (...);
CREATE TABLE workspace_leaderboard (...);
CREATE TABLE workspace_challenges (...);
CREATE TABLE challenge_contributions (...);
```

## Migration Runner

Migrations run automatically on server startup via `packages/infra-db/src/migrate.ts`. See [[Migration Tooling]] for details.

Key properties:
- **Automatic**: no manual steps, no CI script — runs in `server.ts` before `createApp()`
- **Idempotent**: tracks applied migrations in a `migrations` table; skips already-applied files
- **Auto-resilient**: detects manually-applied migrations via PostgreSQL error codes (42710, 42P07, etc.) and marks them as done
- **Fail-fast**: unknown errors crash the server (bad migration should never reach production)

## Sources

- [[Session]] — aggregate root
- [[Artifact]] — entity
- [[Workspace]] — aggregate root
- [[Asset]] — entity
- [[User]] — aggregate root
- [[Quota]] — aggregate root
- [[CrawlData]] — value object
- [[packages-domain Structure]] — domain directory tree
- [[WorkspaceMembership]] — membership entity

## Data Retention Policy

| Data | Retention | Cleanup |
|------|-----------|---------|
| Sessions (completed) | 90 days | Optional export to cold storage, then hard delete |
| Sessions (failed) | 30 days | Hard delete |
| Crawl data | Follow session retention | Cascade delete with session |
| Session snapshots | Follow session retention | Cascade delete with session |
| Idempotency keys | 24h TTL | Auto-expire via `expires_at` |
| Refresh tokens | 7 days | Auto-expire via `expires_at` |

```sql
-- Cron job: run hourly

-- Clean up failed sessions older than 30 days
DELETE FROM session_snapshots WHERE session_id IN (
  SELECT id FROM sessions WHERE status = 'failed' AND created_at < NOW() - INTERVAL '30 days'
);
DELETE FROM crawl_data WHERE session_id IN (
  SELECT id FROM sessions WHERE status = 'failed' AND created_at < NOW() - INTERVAL '30 days'
);
DELETE FROM artifacts WHERE session_id IN (
  SELECT id FROM sessions WHERE status = 'failed' AND created_at < NOW() - INTERVAL '30 days'
);
DELETE FROM sessions WHERE status = 'failed' AND created_at < NOW() - INTERVAL '30 days';

-- Optional: export completed sessions older than 90 days to cold storage (outside OLTP DB)
-- Then hard delete from primary tables
DELETE FROM session_snapshots WHERE session_id IN (
  SELECT id FROM sessions WHERE status = 'completed' AND created_at < NOW() - INTERVAL '90 days'
);
DELETE FROM crawl_data WHERE session_id IN (
  SELECT id FROM sessions WHERE status = 'completed' AND created_at < NOW() - INTERVAL '90 days'
);
DELETE FROM artifacts WHERE session_id IN (
  SELECT id FROM sessions WHERE status = 'completed' AND created_at < NOW() - INTERVAL '90 days'
);
DELETE FROM sessions WHERE status = 'completed' AND created_at < NOW() - INTERVAL '90 days';

-- Clean up expired keys
DELETE FROM idempotency_keys WHERE expires_at < NOW();
```

---

## Backup & Disaster Recovery Runbook (Phase 3)

### Targets

| Objective | Target |
|-----------|--------|
| RPO | <= 15 minutes |
| RTO | <= 60 minutes |
| Backup verification cadence | weekly restore drill |

### Backup Policy

1. Continuous WAL archiving + daily full snapshot.
2. Keep 35 days of backups.
3. Encrypt backups at rest (KMS-managed keys).
4. Restrict restore permissions to platform-admin role.

### Restore Procedure (staging first, then production)

1. Select restore point timestamp.
2. Restore PostgreSQL into an isolated staging instance.
3. Run integrity checks:
   - row counts for `sessions`, `artifacts`, `quotas`, `credit_transactions`
   - referential checks for critical FKs
4. Replay smoke tests against restored instance.
5. Promote restored instance only after checks pass.

### Drill Checklist

- Last successful drill date recorded in ops log.
- Measured RPO and RTO captured.
- Action items created for any SLA breach.
