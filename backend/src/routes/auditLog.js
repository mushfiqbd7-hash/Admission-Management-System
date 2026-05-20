// src/routes/auditLog.js
import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import pool from '../config/database.js';

const router = express.Router();

router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, user_id, action, entity_type, date_from, date_to } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let i = 1;
    if (user_id)     { conditions.push(`al.user_id = $${i++}`);     params.push(user_id); }
    if (action)      { conditions.push(`al.action = $${i++}`);      params.push(action); }
    if (entity_type) { conditions.push(`al.entity_type = $${i++}`); params.push(entity_type); }
    if (date_from)   { conditions.push(`al.created_at >= $${i++}`); params.push(date_from); }
    if (date_to)     { conditions.push(`al.created_at <= $${i++}`); params.push(date_to); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT al.id, al.action, al.entity_type, al.entity_id, al.details, al.ip_address, al.created_at,
                u.full_name AS user_name, u.email AS user_email
         FROM audit_log al LEFT JOIN users u ON u.id = al.user_id
         ${where} ORDER BY al.created_at DESC LIMIT $${i++} OFFSET $${i++}`,
        [...params, parseInt(limit), offset]
      ),
      pool.query(`SELECT COUNT(*) FROM audit_log al ${where}`, params),
    ]);
    res.json({ data: dataResult.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Audit log error:', err);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

export default router;
