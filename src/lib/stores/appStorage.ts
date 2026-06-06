import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type StorageInterface = {
  setItem: (name: string, value: string) => Promise<void>;
  getItem: (name: string) => Promise<string | null>;
  removeItem: (name: string) => Promise<void>;
};

const memoryStorage = new Map<string, string>();

// Sanitize key for SecureStore - only alphanumeric, ., -, _
function sanitizeKey(key: string): string {
  if (!key) return 'empty_key';
  // Replace invalid characters with _
  const sanitized = key.replace(/[^a-zA-Z0-9._-]/g, '_');
  // If after sanitizing it's empty, use fallback
  return sanitized || 'sanitized_empty_key';
}

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

export function createAppStorage(prefix: string): StorageInterface {
  const safePrefix = sanitizeKey(prefix);

  if (Platform.OS === 'web') {
    return createWebStorage();
  }

  return {
    setItem: async (name, value) => {
      try {
        const safeName = sanitizeKey(name);
        const fullKey = safePrefix ? `${safePrefix}_${safeName}` : safeName;
        await SecureStore.setItemAsync(fullKey, value);
      } catch (error) {
        console.warn('Storage setItem failed:', error);
        // Fallback to memory storage
        const safeName = sanitizeKey(name);
        const fullKey = safePrefix ? `${safePrefix}_${safeName}` : safeName;
        memoryStorage.set(fullKey, value);
      }
    },
    getItem: async (name) => {
      try {
        const safeName = sanitizeKey(name);
        const fullKey = safePrefix ? `${safePrefix}_${safeName}` : safeName;
        return await SecureStore.getItemAsync(fullKey);
      } catch (error) {
        console.warn('Storage getItem failed:', error);
        // Fallback to memory storage
        const safeName = sanitizeKey(name);
        const fullKey = safePrefix ? `${safePrefix}_${safeName}` : safeName;
        return memoryStorage.get(fullKey) ?? null;
      }
    },
    removeItem: async (name) => {
      try {
        const safeName = sanitizeKey(name);
        const fullKey = safePrefix ? `${safePrefix}_${safeName}` : safeName;
        await SecureStore.deleteItemAsync(fullKey);
      } catch (error) {
        console.warn('Storage removeItem failed:', error);
        // Fallback to memory storage
        const safeName = sanitizeKey(name);
        const fullKey = safePrefix ? `${safePrefix}_${safeName}` : safeName;
        memoryStorage.delete(fullKey);
      }
    },
  };
}

// Create default storage instances
export const authStorage = createAppStorage('auth');
export const settingsStorage = createAppStorage('settings');
export const appStorage = createAppStorage('app');
