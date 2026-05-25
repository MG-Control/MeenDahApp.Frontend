import apiClient from '@/lib/api/client';
import { encodePhoneForApi } from '@/lib/utils/phoneRoute';
import { useQuery } from '@tanstack/react-query';

export interface TagEntry {
  id: number;
  text: string;
  category: number;
  createdAt: string;
}

export interface PhoneDetails {
  e164: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  userId?: string | null;
  gender?: string | null;
  residence?: string | null;
  country?: string | null;
  birthplace?: string | null;
  relationship?: string | null;
  workplace?: string | null;
  joined?: string | null;
  birthdate?: string | null;
  spamScore: number;
  totalSearches: number;
  lastActivityAt: string;
  topTags: TagEntry[];
  facebookUrl?: string | null;
  whatsappUrl?: string | null;
  telegramUrl?: string | null;
}

export const usePhoneLookup = (phoneNumber?: string) => {
  return useQuery({
    queryKey: ['phone', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return null;
      const { data } = await apiClient.get<PhoneDetails>(
        `/phones/${encodePhoneForApi(phoneNumber)}`
      );
      return data;
    },
    enabled: !!phoneNumber,
  });
};
