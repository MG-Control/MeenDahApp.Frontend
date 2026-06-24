import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';
import { callDetection } from '@/lib/native/callDetection';

const mmkv = createMMKV({
  id: 'blocked_numbers_storage',
});

interface BlockedNumber {
  phoneNumber: string;
  blockedAt: string;
  displayName?: string;
}

interface BlockedNumbersState {
  blockedNumbers: BlockedNumber[];
  _hasHydrated: boolean;
  blockNumber: (phoneNumber: string, displayName?: string) => void;
  unblockNumber: (phoneNumber: string) => void;
  isBlocked: (phoneNumber: string) => boolean;
}

export const useBlockedNumbersStore = create<BlockedNumbersState>()(
  persist(
    (set, get) => ({
      blockedNumbers: [],
      _hasHydrated: false,

      blockNumber: (phoneNumber, displayName) => {
        const { blockedNumbers } = get();
        const alreadyBlocked = blockedNumbers.some(b => b.phoneNumber === phoneNumber);
        if (alreadyBlocked) return;

        set({
          blockedNumbers: [
            ...blockedNumbers,
            {
              phoneNumber,
              displayName,
              blockedAt: new Date().toISOString(),
            },
          ],
        });

        if (Platform.OS === 'android') {
          callDetection.blockNumber(phoneNumber);
        }
      },

      unblockNumber: (phoneNumber) => {
        const { blockedNumbers } = get();
        set({
          blockedNumbers: blockedNumbers.filter(b => b.phoneNumber !== phoneNumber),
        });

        if (Platform.OS === 'android') {
          callDetection.unblockNumber(phoneNumber);
        }
      },

      isBlocked: (phoneNumber) => {
        const { blockedNumbers } = get();
        return blockedNumbers.some(b => b.phoneNumber === phoneNumber);
      },
    }),
    {
      name: 'blocked_numbers_storage',
      storage: createJSONStorage(() => ({
        getItem: (name) => Promise.resolve(mmkv.getString(name) ?? null),
        setItem: (name, value) => {
          mmkv.set(name, value);
          return Promise.resolve();
        },
        removeItem: (name) => {
          mmkv.remove(name);
          return Promise.resolve();
        },
      })),
      onRehydrateStorage: () => (state, error) => {
        console.log('[Blocked Numbers] Rehydrated:', { count: state?.blockedNumbers.length, error });
        queueMicrotask(() => {
          useBlockedNumbersStore.setState({ _hasHydrated: true });
        });
      },
    },
  ),
);