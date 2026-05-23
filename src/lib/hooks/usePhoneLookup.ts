import apiClient from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';

export interface PhoneDetails {
  e164: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  spamScore: number;
  topTags: {
    id: number;
    text: string;
    category: number;
    upvoteCount: number;
    downvoteCount: number;
    createdAt: string;
  }[];
}

export const usePhoneLookup = (phoneNumber?: string) => {
  return useQuery({
    queryKey: ['phone', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return null;
      const { data } = await apiClient.get<PhoneDetails>(`/phones/${phoneNumber}`);
      // if (__DEV__) console.log('[API] Phone Details Response:', JSON.stringify(data, null, 2));
      return data;
    },
    enabled: !!phoneNumber,
  });
};
