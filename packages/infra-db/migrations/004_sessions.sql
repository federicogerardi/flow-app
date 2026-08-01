-- Migration 004: Sessions + Artifacts + CrawlData + Idempotency + Snapshots
-- Content Generation context tables

BEGIN;

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

CREATE TABLE artifacts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    UUID            NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    step_number   INTEGER         NOT NULL,
    content       TEXT            NOT NULL,
    status        artifact_status NOT NULL DEFAULT 'pending',
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifacts_session_id ON artifacts(session_id);

CREATE TABLE idempotency_keys (
    key_hash   VARCHAR(64) PRIMARY KEY,
    session_id UUID        NOT NULL REFERENCES sessions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);

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

CREATE TABLE session_snapshots (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID         NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    snapshot   JSONB        NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_snapshots_session_id ON session_snapshots(session_id);

COMMIT;
