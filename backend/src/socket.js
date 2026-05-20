// src/socket.js
// Socket.IO server — attach to existing HTTP server, authenticate via JWT

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { query } from './config/database.js';

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // ── Auth middleware ────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token ||
                    socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('No token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { rows } = await query(
        'SELECT id, email, full_name, role FROM users WHERE id = $1 AND is_active = TRUE',
        [decoded.userId]
      );
      if (!rows[0]) return next(new Error('User not found'));

      socket.user = rows[0];
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  // ── Connection ────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { id: userId, role } = socket.user;

    // Every user joins their personal room
    socket.join(`user:${userId}`);

    // Admin and staff also join the admission_team room
    if (role === 'admin' || role === 'staff') {
      socket.join('admission_team');
    }

    socket.on('disconnect', () => {});
  });

  return io;
}

// ── Emit helpers (called from controllers) ──────────────────
export function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToAdmissionTeam(event, data) {
  if (!io) return;
  io.to('admission_team').emit(event, data);
}

export function getIO() {
  return io;
}
