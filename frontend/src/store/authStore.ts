// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user:         User | null;
  accessToken:  string | null;
  refreshToken: string | null;
  isAuth:       boolean;

  setAuth:  (user: User, accessToken: string, refreshToken: string) => void;
  setToken: (accessToken: string) => void;
  logout:   () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      isAuth:       false,

      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('accessToken',  accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ user, accessToken, refreshToken, isAuth: true });
      },

      setToken: (accessToken) => {
        localStorage.setItem('accessToken', accessToken);
        set({ accessToken });
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, refreshToken: null, isAuth: false });
      },
    }),
    {
      name: 'sams-auth',
      partialize: (state) => ({
        user:        state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuth:      state.isAuth,
      }),
    }
  )
);
