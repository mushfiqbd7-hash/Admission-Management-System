// src/api/client.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
        processQueue(null, data.accessToken);
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login:                (data: { email: string; password: string }) =>
                        api.post('/auth/login', data),
  register:             (data: { full_name: string; email: string; password: string; role: string }) =>
                        api.post('/auth/register', data),
  logout:               (refreshToken: string) =>
                        api.post('/auth/logout', { refreshToken }),
  me:                   () => api.get('/auth/me'),
  changePassword:       (data: { currentPassword: string; newPassword: string }) =>
                        api.post('/auth/change-password', data),
  verifyEmail:          (token: string) =>
                        api.get(`/auth/verify-email?token=${token}`),
  resendVerification:   (email: string) =>
                        api.post('/auth/resend-verification', { email }),
};

export const studentsApi = {
  list:         (params?: Record<string, string | number>) => api.get('/students', { params }),
  getStats:     () => api.get('/students/stats'),
  get:          (id: string) => api.get(`/students/${id}`),
  create:       (data: unknown) => api.post('/students', data),
  update:       (id: string, data: unknown) => api.put(`/students/${id}`, data),
  delete:       (id: string) => api.delete(`/students/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/students/${id}/status`, { status }),
  addNote:      (id: string, note: string) => api.post(`/students/${id}/notes`, { note }),
};

export const usersApi = {
  list:   () => api.get('/users'),
  create: (data: unknown) => api.post('/users', data),
  update: (id: string, data: unknown) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const messagesApi = {
  inbox:             () => api.get('/messages/inbox'),
  sent:              () => api.get('/messages/sent'),
  send:              (data: FormData) =>
                     api.post('/messages', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  markRead:          (id: string) => api.patch(`/messages/${id}/read`),
  deleteMessage:     (id: string) => api.delete(`/messages/${id}`),
  attachmentUrl:     (attId: string) => `${API_URL}/messages/attachments/${attId}`,
  applications:      () => api.get('/messages/applications'),
  notifications:     () => api.get('/notifications'),
  unreadCount:       () => api.get('/notifications/unread-count'),
  markNotifRead:     (id: string) => api.patch(`/notifications/${id}/read`),
  markAllNotifsRead: () => api.patch('/notifications/read-all'),
};

export const sharedDocsApi = {
  list:    () => api.get('/shared-documents'),
  upload:  (data: FormData) => api.post('/shared-documents', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete:  (id: string) => api.delete(`/shared-documents/${id}`),
  fileUrl: (id: string) => `${API_URL}/shared-documents/${id}/file`,
};

export default api;
