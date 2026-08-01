-- Migration 008: Seed user for development
-- Creates a dev user matching SEED_USER_ID in .env
-- Password: 'password123' (bcrypt, cost factor 12)

BEGIN;

INSERT INTO users (id, email, password_hash, role, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dev@flow-app.local',
  '$2b$12$oG2i4kvI8cR3utxbcPwuCewLQ0nEVT/iUrUZZpev.CQ88FTYc7yEe',
  'member',
  'active'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
