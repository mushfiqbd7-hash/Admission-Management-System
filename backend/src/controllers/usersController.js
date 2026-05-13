// src/controllers/usersController.js
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { sendVerificationEmail } from '../utils/emailService.js';

// ── POST /api/auth/register  (public) ──────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;

    // Public registration must NOT allow staff/admin accounts.
    if (!['agent', 'student'].includes(role)) {
      return res.status(400).json({
        error: 'Public registration is only allowed for agent or student accounts',
      });
    }

    if (!full_name || !email || !password) {
      return res.status(400).json({
        error: 'full_name, email and password are required',
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await query('SELECT id FROM users WHERE email = $1', [
      normalizedEmail,
    ]);

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'An account with this email already exists',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { rows } = await query(
      `
      INSERT INTO users
        (email, password_hash, full_name, role, is_active,
         is_verified, verification_token, verification_token_expires_at)
      VALUES
        ($1, $2, $3, $4, true, false, $5, $6)
      RETURNING id, email, full_name, role
      `,
      [
        normalizedEmail,
        passwordHash,
        full_name.trim(),
        role,
        verificationToken,
        tokenExpiresAt,
      ]
    );

    sendVerificationEmail(normalizedEmail, verificationToken).catch((err) =>
      console.error('Failed to send verification email:', err)
    );

    res.status(201).json({
      message:
        'Account created. Please check your email to verify your account before logging in.',
      user: rows[0],
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── GET /api/users ──────────────────────────────────────────────────────────
export const listUsers = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const { rows } = await query(
        `SELECT id, email, full_name, role, is_active, last_login, created_at
         FROM users ORDER BY created_at DESC`
      );
      return res.json({ users: rows });
    }
    const { rows } = await query(
      `SELECT id, email, full_name, role, is_active, last_login, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    return res.json({ users: rows });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/users  (Admin only) ───────────────────────────────────────────
export const createUser = async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;

    if (!['admin', 'staff', 'agent', 'student', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (!email || !password || !full_name) {
      return res.status(400).json({
        error: 'email, password and full_name are required',
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(password, 12);

    const { rows } = await query(
      `
      INSERT INTO users
        (email, password_hash, full_name, role, is_active, is_verified)
      VALUES
        ($1, $2, $3, $4, true, true)
      RETURNING id, email, full_name, role, is_active
      `,
      [normalizedEmail, passwordHash, full_name.trim(), role]
    );

    res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }

    console.error('Create user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── PUT /api/users/:id ───────────────────────────────────────────────────────
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user.id === id;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        error: 'You can only update your own account',
      });
    }

    const { full_name, role, is_active, password } = req.body;

    const updates = [];
    const params = [];

    if (full_name !== undefined) {
      if (!String(full_name).trim()) {
        return res.status(400).json({ error: 'Full name cannot be empty' });
      }

      params.push(String(full_name).trim());
      updates.push(`full_name = $${params.length}`);
    }

    // Only admin can change role, active status, or reset password
    if (isAdmin) {
      if (role !== undefined) {
        if (!['admin', 'staff', 'agent', 'student', 'viewer'].includes(role)) {
          return res.status(400).json({ error: 'Invalid role' });
        }

        params.push(role);
        updates.push(`role = $${params.length}`);
      }

      if (is_active !== undefined) {
        params.push(Boolean(is_active));
        updates.push(`is_active = $${params.length}`);
      }

      if (password !== undefined) {
        if (String(password).length < 6) {
          return res.status(400).json({
            error: 'Password must be at least 6 characters',
          });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        params.push(passwordHash);
        updates.push(`password_hash = $${params.length}`);

        // Clear old plaintext password column if it exists.
        updates.push(`password = NULL`);
      }
    }

    if (!updates.length) {
      const { rows } = await query(
        `
        SELECT id, email, full_name, role, is_active, last_login, created_at
        FROM users
        WHERE id = $1
        `,
        [id]
      );

      if (!rows[0]) return res.status(404).json({ error: 'User not found' });

      return res.json({ user: rows[0] });
    }

    params.push(id);

    const { rows } = await query(
      `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${params.length}
      RETURNING id, email, full_name, role, is_active
      `,
      params
    );

    if (!rows[0]) return res.status(404).json({ error: 'User not found' });

    res.json({ user: rows[0] });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── DELETE /api/users/:id  (Admin only) ─────────────────────────────────────
export const deleteUser = async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  try {
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

