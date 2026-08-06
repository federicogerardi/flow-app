---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
date_updated: 2026-08-06
source_count: 3
confidence: high
implementation: complete
---

# Migration Tooling

> Automatic database migration runner. Executes on server startup — zero manual steps, zero CI scripts required.

## Implementation

`packages/infra-db/src/migrate.ts` — `runMigrations(db, migrationsPath, log?)`

- Reads `.sql` files from `packages/infra-db/migrations/` in alphabetical order
- Tracks applied migrations in a `migrations` table (auto-created on first run)
- Runs each unapplied migration in a PostgreSQL transaction
- **Auto-resilience**: if a migration fails with a "duplicate object" error (42710, 42P07, 42P16, 42701), the runner detects it was applied manually and marks it as done — no crash, no rollback, no manual intervention needed
- Unknown errors crash the server (fail-fast)

Called from `apps/backend/src/server.ts` before `createApp()`:

```typescript
const migrationsPath = path.resolve(root, '..', '..', 'packages', 'infra-db', 'migrations');
const applied = await runMigrations(db, migrationsPath, (msg) => logger.info(msg));
if (applied.length > 0) {
  logger.info({ count: applied.length, files: applied }, 'migrations_applied');
}
```

## Deployment Behavior

| Scenario | Behavior |
|----------|----------|
| Fresh DB (no objects) | All 10 migrations apply sequentially ✅ |
| DB with manual migrations | Auto-detected via PostgreSQL error codes → marked as applied ✅ |
| Re-deploy (all already applied) | All skip as "already applied" (~1s) ✅ |
| New migration added | Only the new file applies ✅ |
| Migration SQL has error | Transaction rolls back, server exits ✅ |

## Migration Files

```
packages/infra-db/migrations/
├── 001_enums.sql              # 7 enum types
├── 002_users_auth.sql         # users, auth_sessions, oauth_accounts
├── 003_workspaces.sql         # workspaces, memberships, assets
├── 004_sessions.sql           # sessions, artifacts, idempotency, crawl_data, snapshots
├── 005_quotas.sql             # quotas, credit_transactions
├── 006_platform_config.sql    # llm_models, api_services, tool_step_bindings
├── 007_conversations.sql      # conversations, messages
├── 008_seed_user.sql          # dev@flow-app.local (ON CONFLICT DO NOTHING)
├── 009_quotas_version.sql     # ALTER TABLE quotas ADD COLUMN version
└── 010_gamification.sql       # player_profiles, achievements, xp_transactions, challenges
```

## Verification

```
First run (local):  10 migrations applied / auto-detected
Second run (local): 10 migrations skip ("already applied")
Railway deploy:      10 migrations skip ("already applied") → Server started ✅
```

## Sources

- [[Database Schema]] — migration files documented
- [[CLAUDE.md]] — implementation context
- `packages/infra-db/src/migrate.ts` — source code
