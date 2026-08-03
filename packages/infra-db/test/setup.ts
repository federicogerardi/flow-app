import { createDatabase } from '../src/database.js';
import type { Kysely } from 'kysely';
import type { DB } from '../src/types.js';

let testDb: Kysely<DB> | null = null;

export function createTestDb(): Kysely<DB> {
  if (!testDb) {
    const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://flow_app:flow_app@localhost:5432/flow_app';
    testDb = createDatabase(databaseUrl);
  }
  return testDb;
}

export async function destroyTestDb(): Promise<void> {
  if (testDb) {
    await testDb.destroy();
    testDb = null;
  }
}
