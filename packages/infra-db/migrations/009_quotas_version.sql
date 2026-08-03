-- Migration 009: Add version column to quotas for optimistic locking
BEGIN;

ALTER TABLE quotas ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

COMMIT;
