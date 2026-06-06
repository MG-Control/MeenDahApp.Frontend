import apiClient from '@/lib/api/client';
import { encodePhoneForApi } from '@/lib/utils/phoneRoute';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  tags: TagEntry[];
  facebookUrl?: string | null;
  whatsappUrl?: string | null;
  telegramUrl?: string | null;
  viberUrl?: string | null;
  signalUrl?: string | null;
  skypeUrl?: string | null;
  messengerUrl?: string | null;
}

interface UsePhoneLookupOptions {
  skipInitialFetch?: boolean;
}

export const usePhoneLookup = (phoneNumber?: string, options?: UsePhoneLookupOptions) => {
  const queryClient = useQueryClient();
  const cachedPhone = phoneNumber
    ? queryClient.getQueryData<PhoneDetails>(['phone', phoneNumber])
    : undefined;
  const shouldSkipInitialFetch = Boolean(options?.skipInitialFetch && cachedPhone);

  return useQuery({
    queryKey: ['phone', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return null;
      const { data } = await apiClient.get<PhoneDetails>(
        `/phones/${encodePhoneForApi(phoneNumber)}`
      );
      return data;
    },
    enabled: !!phoneNumber && !shouldSkipInitialFetch,
  });
};
