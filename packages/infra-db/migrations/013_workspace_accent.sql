-- Migration 013: Workspace accent color
-- Adds accent_color column to workspaces table for UI theming

BEGIN;

ALTER TABLE workspaces ADD COLUMN accent_color VARCHAR(7) NOT NULL DEFAULT '#2563eb';

COMMIT;
