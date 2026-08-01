import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

async function runMigrations(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Create migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Get already executed migrations
    const { rows: executed } = await pool.query('SELECT name FROM _migrations ORDER BY id');
    const executedNames = new Set(executed.map((r: any) => r.name));

    // Read migration files
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const pending = files.filter((f) => !executedNames.has(f));

    if (pending.length === 0) {
      console.log('All migrations already executed.');
      return;
    }

    console.log(`Found ${pending.length} pending migration(s):`);

    for (const file of pending) {
      console.log(`  Running: ${file}`);
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');

      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);

      console.log(`  ✓ ${file}`);
    }

    console.log(`\n${pending.length} migration(s) executed successfully.`);
  } finally {
    await pool.end();
  }
}

// Run if called directly
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

runMigrations(databaseUrl).catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
