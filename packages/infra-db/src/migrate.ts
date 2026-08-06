import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { DB } from './types';

/**
 * PostgreSQL error codes for "object already exists".
 * When a migration fails with one of these codes, we assume the migration
 * was applied manually and skip it.
 */
const ALREADY_EXISTS_CODES = new Set([
  '42710', // duplicate_object (CREATE TYPE, CREATE FUNCTION)
  '42P07', // duplicate_table
  '42P16', // duplicate_index
  '42701', // duplicate_column (ALTER TABLE ADD COLUMN)
  '42P06', // duplicate_schema
]);

function isAlreadyExistsError(err: unknown): boolean {
  // PostgreSQL errors have a `code` property (e.g., '42710' for duplicate_object)
  const code = (err as Record<string, unknown>)?.code;
  return typeof code === 'string' && ALREADY_EXISTS_CODES.has(code);
}

export async function runMigrations(
  db: Kysely<DB>,
  migrationsPath: string,
  log?: (msg: string) => void,
): Promise<string[]> {
  const applied: string[] = [];

  // Ensure tracking table exists (this is the only CREATE we run outside a migration file)
  await sql`
    CREATE TABLE IF NOT EXISTS migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `.execute(db);

  // Read migration files in order
  const files = fs
    .readdirSync(migrationsPath)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    // Skip already-recorded migrations
    const existing = await sql<{ name: string }>`
      SELECT name FROM migrations WHERE name = ${file}
    `.execute(db);

    if (existing.rows.length > 0) {
      log?.('[migrate] skip ' + file + ' (already applied)');
      continue;
    }

    const sqlContent = fs.readFileSync(path.join(migrationsPath, file), 'utf-8');

    try {
      await db.transaction().execute(async (trx) => {
        await sql.raw(sqlContent).execute(trx);
        await sql`INSERT INTO migrations (name) VALUES (${file})`.execute(trx);
      });

      applied.push(file);
      log?.('[migrate] applied ' + file);
    } catch (err) {
      if (isAlreadyExistsError(err)) {
        // Migration was applied manually — mark as applied and continue
        await sql`INSERT INTO migrations (name) VALUES (${file})
        ON CONFLICT (name) DO NOTHING`.execute(db);
        log?.('[migrate] skip ' + file + ' (objects already exist, marked as applied)');
        continue;
      }
      // Unknown error — rethrow and crash
      throw err;
    }
  }

  return applied;
}
