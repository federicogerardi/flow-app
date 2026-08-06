-- Migration 012: Add name column to assets
-- Allow users to optionally name their assets for better identification
-- Falls back to asset_type label when name is NULL

BEGIN;

ALTER TABLE assets ADD COLUMN name VARCHAR(255);

COMMIT;