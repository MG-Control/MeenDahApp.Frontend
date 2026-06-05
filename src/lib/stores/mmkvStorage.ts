import { Platform } from 'react-native';

type SyncStorage = {
  setItem: (name: string, value: string) => void;
  getItem: (name: string) => string | null;
  removeItem: (name: string) => void;
};

const inMemoryStorage = new Map<string, string>();

function createWebStorage(): SyncStorage {
  if (typeof localStorage !== 'undefined') {
    return {
      setItem: (name, value) => localStorage.setItem(name, value),
      getItem: (name) => localStorage.getItem(name),
      removeItem: (name) => localStorage.removeItem(name),
    };
  }
  return {
    setItem: (name, value) => inMemoryStorage.set(name, value),
    getItem: (name) => inMemoryStorage.get(name) ?? null,
    removeItem: (name) => inMemoryStorage.delete(name),
  };
}

function createFallbackStorage(): SyncStorage {
  return {
    setItem: (name, value) => inMemoryStorage.set(name, value),
    getItem: (name) => inMemoryStorage.get(name) ?? null,
    removeItem: (name) => inMemoryStorage.delete(name),
  };
}

export function createMMKVStorage(id: string): SyncStorage {
  // MMKV is not supported on Web — use localStorage instead
  if (Platform.OS === 'web') {
    return createWebStorage();
  }

  try {
    // Dynamic require to avoid issues in environments where MMKV isn't linked (like Expo Go)
    const { MMKV } = require('react-native-mmkv');
    if (!MMKV) {
      return createFallbackStorage();
    }

    const storage = new MMKV({ id });
    const fallback = createFallbackStorage();

    return {
      setItem: (name: string, value: string) => {
        try {
          storage.set(name, value);
        } catch (e) {
          console.warn('MMKV setItem failed:', e);
          fallback.setItem(name, value);
        }
      },
      getItem: (name: string) => {
        try {
          return storage.getString(name) ?? null;
        } catch (e) {
          console.warn('MMKV getItem failed:', e);
          return fallback.getItem(name);
        }
      },
      removeItem: (name: string) => {
        try {
          storage.delete(name);
        } catch (e) {
          console.warn('MMKV removeItem failed:', e);
          fallback.removeItem(name);
        }
      },
    };
  } catch (error) {
    // If MMKV fails to load (e.g. in Expo Go), use fallback
    return createFallbackStorage();
  }
}
