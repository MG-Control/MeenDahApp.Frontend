import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createMMKVStorage } from './mmkvStorage';

interface SettingsState {
  language: 'ar' | 'en';
  theme: 'light' | 'dark' | 'system';
  hasSyncedContacts: boolean;
  setLanguage: (language: 'ar' | 'en') => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setHasSyncedContacts: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'ar',
      theme: 'system',
      hasSyncedContacts: false,
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setHasSyncedContacts: (hasSyncedContacts) => set({ hasSyncedContacts }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => createMMKVStorage('settings-storage')),
    }
  )
);
