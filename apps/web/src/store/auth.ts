import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, configureAuthBridge, AuthTokens } from '../lib/api';
import { User } from '../lib/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (t: AuthTokens) => void;
  hydrateFromStorage: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setTokens: (t: AuthTokens) => {
        set({ accessToken: t.accessToken, refreshToken: t.refreshToken });
      },

      async login(email, password) {
        const res = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
          '/auth/login',
          { email, password },
        );
        set({
          user: res.user,
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
        });
      },

      async register(name, email, password) {
        const res = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
          '/auth/register',
          { name, email, password },
        );
        set({
          user: res.user,
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
        });
      },

      async logout() {
        const { refreshToken } = get();
        try {
          if (refreshToken) await api.post('/auth/logout', { refreshToken });
        } finally {
          set({ user: null, accessToken: null, refreshToken: null });
        }
      },

      // No-op; el persist ya hidrata del storage. Existe para completar la interfaz.
      hydrateFromStorage: () => {},
    }),
    {
      name: 'kanban-auth',
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
      }),
    },
  ),
);

configureAuthBridge({
  getTokens: () => {
    const s = useAuth.getState();
    return s.accessToken && s.refreshToken
      ? { accessToken: s.accessToken, refreshToken: s.refreshToken }
      : null;
  },
  refresh: async () => {
    const s = useAuth.getState();
    const res = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      { refreshToken: s.refreshToken },
    );
    useAuth.getState().setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    return { accessToken: res.accessToken, refreshToken: res.refreshToken };
  },
});