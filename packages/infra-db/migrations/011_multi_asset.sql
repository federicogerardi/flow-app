-- Migration 011: Multi-asset support
-- Replace UNIQUE(workspace_id, asset_type) with UNIQUE(workspace_id, asset_type, source_ref)
-- + partial unique index to prevent duplicate manual assets (source_ref IS NULL)

BEGIN;

ALTER TABLE assets DROP CONSTRAINT uq_assets_workspace_type;

ALTER TABLE assets ADD CONSTRAINT uq_assets_workspace_type_source
  UNIQUE (workspace_id, asset_type, source_ref);

-- PostgreSQL treats NULL ≠ NULL in UNIQUE constraints, so multiple
-- (workspace_id, type, NULL) rows would be allowed without this index
CREATE UNIQUE INDEX uq_assets_workspace_type_null_source
  ON assets (workspace_id, asset_type)
  WHERE source_ref IS NULL;

COMMIT;
