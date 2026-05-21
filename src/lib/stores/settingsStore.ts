import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createMMKVStorage } from './mmkvStorage';

interface SettingsState {
  language: 'ar' | 'en';
  theme: 'light' | 'dark' | 'system';
  setLanguage: (language: 'ar' | 'en') => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'ar',
      theme: 'system',
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => createMMKVStorage('settings-storage')),
    }
  )
);
