// src/utils/notifications.js
import { query } from '../config/database.js';
import { emitToUser, emitToAdmissionTeam } from '../socket.js';

/**
 * Create a single notification. Falls back gracefully if application_id
 * column doesn't exist yet (migration 009 not run).
 */
export const createNotification = async ({
  userId,
  applicationId = null,
  type = 'info',
  message,
  link = null,
}) => {
  try {
    const { rows: [notif] } = await query(
      `INSERT INTO notifications (user_id, application_id, type, message, link)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, applicationId || null, type, message, link || null]
    );
    // Real-time push
    emitToUser(userId, 'notification:new', notif);
    emitToUser(userId, 'notification:count_updated', {});
  } catch (err) {
    if (err.code === '42703') {
      try {
        await query(
          `INSERT INTO notifications (user_id, type, message, link) VALUES ($1, $2, $3, $4)`,
          [userId, type, message, link || null]
        );
      } catch (e2) { console.error('createNotification fallback error:', e2.message); }
    } else {
      console.error('createNotification error:', err.message);
    }
  }
};

/**
 * Notify all active admin and staff users.
 */
export const notifyAdminsAndStaff = async ({
  applicationId = null,
  type = 'info',
  message,
  link = null,
}) => {
  try {
    const { rows: staff } = await query(
      `SELECT id FROM users WHERE role IN ('admin','staff') AND is_active = TRUE`
    );
    for (const u of staff) {
      await createNotification({ userId: u.id, applicationId, type, message, link });
    }
    // Also broadcast to Socket.IO admission_team room
    emitToAdmissionTeam('notification:count_updated', {});
  } catch (err) {
    console.error('notifyAdminsAndStaff error:', err.message);
  }
};

/**
 * Human-readable status label.
 */
export const statusLabel = (status) => {
  const map = {
    draft:         'Draft',
    pending:       'Pending Review',
    approved:      'Approved',
    revoked:       'Revoked',
    processing:    'Processing',
    pre_admission: 'Pre-Admission',
    admitted:      'Admitted',
    rejected:      'Rejected',
  };
  return map[status] || status;
};
