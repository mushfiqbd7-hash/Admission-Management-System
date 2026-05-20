// src/routes/messages.js
import { Router } from 'express';
import {
  getInbox, getSent, sendMessage, markRead, deleteMessage,
  downloadAttachment, uploadAttachment,
  getApplicationsForDropdown,
  getNotifications, getUnreadCount, markNotifRead, markAllNotifsRead,
} from '../controllers/messagesController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// ── Specific message sub-routes BEFORE /:id routes ───────────
router.get('/messages/applications',             getApplicationsForDropdown);
router.get('/messages/attachments/:attId',       downloadAttachment);
router.get('/messages/inbox',                    getInbox);
router.get('/messages/sent',                     getSent);

// ── Message CRUD ──────────────────────────────────────────────
router.post('/messages',
  uploadAttachment.array('attachments', 5),
  sendMessage
);
router.patch('/messages/:id/read',               markRead);
router.delete('/messages/:id',                   deleteMessage);

// ── Notifications ─────────────────────────────────────────────
router.get('/notifications',                     getNotifications);
router.get('/notifications/unread-count',        getUnreadCount);
router.patch('/notifications/read-all',          markAllNotifsRead);
router.patch('/notifications/:id/read',          markNotifRead);

export default router;
