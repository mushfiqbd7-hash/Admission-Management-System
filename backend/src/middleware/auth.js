// src/middleware/auth.js
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const queryToken = typeof req.query?.token === 'string' ? req.query.token : null;
    if (!authHeader?.startsWith('Bearer ') && !queryToken) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = queryToken || authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await query(
      `SELECT id, email,
         CASE WHEN role = 'admin' AND full_name = 'System Administrator'
              THEN 'Admin-Mushfiq'
              ELSE full_name
         END AS full_name,
         role, is_active
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (!rows[0] || !rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

export const requireAdmin = requireRole('admin');
