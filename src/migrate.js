// src/migrate.js  – run with: node src/migrate.js
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('🔄  Running database migrations...\n');

    // Ensure migration tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename   VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = join(__dirname, '../migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let applied = 0, skipped = 0, failed = 0;

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT filename FROM _migrations WHERE filename = $1', [file]
      );
      if (rows.length > 0) {
        console.log(`  ⏭️   Already applied: ${file}`);
        skipped++;
        continue;
      }

      console.log(`  ▶️   Applying: ${file} ...`);
      const sql = readFileSync(join(migrationsDir, file), 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)', [file]
        );
        await client.query('COMMIT');
        console.log(`  ✅  Done: ${file}`);
        applied++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ❌  Failed: ${file}`);
        console.error(`      ${err.message}`);
        failed++;
      }
    }

    console.log(`\n✅  Migration run complete.`);
    console.log(`    Applied: ${applied} | Skipped: ${skipped} | Failed: ${failed}`);

    if (failed > 0) {
      console.log('\n⚠️   Some migrations failed — your DB may be partially updated.');
      console.log('    Fix the migration files and run again.');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌  Fatal migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
