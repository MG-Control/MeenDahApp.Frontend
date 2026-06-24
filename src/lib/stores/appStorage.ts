import { Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';

type StorageInterface = {
  setItem: (name: string, value: string) => Promise<void>;
  getItem: (name: string) => Promise<string | null>;
  removeItem: (name: string) => Promise<void>;
};

function sanitizeKey(key: string): string {
  if (!key) return 'empty_key';
  const sanitized = key.replace(/[^a-zA-Z0-9._-]/g, '_');
  return sanitized || 'sanitized_empty_key';
}

const defaultMmkv = createMMKV({ id: 'app_default_storage' });
const memoryStorage = new Map<string, string>();

function createWebStorage(): StorageInterface {
  return {
    setItem: async (name, value) => {
      const safeKey = sanitizeKey(name);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(safeKey, value);
        return;
      }
      memoryStorage.set(safeKey, value);
    },
    getItem: async (name) => {
      const safeKey = sanitizeKey(name);
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(safeKey);
      }
      return memoryStorage.get(safeKey) ?? null;
    },
    removeItem: async (name) => {
      const safeKey = sanitizeKey(name);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(safeKey);
        return;
      }
      memoryStorage.delete(safeKey);
    },
  };
}

function createNativeStorage(prefix: string): StorageInterface {
  const safePrefix = sanitizeKey(prefix);
  const mmkv = createMMKV({ id: `${safePrefix}_storage` });
  return {
    setItem: async (name, value) => {
      const safeName = sanitizeKey(name);
      const fullKey = safePrefix ? `${safePrefix}_${safeName}` : safeName;
      mmkv.set(fullKey, value);
    },
    getItem: async (name) => {
      const safeName = sanitizeKey(name);
      const fullKey = safePrefix ? `${safePrefix}_${safeName}` : safeName;
      const value = mmkv.getString(fullKey);
      return value ?? null;
    },
    removeItem: async (name) => {
      const safeName = sanitizeKey(name);
      const fullKey = safePrefix ? `${safePrefix}_${safeName}` : safeName;
      mmkv.remove(fullKey);
    },
  };
}

export function createAppStorage(prefix: string): StorageInterface {
  if (Platform.OS === 'web') {
    return createWebStorage();
  }
  return createNativeStorage(prefix);
}

export const authStorage = createAppStorage('auth');
export const settingsStorage = createAppStorage('settings');
export const appStorage = createAppStorage('app');