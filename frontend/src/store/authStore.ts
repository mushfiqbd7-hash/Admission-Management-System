// src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user:         User | null;
  accessToken:  string | null;
  refreshToken: string | null;
  isAuth:       boolean;
  isHydrated:   boolean;

  setAuth:  (user: User, accessToken: string, refreshToken: string) => void;
  setToken: (accessToken: string) => void;
  setHydrated: (isHydrated: boolean) => void;
  logout:   () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      isAuth:       false,
      isHydrated:   false,

      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken, isAuth: true });
      },

      setToken: (accessToken) => {
        set({ accessToken });
      },

      setHydrated: (isHydrated) => {
        set({ isHydrated });
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('sams-auth');
        set({ user: null, accessToken: null, refreshToken: null, isAuth: false });
      },
    }),
    {
      name: 'sams-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({
        user:        state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuth:      state.isAuth,
      }),
    }
  )
);
