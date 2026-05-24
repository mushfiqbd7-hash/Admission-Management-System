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

const displayNameFor = (user) =>
  user?.role === 'admin' && user?.full_name === 'System Administrator'
    ? process.env.ADMIN_DISPLAY_NAME || 'Admin'
    : user?.full_name;

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

    // Block login if email not verified
    if (!user.is_verified) {
      return res.status(403).json({
        error: 'Please verify your email address before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
    }

    let valid = false;

    const usesLegacyPlaintext =
      (!user.password_hash || user.password_hash === 'PLAINTEXT') && user.password;

    if (user.password_hash && user.password_hash !== 'PLAINTEXT') {
      valid = await bcrypt.compare(password, user.password_hash);
    } else if (usesLegacyPlaintext) {
      valid = password === user.password;
    }

    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Auto-upgrade old plaintext accounts after successful login.
    if (usesLegacyPlaintext) {
      const upgradedHash = await bcrypt.hash(password, 12);

      await query(
        `
        UPDATE users
        SET password_hash = $1,
            password = NULL
        WHERE id = $2
        `,
        [upgradedHash, user.id]
      );
    }

    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Prune this user's expired refresh tokens on each login
    await query('DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at <= NOW()', [user.id]);

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
        id:         user.id,
        email:      user.email,
        full_name:  displayNameFor(user),
        role:       user.role,
        avatar_url: user.avatar_url || null,
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

    // Delete old refresh token
    await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hash]);
    // Issue new refresh token
    const newRefresh = signRefreshToken();
    const newRefreshHash = crypto.createHash('sha256').update(newRefresh).digest('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [rows[0].user_id, newRefreshHash, newExpiresAt]);
    const newAccess = signAccessToken(rows[0].uid, rows[0].role);
    res.json({ accessToken: newAccess, refreshToken: newRefresh });
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
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMe = async (req, res) => {
  res.json({ user: req.user });
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
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

    const newHash = await bcrypt.hash(newPassword, 12);

    await query(
      `
      UPDATE users
      SET password_hash = $1,
          password = NULL
      WHERE id = $2
      `,
      [newHash, req.user.id]
    );

    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('changePassword error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
