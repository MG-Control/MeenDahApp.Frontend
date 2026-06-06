import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { authStorage } from './appStorage';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: {
    id: string;
    phoneNumber?: string;
    displayName?: string;
    email?: string;
    avatarUrl?: string;
  } | null;
  _hasHydrated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      _hasHydrated: false,
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: 'auth_storage', // Simple key
      storage: createJSONStorage(() => authStorage),
      onRehydrateStorage: () => (state, error) => {
        console.log('[Auth] Rehydrated:', { accessToken: state?.accessToken, error });
        queueMicrotask(() => {
          useAuthStore.setState({ _hasHydrated: true });
        });
      },
    }
  )
);
