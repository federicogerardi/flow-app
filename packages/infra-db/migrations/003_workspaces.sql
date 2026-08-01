-- Migration 003: Workspaces + Memberships + Assets
-- Workspace & Assets context tables

BEGIN;

CREATE TABLE workspaces (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID         NOT NULL REFERENCES users(id),
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version    INTEGER      NOT NULL DEFAULT 1
);

CREATE INDEX idx_workspaces_created_by ON workspaces(created_by);

CREATE TABLE workspace_memberships (
    workspace_id UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role         VARCHAR(20)  NOT NULL,
    status       VARCHAR(20)  NOT NULL,
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

CREATE INDEX idx_workspace_memberships_user_id      ON workspace_memberships(user_id);
CREATE INDEX idx_workspace_memberships_workspace_id ON workspace_memberships(workspace_id);

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

COMMIT;
