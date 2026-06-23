import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Platform } from 'react-native';
import { appStorage } from './appStorage';
import { callDetection } from '@/lib/native/callDetection';

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
        // Check if already blocked
        const alreadyBlocked = blockedNumbers.some(b => b.phoneNumber === phoneNumber);
        if (alreadyBlocked) return;
        
        set({
          blockedNumbers: [
            ...blockedNumbers,
            {
              phoneNumber,
              displayName,
              blockedAt: new Date().toISOString()
            }
          ]
        });

        // Sync to native layer so CallScreeningService can block the call
        if (Platform.OS === 'android') {
          callDetection.blockNumber(phoneNumber);
        }
      },
      
      unblockNumber: (phoneNumber) => {
        const { blockedNumbers } = get();
        set({
          blockedNumbers: blockedNumbers.filter(b => b.phoneNumber !== phoneNumber)
        });

        // Sync removal to native layer
        if (Platform.OS === 'android') {
          callDetection.unblockNumber(phoneNumber);
        }
      },
      
      isBlocked: (phoneNumber) => {
        const { blockedNumbers } = get();
        return blockedNumbers.some(b => b.phoneNumber === phoneNumber);
      }
    }),
    {
      name: 'blocked_numbers_storage',
      storage: createJSONStorage(() => appStorage),
      onRehydrateStorage: () => (state, error) => {
        console.log('[Blocked Numbers] Rehydrated:', { count: state?.blockedNumbers.length, error });
        queueMicrotask(() => {
          useBlockedNumbersStore.setState({ _hasHydrated: true });
        });
      },
    }
  )
);
