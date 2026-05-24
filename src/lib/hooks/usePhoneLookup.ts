import apiClient from '@/lib/api/client';
import { encodePhoneForApi } from '@/lib/utils/phoneRoute';
import { useQuery } from '@tanstack/react-query';

export interface TagEntry {
  id: number;
  text: string;
  category: number;
  upvoteCount: number;
  downvoteCount: number;
  createdAt: string;
}

export interface PhoneDetails {
  e164: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  spamScore: number;
  totalSearches: number;
  lastActivityAt: string;
  topTags: TagEntry[];
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
