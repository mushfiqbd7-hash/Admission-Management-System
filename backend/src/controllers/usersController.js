// src/controllers/usersController.js
import { query } from '../config/database.js';

// ── POST /api/auth/register  (public – no auth required) ────────────────────
// Allows Agent, Staff, and Student users to self-register.
export const register = async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;

    // Validate role – only agent, staff, or student allowed via self-registration
    if (!['agent', 'staff', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "agent", "staff", or "student"' });
    }

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'full_name, email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for duplicate email
    const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Insert new user – password stored as plaintext per requirements
    // password_hash is set to a placeholder so the NOT NULL constraint is satisfied
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, password, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, email, full_name, role`,
      [normalizedEmail, 'PLAINTEXT', password, full_name.trim(), role]
    );

    res.status(201).json({
      message: 'Account created successfully',
      user: rows[0],
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── GET /api/users  (Admin: all users | Agent/Staff/Student: own account only) ──
export const listUsers = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const { rows } = await query(
        `SELECT id, email, full_name, role, is_active, last_login, created_at
         FROM users ORDER BY created_at DESC`
      );
      return res.json({ users: rows });
    }

    // Non-admin: return only own record
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

// ── POST /api/users  (Admin only – create any user) ──────────────────────────
export const createUser = async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;

    if (!['admin', 'staff', 'agent', 'student', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const { rows } = await query(
      `INSERT INTO users (email, password_hash, password, full_name, role)
       VALUES ($1, 'PLAINTEXT', $2, $3, $4)
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

// ── PUT /api/users/:id  (Admin: any user | others: own account only) ─────────
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

// ── DELETE /api/users/:id  (Admin only) ──────────────────────────────────────
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
