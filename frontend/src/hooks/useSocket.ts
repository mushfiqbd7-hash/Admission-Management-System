// src/hooks/useSocket.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { useQueryClient } from '@tanstack/react-query';

// In dev, Vite proxies /socket.io → localhost:5000 (same origin, no CORS needed)
// In prod, set VITE_SOCKET_URL to your backend host
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

let globalSocket: Socket | null = null;

export function useSocket() {
  const { user, accessToken, isAuth } = useAuthStore();
  const qc = useQueryClient();
  const initialized = useRef(false);

  useEffect(() => {
    if (!isAuth || !accessToken || !user || initialized.current) return;
    initialized.current = true;

    globalSocket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    globalSocket.on('connect', () => {
      console.log('[Socket] Connected:', globalSocket?.id);
    });

    globalSocket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    // Real-time inbox updates
    globalSocket.on('message:new', () => {
      qc.invalidateQueries({ queryKey: ['messages', 'inbox'] });
    });

    // Real-time notification updates
    globalSocket.on('notification:new', () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    });

    globalSocket.on('notification:count_updated', () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      globalSocket?.disconnect();
      globalSocket = null;
      initialized.current = false;
    };
  }, [isAuth, accessToken, user?.id]);
}

export function getSocket() {
  return globalSocket;
}
