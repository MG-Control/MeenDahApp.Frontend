import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type AsyncStorageLike = {
  setItem: (name: string, value: string) => Promise<void> | void;
  getItem: (name: string) => Promise<string | null> | string | null;
  removeItem: (name: string) => Promise<void> | void;
};

const memoryStorage = new Map<string, string>();

function createWebStorage(): AsyncStorageLike {
  return {
    setItem: async (name, value) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(name, value);
        return;
      }

      memoryStorage.set(name, value);
    },
    getItem: async (name) => {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(name);
      }

      return memoryStorage.get(name) ?? null;
    },
    removeItem: async (name) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(name);
        return;
      }

      memoryStorage.delete(name);
    },
  };
}

export function createSecureStorage(prefix: string): AsyncStorageLike {
  if (Platform.OS === 'web') {
    return createWebStorage();
  }

  return {
    setItem: async (name, value) => {
      try {
        await SecureStore.setItemAsync(`${prefix}:${name}`, value);
      } catch (error) {
        console.warn('SecureStore setItem failed:', error);
        memoryStorage.set(`${prefix}:${name}`, value);
      }
    },
    getItem: async (name) => {
      try {
        return await SecureStore.getItemAsync(`${prefix}:${name}`);
      } catch (error) {
        console.warn('SecureStore getItem failed:', error);
        return memoryStorage.get(`${prefix}:${name}`) ?? null;
      }
    },
    removeItem: async (name) => {
      try {
        await SecureStore.deleteItemAsync(`${prefix}:${name}`);
      } catch (error) {
        console.warn('SecureStore removeItem failed:', error);
        memoryStorage.delete(`${prefix}:${name}`);
      }
    },
  };
}