import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

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
    const executedNames = new Set(executed.map((r: { name: string }) => r.name));

    // Read migration files
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const pending = files.filter((f) => !executedNames.has(f));

    if (pending.length === 0) {
      log('All migrations already executed.');
      return;
    }

    log(`Found ${pending.length} pending migration(s):`);

    for (const file of pending) {
      log(`  Running: ${file}`);
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');

      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);

      log(`  ✓ ${file}`);
    }

    log(`\n${pending.length} migration(s) executed successfully.`);
  } finally {
    await pool.end();
  }
}

// Run if called directly
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  process.stderr.write('DATABASE_URL environment variable is required\n');
  process.exit(1);
}

runMigrations(databaseUrl).catch((err) => {
  process.stderr.write(`Migration failed: ${err.message}\n`);
  process.exit(1);
});
