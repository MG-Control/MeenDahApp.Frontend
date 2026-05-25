import { create } from 'zustand';

export interface ContactEntry {
  name: string;
  phoneNumber: string;
  email?: string;
  avatarUri?: string;
}

interface ContactPickerState {
  pendingContacts: ContactEntry[];
  setPendingContacts: (contacts: ContactEntry[]) => void;
  clear: () => void;
}

export const useContactPickerStore = create<ContactPickerState>((set) => ({
  pendingContacts: [],
  setPendingContacts: (contacts) => set({ pendingContacts: contacts }),
  clear: () => set({ pendingContacts: [] }),
}));
