// Simple, dependency-light migration runner. Applies every .sql file in
// database/migrations, in filename order, tracking what's already run in a
// migrations_log table so it's safe to run repeatedly (e.g. on every deploy).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations_log (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const migrationsDir = path.join(__dirname, '..', '..', 'database', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const already = await pool.query('SELECT 1 FROM migrations_log WHERE filename = $1', [file]);
    if (already.rowCount > 0) {
      console.log(`skip (already applied): ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`applying: ${file}`);
    await pool.query(sql);
    await pool.query('INSERT INTO migrations_log (filename) VALUES ($1)', [file]);
  }

  console.log('All migrations applied.');
  await pool.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
