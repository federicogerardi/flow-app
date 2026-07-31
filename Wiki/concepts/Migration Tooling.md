---
type: concept
tags:
  - wiki/concept
  - wiki/infrastructure
date_updated: 2026-07-30
source_count: 0
confidence: high
---

# Migration Tooling

> Database migration runner for `packages/infra-db`  
> Via Kysely + tsx, no external CLI needed

## Principle

SQL migrations already exist in `packages/infra-db/migrations/`. We need a minimal runner that executes them in order. Kysely doesn't include a built-in runner — we use a simple TypeScript script.

## Directory Structure

```
packages/infra-db/
├── src/
│   ├── migrate.ts          # Migration runner
│   └── types.ts            # Kysely DB type (auto-generated)
├── migrations/
│   ├── 001_enums.sql
│   ├── 002_users_auth.sql
│   ├── 003_workspaces_assets.sql
│   ├── 004_sessions_artifacts.sql
│   ├── 005_quotas.sql
│   └── 006_platform_config.sql
└── package.json
```

## Migration Runner

```typescript
// packages/infra-db/src/migrate.ts

import fs from 'node:fs/promises';
import path from 'node:path';
import { Kysely, sql, type Migration, type MigrationProvider } from 'kysely';
import { Pool } from 'pg';
import { PostgresDialect } from 'kysely';

class FileMigrationProvider implements MigrationProvider {
  constructor(private migrationsPath: string) {}

  async getMigrations(): Promise<Record<string, Migration>> {
    const files = await fs.readdir(this.migrationsPath);
    const migrations: Record<string, Migration> = {};

    for (const file of files.sort()) {
      if (!file.endsWith('.sql')) continue;
      const sqlContent = await fs.readFile(path.join(this.migrationsPath, file), 'utf-8');
      const name = file.replace('.sql', '');

      migrations[name] = {
        up: async (db) => {
          await sql.raw(sqlContent).execute(db);
        },
        // Down migrations: optional — not implemented for now
      };
    }

    return migrations;
  }
}

async function runMigrations() {
  const db = new Kysely({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString: process.env.DATABASE_URL! }),
    }),
  });

  // Create migrations table if not exists
  await sql`
    CREATE TABLE IF NOT EXISTS kysely_migrations (
      name VARCHAR(255) PRIMARY KEY,
      run_at TIMESTAMPTZ DEFAULT NOW()
    )
  `.execute(db);

  const provider = new FileMigrationProvider(
    path.resolve(__dirname, '../migrations')
  );

  const { results, error } = await db.migration.migrateToLatest({ provider });

  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  if (results && results.length > 0) {
    console.log(`Applied ${results.length} migration(s):`);
    for (const r of results) {
      console.log(`  ✓ ${r.migrationName} (${r.direction})`);
    }
  } else {
    console.log('No pending migrations.');
  }

  await db.destroy();
}

const command = process.argv[2];

switch (command) {
  case 'up':
    await runMigrations();
    break;
  default:
    console.log('Usage: tsx src/migrate.ts up');
    process.exit(1);
}
```

## Package Scripts

```json
// packages/infra-db/package.json
{
  "scripts": {
    "migrate:up": "tsx src/migrate.ts up",
    "migrate:create": "tsx src/migrate.ts create",
    "codegen": "kysely-codegen --dialect postgres --out-file src/types.ts --url \"$DATABASE_URL\""
  }
}
```

## CI Integration

```yaml
# .github/workflows/deploy.yml

jobs:
  deploy:
    steps:
      - run: npm ci
      - run: npm run migrate:up --workspace=packages/infra-db
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - run: npm run build
```

## Sources

- [[Database Schema]] — migration files documented
- [[Environment Configuration]] — DATABASE_URL