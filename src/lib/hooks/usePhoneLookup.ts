import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

export interface PhoneDetails {
  phoneNumber: string;
  name?: string;
  spamScore: number;
  tags: {
    id: string;
    tagId: number;
    votes: number;
  }[];
}

export const usePhoneLookup = (phoneNumber?: string) => {
  return useQuery({
    queryKey: ['phone', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return null;
      const { data } = await apiClient.get<PhoneDetails>(`/phones/${phoneNumber}`);
      return data;
    },
    enabled: !!phoneNumber,
  });
};
