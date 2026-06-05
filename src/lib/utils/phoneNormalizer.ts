import { parsePhoneNumberWithError } from 'libphonenumber-js';

import type { ContactEntry } from '@/lib/stores/contactPickerStore';

/** Digits only, Egypt secret format (matches backend NormalizeToSecretFormat). */
export const normalizeDigitsToSecretFormat = (digits: string): string => {
  if (!digits) return '';
  if (digits.startsWith('20')) return digits;
  if (digits.startsWith('0') && digits.length > 1) return `20${digits.slice(1)}`;
  return `20${digits}`;
};

/** Strip +, spaces, dashes, etc. and normalize to secret format for display and sync. */
export const normalizePhoneNumber = (phoneNumber: string, defaultCountry = 'EG'): string => {
  try {
    const parsed = parsePhoneNumberWithError(phoneNumber, defaultCountry as any);
    const digits = parsed.number.replace(/\D/g, '');
    return normalizeDigitsToSecretFormat(digits);
  } catch {
    const digits = phoneNumber.replace(/\D/g, '');
    return normalizeDigitsToSecretFormat(digits);
  }
};

const isValidSecretPhone = (phone: string) => phone.length >= 7 && phone.length <= 16;

export const dedupeContactsByPhone = (contacts: ContactEntry[]): ContactEntry[] => {
  const byPhone = new Map<string, ContactEntry>();

  for (const contact of contacts) {
    const key = contact.phoneNumber;
    if (!isValidSecretPhone(key)) continue;

    const existing = byPhone.get(key);
    if (!existing) {
      byPhone.set(key, contact);
      continue;
    }

    const existingHasName = Boolean(existing.name?.trim());
    const contactHasName = Boolean(contact.name?.trim());
    if (!existingHasName && contactHasName) {
      byPhone.set(key, contact);
    }
  }

  return Array.from(byPhone.values());
};
