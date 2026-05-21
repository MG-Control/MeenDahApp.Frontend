import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

export const useTags = (phoneNumber: string) => {
  const queryClient = useQueryClient();

  const addTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      const { data } = await apiClient.post(`/phones/${phoneNumber}/tags`, { tagId });
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
      tagEntryId: string;
      voteType: number;
    }) => {
      const { data } = await apiClient.post(
        `/phones/${phoneNumber}/tags/${tagEntryId}/vote`,
        {
          voteType,
        }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone', phoneNumber] });
    },
  });

  return {
    addTag: addTagMutation.mutate,
    isAddingTag: addTagMutation.isPending,
    voteTag: voteTagMutation.mutate,
    isVoting: voteTagMutation.isPending,
  };
};
