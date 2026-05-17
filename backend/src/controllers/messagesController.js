// src/controllers/messagesController.js
import { query } from '../config/database.js';
import { emitToUser, emitToAdmissionTeam } from '../socket.js';
import multer from 'multer';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const msgUploadDir = join(__dirname, '../../uploads/messages');
if (!existsSync(msgUploadDir)) mkdirSync(msgUploadDir, { recursive: true });

// ── Multer for message attachments ────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, msgUploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
  if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
  else cb(new Error('Invalid file type'));
};
export const uploadAttachment = multer({
  storage, fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ── Helpers ───────────────────────────────────────────────────
const isAdmissionTeam = (role) => ['admin', 'staff'].includes(role);

// ── Get applications for compose dropdown ─────────────────────
export const getApplicationsForDropdown = async (req, res) => {
  try {
    let rows;
    if (isAdmissionTeam(req.user.role)) {
      // Admin/staff see all non-draft applications
      ({ rows } = await query(`
        SELECT s.id, s.application_number, s.passport_number,
               s.given_name, s.family_name
        FROM students s
        WHERE s.application_status != 'draft'
        ORDER BY s.created_at DESC
      `));
    } else {
      // Student/agent see only their own
      ({ rows } = await query(`
        SELECT s.id, s.application_number, s.passport_number,
               s.given_name, s.family_name
        FROM students s
        WHERE s.created_by = $1
        ORDER BY s.created_at DESC
      `, [req.user.id]));
    }

    const apps = rows.map(r => ({
      id:    r.id,
      label: `${r.application_number || 'No App No.'} - ${r.passport_number || 'No Passport'} - ${r.given_name} ${r.family_name}`,
    }));
    res.json(apps);
  } catch (err) {
    console.error('getApplicationsForDropdown error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Send message ──────────────────────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const { application_id, subject, body } = req.body;
    const files = req.files || [];

    if (!application_id?.trim()) return res.status(400).json({ error: 'Application is required' });
    if (!subject?.trim())        return res.status(400).json({ error: 'Subject is required' });
    if (!body?.trim())           return res.status(400).json({ error: 'Message body is required' });

    // Validate application access
    if (!isAdmissionTeam(req.user.role)) {
      const { rows: own } = await query(
        'SELECT id FROM students WHERE id = $1 AND created_by = $2',
        [application_id, req.user.id]
      );
      if (!own[0]) return res.status(403).json({ error: 'Access denied to this application' });
    }

    let recipientId   = null;
    let recipientGroup = null;

    if (!isAdmissionTeam(req.user.role)) {
      // Student/agent → send to admission_team group
      recipientGroup = 'admission_team';
    } else {
      // Admin/staff → reply to application owner
      const { rows: appRows } = await query(
        'SELECT created_by FROM students WHERE id = $1',
        [application_id]
      );
      if (appRows[0]?.created_by) {
        recipientId = appRows[0].created_by;
      }
    }

    // Insert message
    const { rows: [msg] } = await query(`
      INSERT INTO messages
        (sender_id, recipient_id, recipient_group, application_id, subject, body)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.user.id, recipientId, recipientGroup, application_id, subject.trim(), body.trim()]);

    // Save attachments
    for (const file of files) {
      await query(`
        INSERT INTO message_attachments
          (message_id, original_name, stored_name, file_path, mime_type, size)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [msg.id, file.originalname, file.filename, file.path, file.mimetype, file.size]);
    }

    // Fetch sender info for real-time emit
    const msgWithSender = {
      ...msg,
      sender_name:  req.user.full_name,
      sender_email: req.user.email,
      sender_role:  req.user.role,
      attachments:  files.map(f => ({ original_name: f.originalname, size: f.size })),
    };

    // Real-time: notify recipients
    if (recipientGroup === 'admission_team') {
      // Student/agent sent to team
      emitToAdmissionTeam('message:new', msgWithSender);

      // Also create DB notifications for each admin/staff
      const { rows: staff } = await query(
        `SELECT id FROM users WHERE role IN ('admin','staff') AND is_active = TRUE`
      );
      for (const u of staff) {
        await query(
          `INSERT INTO notifications (user_id, application_id, type, message, link)
           VALUES ($1, $2, 'info', $3, $4)`,
          [u.id, application_id,
           `New message from ${req.user.full_name}: ${subject}`,
           `/students/${application_id}`]
        ).catch(() => {});

        emitToUser(u.id, 'notification:new', {
          type: 'info',
          message: `New message from ${req.user.full_name}: ${subject}`,
          application_id,
        });
      }
    } else if (recipientId) {
      // Admin/staff reply to application owner
      emitToUser(recipientId, 'message:new', msgWithSender);

      await query(
        `INSERT INTO notifications (user_id, application_id, type, message, link)
         VALUES ($1, $2, 'info', $3, $4)`,
        [recipientId, application_id,
         `Reply from ${req.user.full_name}: ${subject}`,
         `/students/${application_id}`]
      ).catch(() => {});

      emitToUser(recipientId, 'notification:new', {
        type: 'info',
        message: `Reply from ${req.user.full_name}: ${subject}`,
        application_id,
      });
    }

    res.status(201).json({ message: msg, attachments: files.length });
  } catch (err) {
    console.error('sendMessage error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Get inbox ─────────────────────────────────────────────────
export const getInbox = async (req, res) => {
  try {
    let rows;
    if (isAdmissionTeam(req.user.role)) {
      // Admin/staff see messages addressed to admission_team OR directly to them
      ({ rows } = await query(`
        SELECT m.*,
          CASE WHEN s.role = 'admin' AND s.full_name = 'System Administrator'
               THEN 'Admin-Mushfiq' ELSE s.full_name END AS sender_name,
          s.email      AS sender_email,
          s.role       AS sender_role,
          CASE WHEN r.role = 'admin' AND r.full_name = 'System Administrator'
               THEN 'Admin-Mushfiq' ELSE r.full_name END AS recipient_name,
          r.role       AS recipient_role,
          st.application_number, st.given_name, st.family_name, st.passport_number
        FROM messages m
        JOIN users s ON m.sender_id = s.id
        LEFT JOIN users r ON m.recipient_id = r.id
        LEFT JOIN students st ON m.application_id = st.id
        WHERE (m.recipient_group = 'admission_team' OR m.recipient_id = $1)
          AND m.deleted_by_recipient = FALSE
        ORDER BY m.created_at DESC
      `, [req.user.id]));
    } else {
      // Student/agent see messages sent directly to them
      ({ rows } = await query(`
        SELECT m.*,
          CASE WHEN s.role = 'admin' AND s.full_name = 'System Administrator'
               THEN 'Admin-Mushfiq' ELSE s.full_name END AS sender_name,
          s.email      AS sender_email,
          s.role       AS sender_role,
          CASE WHEN r.role = 'admin' AND r.full_name = 'System Administrator'
               THEN 'Admin-Mushfiq' ELSE r.full_name END AS recipient_name,
          r.role       AS recipient_role,
          st.application_number, st.given_name, st.family_name, st.passport_number
        FROM messages m
        JOIN users s ON m.sender_id = s.id
        LEFT JOIN users r ON m.recipient_id = r.id
        LEFT JOIN students st ON m.application_id = st.id
        WHERE m.recipient_id = $1
          AND m.deleted_by_recipient = FALSE
        ORDER BY m.created_at DESC
      `, [req.user.id]));
    }

    // Attach attachment counts
    for (const msg of rows) {
      const { rows: atts } = await query(
        'SELECT id, original_name, size FROM message_attachments WHERE message_id = $1',
        [msg.id]
      );
      msg.attachments = atts;
    }

    res.json(rows);
  } catch (err) {
    console.error('getInbox error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Get sent ──────────────────────────────────────────────────
export const getSent = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT m.*,
        CASE WHEN s.role = 'admin' AND s.full_name = 'System Administrator'
             THEN 'Admin-Mushfiq' ELSE s.full_name END AS sender_name,
        s.email      AS sender_email,
        CASE WHEN r.role = 'admin' AND r.full_name = 'System Administrator'
             THEN 'Admin-Mushfiq' ELSE r.full_name END AS recipient_name,
        r.role       AS recipient_role,
        st.application_number, st.given_name, st.family_name, st.passport_number
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      LEFT JOIN users r ON m.recipient_id = r.id
      LEFT JOIN students st ON m.application_id = st.id
      WHERE m.sender_id = $1
        AND m.deleted_by_sender = FALSE
      ORDER BY m.created_at DESC
    `, [req.user.id]);

    for (const msg of rows) {
      const { rows: atts } = await query(
        'SELECT id, original_name, size FROM message_attachments WHERE message_id = $1',
        [msg.id]
      );
      msg.attachments = atts;
    }

    res.json(rows);
  } catch (err) {
    console.error('getSent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Mark message read ─────────────────────────────────────────
export const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (isAdmissionTeam(req.user.role)) {
      await query(
        `UPDATE messages SET is_read = TRUE, read_at = NOW()
         WHERE id = $1 AND (recipient_group = 'admission_team' OR recipient_id = $2)`,
        [id, req.user.id]
      );
    } else {
      await query(
        'UPDATE messages SET is_read = TRUE, read_at = NOW() WHERE id = $1 AND recipient_id = $2',
        [id, req.user.id]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('markRead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Delete message ────────────────────────────────────────────
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    await query(`
      UPDATE messages
      SET deleted_by_sender    = CASE WHEN sender_id    = $2 THEN TRUE ELSE deleted_by_sender    END,
          deleted_by_recipient = CASE WHEN recipient_id = $2 THEN TRUE ELSE deleted_by_recipient END
      WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)
    `, [id, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteMessage error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Download attachment ───────────────────────────────────────
export const downloadAttachment = async (req, res) => {
  try {
    const { attId } = req.params;
    const { rows } = await query(
      `SELECT a.*, m.sender_id, m.recipient_id, m.recipient_group
       FROM message_attachments a
       JOIN messages m ON a.message_id = m.id
       WHERE a.id = $1`,
      [attId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Attachment not found' });

    const att = rows[0];
    // Access check: sender, recipient, or admission_team member
    const canAccess = att.sender_id === req.user.id ||
      att.recipient_id === req.user.id ||
      (att.recipient_group === 'admission_team' && isAdmissionTeam(req.user.role));

    if (!canAccess) return res.status(403).json({ error: 'Access denied' });

    res.download(att.file_path, att.original_name);
  } catch (err) {
    console.error('downloadAttachment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Notifications ─────────────────────────────────────────────
export const getNotifications = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, user_id, application_id, type, message, link, is_read, created_at
       FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('getNotifications error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    res.json({ count: parseInt(rows[0].count) });
  } catch (err) {
    console.error('getUnreadCount error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markNotifRead = async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('markNotifRead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAllNotifsRead = async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('markAllNotifsRead error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
