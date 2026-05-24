// src/migrate.js - run with: node src/migrate.js

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
    console.log('Running database migrations...\n');

    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename   VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = join(__dirname, '../migrations');
    const files = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT filename FROM _migrations WHERE filename = $1',
        [file]
      );

      if (rows.length > 0) {
        console.log(`  SKIP Already applied: ${file}`);
        continue;
      }

      console.log(`  APPLY ${file} ...`);

      const sql = readFileSync(join(migrationsDir, file), 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [
          file,
        ]);
        await client.query('COMMIT');

        console.log(`  DONE ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');

        console.error(`  FAILED ${file}`);
        console.error(`  ${err.message}`);

        throw err;
      }
    }

    console.log('\nMigration run complete.');

    // Clean up expired unused invite tokens
    try {
      const { rowCount } = await client.query(
        `DELETE FROM application_invite_tokens WHERE used_at IS NULL AND expires_at <= NOW()`
      );
      if (rowCount > 0) console.log(`  CLEANUP Deleted ${rowCount} expired invite token(s).`);
    } catch (_) { /* table may not exist yet on first run - ignore */ }

    // Prune expired refresh tokens
    try {
      const { rowCount } = await client.query(
        `DELETE FROM refresh_tokens WHERE expires_at <= NOW()`
      );
      if (rowCount > 0) console.log(`  CLEANUP Deleted ${rowCount} expired refresh token(s).`);
    } catch (_) { /* table may not exist yet - ignore */ }

    // Delete read notifications older than 30 days
    try {
      const { rowCount } = await client.query(
        `DELETE FROM notifications WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '30 days'`
      );
      if (rowCount > 0) console.log(`  CLEANUP Deleted ${rowCount} old notification(s).`);
    } catch (_) { /* table may not exist yet - ignore */ }

    // Null out abandoned draft file_data bytea (draft > 7 days, never pushed to Azure)
    try {
      const { rowCount } = await client.query(`
        UPDATE student_documents SET file_data = NULL
        WHERE file_data IS NOT NULL AND file_path IS NULL
          AND student_id IN (
            SELECT id FROM students WHERE application_status = 'draft'
              AND created_at < NOW() - INTERVAL '7 days'
          )
      `);
      if (rowCount > 0) console.log(`  CLEANUP Nulled file_data on ${rowCount} abandoned draft document(s).`);
    } catch (_) { /* table may not exist yet - ignore */ }

  } catch (err) {
    console.error('\nMigration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
