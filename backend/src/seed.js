// backend/src/seed.js
// Run with: node src/seed.js
//
// Required environment variables:
// - ADMIN_EMAIL: initial admin login email
// - ADMIN_PASSWORD: initial admin password
// - ADMIN_DISPLAY_NAME: optional display name for the seeded admin

import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pool from './config/database.js';

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_DISPLAY_NAME = process.env.ADMIN_DISPLAY_NAME || 'Admin';

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
      INSERT INTO users (
        email,
        password_hash,
        password,
        full_name,
        role,
        is_active,
        is_verified,
        verification_token,
        verification_token_expires_at
      )
      VALUES ($1, $2, NULL, $3, 'admin', true, true, NULL, NULL)
      ON CONFLICT (email)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        password = NULL,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = true,
        is_verified = true,
        verification_token = NULL,
        verification_token_expires_at = NULL
      `,
      [ADMIN_EMAIL.toLowerCase().trim(), adminHash, ADMIN_DISPLAY_NAME]
    );

    const {
      rows: [admin],
    } = await client.query('SELECT id, email, is_verified FROM users WHERE email = $1', [
      ADMIN_EMAIL.toLowerCase().trim(),
    ]);

    if (!admin) {
      throw new Error('Admin user was not created correctly');
    }

    if (!admin.is_verified) {
      throw new Error('Admin user was created but not verified');
    }

    await client.query('COMMIT');

    console.log('Seeding complete.');
    console.log(`Admin account created/updated: ${admin.email}`);
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
