import { Platform } from 'react-native';

type SyncStorage = {
  setItem: (name: string, value: string) => void;
  getItem: (name: string) => string | null;
  removeItem: (name: string) => void;
};

const fallbackStorage = new Map<string, string>();

function createFallbackStorage(): SyncStorage {
  return {
    setItem: (name, value) => fallbackStorage.set(name, value),
    getItem: (name) => fallbackStorage.get(name) ?? null,
    removeItem: (name) => fallbackStorage.delete(name),
  };
}

export function createMMKVStorage(id: string): SyncStorage {
  // MMKV is not supported on Web
  if (Platform.OS === 'web') {
    return createFallbackStorage();
  }

  try {
    // Dynamic require to avoid issues in environments where MMKV isn't linked (like Expo Go)
    const { MMKV } = require('react-native-mmkv');
    if (!MMKV) {
      return createFallbackStorage();
    }

    const storage = new MMKV({ id });

    return {
      setItem: (name: string, value: string) => {
        try {
          storage.set(name, value);
        } catch (e) {
          console.warn('MMKV setItem failed:', e);
          fallbackStorage.set(name, value);
        }
      },
      getItem: (name: string) => {
        try {
          return storage.getString(name) ?? null;
        } catch (e) {
          console.warn('MMKV getItem failed:', e);
          return fallbackStorage.get(name) ?? null;
        }
      },
      removeItem: (name: string) => {
        try {
          storage.delete(name);
        } catch (e) {
          console.warn('MMKV removeItem failed:', e);
          fallbackStorage.delete(name);
        }
      },
    };
  } catch (error) {
    // If MMKV fails to load (e.g. in Expo Go), use fallback
    return createFallbackStorage();
  }
}
