import apiClient from '@/lib/api/client';
import { encodePhoneForApi } from '@/lib/utils/phoneRoute';
import { useMutation, useQueryClient } from '@tanstack/react-query';

function phoneTagsPath(phoneNumber: string) {
  return `/phones/${encodePhoneForApi(phoneNumber)}/tags`;
}

export const useTags = (phoneNumber: string) => {
  const queryClient = useQueryClient();

  const addTagMutation = useMutation({
    mutationFn: async ({ category, text }: { category: number; text: string }) => {
      const { data } = await apiClient.post<number>(phoneTagsPath(phoneNumber), {
        category,
        text,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone', phoneNumber] });
    },
  });

  return {
    addTag: addTagMutation.mutate,
    addTagAsync: addTagMutation.mutateAsync,
    isAddingTag: addTagMutation.isPending,
  };
};
