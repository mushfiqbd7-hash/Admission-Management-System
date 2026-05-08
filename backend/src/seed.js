// backend/src/seed.js
// Run with: node src/seed.js

import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pool from './config/database.js';

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_EMAIL and ADMIN_PASSWORD must be set in backend/.env or Render Environment Variables'
  );
}

async function seed() {
  const client = await pool.connect();

  try {
    console.log('Seeding database...');
    await client.query('BEGIN');

    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await client.query(
      `
      INSERT INTO users (email, password_hash, full_name, role, is_active)
      VALUES ($1, $2, $3, 'admin', true)
      ON CONFLICT (email)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = true
      `,
      [ADMIN_EMAIL, adminHash, 'System Administrator']
    );

    const {
      rows: [admin],
    } = await client.query('SELECT id FROM users WHERE email = $1', [
      ADMIN_EMAIL,
    ]);

    if (!admin) {
      throw new Error('Admin user was not created correctly');
    }

    await client.query('COMMIT');

    console.log('Seeding complete.');
    console.log(`Admin account created/updated: ${ADMIN_EMAIL}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();