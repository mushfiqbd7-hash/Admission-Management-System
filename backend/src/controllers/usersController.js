// src/controllers/usersController.js
import crypto from 'crypto';
import { query } from '../config/database.js';
import { sendVerificationEmail } from '../utils/emailService.js';

// ── POST /api/auth/register  (public) ──────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;

    if (!['agent', 'staff', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "agent", "staff", or "student"' });
    }
    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'full_name, email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { rows } = await query(
      `INSERT INTO users
         (email, password_hash, password, full_name, role, is_active,
          is_verified, verification_token, verification_token_expires_at)
       VALUES ($1, $2, $3, $4, $5, true, false, $6, $7)
       RETURNING id, email, full_name, role`,
      [normalizedEmail, 'PLAINTEXT', password, full_name.trim(), role,
       verificationToken, tokenExpiresAt]
    );

    // Send verification email (non-blocking — don't fail registration if email fails)
    sendVerificationEmail(normalizedEmail, verificationToken).catch(err =>
      console.error('Failed to send verification email:', err)
    );

    res.status(201).json({
      message: 'Account created. Please check your email to verify your account before logging in.',
      user: rows[0],
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── GET /api/auth/verify-email?token=xxx  (public) ─────────────────────────
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const { rows } = await query(
      `SELECT id FROM users
       WHERE verification_token = $1
         AND is_verified = false
         AND verification_token_expires_at > NOW()`,
      [token]
    );

    if (!rows[0]) {
      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }

    await query(
      `UPDATE users
       SET is_verified = true,
           verification_token = NULL,
           verification_token_expires_at = NULL
       WHERE id = $1`,
      [rows[0].id]
    );

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── POST /api/auth/resend-verification  (public) ───────────────────────────
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();
    const { rows } = await query(
      'SELECT id FROM users WHERE email = $1 AND is_verified = false',
      [normalizedEmail]
    );

    // Always return success to prevent email enumeration
    if (!rows[0]) {
      return res.json({ message: 'If that email exists and is unverified, a new link has been sent.' });
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(
      `UPDATE users
       SET verification_token = $1, verification_token_expires_at = $2
       WHERE id = $3`,
      [newToken, newExpiry, rows[0].id]
    );

    sendVerificationEmail(normalizedEmail, newToken).catch(err =>
      console.error('Failed to resend verification email:', err)
    );

    res.json({ message: 'If that email exists and is unverified, a new link has been sent.' });
  } catch (err) {
    console.error('Resend verification error:', err);
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
    const normalizedEmail = email.toLowerCase().trim();
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, password, full_name, role, is_verified)
       VALUES ($1, 'PLAINTEXT', $2, $3, $4, true)
       RETURNING id, email, full_name, role`,
      [normalizedEmail, password, full_name.trim(), role]
    );
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── PUT /api/users/:id ───────────────────────────────────────────────────────
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ error: 'You can only update your own account' });
    }
    const { full_name, role, is_active, password } = req.body;
    const safeRole     = req.user.role === 'admin' ? (role || null) : null;
    const safeIsActive = req.user.role === 'admin' ? (is_active ?? null) : null;
    const { rows } = await query(
      `UPDATE users SET
         full_name = COALESCE($1, full_name),
         role      = COALESCE($2, role),
         is_active = COALESCE($3, is_active),
         password  = COALESCE($4, password)
       WHERE id = $5
       RETURNING id, email, full_name, role, is_active`,
      [full_name || null, safeRole, safeIsActive, password || null, id]
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
