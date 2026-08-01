import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { DB } from './types';

export function createDatabase(databaseUrl: string): Kysely<DB> {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 20,
  });

  return new Kysely<DB>({
    dialect: new PostgresDialect({ pool }),
  });
}
