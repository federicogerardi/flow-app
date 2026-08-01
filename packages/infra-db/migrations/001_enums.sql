-- Migration 001: Enums
-- Creates all PostgreSQL enum types used by Flow App

BEGIN;

CREATE TYPE session_status     AS ENUM ('queued', 'draft', 'ready', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE artifact_status    AS ENUM ('pending', 'generating', 'completed', 'failed');
CREATE TYPE asset_type         AS ENUM ('brief', 'brand-voice', 'persona', 'angle', 'ad-copy');
CREATE TYPE asset_source       AS ENUM ('generated', 'uploaded', 'manual');
CREATE TYPE user_role          AS ENUM ('admin', 'member');
CREATE TYPE user_status        AS ENUM ('active', 'disabled');
CREATE TYPE transaction_reason AS ENUM ('generation', 'admin_grant', 'purchase', 'plan_upgrade');

COMMIT;
