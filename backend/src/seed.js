// backend/src/seed.js
// Run with: node src/seed.js

import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pool from './config/database.js';

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const STAFF_EMAIL = process.env.STAFF_EMAIL;
const STAFF_PASSWORD = process.env.STAFF_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !STAFF_EMAIL || !STAFF_PASSWORD) {
  throw new Error(
    'ADMIN_EMAIL, ADMIN_PASSWORD, STAFF_EMAIL, and STAFF_PASSWORD must be set in backend/.env or Render Environment Variables'
  );
}

async function seed() {
  const client = await pool.connect();

  try {
    console.log('Seeding database...');
    await client.query('BEGIN');

    // Admin user
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

    // Staff user
    const staffHash = await bcrypt.hash(STAFF_PASSWORD, 12);

    await client.query(
      `
      INSERT INTO users (email, password_hash, full_name, role, is_active)
      VALUES ($1, $2, $3, 'staff', true)
      ON CONFLICT (email)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = true
      `,
      [STAFF_EMAIL, staffHash, 'Jane Staff']
    );

    // Get admin ID for sample students
    const {
      rows: [admin],
    } = await client.query('SELECT id FROM users WHERE email = $1', [
      ADMIN_EMAIL,
    ]);

    if (!admin) {
      throw new Error('Admin user was not created correctly');
    }

    // Sample students
    const students = [
      {
        family_name: 'Hassan',
        given_name: 'Ahmad',
        nationality: 'Pakistani',
        email: 'ahmad.hassan@example.com',
        mobile: '+92 300 1234567',
        target_university: 'Beijing University of Technology',
        degree_level: 'master',
        passport_number: 'AB1234567',
        application_status: 'pending',
        priority: 'high',
        gender: 'male',
      },
      {
        family_name: 'Malik',
        given_name: 'Fatima',
        nationality: 'Pakistani',
        email: 'fatima.malik@example.com',
        mobile: '+92 321 9876543',
        target_university: 'Tsinghua University',
        degree_level: 'bachelor',
        passport_number: 'CD2345678',
        application_status: 'approved',
        priority: 'normal',
        gender: 'female',
      },
      {
        family_name: 'Singh',
        given_name: 'Rahul',
        nationality: 'Indian',
        email: 'rahul.singh@example.com',
        mobile: '+91 99001 23456',
        target_university: 'Fudan University',
        degree_level: 'phd',
        passport_number: 'EF3456789',
        application_status: 'processing',
        priority: 'normal',
        gender: 'male',
      },
      {
        family_name: 'Rahman',
        given_name: 'Nadia',
        nationality: 'Bangladeshi',
        email: 'nadia.rahman@example.com',
        mobile: '+880 1711 234567',
        target_university: 'Shanghai Jiao Tong University',
        degree_level: 'master',
        passport_number: 'GH4567890',
        application_status: 'pending',
        priority: 'high',
        gender: 'female',
      },
    ];

    for (const student of students) {
      await client.query(
        `
        INSERT INTO students
          (
            family_name,
            given_name,
            nationality,
            email,
            mobile,
            target_university,
            degree_level,
            passport_number,
            application_status,
            priority,
            gender,
            created_by
          )
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT DO NOTHING
        `,
        [
          student.family_name,
          student.given_name,
          student.nationality,
          student.email,
          student.mobile,
          student.target_university,
          student.degree_level,
          student.passport_number,
          student.application_status,
          student.priority,
          student.gender,
          admin.id,
        ]
      );
    }

    await client.query('COMMIT');

    console.log('Seeding complete.');
    console.log(`Admin account created/updated: ${ADMIN_EMAIL}`);
    console.log(`Staff account created/updated: ${STAFF_EMAIL}`);
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