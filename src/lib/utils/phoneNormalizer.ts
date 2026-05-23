import { parsePhoneNumberWithError } from 'libphonenumber-js';

export const normalizePhoneNumber = (phoneNumber: string, defaultCountry = 'EG') => {
  try {
    const parsed = parsePhoneNumberWithError(phoneNumber, defaultCountry as any);
    return parsed.format('E.164');
  } catch {
    return phoneNumber.replace(/[^\d+]/g, '');
  }
};
