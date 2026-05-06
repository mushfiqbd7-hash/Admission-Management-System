// src/controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/database.js';

const signAccessToken  = (userId, role) =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

const signRefreshToken = () => crypto.randomBytes(64).toString('hex');

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { rows } = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase().trim()]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Support both bcrypt-hashed passwords (admin-seeded) and
    // plaintext passwords (self-registered Agent / Staff users)
    let valid = false;
    if (user.password_hash && user.password_hash !== 'PLAINTEXT') {
      // Legacy / admin-created users with bcrypt hash
      valid = await bcrypt.compare(password, user.password_hash);
    } else if (user.password) {
      // Self-registered users with plaintext password
      valid = password === user.password;
    }

    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const accessToken  = signAccessToken(user.id, user.role);
    const refreshToken = signRefreshToken();
    const refreshHash  = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshHash, expiresAt]
    );

    res.json({
      accessToken,
      refreshToken,
      user: {
        id:        user.id,
        email:     user.email,
        full_name: user.full_name,
        role:      user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const { rows } = await query(
      `SELECT rt.*, u.id as uid, u.role, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token_hash = $1 AND rt.expires_at > NOW()`,
      [hash]
    );

    if (!rows[0] || !rows[0].is_active) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const newAccess = signAccessToken(rows[0].uid, rows[0].role);
    res.json({ accessToken: newAccess });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hash]);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error' });;
  }
};

export const getMe = async (req, res) => {
  res.json({ user: req.user });
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { rows } = await query(
      'SELECT password_hash, password FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = rows[0];
    let valid = false;
    if (user.password_hash && user.password_hash !== 'PLAINTEXT') {
      valid = await bcrypt.compare(currentPassword, user.password_hash);
    } else if (user.password) {
      valid = currentPassword === user.password;
    }

    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    // For self-registered users keep plaintext; for bcrypt users re-hash
    if (user.password_hash && user.password_hash !== 'PLAINTEXT') {
      const newHash = await bcrypt.hash(newPassword, 12);
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);
    } else {
      await query('UPDATE users SET password = $1 WHERE id = $2', [newPassword, req.user.id]);
    }

    // Invalidate all refresh tokens
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Change Email ───────────────────────────────────────────────────────────────
export const changeEmail = async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body;

    if (!newEmail || !currentPassword) {
      return res.status(400).json({ error: 'Email and current password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check duplicate
    const { rows: existing } = await query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [newEmail.trim().toLowerCase(), req.user.id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'This email is already in use by another account' });
    }

    // Verify current password
    const { rows } = await query(
      'SELECT password_hash, password FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = rows[0];
    let valid = false;
    if (user.password_hash && user.password_hash !== 'PLAINTEXT') {
      valid = await bcrypt.compare(currentPassword, user.password_hash);
    } else if (user.password) {
      valid = currentPassword === user.password;
    }
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    // Update email
    await query(
      'UPDATE users SET email = $1 WHERE id = $2',
      [newEmail.trim().toLowerCase(), req.user.id]
    );

    res.json({ message: 'Email updated successfully', email: newEmail.trim().toLowerCase() });
  } catch (err) {
    console.error('changeEmail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
