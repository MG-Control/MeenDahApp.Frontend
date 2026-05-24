import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { encodePhoneForApi } from '@/lib/utils/phoneRoute';

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

  const voteTagMutation = useMutation({
    mutationFn: async ({
      tagEntryId,
      voteType,
    }: {
      tagEntryId: number;
      voteType: number;
    }) => {
      const { data } = await apiClient.post(
        `${phoneTagsPath(phoneNumber)}/${tagEntryId}/vote`,
        { voteType }
      );
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
    voteTag: voteTagMutation.mutate,
    isVoting: voteTagMutation.isPending,
  };
};
